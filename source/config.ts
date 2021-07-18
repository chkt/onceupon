import { createSequencer, Sequencer } from '@chkt/continuity';
import { log_level } from './level';
import { extendTags } from './tags';
import { getTime, nowToUtcIso } from './time';
import { getType, inferType } from './type';
import { createLog, createLogContext, Log, LoggableData } from './context';
import { createParseConfig, createParseHost, getParser, ParseConfig, ParseHost, parsers, Parsers } from './parse';
import { Aggregator, attachEmitter } from './aggregate';
import { createNoopAggregator } from './aggregator/noop';
import { decorateTimeLevelLog, decorateTokens } from './decorate';
import { createConsoleHandler, handleLog } from './handler';


export interface LoggerConfig extends ParseConfig {
	readonly threshold : log_level;
	readonly tags : string;
	readonly infer : inferType;
	readonly parsers : Parsers;
	readonly decorate : decorateTokens;
	readonly time : getTime;
	readonly aggregate : attachEmitter;
	readonly handle : handleLog;
}

type asyncTrigger = () => Promise<void>;
type enqueue = (fn:asyncTrigger) => void;
type parseAndHandle = (this:LoggerHost, data:LoggableData) => void;

export interface LoggerHost {
	readonly config : LoggerConfig;
	readonly baseTags : ReadonlyArray<string>;
	readonly sequence : Sequencer;
	readonly queue : enqueue;
	readonly aggregate : Aggregator;
	readonly parser : ParseHost;
	readonly parseAndHandle : parseAndHandle;
}


function createQueueHandler() : (fn:asyncTrigger) => void {
	let q:Promise<void> = Promise.resolve();

	return fn => new Promise(resolve => {
		q = q.then(() => fn().then(resolve));
	});
}


function parseAndHandle(this:LoggerHost, data:LoggableData) : void {
	const id = this.sequence.register();

	createLogContext(this, data)
		.then(context => {
			this.sequence.schedule(id, () => {
				const tokens = this.parser.parse(data, context);

				this.aggregate.append(createLog(tokens, context));
			});
		});
}


function onAggregated(queue:enqueue, config:LoggerConfig, data:Log) : void {
	queue(() => {
		const tokens = config.decorate(data);

		return config.handle(createLog(tokens, data.context));
	});
}


export function getDefaultConfig() : LoggerConfig {
	return {
		threshold : log_level.notice,
		tags : '',
		maxDepth : Number.MAX_SAFE_INTEGER,
		maxBytes : Number.MAX_SAFE_INTEGER,
		tailBytes : 16,
		infer : getType,
		parsers,
		decorate : decorateTimeLevelLog,
		time : nowToUtcIso,
		aggregate : createNoopAggregator(),
		handle : createConsoleHandler()
	};
}

export function createHost(config:Partial<LoggerConfig>, base:LoggerConfig) : LoggerHost {
	const settings = { ...base, ...config};
	const queue = createQueueHandler();

	return {
		config : settings,
		baseTags : extendTags([], settings.tags),
		sequence : createSequencer(),
		queue,
		aggregate : settings.aggregate(onAggregated.bind(null, queue, settings)),
		parser : createParseHost(
			createParseConfig(settings),
			settings.infer,
			type => getParser(settings.parsers, type)
		),
		parseAndHandle
	};
}

export function updateHost(config:Partial<LoggerConfig>, host:LoggerHost) : LoggerHost {
	const settings = { ...host.config, ...config };

	return {
		...host,
		config : settings,
		baseTags : extendTags([], settings.tags),
		aggregate : settings.aggregate(onAggregated.bind(null, host.queue, settings)),
		parser : createParseHost(
			createParseConfig(settings),
			settings.infer,
			type => getParser(settings.parsers, type)
		)
	};
}
