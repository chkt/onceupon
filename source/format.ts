import { createToken, LogToken, LogTokens, token_type } from './token';
import { isScopeToken } from './parser/common';
import { transformFail } from './failure';


type testDelimiterRule = (type:token_type|null) => boolean;

interface DelimiterStats extends FormatterContext {
	readonly depth : number;
	readonly firstType : token_type;
	readonly lastType? : token_type;
	readonly maxDepth : number;
	readonly numProperties : number;
	readonly numElements : number;
}

type transformDelimiter = (stats:DelimiterStats) => string;
type DelimiterRule = [ testDelimiterRule, testDelimiterRule, transformDelimiter ];

type transformToken = (token:LogToken) => LogToken;

interface Transforms {
	readonly [ key:string ] : transformToken;
}

interface BufferChunk {
	readonly chunkOffset : number;
	readonly chunkSize : number;
	readonly startOffset : number;
	readonly startBytes : number;
	readonly chars : string;
}

interface BufferLine {
	readonly offset : number;
	readonly bytes : readonly (string|undefined)[];
}

interface BufferData {
	readonly size : number;
	readonly chunks : string;
}

export interface FormatterSettings {
	readonly inlineDepth : number;
	readonly inlineProperties : number;
	readonly inlineElements : number;
	readonly inlineBytes : number;
	readonly clampBytes : number;
	readonly bytesInLine : number;
	readonly bytesInGroup : number;
}

export type FormatterConfig = Partial<FormatterSettings>;

interface FormatterContext extends FormatterSettings {
	readonly scopes : readonly token_type[];
}

interface FormatterStats {
	readonly maxDepth : number;
	readonly numProperties : number;
	readonly numElements : number;
}

interface FormatterResult extends FormatterStats {
	readonly string : string;
}

export type formatTokens = (tokens:LogTokens) => string;


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

function lineStart(stats:DelimiterStats) : string {
	return '\n'.padEnd(stats.depth + 1, '\t');
}

function scopeOpen(stats:DelimiterStats) : string {
	if (stats.depth === 0) return '';
	else if (
		stats.maxDepth - stats.depth >= stats.inlineDepth ||
		stats.numProperties > stats.inlineProperties ||
		stats.numElements > stats.inlineElements
	) return lineStart(stats);
	else if (
		stats.firstType === undefined ||
		stats.scopes[stats.scopes.length - 1] === token_type.object_array &&
		[token_type.object, token_type.object_array, token_type.object_unresolved].includes(stats.firstType)
	) return '';
	else return ' ';
}

function scopeClose(stats:DelimiterStats) : string {
	const scopeType = stats.scopes[stats.scopes.length - 1];

	if (stats.depth === 0) return '';
	else if (
		stats.maxDepth - stats.depth >= stats.inlineDepth ||
		stats.numProperties > stats.inlineProperties ||
		stats.numElements > stats.inlineElements ||
		scopeType === token_type.object && stats.inlineProperties === 0 ||
		scopeType === token_type.object_array && stats.inlineElements === 0
	) return lineStart(popDelimiterStats(stats));
	else if (
		stats.lastType === undefined ||
		[token_type.object, token_type.object_array].includes(scopeType) &&
		[token_type.object, token_type.object_array, token_type.object_unresolved].includes(stats.lastType)
	) return '';
	else return ' ';
}

function delim(stats:DelimiterStats) : string {
	if (
		stats.maxDepth - stats.depth >= stats.inlineDepth ||
		stats.numProperties > stats.inlineProperties ||
		stats.numElements > stats.inlineElements
	) return `,${ lineStart(stats) }`;
	else return ', ';
}

function unresolved(stats:DelimiterStats) : string {
	const scopeType = stats.scopes[stats.scopes.length - 1];

	if (
		scopeType === token_type.object && stats.inlineProperties !== 0 ||
		scopeType === token_type.object_array && stats.inlineElements !== 0
	) return '';
	else return lineStart(stats);
}

const valueTypes = [
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
	[ eq(null), eq(token_type.object_unresolved), unresolved ],
	[ eq(null), any, scopeOpen ],
	[ eq(token_type.count), eq(token_type.level), () => '|' ],
	[ eq(token_type.count, token_type.level), any, one ],
	[ eq(token_type.tag), eq(token_type.tag), () => ':' ],
	[ any, eq(token_type.tag), () => ' .:' ],
	[ eq(token_type.message_fragment), any, zero ],
	[ any, eq(token_type.message_fragment), zero ],
	[ eq(token_type.property_inherited), eq(token_type.property_name), one ],
	[ any, eq(token_type.property_inherited, token_type.property_name), delim ],
	[ any, eq(token_type.object_unresolved), d => `${ delim(d) }^` ],
	[ eq(token_type.property_name), any, () => ' : ' ],
	[ eq(...valueTypes), eq(...valueTypes), delim ],
	[ any, eq(token_type.error_file), () => ' @'],
	[ eq(token_type.error_line), eq(token_type.error_col), () => ':' ],
	[ any, eq(token_type.error_col), () => ' :' ],
	[ any, any, one ]
];


