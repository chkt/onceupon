import { isLevelWithinThreshold, log_level } from "./level";
import { extendTags } from "./tags";
import { createLogContext } from "./context";
import { getParser } from "./parse";
import { getSettings, getDefaultConfig, LoggerConfig, LoggerSettings } from "./config";


export interface Logger {
	log(loggable:any, level?:log_level, tags?:string) : Promise<void>;
	update(settings:Partial<LoggerConfig>) : void;
}


function createLogger(settings:LoggerSettings) : Logger {
	return {
		async log(loggable, level:log_level = log_level.notice, tags:string = '') : Promise<void> {
			if (!isLevelWithinThreshold(level, settings.threshold)) return;

			const type = settings.infer(loggable);
			const parser = getParser(settings.parsers, type);
			const context = await createLogContext(settings, level, type, extendTags(settings.baseTags, tags));
			const tokens = settings.decorate(parser(loggable, context), context);

			return settings.handle(tokens, context);
		},
		update(config) {
			settings = getSettings(config, settings);
		}
	};
}


export default function(settings:Partial<LoggerConfig> = {}) : Logger {
	const config = getSettings(settings, getDefaultConfig());

	return createLogger(config);
}
