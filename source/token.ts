export const enum token_type {
	time,
	level,
	tag,
	count,
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
	object_reference,
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

export function createTokens(type:token_type, contents:ReadonlyArray<string>) {
	return contents.map(content => ({ type, content }));
}

export function isTokensEqual(a:LogTokens, b:LogTokens) : boolean {
	if (a.length !== b.length) return false;

	for (let i = 0, l = a.length; i < l; i += 1) {
		if (a[i].type !== b[i].type || a[i].content !== b[i].content) return false;
	}

	return true;
}
