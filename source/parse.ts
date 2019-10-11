import { loggable_type } from "./type";
import { LogContext } from "./context";
import { createToken, LogTokens, token_type } from "./token";
import { parseFail } from "./failure";


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
	[loggable_type.string] : message => [ createToken(token_type.message, message) ]
};


export function getParser<P extends loggable_type>(parserCollection:Parsers, type:P) : parse<P> {
	if (type in parserCollection) return parserCollection[type] as parse<P>;
	else if (loggable_type.any in parserCollection) return parserCollection[loggable_type.any] as parse<loggable_type.any>;
	else return parseFail.bind(null, type);
}
