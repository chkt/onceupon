import { createToken, LogTokens, token_type } from "../token";
import { LogContext } from "../context";
import { createScopeToken } from "./common";


export function parseNull() : LogTokens {
	return [ createToken(token_type.object_null, 'null') ];
}

export function parseObject(obj:object, context:LogContext) : LogTokens {
	const items = [];

	for (const [name, prop] of Object.entries(obj)) {
		items.push(
			createToken(token_type.property_name, name),
			...context.parse(prop, context)
		);
	}

	return [ createScopeToken(token_type.object, items) ];
}

export function parseArray(arr:any[], context:LogContext) : LogTokens {
	const items = [];

	for (const item of arr) items.push(...context.parse(item, context));

	return [ createScopeToken(token_type.object_array, items)];
}
