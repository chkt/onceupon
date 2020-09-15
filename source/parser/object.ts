import { createToken, LogTokens, token_type } from '../token';
import { ParseContext } from '../parse';
import { createScopeToken } from './common';


export function parseNull() : LogTokens {
	return [ createToken(token_type.object_null, 'null') ];
}

export function parseObject(obj:object, context:ParseContext) : LogTokens {
	const refIndex = context.references.indexOf(obj);

	if (refIndex !== -1) {
		return [ createToken(
			token_type.object_reference,
			(context.references.length - refIndex - 1).toFixed(0)
		) ];
	}

	const childContext = {
		...context,
		references : [ ...context.references, obj ]
	};
	const items = [];

	for (const [name, prop] of Object.entries(obj)) {
		items.push(
			createToken(token_type.property_name, name),
			...childContext.inferAndParse(prop)
		);
	}

	return [ createScopeToken(token_type.object, items) ];
}

export function parseArray(arr:unknown[], context:ParseContext) : LogTokens {
	const refIndex = context.references.indexOf(arr);

	if (refIndex !== -1) {
		return [ createToken(
			token_type.object_reference,
			(context.references.length - refIndex - 1).toFixed(0)
		) ];
	}

	const childContext = {
		...context,
		references : [ ...context.references, arr ]
	};
	const items = [];

	for (const item of arr) items.push(...childContext.inferAndParse(item));

	return [ createScopeToken(token_type.object_array, items)];
}
