import * as assert from 'assert';
import { describe, it } from 'mocha';

import logger from '../source';
import { compose } from "../source/compose";
import { Log } from "../source/context";
import { AggregatedContext } from "../source/aggregate";
import { tokensToString } from "../source/format";


async function* getIncrement() {
	let i = 0;

	while (true) yield String(++i);
}

async function handle(this:string[], data:Log<AggregatedContext>) : Promise<void> {
	this.push(tokensToString(data.tokens));
}


describe('onceupon', () => {
	it ('should log null and undefined', async () => {
		const msg:string[] = [];
		const log = logger({
			tags : 'foo bar',
			time : getIncrement(),
			handle : handle.bind(msg)
		});

		await log
			.value(undefined)
			.value(null)
			.settle();

		assert.deepStrictEqual(msg, [
			'1 notice  undefined .:foo:bar',
			'2 notice  null .:foo:bar'
		]);
	});

	it ('should log booleans', async () => {
		const msg:string[] = [];
		const log = logger({
			tags : 'foo bar',
			time : getIncrement(),
			handle : handle.bind(msg)
		});

		await log
			.value(true)
			.value(false)
			.settle();

		assert.deepStrictEqual(msg, [
			'1 notice  true .:foo:bar',
			'2 notice  false .:foo:bar'
		]);
	});

	it ('should log numbers', async () => {
		const msg:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : handle.bind(msg)
		});

		await log
			.value(0)
			.value(1)
			.value(Number.MAX_SAFE_INTEGER)
			.value(Number.MIN_SAFE_INTEGER)
			.value(Number.MAX_SAFE_INTEGER + 1)
			.value(Number.MIN_SAFE_INTEGER - 1)
			.value(999999999.9)
			.value(-999999999.9)
			.value(1000000000.1)
			.value(-1000000000.1)
			.value(0.000001)
			.value(-0.000001)
			.value(0.0000009)
			.value(-0.0000009)
			.value(NaN)
			.value(Number.POSITIVE_INFINITY)
			.value(Number.NEGATIVE_INFINITY)
			.settle();

		assert.deepStrictEqual(msg, [
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
		const msg:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : handle.bind(msg)
		});

		await log
			.value('foo')
			.value('foo "bar"')
			.value("foo 'bar'")
			.value('foo "bar" \'baz\'')
			.value("foo 'bar' \"baz\"")
			.value('foo "bar" \'\\\'\\\\\'')
			.settle();

		assert.deepStrictEqual(msg, [
			`1 notice  'foo'`,
			`2 notice  'foo "bar"'`,
			`3 notice  "foo 'bar'"`,
			`4 notice  'foo "bar" \\'baz\\''`,
			`5 notice  'foo \\'bar\\' "baz"'`,
			`6 notice  'foo "bar" \\\'\\\'\\\\\\\''`
		]);
	});

	it('should log objects', async () => {
		const msg:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : handle.bind(msg)
		});

		await log
			.value({ foo : false, bar : 1, baz : { qux : '1'} })
			.settle();

		assert.deepStrictEqual(msg, [
			'1 notice  {\n\tfoo : false,\n\tbar : 1,\n\tbaz : {\n\t\tqux : \'1\'\n\t}\n}'
		]);
	});

	it('should log v8 errors', async () => {
		const msg:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : handle.bind(msg)
		});

		class V8Error extends Error {
			public stack : string;

			constructor(message:string, stack:string) {
				super(message);

				this.stack = stack;
			}
		}

		await log
			.value(new V8Error('foo', 'V8Error: foo\n    at fn (/path/to/file:1:2)'))
			.value(new V8Error('bar', 'V8Error: bar\n    at SomeClass.method [as methodName] (/path/to/file:10:20)'))
			.value(new V8Error('baz', 'V8Error: baz\n    at new SomeClass (/path/to/file:12:34)'))
			.value(new V8Error('qux', 'V8Error: qux\n    at nativeOp (native)'))
			.value(new V8Error('fox', 'V8Error: fox\n    at <anonymous> (unknown location)'))
			.value(new V8Error('bax', 'V8Error: bax\n    at SomeClass.method (eval at SomeClass.other (eval at <anonymous> (/path/to/file:42:23)))'))
			.value(new V8Error('quz', '$ome_error: bang\n    at fn (/path/to/file:42:23)'))
			.value(new V8Error('foz', 'V8Error: foz\n   at fn (http://domain.tld/path/to/file:23:42)'))
			.settle();

		assert.deepStrictEqual(msg, [
			'1 notice  Error:V8Error \'foo\' @/path/to/file 1:2',
			'2 notice  Error:V8Error \'bar\' @/path/to/file 10:20',
			'3 notice  Error:V8Error \'baz\' @/path/to/file 12:34',
			'4 notice  Error:V8Error \'qux\' @native ?:?',
			'5 notice  Error:V8Error \'fox\' @unknown location ?:?',
			'6 notice  Error:V8Error \'bax\' @/path/to/file 42:23',
			'7 notice  Error:V8Error \'quz\' @/path/to/file 42:23',
			'8 notice  Error:V8Error \'foz\' @http://domain.tld/path/to/file 23:42'
		]);
	});

	it('should log errors with file information', async () => {
		const msg:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : handle.bind(msg)
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

		await log
			.value(new FileInfoError('foo', 'path/to/file', '1', '13'))
			.settle();

		assert.deepStrictEqual(msg, [
			'1 notice  SomeError:FileInfoError \'foo\' @path/to/file 1:13'
		]);
	});

	it('should log errors with firefox-like stack traces', async () => {
		const msg:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : handle.bind(msg)
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

		await log
			.value(new FFStackError('bang', 'foo@path/to/file:23:42\n@path/to/other:1:13'))
			.value(new FFStackError('bang', '@path/to/file line 23 > eval:1:1\n@path/to/file:23:42'))
			.value(new FFStackError('bang', '    foo@path/to/file:23:42    '))
			.value(new FFStackError('bang', 'value@http://domain.tld/path/to/file:23:42'))
			.settle();

		assert.deepStrictEqual(msg, [
			'1 notice  FFStackError \'bang\' @path/to/file 23:42',
			'2 notice  FFStackError \'bang\' @path/to/file line 23 > eval 1:1',
			'3 notice  FFStackError \'bang\' @path/to/file 23:42',
			'4 notice  FFStackError \'bang\' @http://domain.tld/path/to/file 23:42'
		]);
	});

	it ('should log errors with safari-like stack traces', async () => {
		const msg:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : handle.bind(msg)
		});

		// tslint:disable-next-line:max-classes-per-file
		class JsCoreStackError extends Error {
			public name : string;
			public stack : string;

			constructor(message:string, stack:string) {
				super(message);

				this.name = 'JsCoreStackError';
				this.stack = stack;
			}
		}

		await log
			.value(new JsCoreStackError('bang', 'foo@path/to/file:23:42\n@path/to/other:1:13'))
			.value(new JsCoreStackError('bang', 'foo@path/to/file:23:42\nbar@[native code]'))
			.value(new JsCoreStackError('bang', '    foo@path/to/file:23:42    '))
			.value(new JsCoreStackError('bang', 'foo@http://domain.tld/path/to/file:23:42'))
			.value(new JsCoreStackError('bang', 'foo@[native code]'))
			.settle();

		assert.deepStrictEqual(msg, [
			"1 notice  JsCoreStackError 'bang' @path/to/file 23:42",
			"2 notice  JsCoreStackError 'bang' @path/to/file 23:42",
			"3 notice  JsCoreStackError 'bang' @path/to/file 23:42",
			"4 notice  JsCoreStackError 'bang' @http://domain.tld/path/to/file 23:42",
			"5 notice  JsCoreStackError 'bang' @native ?:?"
		]);
	});

	it ('should report unsolvable traces', async () => {
		const msg:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : handle.bind(msg)
		});

		// tslint:disable-next-line:max-classes-per-file
		class OddTraceError extends Error {
			public stack : string;

			constructor(message:string, stack:string) {
				super(message);

				this.stack = stack;
			}
		}

		await log
			.value(new OddTraceError('foo', '  1:23 /path/to/file foo  '))
			.settle();

		assert.deepStrictEqual(msg, [
			'1 notice  Error:OddTraceError \'foo\' <ODDTRACE|  1:23 /path/to/file foo  >'
		]);
	});

	it('should log arrays', async () => {
		const msg:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : handle.bind(msg)
		});

		await log
			.value([ true, 1, 'foo' ])
			.settle();

		assert.deepStrictEqual(msg, [
			'1 notice  [\n\ttrue,\n\t1,\n\t\'foo\'\n]'
		]);
	});

	it('should log compositions', async () => {
		const msg:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : handle.bind(msg)
		});

		await log
			.value(compose`foo ${ 'bar' }`)
			.settle();

		assert.deepStrictEqual(msg, [
			'1 notice  foo \'bar\''
		]);
	});
});
