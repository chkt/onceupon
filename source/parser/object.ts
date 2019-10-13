import { createToken, LogTokens, token_type } from "../token";
import { LogContext } from "../context";
import { createScopeToken } from "./common";


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
