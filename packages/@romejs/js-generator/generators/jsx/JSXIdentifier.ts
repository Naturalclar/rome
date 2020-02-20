/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Generator from '../../Generator';
import {JSXIdentifier, jsxIdentifier, AnyNode} from '@romejs/js-ast';

export default function JSXIdentifier(generator: Generator, node: AnyNode) {
  node = jsxIdentifier.assert(node);

  generator.word(node.name);
}
