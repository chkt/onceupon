import { createToken, LogTokens, token_type } from "../token";
import { stackFail } from "../failure";


const stackParserFF = /^([^@]*)@([^:]+):(\d+):(\d+)$/;

const enum ff_match_location {
	message = 0,
	name = 1,
	file = 2,
	line = 3,
	col = 4
}

const stackParserV8 = /^\s*at (?:[^. ]+\.|new )?([^ ]+) (?:\[as [^\]]+] )?\((?:(native|unknown location)|eval (.*)|([^:]+):(\d+):(\d+))\)\s*$/;

const enum v8_match_location {
	message = 0,
	name = 1,
	bin = 2,
	eval = 3,
	file = 4,
	line = 5,
	col = 6
}


interface FileInfoError extends Error {
	readonly fileName : string;
	readonly lineNumber : string;
	readonly columnNumber : string;
}

interface StackInfoError extends Error {
	readonly stack : string;
}

function isFileInfoError(err:Error) : err is FileInfoError {
	const ferr = err as FileInfoError;

	return 'fileName' in ferr && 'lineNumber' in ferr && 'columnNumber' in ferr;
}

function isStackInfoError(err:Error) : err is StackInfoError {
	return 'stack' in (err as StackInfoError);
}


function createTraceError(message:string, trace:string) : Error {
	return new Error(`${ message }:${ trace.trim() }`);
}

function getErrorTrace(err:Error) : string {
	const msg = err.message;

	return msg.slice(msg.indexOf(':') + 1);
}


interface StackInfo {
	readonly name : string;
	readonly file : string;
	readonly line : string;
	readonly col : string;
}


function parseErrorStackFF(lines:string[], limit:number) : StackInfo[] {
	const info:StackInfo[] = [];

	for (let i = 0, l = Math.min(lines.length, limit); i < l; i += 1) {
		const match = lines[i].match(stackParserFF);

		if (match === null) throw createTraceError('ff no match', lines[i]);

		info.push({
			name : match[ff_match_location.name],
			file : match[ff_match_location.file],
			line : match[ff_match_location.line],
			col : match[ff_match_location.col]
		});
	}

	return info;
}


function createStackInfoV8(match:RegExpMatchArray) : StackInfo {
	const name = match[v8_match_location.name];

	if (match[v8_match_location.file] !== undefined) {
		return {
			name,
			file : match[v8_match_location.file],
			line : match[v8_match_location.line],
			col : match[v8_match_location.col]
		};
	}
	else if (match[v8_match_location.bin] !== undefined) {
		return {name, file: match[v8_match_location.bin], line: '?', col: '?'};
	}
	else if (match[v8_match_location.eval] !== undefined) {
		return {
			...parseLineV8(match[v8_match_location.eval]),
			name
		};
	}
	else throw createTraceError('v8 weird line', match[v8_match_location.message]);
}

function parseLineV8(line:string) : StackInfo {
	const match = line.match(stackParserV8);

	if (match === null) throw createTraceError('v8 no match', line);

	return createStackInfoV8(match);
}

function parseErrorStackV8(lines:string[], limit:number) : StackInfo[] {
	const info:StackInfo[] = [];

	for (let i = 0, l = Math.min(lines.length, limit); i < l; i += 1) info.push(parseLineV8(lines[i]));

	return info;
}


function parseErrorStack(err:StackInfoError, limit:number = Number.MAX_SAFE_INTEGER) : StackInfo[] {
	const lines = err.stack.split('\n');

	if (lines.length === 0) return [];

	if (lines.length > 1 && stackParserV8.test(lines[1])) return parseErrorStackV8(lines.slice(1), limit);
	else if (stackParserFF.test(lines[0])) return parseErrorStackFF(lines, limit);
	else throw createTraceError('no parser', lines[0]);
}


export function parseError(err:Error) : LogTokens {
	const className = Object.getPrototypeOf(err).constructor.name;

	const tokens = [
		createToken(token_type.error_name, className === err.name ? err.name : `${ err.name }:${ className }`),
		createToken(token_type.error_message, err.message)
	];

	if (isFileInfoError(err)) {
		tokens.push(
			createToken(token_type.error_file, err.fileName),
			createToken(token_type.error_line, err.lineNumber),
			createToken(token_type.error_col, err.columnNumber)
		);
	}
	else if (isStackInfoError(err)) {
		let stack:StackInfo[];

		try {
			stack = parseErrorStack(err);
		}
		catch (err) {
			tokens.push(...stackFail(getErrorTrace(err)));

			return tokens;
		}

		if (stack.length === 0) return tokens;

		const line = stack[0];

		tokens.push(
			createToken(token_type.error_file, line.file),
			createToken(token_type.error_line, line.line),
			createToken(token_type.error_col, line.col)
		);
	}

	return tokens;
}