export function formatLevel(level:string) : string {
	return level.padEnd(7);
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

function getDelim(prev:token_type|null, next:token_type, stats:DelimiterStats) : string {
	const [_1, _2, transform] = delimiterRules.find(([ testPrev, testNext ]) => testPrev(prev) && testNext(next)) as DelimiterRule;

	return transform(stats);
}


function transformLevel(token:LogToken) : LogToken {
	return createToken(token.type, formatLevel(token.content));
}

function transformCount(token:LogToken) : LogToken {
	try {
		return createToken(token.type, formatCount(token.content));
	}
	catch (err) {
		return transformFail('count', token.content);
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

function createChildContext(context:FormatterContext, type:token_type) : FormatterContext {
	return {
		...context,
		scopes : [ ...context.scopes, type]
	};
}

function createDelimiterStats(context:FormatterContext, tokens:LogTokens) : DelimiterStats {
	return {
		...context,
		depth : context.scopes.length,
		firstType : tokens[0]?.type,
		lastType : tokens[tokens.length - 1]?.type,
		maxDepth : context.scopes.length,
		numProperties : 0,
		numElements : 0
	};
}

function updateDelimiterStats(stats:DelimiterStats, update:FormatterStats) : DelimiterStats {
	return {
		...stats,
		maxDepth : Math.max(stats.maxDepth, update.maxDepth),
		numProperties : stats.numProperties + update.numProperties,
		numElements : stats.numElements + update.numElements
	};
}

function incrementDelimiterProps(stats:DelimiterStats, num:number = 1) : DelimiterStats {
	return {
		...stats,
		numProperties : stats.numProperties + num
	};
}

function incrementDelimiterElements(stats:DelimiterStats, num:number = 1) : DelimiterStats {
	return {
		...stats,
		numElements : stats.numElements + num
	};
}

function popDelimiterStats(stats:DelimiterStats) : DelimiterStats {
	return {
		...stats,
		scopes : stats.scopes.slice(0, stats.scopes.length - 2),
		depth : Math.max(stats.depth - 1, 0)
	}
}


function hexToBytes(chars:string) : readonly string[] {
	const res:string[] = [];

	for (let i = 0; i < chars.length; i += 2) res.push(chars.substr(i, 2));

	return res;
}

const enum unicode {
	null = 0x00,
	space = 0x20,
	tilde = 0x7e,
	nbsp = 0xa0,
	shy = 0xad
}

const replacementChars:Map<unicode, string> = new Map([
	[ unicode.null, '•' ],
	[ unicode.space, '␣' ],
	[ unicode.nbsp, '⌒' ],
	[ unicode.shy, '⌐' ]
]);

function byteToChar(byte:string) : string {
	let code = Number.parseInt(byte, 16);

	if (code < unicode.space || code > unicode.tilde && code < unicode.nbsp) code = unicode.null;

	return replacementChars.get(code) ?? String.fromCharCode(code);
}

function* getBufferChunks(chunks:string, context:FormatterContext) : Generator<BufferChunk, void, void> {
	for (const chunk of chunks.split('+')) {
		const [start, chars] = chunk.split('-', 2);
		const chunkOffset = Number.parseInt(start, 16);
		const byteOffset = chunkOffset % context.bytesInLine;

		yield {
			chunkOffset,
			chunkSize : chars.length * 0.5,
			startOffset : chunkOffset - byteOffset,
			startBytes : (context.bytesInLine - byteOffset) % context.bytesInLine,
			chars,
		};
	}
}

function* getBufferLine(chunks:string, context:FormatterContext) : Generator<BufferLine, void, void> {
	let prevOffset = 0;
	let prevBytes:string[] = [];

	for (const { chars, ...chunk } of getBufferChunks(chunks, context)) {
		if (chunk.startOffset !== prevOffset && prevBytes.length !== 0) {
			yield { offset : prevOffset, bytes: prevBytes };

			prevOffset = chunk.startOffset;
			prevBytes = [];
		}

		if (chunk.startBytes !== 0) {
			yield { offset : prevOffset, bytes : [
				...prevBytes.slice(0),
				...Array(context.bytesInLine - prevBytes.length - chunk.startBytes),
				...hexToBytes(chars.substr(0, chunk.startBytes * 2))
			] };
		}

		for (let i = chunk.startBytes; i < chunk.chunkSize; i += context.bytesInLine) {
			const nextOffset = chunk.chunkOffset + i;

			if (i + context.bytesInLine < chunk.chunkSize) yield { offset : nextOffset, bytes: hexToBytes(chars.substr(i * 2, context.bytesInLine * 2)) };
			else prevBytes = [ ...hexToBytes(chars.slice(i * 2)) ];

			prevOffset = nextOffset;
		}
	}

	if (prevBytes.length !== 0) yield { offset : prevOffset, bytes: prevBytes };
}

function formatBufferInline({ size, chunks }:BufferData) : string {
	const [chunk] = chunks.split('+', 1);
	const [_, hex] = chunk.split('-', 2);

	const more = hex.length * 0.5 < size ? '…' : '';
	const bytes:string[] = [];
	let chars = '';

	for (let i = 0, l = hex.length; i < l; i += 2) {
		const byte = hex.substr(i, 2);

		bytes.push(byte);
		chars += byteToChar(byte);
	}

	return `<${ bytes.join(' ')}${ more }> ${ chars }${ more }`;
}

function formatBufferBlock({ size, chunks }:BufferData, context:FormatterContext) {
	const stats = createDelimiterStats({
		...context,
		scopes : [ ...context.scopes, token_type.object_bytes ]
	}, []);
	const places = size.toString(16).length;
	let prevOffset = 0;
	let res = `<`;

	for (const { offset, bytes } of getBufferLine(chunks, context)) {
		if (!bytes[0]) continue;

		let hex = '';
		let chars = '';
		let prevIndex = -1;

		for (let i = 0; i < bytes.length; i += 1) {
			const byte = bytes[i];

			if (byte === undefined) continue;
			else if (i === 0) {
				hex += byte;
				chars += byteToChar(byte);
			}
			else if (i - prevIndex > 1) {
				hex += `${ (prevIndex !== -1 ? '…' : ' ').padEnd((i - prevIndex - 1) * 3, ' ') }…${ byte }`;
				chars += `${ ' '.padEnd((i - prevIndex - 1))}${ byteToChar(byte) }`;
			}
			else if (i % context.bytesInGroup === 0) {
				hex += `-${ byte }`;
				chars += ` ${ byteToChar(byte) }`;
			}
			else {
				hex += ` ${ byte }`;
				chars += byteToChar(byte);
			}

			prevIndex = i;
		}

		res += `${
			lineStart(stats) }${
			offset.toString(16).padStart(places, '0') } ${
			prevOffset + context.bytesInLine < offset ? '…' : ' ' }${
			hex }${ (context.bytesInLine - prevIndex !== 1 && size - offset - prevIndex !== 1 ? '…' : ' ').padEnd((context.bytesInLine - prevIndex - 1) * 3 + 2, ' ') }${ chars }`;
		prevOffset = offset;
	}

	return `${ res }${ scopeClose(stats) }>`;
}

function formatBuffer(token:LogToken, context:FormatterContext) : string {
	const index = token.content.indexOf('+');
	const size = Number.parseInt(token.content.slice(0, index), 16);
	const chunks = token.content.slice(index + 1);

	if (size > context.inlineBytes) return formatBufferBlock({ size, chunks }, context);
	else return formatBufferInline({ size, chunks });
}


function resolveTokens(tokens:LogTokens, context:FormatterContext) : FormatterResult {
	let prevType = null;
	let message = '';

	const normalizedTokens:LogToken[] = [];
	const scopes = new Map<LogToken, FormatterResult>();
	let stats:DelimiterStats = createDelimiterStats(context, tokens);

	for (const token of tokens) {
		const normal = transforms[token.type]?.(token) ?? token;

		normalizedTokens.push(normal);

		if (isScopeToken(normal)) {
			const result = resolveTokens(normal.children, createChildContext(context, token.type));

			scopes.set(normal, result);
			stats = updateDelimiterStats(stats, result);
		}
		else {
			const scope = context.scopes[context.scopes.length - 1];

			if (scope === token_type.object && token.type === token_type.property_name) stats = incrementDelimiterProps(stats);
			else if (scope === token_type.object_array) stats = incrementDelimiterElements(stats);
		}
	}

	for (const token of normalizedTokens) {
		const nextType = token.type;
		const result = scopes.get(token);

		message += getDelim(prevType, nextType, stats);

		if (result) {
			if (nextType === token_type.object) message += `{${ result.string }}`;
			else if (nextType === token_type.object_array) message += `[${ result.string }]`;
			else message += result.string;
		}
		else if (nextType === token_type.object_bytes) message += formatBuffer(token, context)
		else message += token.content;

		prevType = nextType;
	}

	return { ...stats, string : message + scopeClose(stats) };
}

function getDefaultSettings() : FormatterSettings {
	return {
		clampBytes : Number.MAX_SAFE_INTEGER,
		inlineDepth : 0,
		inlineProperties : 0,
		inlineElements : 0,
		inlineBytes : 16,
		bytesInGroup : 8,
		bytesInLine : 16
	};
}

export function tokensToString(tokens:LogTokens, settings:FormatterSettings) : string {
	return resolveTokens(tokens, { ...settings, scopes : [] }).string;
}

export function createFormatter(config:FormatterConfig = {}) : formatTokens {
	const context:FormatterSettings = { ...getDefaultSettings(), ...config };

	return (tokens:LogTokens) => tokensToString(tokens, context);
}
