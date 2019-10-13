import { LogTokens, token_type } from "./token";
import { isScopeToken } from "./parser/common";


function getDelim(prev:token_type|null, next:token_type, depth:number) : string {
	if (prev === null) return depth === 0 ? '' : '\n'.padEnd(1 + depth, '\t');
	else if (prev === token_type.level) return ' ';
	else if (next === token_type.tag) return prev === token_type.tag ? ':' : ' .:';
	else if (prev === token_type.message_fragment || next === token_type.message_fragment) return '';
	else if (prev === token_type.property_name) return ' : ';
	else if (next === token_type.property_name) return ',\n'.padEnd(2 + depth, '\t');

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
		else if (nextType === token_type.scalar_string) message += delimitString(token.content);
		else if (isScopeToken(token)) {
			if (nextType === token_type.object) message += `{${ tokensToString(token.children, depth + 1) }${ '\n'.padEnd(1 + depth, '\t') }}`;
		}
		else message += token.content;

		prevType = nextType;
	}

	return message;
}
