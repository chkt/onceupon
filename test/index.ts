import * as assert from 'assert';
import { describe, it } from 'mocha';

import { log_level } from "../source/level";
import { loggable_type } from "../source/type";
import { LogContext } from "../source/context";
import { createToken, LogTokens, token_type } from "../source/token";
import logger from '../source';


async function mockConsole(prop:'log'|'warn'|'error', op:() => Promise<void>) : Promise<string> {
	if (!(prop in console)) throw new Error('console in unknown state');

	const backup = console[prop];
	let res:string = '';

	console[prop] = (message:string) : void => {
		res = message;
	};

	await op();

	console[prop] = backup;

	return res;
}


async function* getIncrement() {
	let i = 0;

	while (true) {
		yield String(++i);
	}
}

function tokensToString(tokens:LogTokens) {
	let res:string = '';

	for (const token of tokens) res += token.content + ' ';

	return res.substring(0, res.length - 1);
}


describe('onceupon', () => {
	it('should create a logger instance', () => {
		const log = logger();

		assert(typeof log === 'object');
		assert('log' in log);
		assert(typeof log.log === 'function');
		assert('update' in log);
		assert(typeof log.update === 'function');
	});

	it('should log a string message to console', async () => {
		const log = logger();
		const msg = await mockConsole('log', () => {
			return log.log('foo');
		});

		assert(msg.search(/^\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z notice foo$/) !== 0);
	});

	it('should allow arbitrary time sources', async () => {
		const log = logger({
			time : getIncrement()
		});
		const msg = await mockConsole('log', () => {
			return log.log('foo');
		});

		assert.strictEqual(msg, '1 notice foo');
	});

	it('should allow arbitrary handlers', async () => {
		let msg:string = '';
		const log = logger({
			time : getIncrement(),
			handle : async (tokens:LogTokens) => {
				msg = tokensToString(tokens);
			}
		});

		await log.log('foo');

		assert.strictEqual(msg, '1 notice foo');
	});

	it('should silently drop logs below the threshold', async () => {
		const msg:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : async (tokens:LogTokens) => {
				msg.push(tokensToString(tokens));
			},
			threshold : log_level.warn
		});

		await log.log('foo', log_level.notice);
		await log.log('foo', log_level.warn);

		log.update({ threshold : log_level.notice });

		await log.log('foo', log_level.notice);

		assert.deepStrictEqual(msg, [
			'1 warn   foo',
			'2 notice foo'
		]);
	});

	it ('should infer basic object types', async () => {
		const msg:string[] = [];
		const log = logger({
			handle : async (tokens:LogTokens) : Promise<void> => {
				msg.push(tokensToString(tokens));
			},
			parsers : {
				[ loggable_type.any] : (loggable:any, context:LogContext) : LogTokens => [
					createToken(token_type.message, context.type)
				]
			},
			decorate : tokens => tokens
		});

		await log.log(undefined);
		await log.log(null);
		await log.log(true);
		await log.log(1);
		// @ts-ignore
		await log.log(1n);
		await log.log('1');
		await log.log(Symbol('1'));
		await log.log(() => undefined);
		await log.log([1, 2, 3]);
		await log.log({ foo : 1 });
		await log.log(new Error());

		assert.deepStrictEqual(msg, [
			loggable_type.undefined, loggable_type.null,
			loggable_type.boolean, loggable_type.number, loggable_type.bigint,
			loggable_type.string, loggable_type.symbol,
			loggable_type.function, loggable_type.array, loggable_type.object, loggable_type.error
		]);
	});
});
