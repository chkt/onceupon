import { LogToken, LogTokens, token_type } from './token';


// TODO: incompatible, rename to failureType in version 2.0
export const enum failure_type {
	no_parser = 'NOPARSE',
	bad_message = 'BADMSG',
	odd_trace = 'ODDTRACE',
	bad_transform = 'BADTRN'
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

export function messageFail(type:string) : LogTokens {
	return [ createFailureToken(createTokenContent(failure_type.bad_message, type)) ];
}

export function stackFail(line:string) : LogTokens {
	return [ createFailureToken(createTokenContent(failure_type.odd_trace, line)) ];
}

export function transformFail(name:string, content:string) : LogToken {
	return createFailureToken(createTokenContent(failure_type.bad_transform, `[${ name }]${ content }`));
}
