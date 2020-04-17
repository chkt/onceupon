import { createToken, LogToken, LogTokens, token_type } from "./token";
import { createScopeToken, isScopeToken } from "./parser/common";
import { transformFail } from "./failure";


type transformToken = (token:LogToken) => LogToken;

interface Transforms {
	readonly [ key:string] : transformToken;
}


function isValueType(type:token_type) : boolean {
	switch (type) {
		case token_type.scalar_bool :
		case token_type.scalar_int :
		case token_type.scalar_float :
		case token_type.scalar_inf :
		case token_type.scalar_nan :
		case token_type.scalar_string :
		case token_type.object :
		case token_type.object_array : return true;
		default : return false;
	}
}


function getSpacing(depth:number) {
	return '\n'.padEnd(1 + depth, '\t');
}


function getDelim(prev:token_type|null, next:token_type, depth:number) : string {
	if (prev === null) return depth === 0 ? '' : getSpacing(depth);
	else if (prev === token_type.count) return next === token_type.level ? '|' : ' ';
	else if (prev === token_type.level) return ' ';
	else if (next === token_type.tag) return prev === token_type.tag ? ':' : ' .:';
	else if (prev === token_type.message_fragment || next === token_type.message_fragment) return '';
	else if (prev === token_type.property_name) return ' : ';
	else if (next === token_type.property_name) return `,${ depth === 0 ? ' ' : getSpacing(depth) }`;
	else if (next === token_type.error_file) return ' @';
	else if (next === token_type.error_col) return `${ prev !== token_type.error_line ? ' ' : '' }:`;
	else if (isValueType(prev) && isValueType(next)) return `,${ depth === 0 ? ' ' : getSpacing(depth) }`;

	return ' ';
}


function transformLevel(token:LogToken) : LogToken {
	return createToken(token.type, token.content.padEnd(7));
}

function transformCount(token:LogToken) : LogToken {
	const map:ReadonlyArray<[number, string]> = [[1e0, ''], [1e3, 'K'], [1e6, 'M'], [1e9, 'G'], [1e12, 'T']];
	const n = Number.parseFloat(token.content);

	if (Number.isNaN(n) || Math.round(n) < 1) return createScopeToken(token_type.self_err, transformFail(token.content));

	for (const item of map) {
		const m = item[0], s = n / m, r = Math.round(s);

		if (r > 999) continue;

		const f = m > 1 && Math.round(s * 10) < 100 ? 1 : 0;

		return createToken(token.type, `${ s.toFixed(f) }${ item[1] }`.padStart(4));
	}

	return createToken(token.type, `999${ map[map.length - 1][1] }`);
}

function transformString(token:LogToken) : LogToken {
	let s = token.content;

	if (s.indexOf('\'') === -1) s = `'${ s }'`;
	else if (s.indexOf('"') === -1) s = `"${ s }"`;
	else s = `'${ s.replace(/\\*'/g, match => match.length % 2 === 0 ? match : match.slice(0, match.length - 1) + '\\\'') }'`;

	return createToken(token.type, s);
}


export function tokensToString(tokens:LogTokens, depth:number = 0) : string {
	const transforms:Transforms = {
		[ token_type.level ] : transformLevel,
		[ token_type.count ] : transformCount,
		[ token_type.scalar_string ] : transformString,
		[ token_type.error_message ] : transformString
	};

	let prevType = null;
	let message = '';

	for (let token of tokens) {
		const nextType = token.type;

		message += getDelim(prevType, nextType, depth);

		if (nextType in transforms) token = transforms[nextType](token);

		if (isScopeToken(token)) {
			if (nextType === token_type.object) message += `{${ tokensToString(token.children, depth + 1) }${ getSpacing(depth) }}`;
			else if (nextType === token_type.object_array) message += `[${ tokensToString(token.children, depth + 1) }${ getSpacing(depth) }]`;
			else message += tokensToString(token.children);
		}
		else message += token.content;

		prevType = nextType;
	}

	return message;
}
