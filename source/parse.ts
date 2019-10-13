import { loggable_type } from "./type";
import { Composition } from "./compose";
import { LogContext } from "./context";
import { LogTokens } from "./token";
import { parseFail } from "./failure";
import { parseBool, parseNumber, parseString } from "./parser/scalars";
import { parseArray, parseObject } from "./parser/object";
import { parseMessage, parseComposition } from "./parser/message";


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
	readonly [ loggable_type.composition ] : Composition;
	readonly [ loggable_type.message] : string;
}

export type parse<P extends loggable_type, T = TypeMap[P]> = (loggable:T, context:LogContext) => LogTokens;
export type Parsers = { [P in loggable_type]? : parse<P> };


export const parsers:Parsers = {
	[ loggable_type.boolean ] : parseBool,
	[ loggable_type.number ] : parseNumber,
	[ loggable_type.string ] : parseString,
	[ loggable_type.object ] : parseObject,
	[ loggable_type.array ] : parseArray,
	[ loggable_type.message ] : parseMessage,
	[ loggable_type.composition ] : parseComposition
};


export function getParser<P extends loggable_type>(parserCollection:Parsers, type:P) : parse<P> {
	if (type in parserCollection) return parserCollection[type] as parse<P>;
	else if (loggable_type.any in parserCollection) return parserCollection[loggable_type.any] as parse<loggable_type.any>;
	else return parseFail.bind(null, type);
}
