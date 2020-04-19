import { createToken, LogTokens, token_type } from '../token';
import { ParseContext } from '../parse';
import { createScopeToken } from './common';


export function parseNull() : LogTokens {
	return [ createToken(token_type.object_null, 'null') ];
}

export function parseObject(obj:object, context:ParseContext) : LogTokens {
	const items = [];

	for (const [name, prop] of Object.entries(obj)) {
		items.push(
			createToken(token_type.property_name, name),
			...context.inferAndParse(prop)
		);
	}

	return [ createScopeToken(token_type.object, items) ];
}

export function parseArray(arr:unknown[], context:ParseContext) : LogTokens {
	const items = [];

	for (const item of arr) items.push(...context.inferAndParse(item));

	return [ createScopeToken(token_type.object_array, items)];
}
