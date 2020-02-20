/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Generator from '../../Generator';
import {
  InterpreterDirective,
  interpreterDirective,
  AnyNode,
} from '@romejs/js-ast';

export default function InterpreterDirective(
  generator: Generator,
  node: AnyNode,
) {
  node = interpreterDirective.assert(node);

  throw new Error('unimplemented');
}
