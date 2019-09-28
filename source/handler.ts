import { log_level } from "./level";
import { LogContext } from "./context";
import { LogTokens } from "./token";


export type handleLog = (tokens:LogTokens, context:LogContext) => Promise<void>;


function tokensToString(tokens:LogTokens) : string {
	let message = '';

	for (const token of tokens) message += `${ token.content } `;

	return message.slice(0, message.length - 1);
}

function sendMsg(fn:(msg:string) => any, msg:string) : Promise<void> {
	const ret = fn(msg);

	if (ret instanceof Promise) return ret.then(resolve => resolve());
	else return Promise.resolve();
}


export function consoleHandler(tokens:LogTokens, context:LogContext) : Promise<void> {
	const msg = tokensToString(tokens);

	switch (context.level) {
		case log_level.fatal:
		case log_level.error : return sendMsg(console.error, msg);
		case log_level.warn : return sendMsg(console.warn, msg);
		case log_level.notice :
		case log_level.info :
		case log_level.verbose : return sendMsg(console.log, msg);
		case log_level.debug : return sendMsg(console.debug, msg);
	}

	return Promise.reject();
}

export function stdHandler(tokens:LogTokens, context:LogContext) : Promise<void> {
	const msg = tokensToString(tokens) + '\n';

	switch (context.level) {
		case log_level.fatal :
		case log_level.error :
		case log_level.warn : return sendMsg(process.stderr.write, msg);
		case log_level.notice :
		case log_level.info :
		case log_level.verbose :
		case log_level.debug : return sendMsg(process.stdout.write, msg);
	}

	return Promise.reject();
}
