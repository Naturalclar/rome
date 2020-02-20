/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Resolver, {
  ResolverLocalQuery,
  ResolverQueryResponseMissing,
  ResolverQuerySource,
  isPathLike,
  ResolverQueryResponseUnsupported,
  ResolverQueryResponseFetchError,
  ResolverRemoteQuery,
} from './Resolver';
import {
  DiagnosticsError,
  PartialDiagnosticAdvice,
  buildSuggestionAdvice,
} from '@romejs/diagnostics';
import {orderBySimilarity} from '@romejs/string-utils';
import {createUnknownFilePath, AbsoluteFilePath} from '@romejs/path';
import {PLATFORMS} from '../../common/types/platform';

export default function resolverSuggest(
  resolver: Resolver,
  query: ResolverRemoteQuery,
  resolved:
    | ResolverQueryResponseFetchError
    | ResolverQueryResponseMissing
    | ResolverQueryResponseUnsupported,
  origQuerySource?: ResolverQuerySource,
): Error {
  let errMsg = '';
  if (resolved.type === 'UNSUPPORTED') {
    errMsg = `Unsupported path format`;
  } else if (resolved.type === 'MISSING') {
    errMsg = `Cannot find`;
  } else if (resolved.type === 'FETCH_ERROR') {
    errMsg = 'Failed to fetch';
  }
  errMsg += ` "${query.source.join()}" from "${query.origin.join()}"`;

  // Use the querySource returned by the resolution which will be the one that actually triggered this error, otherwise use the query source provided to us
  const querySource =
    resolved.source === undefined ? origQuerySource : resolved.source;
  if (querySource === undefined || querySource.pointer === undefined) {
    // TODO do something about the `advice` on some `resolved` that may contain metadata?
    throw new Error(errMsg);
  }

  const {pointer} = querySource;

  let advice: PartialDiagnosticAdvice = [];

  if (query.origin.isAbsolute()) {
    const localQuery: ResolverLocalQuery = {
      ...query,
      origin: query.origin.assertAbsolute(),
    };

    // Provide advice in strict-mode if a non-strict version existed
    if (query.strict) {
      const nonStrictResolved = resolver.resolveLocal({
        ...localQuery,
        strict: false,
      });

      if (nonStrictResolved.type === 'FOUND') {
        if (nonStrictResolved.types.includes('implicitIndex')) {
          advice.push({
            type: 'log',
            category: 'info',
            message: `This successfully resolves as an implicit index file. Trying adding <emphasis>/index${nonStrictResolved.path.getExtensions()}</emphasis> to the end of the import source`,
          });
        } else if (nonStrictResolved.types.includes('implicitExtension')) {
          advice.push({
            type: 'log',
            category: 'info',
            message: `This successfully resolves as an implicit extension. Try adding the extension <emphasis>${nonStrictResolved.path.getExtensions()}</emphasis>`,
          });
        }
      }
    }

    // We may set this to `true` for stuff like forgetting a platform
    let skipSimilaritySuggestions = false;

    // Try other platforms
    const validPlatforms: Array<string> = [];
    for (const PLATFORM of PLATFORMS) {
      if (PLATFORM === query.platform) {
        continue;
      }

      const resolved = resolver.resolveLocal({
        ...localQuery,
        platform: PLATFORM,
      });

      if (resolved.type === 'FOUND') {
        validPlatforms.push(
          `<emphasis>${PLATFORM}</emphasis> at <filelink emphasis target="${resolved.ref.uid}" />`,
        );
      }
    }
    if (validPlatforms.length > 0) {
      if (query.platform === undefined) {
        advice.push({
          type: 'log',
          category: 'info',
          message:
            'No platform was specified but we found modules for the following platforms',
        });
      } else {
        advice.push({
          type: 'log',
          category: 'info',
          message: `No module found for the platform <emphasis>${query.platform}</emphasis> but we found these others`,
        });
      }

      skipSimilaritySuggestions = true;

      advice.push({
        type: 'list',
        list: validPlatforms,
      });
    }

    // Hint on any indirection
    if (
      origQuerySource !== undefined &&
      origQuerySource.pointer !== undefined &&
      resolved.source !== undefined
    ) {
      advice.push({
        type: 'log',
        category: 'info',
        message: `Found while resolving <emphasis>${query.source}</emphasis> from <filelink emphasis target="${query.origin}" />`,
      });

      const origPointer = origQuerySource.pointer;

      advice.push({
        type: 'frame',
        ...origPointer,
      });
    }

    // Suggestions based on similarity to paths and packages on disk
    if (!skipSimilaritySuggestions) {
      const suggestions = getSuggestions(resolver, localQuery);
      if (suggestions.size > 0) {
        const originFolder = resolver.getOriginFolder(localQuery);

        // Relative paths to absolute
        const relativeToAbsolute: Map<string, string> = new Map();

        const relativeSuggestions = Array.from(
          suggestions,
          ([human, absolute]) => {
            if (human !== absolute) {
              relativeToAbsolute.set(human, absolute);
              return human;
            }

            let relativePath = originFolder.relative(absolute);

            // If the user didn't use extensions, then neither should we
            if (!query.source.hasExtensions()) {
              // TODO only do this if it's an implicit extension
              relativePath = relativePath.changeBasename(
                relativePath.getExtensionlessBasename(),
              );
            }

            const relativeStr = relativePath.toExplicitRelative().join();
            relativeToAbsolute.set(relativeStr, absolute);
            return relativeStr;
          },
        );

        advice = [
          ...advice,
          ...buildSuggestionAdvice(
            query.source.join(),
            relativeSuggestions,
            0,
            relative => {
              const absolute = relativeToAbsolute.get(relative);
              if (absolute === undefined) {
                throw new Error('Should be valid');
              }

              return `<filelink target="${absolute}">${relative}</filelink>`;
            },
          ),
        ];
      }
    }

    // Hint if this was an entry resolve and the cwd wasn't a project
    if (
      query.entry === true &&
      resolver.master.projectManager.findProjectExisting(localQuery.origin) ===
        undefined
    ) {
      advice.push({
        type: 'log',
        category: 'warn',
        message: "You aren't in a Rome project",
      });
    }
  }

  const source =
    querySource.source === undefined ? query.source.join() : querySource.source;
  let message = '';

  if (resolved.type === 'UNSUPPORTED') {
    message = `Unsupported`;
  } else if (resolved.type === 'MISSING') {
    message = `Cannot find`;
  } else if (resolved.type === 'FETCH_ERROR') {
    message = 'Failed to fetch';
  }

  if (resolved.advice !== undefined) {
    advice = advice.concat(resolved.advice);
  }

  message += ` <emphasis>${source}</emphasis> from <filelink emphasis target="${pointer.filename}" />`;

  throw new DiagnosticsError(errMsg, [
    {
      // TODO very confused by the usage of pointer and then querySource.pointer
      category: 'resolver',
      filename: pointer.filename,
      start: pointer.start,
      end: pointer.end,
      sourceText: querySource.pointer.sourceText,
      language: querySource.pointer.language,
      mtime: querySource.pointer.mtime,
      message,
      advice,
    },
  ]);
}

