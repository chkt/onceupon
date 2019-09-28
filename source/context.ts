import { log_level } from "./level";
import { loggable_type } from "./type";


export interface LogContext {
	readonly time : string;
	readonly level : log_level;
	readonly type : loggable_type;
	readonly tags : string[];
}


export function createLogContext(time:string, level:log_level, type:loggable_type, tags:string[]) : LogContext {
	return { time, level, type, tags };
}
