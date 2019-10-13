import { log_level } from "./level";
import { extendTags } from "./tags";
import { loggable_type } from "./type";
import { LoggerSettings, parse } from "./config";


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
	readonly tags : string[];
}


export async function createLogContext(
	settings:LoggerSettings,
	data:LoggableData
) : Promise<LogContext> {
	return {
		time : (await settings.time.next()).value,
		level : data.level,
		type : data.type,
		tags : extendTags(settings.baseTags, data.tags),
		parse : settings.parse.bind(settings)
	};
}
