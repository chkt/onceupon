import { log_level } from "./level";
import { getType, inferType } from "./type";
import { nowToISO, timingFunction } from "./time";
import { parsers, Parsers } from "./parse";
import { decorateTimeLevelLog, decorateTokens } from "./decorate";
import { consoleHandler, handleLog } from "./handler";


export interface LoggerConfig {
	readonly threshold : log_level;
	readonly infer : inferType;
	readonly parsers : Parsers;
	readonly decorate : decorateTokens;
	readonly time : timingFunction;
	readonly handle : handleLog;
}


export function getDefaultConfig() : LoggerConfig {
	return {
		threshold : log_level.notice,
		infer : getType,
		parsers,
		decorate : decorateTimeLevelLog,
		time : nowToISO(),
		handle : consoleHandler,
	};
}

export function getConfig(config:Partial<LoggerConfig>, base:LoggerConfig) : LoggerConfig {
	return { ...base, ...config };
}
