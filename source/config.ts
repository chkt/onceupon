import { log_level } from "./level";
import { extendTags } from "./tags";
import { getType, inferType } from "./type";
import { nowToISO, timingFunction } from "./time";
import { LogContext } from "./context";
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


export type parseTransform = (loggable:any, context:LogContext) => LogTokens;

export interface LoggerSettings extends LoggerConfig {
	readonly baseTags : string[];
	readonly parse : parseTransform;
}


function parseTransform(infer:inferType, parserCollection:Parsers, loggable:any, context:LogContext) : LogTokens {
	const type = infer(loggable);
	const parser = getParser(parserCollection, type);

	return parser(loggable, context);
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
		parse : parseTransform.bind(null, settings.infer, settings.parsers)
	};
}
