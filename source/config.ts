import { log_level } from "./level";
import { getType, inferType } from "./type";
import { nowToISO, timingFunction } from "./time";
import { parsers, Parsers } from "./parse";
import { consoleHandler, handleLog } from "./handler";


export interface LoggerConfig {
	readonly threshold : log_level;
	readonly infer : inferType;
	readonly parsers : Parsers;
	readonly time : timingFunction;
	readonly handle : handleLog;
}


export function getDefaultConfig() : LoggerConfig {
	return {
		threshold : log_level.notice,
		infer : getType,
		parsers,
		time : nowToISO(),
		handle : consoleHandler,
	};
}

export function getConfig(config:Partial<LoggerConfig>, base:LoggerConfig) : LoggerConfig {
	return { ...base, ...config };
}
