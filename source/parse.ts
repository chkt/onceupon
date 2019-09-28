import { getNameOfLevel } from "./level";
import { loggable_type } from "./type";
import { LogContext } from "./context";
import { createToken, LogTokens, token_type } from "./token";


export interface TypeMap {
	readonly [ loggable_type.any ] : any;
	readonly [ loggable_type.other] : any;
	readonly [ loggable_type.undefined ] : undefined;
	readonly [ loggable_type.null ] : null;
	readonly [ loggable_type.boolean ] : boolean;
	readonly [ loggable_type.number ] : number;
	readonly [ loggable_type.bigint ] : bigint;
	readonly [ loggable_type.string ] : string;
	readonly [ loggable_type.symbol ] : symbol;
	readonly [ loggable_type.function ] : (...args:any[]) => any;
	readonly [ loggable_type.error ] : Error;
	readonly [ loggable_type.array ] : any[];
	readonly [ loggable_type.object ] : object;
}

export type parse<P extends loggable_type, T = TypeMap[P]> = (loggable:T, context:LogContext) => LogTokens;
export type Parsers = { [P in loggable_type]? : parse<P> };


export const parsers:Parsers = {
	[loggable_type.string] : (message, context) : LogTokens => [
		createToken(token_type.time, context.time),
		createToken(token_type.level, getNameOfLevel(context.level)),
		createToken(token_type.message, message)
	]
};
