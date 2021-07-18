import WritableStream = NodeJS.WritableStream;
import { log_level } from './level';
import { Log } from './context';
import { createFormatter, FormatterConfig, formatTokens } from './format';


export type handleLog = (data:Log) => Promise<void>;

type Streams = { [P in log_level] : WritableStream };

// TODO: incompatible, for use in version 2.0
interface StreamConfig extends FormatterConfig {
	readonly streams : Streams;
}

// TODO: incompatible, for use in version 2.0
interface OutErrConfig extends FormatterConfig {
	readonly out? : WritableStream;
	readonly err? : WritableStream;
}


function sendMsgToConsole(fn:(msg:string) => any, msg:string) : Promise<void> {
	return Promise.resolve(fn(msg));
}


function configuredConsoleHandler(format:formatTokens, data:Log) : Promise<void> {
	const msg = format(data.tokens);

	switch (data.context.level) {
		case log_level.fatal:
		case log_level.error : return sendMsgToConsole(console.error, msg);
		case log_level.warn : return sendMsgToConsole(console.warn, msg);
		case log_level.notice :
		case log_level.info :
		case log_level.verbose : return sendMsgToConsole(console.log, msg);
		case log_level.debug : return sendMsgToConsole(console.debug, msg);
	}

	return Promise.reject();
}

// TODO: deprecated, remove for 2.0
export function consoleHandler(data:Log) : Promise<void> {
	return configuredConsoleHandler(createFormatter(), data);
}

export function createConsoleHandler(config:FormatterConfig = {}) : handleLog {
	return configuredConsoleHandler.bind(null, createFormatter(config));
}

// TODO: incompatible, change invocation to ({ streams, ...opts }:StreamConfig) for version 2.0
export function createStreamHandler(streams:Streams, opts:FormatterConfig = {}) : handleLog {
	const format = createFormatter(opts);

	return data => {
		const msg = format(data.tokens);
		const stream = streams[data.context.level];

		return new Promise((resolve, reject) => {
			stream.write(`${ msg }\n`, err => err === undefined ? resolve() : reject());
		});
	};
}

// TODO: incompatible, change invocation to ({ out, err, ...opts }):OutErrConfig) for version 2.0
export function createOutErrHandler(out:WritableStream = process.stdout, err:WritableStream = process.stderr, opts:FormatterConfig = {}) : handleLog {
	return createStreamHandler({
		[log_level.fatal]: err,
		[log_level.error]: err,
		[log_level.warn]: err,
		[log_level.notice]: out,
		[log_level.info]: out,
		[log_level.verbose]: out,
		[log_level.debug]: out
	}, opts);
}
