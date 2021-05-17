import { createToken, LogTokens, token_type } from '../token';
import { messageFail, stackFail } from '../failure';


const stackParserSpiderMonkey = /^\s*([^@]*)@(.+):(\d+):(\d+)\s*$/;

const enum spidermonkey_match_location {
	message = 0,
	name = 1,
	file = 2,
	line = 3,
	col = 4
}


const stackParserJsCore = /^\s*(?:([^@*]*)@)?(?:(\[native code])|(.+):(\d+):(\d+))\s*$/;

const enum jscore_match_location {
	message = 0,
	name = 1,
	bin = 2,
	file = 3,
	line = 4,
	col = 5
}


const stackParserV8 = /^\s*(?:([A-Za-z_$][A-Za-z0-9_$]*)(?:: (.+))?|at (?:[^. ]+\.|new )?([^ ]+) (?:\[as [^\]]+] )?\((?:(native|unknown location)|eval (.*)|(.+):(\d+):(\d+))\)|at (.+):(\d+):(\d+))\s*$/;

const enum v8_match_location {
	frame = 0,
	error = 1,
	message = 2,
	name = 3,
	bin = 4,
	eval = 5,
	file = 6,
	line = 7,
	col = 8,
	naked_file,
	naked_line,
	naked_col
}


function resolveString(value:unknown, fallback:string) : string {
	return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}


interface FileInfoError extends Error {
	readonly fileName : string;
	readonly lineNumber : number;
	readonly columnNumber : number;
}

interface StackInfoError extends Error {
	readonly stack : string;
}


function isFileInfoError(err:Error) : err is FileInfoError {
	const ferr = err as Partial<FileInfoError>;

	return typeof ferr.fileName === 'string'
		&& typeof ferr.lineNumber === 'number'
		&& typeof ferr.columnNumber === 'number';
}

function isStackInfoError(err:Error) : err is StackInfoError {
	return typeof (err as Partial<StackInfoError>).stack === 'string';
}


function createTraceError(message:string, trace:string) : Error {
	return new Error(`${ message }:${ trace }`);
}

function getErrorTrace(err:Error) : string {
	const msg = err.message;

	return msg.slice(msg.indexOf(':') + 1);
}


interface StackCommon {
	readonly name : string;
}

interface ErrorInfo extends StackCommon {
	readonly message? : string;
}

interface StackFrame extends StackCommon {
	readonly file : string;
	readonly line : string;
	readonly col : string;
}

type StackInfo = StackFrame|ErrorInfo;


function isErrorInfo(frame:StackCommon) : frame is ErrorInfo {
	return 'message' in frame || !('file' in frame);
}


const enum parse_mode {
	unknown,
	v8,
	spiderMonkey,
	jscore,
	spiderMonkeyOrJscore
}


function isV8Frame(line:string) : boolean {
	return stackParserV8.test(line);
}

function isSpiderMonkeyFrame(line:string) : boolean {
	return stackParserSpiderMonkey.test(line);
}

function isJSCoreFrame(line:string) : boolean {
	return stackParserJsCore.test(line);
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
	else if (match[v8_match_location.error] !== undefined) {
		return {
			name : match[v8_match_location.error],
			...match[v8_match_location.message] !== undefined ? { message : match[v8_match_location.message ] } : {}
		};
	}
	else if (match[v8_match_location.naked_file] !== undefined) {
		return {
			name : '',
			file : match[v8_match_location.naked_file],
			line : match[v8_match_location.naked_line],
			col : match[v8_match_location.naked_col]
		};
	}
	else throw createTraceError('v8 weird line', match[v8_match_location.frame]);
}

