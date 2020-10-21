import { inferType, loggable_type } from './type';
import { Composition } from './compose';
import { LogContext, LoggableData } from './context';
import { LogTokens } from './token';
import { parseFail } from './failure';
import { parseBool, parseNumber, parseString, parseUndefined } from './parser/scalars';
import { parseBytes } from './parser/buffer';
import { parseArray, parseNull, parseObject } from './parser/object';
import { parseMessage, parseComposition } from './parser/message';
import { parseError } from './parser/error';


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
	readonly [ loggable_type.bytes ] : Uint8Array;
	readonly [ loggable_type.object ] : object;
	readonly [ loggable_type.composition ] : Composition;
	readonly [ loggable_type.message] : string;
}

export type parse<P extends loggable_type, T = TypeMap[P]> = (loggable:T, context:ParseContext) => LogTokens;
export type Parsers = { [ P in loggable_type ]? : parse<P> };


type selectParser = (type:loggable_type) => parse<loggable_type>;
type parseInferred = (data:LoggableData, context:LogContext) => LogTokens;
type parseUnknown = (loggable:unknown) => LogTokens;

export interface ParseHost {
	readonly inferType : inferType;
	readonly selectParser : selectParser;
	readonly parse : parseInferred;
}

export interface ParseContext {
	readonly context : LogContext;
	readonly references : ReadonlyArray<unknown>;
	readonly inferAndParse : parseUnknown;
}


export const parsers:Parsers = {
	[ loggable_type.undefined ] : parseUndefined,
	[ loggable_type.null ] : parseNull,
	[ loggable_type.boolean ] : parseBool,
	[ loggable_type.number ] : parseNumber,
	[ loggable_type.string ] : parseString,
	[ loggable_type.object ] : parseObject,
	[ loggable_type.array ] : parseArray,
	[ loggable_type.bytes ] : parseBytes,
	[ loggable_type.error ] : parseError,
	[ loggable_type.message ] : parseMessage,
	[ loggable_type.composition ] : parseComposition
};


export function createParseHost(
	infer:inferType,
	select:selectParser
) : ParseHost {
	return {
		inferType : infer,
		selectParser : select,
		parse(data, context) {
			const parseContext = createParseContext(this, context);
			const parse = select(data.type);

			return parse(data.value, parseContext);
		}
	}
}

export function createParseContext(host:ParseHost, context:LogContext) : ParseContext {
	return {
		context,
		references : [],
		inferAndParse(loggable) {
			const type = host.inferType(loggable);
			const parse = host.selectParser(type);

			return parse(loggable, this);
		}
	}
}


export function getParser<P extends loggable_type>(parserCollection:Parsers, type:P) : parse<P> {
	if (type in parserCollection) return parserCollection[type] as parse<P>;
	else if (loggable_type.any in parserCollection) return parserCollection[loggable_type.any] as parse<loggable_type.any>;
	else return parseFail.bind(null, type);
}
