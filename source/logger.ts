import { isLevelWithinThreshold, log_level } from './level';
import { loggable_type } from './type';
import { Composition } from './compose';
import { createLog, createLogContext, Log } from './context';
import { createHost, getDefaultConfig, LoggerConfig, LoggerHost, updateHost } from './config';


interface ParseOptions {
	readonly level? : log_level;
	readonly tags? : string;
	readonly stringAsMessage? : boolean;
}

export interface Logger {
	message(message:string|Composition, level?:log_level, tags?:string) : Logger;
	value(value:any, level?:log_level, tags?:string) : Logger;
	failure(reason:any, level?:log_level, tags?:string) : Logger;
	threshold(threshold:log_level) : Logger;
	settings(settings:Partial<LoggerConfig>) : Logger;
	create(value:any, options?:ParseOptions) : Promise<Log>;
	submit(data:Log) : Logger;
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
		async create(value, options= {}) {
			const data = {
				type : typeof value === 'string' && (options.stringAsMessage ?? false) ? loggable_type.message : host.config.infer(value),
				value,
				level : options.level ?? log_level.notice,
				tags : options.tags ?? ''
			};

			const context = await createLogContext(host, data);

			return createLog(host.parser.parse(data, context), context);
		},
		submit(log) {
			if (isLevelWithinThreshold(log.context.level, host.config.threshold)) {
				host.sequence.schedule(host.sequence.register(), () => {
					host.aggregate.append(log);
				});
			}

			return this;
		},
		settle() {
			return host.sequence
				.immediate()
				.then(() => new Promise(resolve => {
					host.aggregate.flush();
					host.queue(async () => {
						resolve();
					});
				}));
		}
	};
}

export function createLogger(settings:Partial<LoggerConfig> = {}) : Logger {
	const config = createHost(settings, getDefaultConfig());

	return getLogger(config);
}
