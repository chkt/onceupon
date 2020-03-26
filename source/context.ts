import { log_level } from "./level";
import { extendTags } from "./tags";
import { loggable_type } from "./type";
import { LogTokens } from "./token";
import { LoggerHost, parse } from "./config";


export interface LoggableData {
	readonly type : loggable_type;
	readonly value : any;
	readonly level : log_level;
	readonly tags : string;
}

export interface LogContext {
	readonly parse : parse;
	readonly time : string;
	readonly level : log_level;
	readonly type : loggable_type;
	readonly tags : ReadonlyArray<string>;
}

export async function createLogContext(
	host:LoggerHost,
	data:LoggableData
) : Promise<LogContext> {
	return {
		time : (await host.config.time.next()).value,
		level : data.level,
		type : data.type,
		tags : extendTags(host.baseTags, data.tags),
		parse : host.parse.bind(host)
	};
}


export interface Log<T extends LogContext> {
	readonly tokens : LogTokens;
	readonly context : T;
}

export function createLog<T extends LogContext>(tokens:LogTokens, context:T) : Log<T> {
	return { tokens, context };
}
