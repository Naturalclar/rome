/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Generator from '../../Generator';
import {printMethod} from '../utils';
import {ObjectMethod, objectMethod, AnyNode} from '@romejs/js-ast';

export default function ObjectMethod(generator: Generator, node: AnyNode) {
  node = objectMethod.assert(node);
  objectMethod.assert(node);
  printMethod(generator, node);
}