function createStackInfoJsCore(match:RegExpMatchArray) : StackFrame {
	const name = match[jscore_match_location.name];

	if (match[jscore_match_location.file] !== undefined) {
		return {
			// tslint:disable-next-line:object-literal-sort-keys
			name,
			file : match[jscore_match_location.file],
			line : match[jscore_match_location.line],
			col : match[jscore_match_location.col]
		};
	}
	else if (match[jscore_match_location.bin] !== undefined) {
		// tslint:disable-next-line:object-literal-sort-keys
		return { name, file: 'native', line: '?', col: '?' };
	}
	else throw createTraceError('odd JsCore frame', match[jscore_match_location.message]);
}


function parseLineV8(line:string) : StackInfo {
	const match = line.match(stackParserV8);

	if (match === null) throw createTraceError('v8 no match', line);

	return createStackInfoV8(match);
}

function parseLineSpiderMonkey(line:string) : StackFrame {
	const match = line.match(stackParserSpiderMonkey);

	if (match === null) throw createTraceError('not a SpiderMonkey frame', line);

	return {
		// tslint:disable-next-line:object-literal-sort-keys
		name : match[spidermonkey_match_location.name],
		file : match[spidermonkey_match_location.file],
		line : match[spidermonkey_match_location.line],
		col : match[spidermonkey_match_location.col]
	};
}

function parseLineJsCore(line:string) : StackFrame {
	const match = line.match(stackParserJsCore);

	if (match === null) throw createTraceError('not a JsCore frame', line);

	return createStackInfoJsCore(match);
}

function parseLineSpiderMonkeyOrJSCore(line:string) : [ parse_mode, StackFrame] {
	if (isSpiderMonkeyFrame(line)) return [ parse_mode.spiderMonkey, parseLineSpiderMonkey(line) ];
	else if (isJSCoreFrame(line)) return [ parse_mode.jscore, parseLineJsCore(line) ];
	else throw createTraceError('neither SpiderMonkey nor JsCore frame', line);
}

function parseLineUnknown(line:string) : [ parse_mode, StackInfo ] {
	if (isV8Frame(line)) return [ parse_mode.v8, parseLineV8(line) ];
	else if (isSpiderMonkeyFrame(line)) return parseLineSpiderMonkeyOrJSCore(line);
	else if (isJSCoreFrame(line)) return [ parse_mode.jscore, parseLineJsCore(line) ];
	else throw createTraceError('unknown frame', line);
}


function parseErrorStack(err:StackInfoError, limit:number = Number.MAX_SAFE_INTEGER) : StackFrame[] {
	const lines = err.stack.split('\n');
	const res:StackFrame[] = [];
	let mode = parse_mode.unknown;

	for (let i = 0, l = Math.min(lines.length, limit); i < l; i += 1) {
		const line = lines[i];
		let frame:StackInfo;

		if (mode === parse_mode.unknown) [ mode, frame ] = parseLineUnknown(line);
		else if (mode === parse_mode.spiderMonkeyOrJscore) [ mode, frame ] = parseLineSpiderMonkeyOrJSCore(line);
		else if (mode === parse_mode.v8) frame = parseLineV8(line);
		else if (mode === parse_mode.spiderMonkey) frame = parseLineSpiderMonkey(line);
		else frame = parseLineJsCore(line);

		if (isErrorInfo(frame)) l = Math.min(lines.length, l + 1);
		else res.push(frame);
	}

	return res;
}


export function parseError(err:Error) : LogTokens {
	const className = resolveString(Object.getPrototypeOf(err).constructor?.name, 'Error');
	const errName = resolveString(err.name, className);
	const messageType = typeof err.message;

	const tokens = [
		createToken(token_type.error_name, errName === className ? errName : `${ errName }:${ className }`),
		...(messageType === 'string' ? [ createToken(token_type.error_message, err.message) ] : messageFail(messageType))
	];

	if (isFileInfoError(err)) {
		tokens.push(
			createToken(token_type.error_file, err.fileName),
			createToken(token_type.error_line, err.lineNumber.toFixed(0)),
			createToken(token_type.error_col, err.columnNumber.toFixed(0))
		);
	}
	else if (isStackInfoError(err)) {
		let stack:StackFrame[];

		try {
			stack = parseErrorStack(err, 1);
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
