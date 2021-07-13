import { createToken, LogToken, LogTokens, token_type } from './token';
import { createScopeToken, isScopeToken } from './parser/common';
import { transformFail } from './failure';


type testDelimiterRule = (type:token_type|null) => boolean;
type transformDelimiter = (depth:number) => string;
type DelimiterRule = [ testDelimiterRule, testDelimiterRule, transformDelimiter ];

type transformToken = (token:LogToken) => LogToken;

interface Transforms {
	readonly [ key:string ] : transformToken;
}


function any() {
	return true;
}

function eqSolve(a:(token_type|null)[], b:token_type|null) {
	return a.includes(b);
}

function eq(...a:(token_type|null)[]) {
	return eqSolve.bind(null, a);
}

function zero() {
	return '';
}

function one() {
	return ' ';
}

function getLine(depth:number) {
	return '\n'.padEnd(depth + 1, '\t');
}

function getSpacing(depth:number) {
	return depth !== 0 ? getLine(depth) : '';
}

function prop(depth:number) {
	return `,${ getLine(depth) }`;
}

const value = [
	token_type.scalar_bool,
	token_type.scalar_int,
	token_type.scalar_float,
	token_type.scalar_inf,
	token_type.scalar_nan,
	token_type.scalar_string,
	token_type.object,
	token_type.object_array
];

const delimiterRules:readonly DelimiterRule[] = [
	[ eq(null), any, getSpacing ],
	[ eq(token_type.count), eq(token_type.level), () => '|' ],
	[ eq(token_type.count, token_type.level), any, one ],
	[ eq(token_type.tag), eq(token_type.tag), () => ':' ],
	[ any, eq(token_type.tag), () => ' .:' ],
	[ eq(token_type.message_fragment), any, zero ],
	[ any, eq(token_type.message_fragment), zero ],
	[ eq(token_type.property_inherited), eq(token_type.property_name), one ],
	[ any, eq(token_type.property_inherited, token_type.property_name), prop ],
	[ any, eq(token_type.object_unresolved), d => `${ prop(d) }^` ],
	[ eq(token_type.property_name), any, () => ' : ' ],
	[ eq(...value), eq(...value), prop ],
	[ any, eq(token_type.error_file), () => ' @'],
	[ eq(token_type.error_line), eq(token_type.error_col), () => ':' ],
	[ any, eq(token_type.error_col), () => ' :' ],
	[ any, any, one ]
];


export function formatLevel(level:string) : string {
	return level.padEnd(7);
}

function formatBytes(tokens:LogTokens, depth:number) {
	const places = tokens.length.toString(16).length;
	let res = '';

	for (let i = 0, l = tokens.length; i < l; i += 1) {
		const mod = i % 16;

		if (mod === 0) res += `${ getSpacing(depth) }${ i.toString(16).padStart(places, '0') }  `;
		else if (mod === 8) res += '-';
		else res += ' ';

		res += tokens[i].content;
	}

	return res;
}

export function formatCount(count:string) : string {
	const map:ReadonlyArray<[number, string]> = [[1e0, ''], [1e3, 'K'], [1e6, 'M'], [1e9, 'G'], [1e12, 'T']];
	const n = Number.parseFloat(count);

	if (Number.isNaN(n) || Math.round(n) < 1) throw new RangeError();

	for (const item of map) {
		const m = item[0], s = n / m, r = Math.round(s);

		if (r > 999) continue;

		const f = m > 1 && Math.round(s * 10) < 100 ? 1 : 0;

		return `${ s.toFixed(f) }${ item[1] }`.padStart(4);
	}

	return `999${ map[map.length - 1][1] }`;
}

function getDelim(prev:token_type|null, next:token_type, depth:number) : string {
	const [_1, _2, transform] = delimiterRules.find(([ testPrev, testNext ]) => testPrev(prev) && testNext(next)) as DelimiterRule;

	return transform(depth);
}


function transformLevel(token:LogToken) : LogToken {
	return createToken(token.type, formatLevel(token.content));
}

function transformCount(token:LogToken) : LogToken {
	try {
		return createToken(token.type, formatCount(token.content));
	}
	catch (err) {
		return createScopeToken(token_type.self_err, transformFail('count', token.content));
	}
}

function transformBigInt(token:LogToken) : LogToken {
	return createToken(token.type, `${ token.content}n`);
}

function transformString(token:LogToken) : LogToken {
	let s = token.content;

	if (s.indexOf('\'') === -1) s = `'${ s }'`;
	else if (s.indexOf('"') === -1) s = `"${ s }"`;
	else s = `'${ s.replace(/\\*'/g, match => match.length % 2 === 0 ? match : match.slice(0, match.length - 1) + '\\\'') }'`;

	return createToken(token.type, s);
}

function transformInheritance(token:LogToken) : LogToken {
	return createToken(token.type, `^${ token.content }`);
}

function transformReference(token:LogToken) : LogToken {
	return createToken(token.type, `&${ token.content }`);
}

function transformUnresolved(token:LogToken) : LogToken {
	return createToken(token.type, '…');
}


const transforms:Transforms = {
	[ token_type.level ] : transformLevel,
	[ token_type.count ] : transformCount,
	[ token_type.scalar_bint ] : transformBigInt,
	[ token_type.scalar_string ] : transformString,
	[ token_type.property_inherited ] : transformInheritance,
	[ token_type.object_reference ] : transformReference,
	[ token_type.object_unresolved ] : transformUnresolved,
	[ token_type.error_message ] : transformString
};


export function tokensToString(tokens:LogTokens, depth:number = 0) : string {
	let prevType = null;
	let message = '';

	for (let token of tokens) {
		const nextType = token.type;

		message += getDelim(prevType, nextType, depth);

		if (nextType in transforms) token = transforms[nextType](token);

		if (isScopeToken(token)) {
			if (nextType === token_type.object) message += `{${ tokensToString(token.children, depth + 1) }${ getLine(depth) }}`;
			else if (nextType === token_type.object_array) message += `[${ tokensToString(token.children, depth + 1) }${ getLine(depth) }]`;
			else if (nextType === token_type.object_bytes) message += `<${ formatBytes(token.children, depth + 1) }${ getLine(depth) }>`;
			else message += tokensToString(token.children);
		}
		else message += token.content;

		prevType = nextType;
	}

	return message;
}
