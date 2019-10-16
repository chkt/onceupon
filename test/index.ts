import * as assert from 'assert';
import { describe, it } from 'mocha';

import { Writable } from 'stream';
import { log_level } from "../source/level";
import { loggable_type } from "../source/type";
import { compose } from "../source/compose";
import { LogContext } from "../source/context";
import { createToken, LogTokens, token_type } from "../source/token";
import logger from '../source';
import { createOutErrHandler } from "../source/handler";


class MockStream extends Writable {
	public out : Array<{ chunk : any, encoding : string}> = [];

	public _write(chunk:any, encoding:string, cb?:(err?:Error) => void) : void {
		if (chunk instanceof Buffer) this.out.push({ chunk : chunk.toString(), encoding });
		else this.out.push({ chunk, encoding });

		if (cb !== undefined) cb();
	}
}

async function mockConsole(prop:'debug'|'log'|'warn'|'error', op:() => Promise<void>) : Promise<string> {
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
		assert('message' in log);
		assert(typeof log.message === 'function');
		assert('value' in log);
		assert(typeof log.value === 'function');
		assert('update' in log);
		assert(typeof log.update === 'function');
	});

	it('should log a string message to console', async () => {
		const log = logger();
		const msg = await mockConsole('log', () => {
			return log.message('foo');
		});

		assert(msg.search(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z notice\s{2}foo$/) === 0);
	});

	it('should allow arbitrary time sources', async () => {
		const log = logger({
			time : getIncrement()
		});
		const msg = await mockConsole('log', () => {
			return log.message('foo');
		});

		assert.strictEqual(msg, '1 notice  foo');
	});

	it('should allow arbitrary handlers', async () => {
		let msg:string = '';
		const log = logger({
			time : getIncrement(),
			handle : async (tokens:LogTokens) => {
				msg = tokensToString(tokens);
			}
		});

		await log.message('foo');

		assert.strictEqual(msg, '1 notice foo');
	});

	it ('should allow arbitrary parsers', async () => {
		const msgs:string[] = [];
		const log = logger({
			time : getIncrement(),
			parsers : {
				[ loggable_type.string ] : message => [ createToken(token_type.message_fragment, message) ]
			},
			handle : async (tokens:LogTokens) => {
				msgs.push(tokensToString(tokens));
			}
		});

		await log.value('foo');
		await log.value(1);

		assert.deepStrictEqual(msgs, [
			'1 notice foo',
			'2 notice <NOPARSE fnum>'
		]);
	});

	it('should log a string message to the assigned console method', async () => {
		const msg:string[] = [];

		const log = logger({
			threshold : log_level.debug,
			time : getIncrement()
		});

		msg.push(await mockConsole('debug', () => log.message('foo', log_level.debug)));
		msg.push(await mockConsole('log', () => log.message('bar', log_level.verbose)));
		msg.push(await mockConsole('log', () => log.message('baz', log_level.info)));
		msg.push(await mockConsole('log', () => log.message('qux', log_level.notice)));
		msg.push(await mockConsole('warn', () => log.message('bang', log_level.warn)));
		msg.push(await mockConsole('error', () => log.message('bam', log_level.error)));
		msg.push(await mockConsole('error', () => log.message('aarg', log_level.fatal)));

		assert.deepStrictEqual(msg, [
			'1 debug   foo',
			'2 verbose bar',
			'3 info    baz',
			'4 notice  qux',
			'5 warn    bang',
			'6 error   bam',
			'7 fatal   aarg'
		]);
	});

	it('should log a string message to an arbitrarily assigned stream', async () => {
		const out = new MockStream();
		const err = new MockStream();
		const log = logger({
			time : getIncrement(),
			threshold : log_level.debug,
			handle : createOutErrHandler(out, err)
		});

		await log.message('foo', log_level.debug);
		await log.message('bar', log_level.verbose);
		await log.message('baz', log_level.info);
		await log.message('qux', log_level.notice);
		await log.message('bang', log_level.warn);
		await log.message('bam', log_level.error);
		await log.message('aarg', log_level.fatal);

		assert.deepStrictEqual(out.out, [
			{ chunk : '1 debug   foo\n', encoding : 'buffer' },
			{ chunk : '2 verbose bar\n', encoding : 'buffer' },
			{ chunk : '3 info    baz\n', encoding : 'buffer' },
			{ chunk : '4 notice  qux\n', encoding : 'buffer' },
		]);

		assert.deepStrictEqual(err.out, [
			{ chunk : '5 warn    bang\n', encoding : 'buffer' },
			{ chunk : '6 error   bam\n' , encoding : 'buffer' },
			{ chunk : '7 fatal   aarg\n', encoding : 'buffer' }
		]);
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

		await log.message('foo', log_level.notice);
		await log.value('bar', log_level.notice);
		await log.message('baz', log_level.warn);
		await log.value('qux', log_level.warn);

		log.update({ threshold : log_level.notice });

		await log.message('fox', log_level.notice);
		await log.value('bax', log_level.notice);

		assert.deepStrictEqual(msg, [
			'1 warn baz',
			'2 warn qux',
			'3 notice fox',
			'4 notice bax'
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
					createToken(token_type.message_fragment, context.type)
				]
			},
			decorate : tokens => tokens
		});

		await log.value(undefined);
		await log.value(null);
		await log.value(true);
		await log.value(1);
		// @ts-ignore
		await log.value(1n);
		await log.value('1');
		await log.value(Symbol('1'));
		await log.value(() => undefined);
		await log.value([1, 2, 3]);
		await log.value({ foo : 1 });
		await log.value(new Error());

		assert.deepStrictEqual(msg, [
			loggable_type.undefined, loggable_type.null,
			loggable_type.boolean, loggable_type.number, loggable_type.bigint,
			loggable_type.string, loggable_type.symbol,
			loggable_type.function, loggable_type.array, loggable_type.object, loggable_type.error
		]);
	});

	it('should decorate with tags', async () => {
		const msg:string[] = [];
		const log = logger({
			time : getIncrement(),
			handle : async (tokens:LogTokens) : Promise<void> => {
				msg.push(tokensToString(tokens));
			}
		});

		await log.message('foo', log_level.notice, 'bar');
		await log.message('foo', log_level.notice, 'bar baz');

		assert.deepStrictEqual(msg, [
			'1 notice foo bar',
			'2 notice foo bar baz'
		]);
	});

	it('should decorate with default tags', async () => {
		const msg:string[] = [];
		const log = logger({
			tags : 'quux',
			time : getIncrement(),
			handle : async (tokens:LogTokens) : Promise<void> => {
				msg.push(tokensToString(tokens));
			}
		});

		await log.message('foo', log_level.notice);
		await log.message('foo', log_level.notice, 'bar');
		await log.message('foo', log_level.notice, 'bar baz');
		await log.message('foo', log_level.notice, 'baz quux');

		assert.deepStrictEqual(msg, [
			'1 notice foo quux',
			'2 notice foo quux bar',
			'3 notice foo quux bar baz',
			'4 notice foo quux baz'
		]);
	});

	it('should format tags when using the default handler', async () => {
		const msg:string[] = [];
		const log = logger({
			tags : 'baz quux',
			time : getIncrement()
		});

		msg.push(await mockConsole('log', () => log.message('foo')));
		msg.push(await mockConsole('log', () => log.message('foo', log_level.notice, 'bar baz')));

		assert.deepStrictEqual(msg, [
			'1 notice  foo .:baz:quux',
			'2 notice  foo .:baz:quux:bar'
		]);
	});

	it ('should treat strings as messages when using the failure reporter', async () => {
		const msg:string[] = [];
		const log = logger({
			time : getIncrement()
		});

		msg.push(await mockConsole('error', () => log.failure('because I say so')));
		msg.push(await mockConsole('error', () => log.failure(compose`this is a failure, ${ 'foo' }`)));

		assert.deepStrictEqual(msg, [
			'1 error   because I say so',
			'2 error   this is a failure, \'foo\''
		]);
	});
});
