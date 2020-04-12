import { isLevelWithinThreshold, log_level } from "./level";
import { loggable_type } from "./type";
import { Composition } from "./compose";
import { createHost, getDefaultConfig, LoggerConfig, LoggerHost, updateHost } from "./config";


export interface Logger {
	message(message:string|Composition, level?:log_level, tags?:string) : Logger;
	value(value:any, level?:log_level, tags?:string) : Logger;
	failure(reason:any, level?:log_level, tags?:string) : Logger;
	threshold(threshold:log_level) : Logger;
	settings(settings:Partial<LoggerConfig>) : Logger;
	settle() : Promise<void>;
}


function getLogger(host:LoggerHost) : Logger {
	return {
		message(message, level = log_level.notice, tags = '') {
			if (isLevelWithinThreshold(level, host.config.threshold)) {
				host.parseAndHandle({
					type : typeof message === 'string' ? loggable_type.message : loggable_type.composition,
					value : message,
					level,
					tags
				});
			}

			return this;
		},
		value(value, level = log_level.notice, tags = '') {
			if (isLevelWithinThreshold(level, host.config.threshold)) {
				host.parseAndHandle({
					type : host.config.infer(value),
					value,
					level,
					tags
				});
			}

			return this;
		},
		failure(reason, level = log_level.error, tags = '') {
			if (isLevelWithinThreshold(level, host.config.threshold)) {
				host.parseAndHandle({
					type : typeof reason === 'string' ? loggable_type.message : host.config.infer(reason),
					value : reason,
					level,
					tags
				});
			}

			return this;
		},
		threshold(threshold) {
			return getLogger(updateHost({ threshold }, host));
		},
		settings(config) {
			return getLogger(updateHost(config, host));
		},
		settle() {
			const id = host.sequence.register();

			return new Promise(async resolve => {
				await host.sequence.resolve(id);

				host.aggregate.flush();
				host.queue(() => {
					resolve();

					return Promise.resolve();
				});
			});
		}
	};
}

export function createLogger(settings:Partial<LoggerConfig> = {}) : Logger {
	const config = createHost(settings, getDefaultConfig());

	return getLogger(config);
}
