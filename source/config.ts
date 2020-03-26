import { createSequencer, Sequencer } from "@chkt/continuity/dist";
import { log_level } from "./level";
import { extendTags } from "./tags";
import { getType, inferType } from "./type";
import { nowToISO, timingFunction } from "./time";
import { createLog, createLogContext, Log, LogContext, LoggableData } from "./context";
import { LogTokens } from "./token";
import { getParser, parsers, Parsers } from "./parse";
import { AggregatedContext, Aggregator, createAggregator, createNoopAggregator } from "./aggregate";
import { decorateTimeLevelLog, decorateTokens } from "./decorate";
import { consoleHandler, handleLog } from "./handler";


export interface LoggerConfig {
	readonly threshold : log_level;
	readonly tags : string;
	readonly infer : inferType;
	readonly parsers : Parsers;
	readonly decorate : decorateTokens;
	readonly time : timingFunction;
	readonly aggregate : createAggregator;
	readonly handle : handleLog;
}

type asyncTrigger = () => Promise<void>;
type enqueue = (fn:asyncTrigger) => void;

export interface LoggerHost {
	readonly config : LoggerConfig;
	readonly baseTags : ReadonlyArray<string>;
	readonly sequence : Sequencer;
	readonly queue : enqueue;
	readonly aggregate : Aggregator;
	readonly parse : parse;
	readonly parseAndHandle : parseAndHandle;
}


function createQueueHandler() : (fn:asyncTrigger) => void {
	let q:Promise<void> = Promise.resolve();

	return fn => new Promise(resolve => {
		q = q.then(() => fn().then(() => {
			resolve();
		}));
	});
}


export type parse = (loggable:any, context:LogContext) => LogTokens;
export type parseAndHandle = (this:LoggerHost, data:LoggableData) => void;

function parse(this:LoggerHost, loggable:any, context:LogContext) : LogTokens {
	const type = this.config.infer(loggable);
	const parser = getParser(this.config.parsers, type);

	return parser(loggable, context);
}

function parseAndHandle(this:LoggerHost, data:LoggableData) : void {
	const id = this.sequence.register();

	createLogContext(this, data)
		.then(async context => {
			const parser = getParser(this.config.parsers, data.type);
			const tokens = parser(data.value, context);

			await this.sequence.resolve(id);

			this.aggregate.append({ tokens, context });
		});
}

function onAggregated(queue:enqueue, config:LoggerConfig, data:Log<AggregatedContext>) : void {
	queue(() => {
		const tokens = config.decorate(data);

		return config.handle(createLog(tokens, data.context));
	});
}


export function getDefaultConfig() : LoggerConfig {
	return {
		threshold : log_level.notice,
		tags : '',
		infer : getType,
		parsers,
		decorate : decorateTimeLevelLog,
		time : nowToISO(),
		aggregate : createNoopAggregator,
		handle : consoleHandler,
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
		parse,
		parseAndHandle
	};
}

export function updateHost(config:Partial<LoggerConfig>, host:LoggerHost) : LoggerHost {
	const settings = { ...host.config, ...config };

	return {
		...host,
		config : settings,
		baseTags : extendTags([], settings.tags),
		aggregate : settings.aggregate(onAggregated.bind(null, host.queue, settings))
	};
}
