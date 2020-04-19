import { log_level } from './level';
import { extendTags } from './tags';
import { loggable_type } from './type';
import { LogTokens } from './token';
import { LoggerHost } from './config';


export interface LoggableData {
	readonly type : loggable_type;
	readonly value : any;
	readonly level : log_level;
	readonly tags : string;
}

export interface LogContext {
	readonly count : number;
	readonly from : string;
	readonly to : string;
	readonly level : log_level;
	readonly tags : ReadonlyArray<string>;
	readonly type : loggable_type;
}

export interface Log {
	readonly tokens : LogTokens;
	readonly context : LogContext;
}


export async function createLogContext(
	host:LoggerHost,
	data:LoggableData
) : Promise<LogContext> {
	const now = await host.config.time();

	return {
		count : 1,
		from : now,
		to : now,
		level : data.level,
		tags : extendTags(host.baseTags, data.tags),
		type : data.type
	};
}

export function createLog(tokens:LogTokens, context:LogContext) : Log {
	return { tokens, context };
}
