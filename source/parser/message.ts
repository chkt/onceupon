import { Composition } from '../compose';
import { createToken, LogTokens, token_type } from '../token';
import { ParseContext } from '../parse';


export function parseMessage(message:string) : LogTokens {
	return [ createToken(token_type.message_fragment, message) ];
}

export function parseComposition(composition:Composition, context:ParseContext) : LogTokens {
	const pl = composition.parts.length, el = composition.embeds.length;
	const tokens = [];

	for (let i = 0, l = Math.max(pl, el); i < l; i += 1) {
		if (i < pl) tokens.push(createToken(token_type.message_fragment, composition.parts[i]));
		if (i < el) tokens.push(...context.inferAndParse(composition.embeds[i]));
	}

	return tokens;
}
