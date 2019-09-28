import { isLevelWithinThreshold, log_level } from "./level";
import { loggable_type } from "./type";
import { createLogContext } from "./context";
import { parse, Parsers } from "./parse";
import { getConfig, getDefaultConfig, LoggerConfig } from "./config";


interface Logger {
	log(loggable:any, level?:log_level, tags?:string[]) : Promise<void>;
	update(settings:Partial<LoggerConfig>) : void;
}


function getParser<P extends loggable_type>(parsers:Parsers, type:P) : parse<P>|null {
	if (type in parsers) return parsers[type] as parse<P>;
	else if (loggable_type.any in parsers) return parsers[loggable_type.any] as parse<loggable_type.any>;
	else return null;
}


function createLogger(config:LoggerConfig) : Logger {
	return {
		async log(loggable, level:log_level = log_level.notice, tags:string[] = []) : Promise<void> {
			if (!isLevelWithinThreshold(level, config.threshold)) return;

			const type = config.infer(loggable);
			const parser = getParser(config.parsers, type);

			if (parser === null) return;

			const time = (await config.time.next()).value;
			const context = createLogContext(time, level, type, tags);
			const tokens = parser(loggable, context);

			return config.handle(tokens, context);
		},
		update(settings) {
			config = getConfig(settings, config);
		}
	};
}


export default function(settings:Partial<LoggerConfig> = {}) : Logger {
	const config = getConfig(settings, getDefaultConfig());

	return createLogger(config);
}
