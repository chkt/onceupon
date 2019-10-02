import { LogTokens, token_type } from "./token";


export function tokensToString(tokens:LogTokens) : string {
	let prevType = null;
	let message = '';

	for (const token of tokens) {
		if (token.type === token_type.level) message += token.content.padEnd(8, ' ');
		else if (token.type === token_type.tag) message += (prevType !== token_type.tag ? '.' : '') + `:${ token.content }`;
		else message += `${token.content} `;

		prevType = token.type;
	}

	return prevType !== token_type.tag ? message.slice(0, message.length - 1) : message;
}
