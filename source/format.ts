import { LogTokens, token_type } from "./token";
import { isScopeToken } from "./parser/common";


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

function delimitString(s:string) : string {
	if (s.indexOf('\'') === -1) return `'${ s }'`;
	else if (s.indexOf('"') === -1) return `"${ s }"`;
	else return `'${ s.replace(/\\*'/g, match => match.length % 2 === 0 ? match : match.slice(0, match.length - 1) + '\\\'') }'`;
}


export function tokensToString(tokens:LogTokens, depth:number = 0) : string {
	let prevType = null;
	let message = '';

	for (const token of tokens) {
		const nextType = token.type;

		message += getDelim(prevType, nextType, depth);

		if (nextType === token_type.level) message += token.content.padEnd(7, ' ');
		else if (
			nextType === token_type.scalar_string ||
			nextType === token_type.error_message
		) message += delimitString(token.content);
		else if (isScopeToken(token)) {
			if (nextType === token_type.object) message += `{${ tokensToString(token.children, depth + 1) }${ getSpacing(depth) }}`;
			else if (nextType === token_type.object_array) message += `[${ tokensToString(token.children, depth + 1) }${ getSpacing(depth) }]`;
		}
		else message += token.content;

		prevType = nextType;
	}

	return message;
}
