export const enum token_type {
	time,
	level,
	tag,
	message_fragment,
	scalar_undefined,
	scalar_bool,
	scalar_int,
	scalar_float,
	scalar_nan,
	scalar_inf,
	scalar_string,
	object,
	object_null,
	object_array,
	property_name,
	error_name,
	error_message,
	error_file,
	error_line,
	error_col,
	self_err
}

export interface LogToken {
	readonly type : token_type;
	readonly content : string;
}

export type LogTokens = ReadonlyArray<LogToken>;


export function createToken(type:token_type, content:string) {
	return { type, content };
}

export function createTokens(type:token_type, contents:string[]) {
	return contents.map(content => ({ type, content }));
}
