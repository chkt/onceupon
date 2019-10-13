import { log_level } from "./level";
import { extendTags } from "./tags";
import { getType, inferType } from "./type";
import { nowToISO, timingFunction } from "./time";
import { createLogContext, LogContext, LoggableData } from "./context";
import { LogTokens } from "./token";
import { getParser, parsers, Parsers } from "./parse";
import { decorateTimeLevelLog, decorateTokens } from "./decorate";
import { consoleHandler, handleLog } from "./handler";


export interface LoggerConfig {
	readonly threshold : log_level;
	readonly tags : string;
	readonly infer : inferType;
	readonly parsers : Parsers;
	readonly decorate : decorateTokens;
	readonly time : timingFunction;
	readonly handle : handleLog;
}


export type parse = (loggable:any, context:LogContext) => LogTokens;
export type parseAndHandle = (this:LoggerSettings, data:LoggableData) => Promise<void>;

export interface LoggerSettings extends LoggerConfig {
	readonly baseTags : string[];
	readonly parse : parse;
	readonly parseAndHandle : parseAndHandle;
}


function parse(this:LoggerSettings, loggable:any, context:LogContext) : LogTokens {
	const type = this.infer(loggable);
	const parser = getParser(this.parsers, type);

	return parser(loggable, context);
}

async function parseAndHandle(this:LoggerSettings, data:LoggableData) : Promise<void> {
	const parser = getParser(this.parsers, data.type);
	const context = await createLogContext(this, data);
	const tokens = this.decorate(parser(data.value, context), context);

	return this.handle(tokens, context);
}


export function getDefaultConfig() : LoggerConfig {
	return {
		threshold : log_level.notice,
		tags : '',
		infer : getType,
		parsers,
		decorate : decorateTimeLevelLog,
		time : nowToISO(),
		handle : consoleHandler,
	};
}

export function getSettings(config:Partial<LoggerConfig>, base:LoggerConfig) : LoggerSettings {
	const settings = { ...base, ...config};

	return {
		...settings,
		baseTags : extendTags([], settings.tags),
		parse,
		parseAndHandle
	};
}