type Suggestions = Map<string, string>;

function getPathSuggestions(
  resolver: Resolver,
  query: ResolverLocalQuery,
): Suggestions {
  const {source} = query;
  const originFolder = resolver.getOriginFolder(query);
  const suggestions: Suggestions = new Map();

  // Try normal resolved
  tryPathSuggestions(resolver, suggestions, originFolder.resolve(source));

  // Remove . and .. entries from beginning
  const sourceParts = [...source.getSegments()];
  while (sourceParts[0] === '.' || sourceParts[0] === '..') {
    sourceParts.shift();
  }

  // Try parent directories of the origin
  for (const path of originFolder.getChain()) {
    tryPathSuggestions(resolver, suggestions, path.append(sourceParts));
  }

  return suggestions;
}

const MIN_SIMILARITY = 0.8;

function tryPathSuggestions(
  resolver: Resolver,
  suggestions: Suggestions,
  path: AbsoluteFilePath,
) {
  const {memoryFs} = resolver.master;

  const segments = path.getSegments();
  const chain = path.getChain();

  // Get all segments that are unknown
  for (let i = chain.length - 1; i >= 0; i--) {
    const path = chain[i];

    if (memoryFs.exists(path)) {
      // If this is an absolute match then we should be a suggestion
      if (i === chain.length) {
        const filename = path.join();
        suggestions.set(filename, filename);
      }

      // Otherwise this segment exists and should have been dealt with previously in the loop
      break;
    }

    const parentPath = path.getParent();

    // Our basename isn't valid, but our parent exists
    if (!memoryFs.exists(path) && memoryFs.exists(parentPath)) {
      const entries = Array.from(memoryFs.readdir(parentPath), path =>
        path.join(),
      );
      if (entries.length === 0) {
        continue;
      }

      const ratings = orderBySimilarity(
        path.getExtensionlessBasename(),
        entries,
        MIN_SIMILARITY,
        target => {
          return createUnknownFilePath(target).getExtensionlessBasename();
        },
      );

      for (const rating of ratings) {
        tryPathSuggestions(
          resolver,
          suggestions,
          createUnknownFilePath(rating.target)
            .append(segments.slice(1))
            .assertAbsolute(),
        );
      }
    }
  }
}

function getPackageSuggestions(
  resolver: Resolver,
  query: ResolverLocalQuery,
): Suggestions {
  const possibleGlobalPackages: Map<string, string> = new Map();

  const mainProject = resolver.master.projectManager.findProjectExisting(
    query.origin,
  );
  if (mainProject !== undefined) {
    const projects = resolver.master.projectManager.getHierarchyFromProject(
      mainProject,
    );

    for (const project of projects) {
      for (const [name, value] of project.hasteMap) {
        possibleGlobalPackages.set(name, value.join());
      }

      for (const [name, value] of project.packages) {
        possibleGlobalPackages.set(name, value.folder.join());
      }
    }
  }

  // TODO Add node_modules

  const matches: Array<[string, string]> = orderBySimilarity(
    query.source.join(),
    Array.from(possibleGlobalPackages.keys()),
    MIN_SIMILARITY,
  ).map(item => {
    const name = item.target;

    const absolute = possibleGlobalPackages.get(name);
    if (absolute === undefined) {
      throw new Error('Should exist');
    }

    return [name, absolute];
  });
  return new Map(matches);
}

function getSuggestions(
  resolver: Resolver,
  query: ResolverLocalQuery,
): Suggestions {
  if (query.entry === true) {
    return new Map([
      ...getPathSuggestions(resolver, query),
      ...getPackageSuggestions(resolver, query),
    ]);
  } else if (isPathLike(query.source)) {
    return getPathSuggestions(resolver, query);
  } else {
    return getPackageSuggestions(resolver, query);
  }
}
