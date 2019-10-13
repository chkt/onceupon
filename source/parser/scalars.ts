import { createToken, LogTokens, token_type } from "../token";


export function parseBool(b:boolean) : LogTokens {
	return [ createToken(token_type.scalar_bool, b ? 'true' : 'false') ];
}

export function parseNumber(n:number) : LogTokens {
	let s:string, t:token_type;

	if (Number.isSafeInteger(n)) {
		s = n.toString();
		t = token_type.scalar_int;
	}
	else if (Number.isNaN(n)) {
		s = 'NaN';
		t = token_type.scalar_nan;
	}
	else if (!Number.isFinite(n)) {
		s = (n > 0 ? '+' : '-') + 'Infinity';
		t = token_type.scalar_inf;
	}
	else {
		const a = Math.abs(n);
		s = a > 1e9 || a < 1e-6 ? n.toExponential() : n.toString();
		t = token_type.scalar_float;

	}

	return [ createToken(t, s) ];
}

export function parseString(s:string) : LogTokens {
	return [ createToken(token_type.scalar_string, s) ];
}
