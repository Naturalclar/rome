/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Generator from '../../Generator';
import {
  ImportDefaultSpecifier,
  importDefaultSpecifier,
  AnyNode,
} from '@romejs/js-ast';

export default function ImportDefaultSpecifier(
  generator: Generator,
  node: AnyNode,
) {
  node = importDefaultSpecifier.assert(node);

  generator.print(node.local.name, node);
}
