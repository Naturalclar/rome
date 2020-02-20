/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Generator from '../../Generator';
import {NewExpression, newExpression, AnyNode} from '@romejs/js-ast';

export default function NewExpression(generator: Generator, node: AnyNode) {
  node = newExpression.assert(node);

  generator.word('new');
  generator.space();
  generator.print(node.callee, node);
  generator.print(node.typeArguments, node);
  generator.token('(');
  generator.printCommaList(node.arguments, node);
  generator.token(')');
}
