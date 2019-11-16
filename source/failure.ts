import { LogToken, LogTokens, token_type } from "./token";


export const enum failure_type {
	no_parser = 'NOPARSE',
	odd_trace = 'ODDTRACE'
}


function createTokenContent(type:failure_type, message:string) : string {
	return `<${ type }|${ message }>`;
}


export function createFailureToken(content:string) : LogToken {
	return { type : token_type.self_err, content };
}


export function parseFail(type:string) : LogTokens {
	return [ createFailureToken(createTokenContent(failure_type.no_parser, type)) ];
}

export function stackFail(line:string) : LogTokens {
	return [ createFailureToken(createTokenContent(failure_type.odd_trace, line)) ];
}
