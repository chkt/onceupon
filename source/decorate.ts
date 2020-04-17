import { getNameOfLevel } from "./level";
import { Log } from "./context";
import { createToken, createTokens, LogTokens, token_type } from "./token";
import { AggregatedContext } from "./aggregate";


export type decorateTokens = (data:Log<AggregatedContext>) => LogTokens;


export function decorateNothing(data:Log<AggregatedContext>) : LogTokens {
	return data.tokens;
}

export function decorateTimeLevelLog(data:Log<AggregatedContext>) : LogTokens {
	return [
		createToken(token_type.time, data.context.time),
		createToken(token_type.level, getNameOfLevel(data.context.level)),
		...data.tokens,
		...createTokens(token_type.tag, data.context.tags)
	];
}

export function decorateTimeCountLevelLog(data:Log<AggregatedContext>) : LogTokens {
	return [
		createToken(token_type.time, data.context.time),
		createToken(token_type.count, data.context.count.toFixed(0)),
		createToken(token_type.level, getNameOfLevel(data.context.level)),
		...data.tokens,
		...createTokens(token_type.tag, data.context.tags)
	];
}
