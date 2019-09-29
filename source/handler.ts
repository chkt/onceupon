import WritableStream = NodeJS.WritableStream;

import { log_level } from "./level";
import { LogContext } from "./context";
import { LogTokens, token_type } from "./token";


export type handleLog = (tokens:LogTokens, context:LogContext) => Promise<void>;

type Streams = { [P in log_level] : WritableStream };


function tokensToString(tokens:LogTokens) : string {
	let message = '';

	for (const token of tokens) {
		if (token.type === token_type.level) message += token.content.padEnd(8, ' ');
		else message += `${token.content} `;
	}

	return message.slice(0, message.length - 1);
}

function sendMsgToConsole(fn:(msg:string) => any, msg:string) : Promise<void> {
	return Promise.resolve(fn(msg));
}


export function consoleHandler(tokens:LogTokens, context:LogContext) : Promise<void> {
	const msg = tokensToString(tokens);

	switch (context.level) {
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

export function createStreamHandler(streams:Streams) : handleLog {
	return (tokens, context) => {
		const msg = tokensToString(tokens);
		const stream = streams[context.level];

		return new Promise((resolve, reject) => {
			stream.write(`${ msg }\n`, err => err === undefined ? resolve() : reject());
		});
	};
}

export function createOutErrHandler(
	out:WritableStream = process.stdout,
	err:WritableStream = process.stderr
) : handleLog {
	return createStreamHandler({
		[ log_level.fatal ] : err,
		[ log_level.error ] : err,
		[ log_level.warn ] : err,
		[ log_level.notice ] : out,
		[ log_level.info ] : out,
		[ log_level.verbose ] : out,
		[ log_level.debug ] : out
	});
}
