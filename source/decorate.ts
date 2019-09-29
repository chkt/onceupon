import { getNameOfLevel } from "./level";
import { LogContext } from "./context";
import { createToken, LogTokens, token_type } from "./token";


export type decorateTokens = (tokens:LogTokens, context:LogContext) => LogTokens;


export function decorateTimeLevelLog(tokens:LogTokens, context:LogContext) : LogTokens {
	return [
		createToken(token_type.time, context.time),
		createToken(token_type.level, getNameOfLevel(context.level).padEnd(6, ' ')),
		...tokens
	];
}
