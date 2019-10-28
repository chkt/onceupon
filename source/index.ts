import { isLevelWithinThreshold, log_level } from "./level";
import { loggable_type } from "./type";
import { Composition } from "./compose";
import { getDefaultConfig, getSettings, LoggerConfig, LoggerSettings } from "./config";


export interface Logger {
	message(message:string|Composition, level?:log_level, tags?:string) : Promise<void>;
	value(value:any, level?:log_level, tags?:string) : Promise<void>;
	failure(reason:any, level?:log_level, tags?:string) : Promise<void>;
	threshold(threshold:log_level) : Logger;
	settings(settings:Partial<LoggerConfig>) : Logger;
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
		async failure(reason, level = log_level.error, tags = '') {
			if (!isLevelWithinThreshold(level, settings.threshold)) return;

			return settings.parseAndHandle({
				type : typeof reason === 'string' ? loggable_type.message : settings.infer(reason),
				value : reason,
				level,
				tags
			});
		},
		threshold(threshold) {
			return createLogger(getSettings({ threshold }, settings));
		},
		settings(config) {
			return createLogger(getSettings(config, settings));
		}
	};
}


export default function(settings:Partial<LoggerConfig> = {}) : Logger {
	const config = getSettings(settings, getDefaultConfig());

	return createLogger(config);
}
