import { LogToken, LogTokens, token_type } from "./token";


export const enum failure_type {
	no_parser = 'NOPARSE',
	odd_trace = 'ODDTRACE'
}


export function createFailureToken(message:string) : LogToken {
	return { type : token_type.self_err, content : `<${ message }>` };
}


export function parseFail(type:string) : LogTokens {
	return [ createFailureToken(`${ failure_type.no_parser } ${ type }`)];
}

export function stackFail(line:string) : LogTokens {
	return [ createFailureToken(`${ failure_type.odd_trace} ${ line }`) ];
}
