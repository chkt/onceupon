export const enum token_type {
	time,
	level,
	tag,
	message_fragment,
	scalar_bool,
	scalar_int,
	scalar_float,
	scalar_nan,
	scalar_inf,
	scalar_string,
	object,
	property_name,
	self_err
}

export interface LogToken {
	readonly type : number;
	readonly content : string;
}

export type LogTokens = ReadonlyArray<LogToken>;


export function createToken(type:token_type, content:string) {
	return { type, content };
}

export function createTokens(type:token_type, contents:string[]) {
	return contents.map(content => ({ type, content }));
}
