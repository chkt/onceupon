import { createToken, LogToken, LogTokens, token_type } from '../token';
import { createScopeToken } from './common';


export function parseBytes(bytes:Uint8Array) : LogTokens {
	const type = Object.getPrototypeOf(bytes).constructor.name;
	const tokens:LogToken[] = [];

	bytes.forEach(byte => {
		tokens.push(createToken(token_type.scalar_byte, byte.toString(16).padStart(2, '0')));
	});

	return [
		createToken(token_type.type_name, type),
		createScopeToken(token_type.object_bytes, tokens)
	];
}
