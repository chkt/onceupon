import { isLevelWithinThreshold, log_level } from "./level";
import { loggable_type } from "./type";
import { Composition } from "./compose";
import { getDefaultConfig, getSettings, LoggerConfig, LoggerSettings } from "./config";


export interface Logger {
	message(message:string|Composition, level?:log_level, tags?:string) : Promise<void>;
	value(value:any, level?:log_level, tags?:string) : Promise<void>;
	update(settings:Partial<LoggerConfig>) : void;
}


function createLogger(settings:LoggerSettings) : Logger {
	return {
		async message(message, level = log_level.notice, tags = '') {
			if (!isLevelWithinThreshold(level, settings.threshold)) return;

			return settings.parseAndHandle({
				type : typeof message === 'string' ? loggable_type.message : loggable_type.composition,
				value : message,
				level,
				tags
			});
		},
		async value(value, level = log_level.notice, tags = '') {
			if (!isLevelWithinThreshold(level, settings.threshold)) return;

			return settings.parseAndHandle({
				type : settings.infer(value),
				value,
				level,
				tags
			});
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
