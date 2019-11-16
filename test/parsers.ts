import * as assert from 'assert';
import { describe, it } from 'mocha';

import logger from '../source';
import { tokensToString } from "../source/format";
import { compose } from "../source/compose";


async function* getIncrement() {
	let i = 0;

	while (true) yield String(++i);
}


describe('onceupon', () => {
	it ('should log null and undefined', async () => {
		const msgs:string[] = [];
		const log = logger({
			tags : 'foo bar',
			time : getIncrement(),
			handle : async tokens => {
				msgs.push(tokensToString(tokens));
			}
		});

		await log.value(undefined);
		await log.value(null);

		assert.deepStrictEqual(msgs, [
			'1 notice  undefined .:foo:bar',
			'2 notice  null .:foo:bar'
		]);
	});

	it ('should log booleans', async () => {
		const msgs:string[] = [];
		const log = logger({
			tags : 'foo bar',
			time : getIncrement(),
			handle : async tokens => {
				msgs.push(tokensToString(tokens));
			}
		});

		await log.value(true);
		await log.value(false);

		assert.deepStrictEqual(msgs, [
			'1 notice  true .:foo:bar',
			'2 notice  false .:foo:bar'
		]);
	});

	it ('should log numbers', async () => {
		const msgs:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : async tokens => {
				msgs.push(tokensToString(tokens));
			}
		});

		await log.value(0);
		await log.value(1);
		await log.value(Number.MAX_SAFE_INTEGER);
		await log.value(Number.MIN_SAFE_INTEGER);
		await log.value(Number.MAX_SAFE_INTEGER + 1);
		await log.value(Number.MIN_SAFE_INTEGER - 1);
		await log.value(999999999.9);
		await log.value(-999999999.9);
		await log.value(1000000000.1);
		await log.value(-1000000000.1);
		await log.value(0.000001);
		await log.value(-0.000001);
		await log.value(0.0000009);
		await log.value(-0.0000009);
		await log.value(NaN);
		await log.value(Number.POSITIVE_INFINITY);
		await log.value(Number.NEGATIVE_INFINITY);

		assert.deepStrictEqual(msgs, [
			'1 notice  0',
			'2 notice  1',
			`3 notice  ${ Number.MAX_SAFE_INTEGER.toString() }`,
			`4 notice  ${ Number.MIN_SAFE_INTEGER.toString() }`,
			`5 notice  ${ (Number.MAX_SAFE_INTEGER + 1).toExponential() }`,
			`6 notice  ${ (Number.MIN_SAFE_INTEGER - 1).toExponential() }`,
			'7 notice  999999999.9',
			'8 notice  -999999999.9',
			'9 notice  1.0000000001e+9',
			'10 notice  -1.0000000001e+9',
			'11 notice  0.000001',
			'12 notice  -0.000001',
			'13 notice  9e-7',
			'14 notice  -9e-7',
			'15 notice  NaN',
			'16 notice  +Infinity',
			'17 notice  -Infinity'
		]);
	});

	it ('should log strings', async () => {
		const msgs:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : async tokens => {
				msgs.push(tokensToString(tokens));
			}
		});

		await log.value('foo');
		await log.value('foo "bar"');
		await log.value("foo 'bar'");
		await log.value('foo "bar" \'baz\'');
		await log.value("foo 'bar' \"baz\"");
		await log.value('foo "bar" \'\\\'\\\\\'');

		assert.deepStrictEqual(msgs, [
			`1 notice  'foo'`,
			`2 notice  'foo "bar"'`,
			`3 notice  "foo 'bar'"`,
			`4 notice  'foo "bar" \\'baz\\''`,
			`5 notice  'foo \\'bar\\' "baz"'`,
			`6 notice  'foo "bar" \\\'\\\'\\\\\\\''`
		]);
	});

	it('should log objects', async () => {
		const msgs:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : async tokens => {
				msgs.push(tokensToString(tokens));
			}
		});

		await log.value({ foo : false, bar : 1, baz : { qux : '1'} });

		assert.deepStrictEqual(msgs, [
			'1 notice  {\n\tfoo : false,\n\tbar : 1,\n\tbaz : {\n\t\tqux : \'1\'\n\t}\n}'
		]);
	});

	it('should log v8 errors', async () => {
		const msgs:string[] = [];
		const log = logger({
			time: getIncrement(),
			handle: async tokens => {
				msgs.push(tokensToString(tokens));
			}
		});

		class V8Error extends Error {
			public stack : string;

			constructor(message:string, stack:string) {
				super(message);

				this.stack = stack;
			}
		}

		await log.value(new V8Error('foo', 'V8Error: foo\n    at fn (/path/to/file:1:2)'));
		await log.value(new V8Error('bar', 'V8Error: bar\n    at SomeClass.method [as methodName] (/path/to/file:10:20)'));
		await log.value(new V8Error('baz', 'V8Error: baz\n    at new SomeClass (/path/to/file:12:34)'));
		await log.value(new V8Error('qux', 'V8Error: qux\n    at nativeOp (native)'));
		await log.value(new V8Error('fox', 'V8Error: fox\n    at <anonymous> (unknown location)'));
		await log.value(new V8Error('bax', 'V8Error: bax\n    at SomeClass.method (eval at SomeClass.other (eval at <anonymous> (/path/to/file:42:23)))'));

		assert.deepStrictEqual(msgs, [
			'1 notice  Error:V8Error \'foo\' @/path/to/file 1:2',
			'2 notice  Error:V8Error \'bar\' @/path/to/file 10:20',
			'3 notice  Error:V8Error \'baz\' @/path/to/file 12:34',
			'4 notice  Error:V8Error \'qux\' @native ?:?',
			'5 notice  Error:V8Error \'fox\' @unknown location ?:?',
			'6 notice  Error:V8Error \'bax\' @/path/to/file 42:23'
		]);
	});

	it('should log errors with file information', async () => {
		const msgs:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : async tokens => {
				msgs.push(tokensToString(tokens));
			}
		});

		// tslint:disable-next-line:max-classes-per-file
		class FileInfoError extends Error {
			public fileName : string;
			public lineNumber : string;
			public columnNumber : string;

			constructor(message:string, file:string, line:string, col:string) {
				super(message);

				this.name = 'SomeError';
				this.fileName = file;
				this.lineNumber = line;
				this.columnNumber = col;
			}
		}

		await log.value(new FileInfoError('foo', 'path/to/file', '1', '13'));

		assert.deepStrictEqual(msgs, [
			'1 notice  SomeError:FileInfoError \'foo\' @path/to/file 1:13'
		]);
	});

	it('should log errors with firefox-like stack traces', async () => {
		const msgs:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : async tokens => {
				msgs.push(tokensToString(tokens));
			}
		});

		// tslint:disable-next-line:max-classes-per-file
		class FFStackError extends Error {
			public name : string;
			public stack : string;

			constructor(message:string, stack:string) {
				super(message);

				this.name = 'FFStackError';
				this.stack = stack;
			}
		}

		await log.value(new FFStackError('bang', 'foo@path/to/file:23:42\n@path/to/other:1:13'));
		await log.value(new FFStackError('bang', '@path/to/file line 23 > eval:1:1\n@path/to/file:23:42'));
		await log.value(new FFStackError('bang', '    foo@path/to/file:23:42    '));

		assert.deepStrictEqual(msgs, [
			'1 notice  FFStackError \'bang\' @path/to/file 23:42',
			'2 notice  FFStackError \'bang\' @path/to/file line 23 > eval 1:1',
			'3 notice  FFStackError \'bang\' @path/to/file 23:42'
		]);
	});

	it ('should report unsolvable traces', async () => {
		const msgs:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : async tokens => {
				msgs.push(tokensToString(tokens));
			}
		});

		// tslint:disable-next-line:max-classes-per-file
		class OddTraceError extends Error {
			public stack : string;

			constructor(message:string, stack:string) {
				super(message);

				this.stack = stack;
			}
		}

		await log.value(new OddTraceError('foo', '  1:23 /path/to/file foo  '));

		assert.deepStrictEqual(msgs, [
			'1 notice  Error:OddTraceError \'foo\' <ODDTRACE|  1:23 /path/to/file foo  >'
		]);
	});

	it('should log arrays', async () => {
		const msgs:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : async tokens => {
				msgs.push(tokensToString(tokens));
			}
		});

		await log.value([ true, 1, 'foo' ]);

		assert.deepStrictEqual(msgs, [
			'1 notice  [\n\ttrue,\n\t1,\n\t\'foo\'\n]'
		]);
	});

	it('should log compositions', async () => {
		const msgs:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : async tokens => {
				msgs.push(tokensToString(tokens));
			}
		});

		await log.value(compose`foo ${ 'bar' }`);

		assert.deepStrictEqual(msgs, [
			'1 notice  foo \'bar\''
		]);
	});
});
