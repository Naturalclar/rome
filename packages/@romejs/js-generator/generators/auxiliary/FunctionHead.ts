/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {FunctionHead, functionHead, AnyNode} from '@romejs/js-ast';
import {Generator} from '@romejs/js-generator';

export default function FunctionHead(generator: Generator, node: AnyNode) {
  node = functionHead.assert(node);

  const {typeAnnotations} = generator.options;

  generator.print(node.typeParameters, node);
  generator.token('(');

  generator.printCommaList(node.params, node, {
    iterator: node => {
      if (typeAnnotations && node.meta !== undefined) {
        if (node.meta.optional) {
          generator.token('?');
        }
        generator.printTypeColon(node.meta.typeAnnotation, node);
      }
    },
  });

  if (node.rest !== undefined) {
    if (node.params.length > 0) {
      generator.token(',');
      generator.space();
    }

    generator.token('...');
    generator.print(node.rest, node);
  }

  generator.token(')');

  if (typeAnnotations) {
    if (node.returnType) {
      generator.printTypeColon(node.returnType, node);
    }

    if (node.predicate) {
      if (!node.returnType) {
        generator.token(':');
      }
      generator.space();
      generator.print(node.predicate, node);
    }
  }
}
