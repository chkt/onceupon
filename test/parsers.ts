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
