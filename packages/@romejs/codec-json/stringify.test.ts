/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import '@romejs/core';
import {consumeJSONExtra, stringifyRJSONFromConsumer} from '@romejs/codec-json';
import {test} from 'rome';
import {ParserOptions} from '@romejs/parser-core';
import {createUnknownFilePath} from '@romejs/path';
import {Dict} from '@romejs/typescript-helpers';

function consumeExtJSON(opts: ParserOptions) {
	return consumeJSONExtra({
		...opts,
		path: createUnknownFilePath('input.rjson'),
	});
}

test(
	'arrays',
	(t) => {
		t.is(stringifyRJSONFromConsumer(consumeExtJSON({input: '[]'})), '[]');
		t.is(stringifyRJSONFromConsumer(consumeExtJSON({input: '[1]'})), '[1]');
		t.is(stringifyRJSONFromConsumer(consumeExtJSON({input: '[1,]'})), '[1]');
		t.is(
			stringifyRJSONFromConsumer(consumeExtJSON({input: '[1, 2, 3]'})),
			'[\n  1\n  2\n  3\n]',
		);
	},
);

test(
	'booleans',
	(t) => {
		t.is(stringifyRJSONFromConsumer(consumeExtJSON({input: 'true'})), 'true');
		t.is(stringifyRJSONFromConsumer(consumeExtJSON({input: 'false'})), 'false');
	},
);

test(
	'numbers',
	(t) => {
		t.is(stringifyRJSONFromConsumer(consumeExtJSON({input: '1'})), '1');
		t.is(stringifyRJSONFromConsumer(consumeExtJSON({input: '12'})), '12');
		t.is(stringifyRJSONFromConsumer(consumeExtJSON({input: '123'})), '123');
		t.is(stringifyRJSONFromConsumer(consumeExtJSON({input: '123.45'})), '123.45');
		t.is(
			stringifyRJSONFromConsumer(consumeExtJSON({input: '1.2341234123412341e+27'})),
			'1.2341234123412341e+27',
		);
		t.is(
			stringifyRJSONFromConsumer(consumeExtJSON({input: '1.2341234123412341E+27'})),
			'1.2341234123412341e+27',
		);
	},
);

test(
	'null',
	(t) => {
		t.is(stringifyRJSONFromConsumer(consumeExtJSON({input: 'null'})), 'null');

		const funcToNull = consumeExtJSON({input: '1'});
		funcToNull.consumer.setValue(() => {});
		t.is(stringifyRJSONFromConsumer(funcToNull), 'null');

		const undefinedToNull = consumeExtJSON({input: '1'});
		undefinedToNull.consumer.setValue(undefined);
		t.is(stringifyRJSONFromConsumer(undefinedToNull), 'null');

		const NaNToNull = consumeExtJSON({input: '1'});
		NaNToNull.consumer.setValue(NaN);
		t.is(stringifyRJSONFromConsumer(NaNToNull), 'NaN');
	},
);

test(
	'objects',
	(t) => {
		t.is(stringifyRJSONFromConsumer(consumeExtJSON({input: '{}'})), '{}');
		t.is(
			stringifyRJSONFromConsumer(consumeExtJSON({input: '{"foo":"bar"}'})),
			'foo: "bar"',
		);
		t.is(
			stringifyRJSONFromConsumer(consumeExtJSON({input: '{"foo":"bar",}'})),
			'foo: "bar"',
		);
		t.is(
			stringifyRJSONFromConsumer(
				consumeExtJSON({input: '{"foo":"bar", "bar": "foo"}'}),
			),
			'bar: "foo"\nfoo: "bar"',
		);

		// ignore functions and undefined
		const ret = consumeExtJSON({input: '{}'});
		ret.consumer.get('foo').setValue('bar');
		ret.consumer.get('func').setValue(function() {});
		ret.consumer.get('undef').setValue(undefined);
		t.is(stringifyRJSONFromConsumer(ret), 'foo: "bar"');
	},
);

const complexTest = `// root comment
/* and another!*/
foo: {
  // comment before property
  bar: {nested: true}
  great: 1.233e+58
  yes: null
}
// hello!
hello: [
  // comment before element
  "world"
  2
  3.53
]`;
test(
	'complex',
	(t) => {
		const consumer = consumeExtJSON({input: complexTest});
		t.is(stringifyRJSONFromConsumer(consumer), complexTest);
	},
);

test(
	'comments',
	(t) => {
		t.is(
			stringifyRJSONFromConsumer(consumeExtJSON({input: '// foo\ntrue'})),
			'// foo\ntrue',
		);
		t.is(
			stringifyRJSONFromConsumer(consumeExtJSON({input: 'true\n// foo'})),
			'// foo\ntrue',
		);

		//# Comments - loose

		// comments at end of object
		t.is(
			stringifyRJSONFromConsumer(
				consumeExtJSON({
					input: `{
    "foo": "bar",
    // end comment
  }`,
				}),
			),
			'foo: "bar"\n// end comment',
		);
		// comments at end of array
		t.is(
			stringifyRJSONFromConsumer(
				consumeExtJSON({
					input: `[
    "foobar",
    // end comment
  ]`,
				}),
			),
			'[\n  "foobar"\n  // end comment\n]',
		);
		// comments in empty array
		t.is(
			stringifyRJSONFromConsumer(
				consumeExtJSON({
					input: `[
    // inner comment
  ]`,
				}),
			),
			'[\n  // inner comment\n]',
		);
		// comments in empty object
		t.is(
			stringifyRJSONFromConsumer(
				consumeExtJSON({
					input: `{
    // inner comment
  }`,
				}),
			),
			'{\n  // inner comment\n}',
		);

		//# Comments - object property

		// before property
		t.is(
			stringifyRJSONFromConsumer(
				consumeExtJSON({
					input: `{
    /* bar */
    "foo": "bar",
  }`,
				}),
			),
			'/* bar */\nfoo: "bar"',
		);
		// before value
		t.is(
			stringifyRJSONFromConsumer(
				consumeExtJSON({
					input: `{
    "foo": /* bar */ "bar",
  }`,
				}),
			),
			'/* bar */\nfoo: "bar"',
		);
		// after value
		t.is(
			stringifyRJSONFromConsumer(
				consumeExtJSON({
					input: `{
    "foo": "bar" /* bar */,
  }`,
				}),
			),
			'/* bar */\nfoo: "bar"',
		);

		//# Comments - array element

		// before element
		t.is(
			stringifyRJSONFromConsumer(
				consumeExtJSON({
					input: `[
    /* bar */
    "foo",
  ]`,
				}),
			),
			'[\n  /* bar */\n  "foo"\n]',
		);
		// after value
		t.is(
			stringifyRJSONFromConsumer(
				consumeExtJSON({
					input: `[
    "foo" /* bar */,
  ]`,
				}),
			),
			'[\n  /* bar */\n  "foo"\n]',
		);
	},
);

test(
	'recursion',
	(t) => {
		t.throws(() => {
			const ret = consumeExtJSON({input: '{}'});
			const foo: Dict<unknown> = {};
			foo.bar = foo;
			ret.consumer.get('foo').setValue(foo);
			stringifyRJSONFromConsumer(ret);
		});
	},
);
