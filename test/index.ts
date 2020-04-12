import * as assert from 'assert';
import { describe, it } from 'mocha';

import { Writable } from 'stream';
import { loggable_type } from "../source/type";
import { compose } from "../source/compose";
import { Log, LogContext } from "../source/context";
import { createToken, LogTokens, token_type } from "../source/token";
import { AggregatedContext, createTLAggregator } from "../source/aggregate";
import { createOutErrHandler } from "../source/handler";
import { createLogger, log_level } from '../source';


class MockStream extends Writable {
	public out : { chunk : any, encoding : string}[] = [];

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


function getIncrement() {
	let i = 0;

	return () => Promise.resolve(String(++i));
}

function tokensToString(tokens:LogTokens) {
	let res:string = '';

	for (const token of tokens) res += token.content + ' ';

	return res.substring(0, res.length - 1);
}

async function handle(this:string[], data:Log<AggregatedContext>) : Promise<void> {
	this.push(tokensToString(data.tokens));
}


describe('onceupon', () => {
	it('should create a logger instance', () => {
		const log = createLogger();

		assert(typeof log === 'object');
		assert('message' in log);
		assert(typeof log.message === 'function');
		assert('value' in log);
		assert(typeof log.value === 'function');
		assert('threshold' in log);
		assert(typeof log.threshold === 'function');
		assert('settings' in log);
		assert(typeof log.settings === 'function');
		assert('settle' in log);
		assert(typeof log.settle === 'function');
	});

	it('should log a string message to console', async () => {
		const log = createLogger();
		const msg = await mockConsole('log', () => log.message('foo').settle());

		assert(msg.search(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z notice\s{2}foo$/) === 0);
	});

	it('should allow arbitrary time sources', async () => {
		const log = createLogger({
			time : getIncrement()
		});

		const msg = await mockConsole('log', () => log.message('foo').settle());

		assert.strictEqual(msg, '1 notice  foo');
	});

	it('should allow arbitrary handlers', async () => {
		const msg:string[] = [];
		const log = createLogger({
			time : getIncrement(),
			handle : handle.bind(msg)
		});

		await log
			.message('foo')
			.settle();

		assert.deepStrictEqual(msg, [
			'1 notice foo'
		]);
	});

	it ('should allow arbitrary parsers', async () => {
		const msg:string[] = [];
		const log = createLogger({
			time : getIncrement(),
			parsers : {
				[ loggable_type.string ] : message => [ createToken(token_type.message_fragment, message) ]
			},
			handle : async (data:Log<AggregatedContext>) => {
				msg.push(tokensToString(data.tokens));
			}
		});

		await log
			.value('foo')
			.value(1)
			.settle();

		assert.deepStrictEqual(msg, [
			'1 notice foo',
			'2 notice <NOPARSE|fnum>'
		]);
	});

	it('should log a string message to the assigned console method', async () => {
		const msg:string[] = [];

		const log = createLogger({
			threshold : log_level.debug,
			time : getIncrement()
		});

		msg.push(await mockConsole('debug', () => log.message('foo', log_level.debug).settle()));
		msg.push(await mockConsole('log', () => log.message('bar', log_level.verbose).settle()));
		msg.push(await mockConsole('log', () => log.message('baz', log_level.info).settle()));
		msg.push(await mockConsole('log', () => log.message('qux', log_level.notice).settle()));
		msg.push(await mockConsole('warn', () => log.message('bang', log_level.warn).settle()));
		msg.push(await mockConsole('error', () => log.message('bam', log_level.error).settle()));
		msg.push(await mockConsole('error', () => log.message('aarg', log_level.fatal).settle()));

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
		const log = createLogger({
			time : getIncrement(),
			threshold : log_level.debug,
			handle : createOutErrHandler(out, err)
		});

		await log
			.message('foo', log_level.debug)
			.message('bar', log_level.verbose)
			.message('baz', log_level.info)
			.message('qux', log_level.notice)
			.message('bang', log_level.warn)
			.message('bam', log_level.error)
			.message('aarg', log_level.fatal)
			.settle();

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
		const log = createLogger({
			time : getIncrement(),
			handle : handle.bind(msg),
			threshold : log_level.warn
		});

		await log
			.message('foo', log_level.notice)
			.value('bar', log_level.notice)
			.message('baz', log_level.warn)
			.value('qux', log_level.warn)
			.threshold(log_level.notice)
			.message('fox', log_level.notice)
			.value('bax', log_level.notice)
			.message('arg', log_level.info)
			.value('barg', log_level.info)
			.settings({ threshold : log_level.info })
			.message('arr', log_level.info)
			.value('err', log_level.info)
			.settle();

		assert.deepStrictEqual(msg, [
			'1 warn baz',
			'2 warn qux',
			'3 notice fox',
			'4 notice bax',
			'5 info arr',
			'6 info err'
		]);
	});

	it ('should infer basic object types', async () => {
		const msg:string[] = [];
		const log = createLogger({
			handle : handle.bind(msg),
			parsers : {
				[ loggable_type.any] : (loggable:any, context:LogContext) : LogTokens => [
					createToken(token_type.message_fragment, context.type)
				]
			},
			decorate : data => data.tokens
		});

		await log
			.value(undefined)
			.value(null)
			.value(true)
			.value(1)
			// @ts-ignore
			.value(1n)
			.value('1')
			.value(Symbol('1'))
			.value(() => undefined)
			.value([1, 2, 3])
			.value({ foo : 1 })
			.value(new Error())
			.settle();

		assert.deepStrictEqual(msg, [
			loggable_type.undefined, loggable_type.null,
			loggable_type.boolean, loggable_type.number, loggable_type.bigint,
			loggable_type.string, loggable_type.symbol,
			loggable_type.function, loggable_type.array, loggable_type.object, loggable_type.error
		]);
	});

	it('should decorate with tags', async () => {
		const msg:string[] = [];
		const log = createLogger({
			time : getIncrement(),
			handle : handle.bind(msg)
		});

		await log
			.message('foo', log_level.notice, 'bar')
			.message('foo', log_level.notice, 'bar baz')
			.settle();

		assert.deepStrictEqual(msg, [
			'1 notice foo bar',
			'2 notice foo bar baz'
		]);
	});

	it('should decorate with default tags', async () => {
		const msg:string[] = [];
		const log = createLogger({
			tags : 'quux',
			time : getIncrement(),
			handle : handle.bind(msg)
		});

		await log
			.message('foo', log_level.notice)
			.message('foo', log_level.notice, 'bar')
			.message('foo', log_level.notice, 'bar baz')
			.message('foo', log_level.notice, 'baz quux')
			.settle();

		assert.deepStrictEqual(msg, [
			'1 notice foo quux',
			'2 notice foo quux bar',
			'3 notice foo quux bar baz',
			'4 notice foo quux baz'
		]);
	});

	it('should format tags when using the default handler', async () => {
		const msg:string[] = [];
		const log = createLogger({
			tags : 'baz quux',
			time : getIncrement()
		});

		msg.push(await mockConsole('log', () => log.message('foo').settle()));
		msg.push(await mockConsole('log', () => log.message('foo', log_level.notice, 'bar baz').settle()));

		assert.deepStrictEqual(msg, [
			'1 notice  foo .:baz:quux',
			'2 notice  foo .:baz:quux:bar'
		]);
	});

	it ('should treat strings as messages when using the failure reporter', async () => {
		const msg:string[] = [];
		const log = createLogger({
			time : getIncrement()
		});

		msg.push(await mockConsole('error', () => log.failure('because I say so').settle()));
		msg.push(await mockConsole('error', () => log.failure(compose`this is a failure, ${ 'foo' }`).settle()));

		assert.deepStrictEqual(msg, [
			'1 error   because I say so',
			'2 error   this is a failure, \'foo\''
		]);
	});

	it('should sustain the sequence of logger calls', async() => {
		function delay() {
			let i = 0;
			const delays = [ 100, 10 ];

			function sleep(ms:number) : Promise<void> {
				return new Promise(resolve => {
					setTimeout(resolve, ms);
				});
			}

			return () => {
				const n = i++;
				const d = delays[n % delays.length];

				return sleep(d).then(() => String(d));
			}
		}

		const msg:string[] = [];
		const log = createLogger({
			time : delay(),
			handle : handle.bind(msg)
		});

		await log
			.message('foo')
			.message('bar')
			.settle();

		assert.deepStrictEqual(msg, [
			'100 notice foo',
			'10 notice bar'
		]);
	});

	it('should aggregate message floods when using an aggregator', async () => {
		const msg:string[] = [];
		const log = createLogger({
			threshold : log_level.info,
			time : getIncrement(),
			aggregate : createTLAggregator,
			handle : handle.bind(msg)
		});

		await log
			.message('foo')
			.message('foo')
			.message('foo', log_level.info)
			.message('foo', log_level.info)
			.message('bar', log_level.info)
			.message('bar')
			.settle();

		assert.deepStrictEqual(msg, [
			'1 notice foo',
			'3 info foo',
			'5 info bar',
			'6 notice bar'
		]);
	});
});
