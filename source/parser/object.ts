import Dict = NodeJS.Dict;
import { createToken, LogTokens, token_type } from '../token';
import { ParseContext } from '../parse';
import { createScopeToken } from './common';


export function parseNull() : LogTokens {
	return [ createToken(token_type.object_null, 'null') ];
}

export function parseObject(obj:object, context:ParseContext) : LogTokens {
	if (context.depthLeft <= 0) {
		return [ createScopeToken(
			token_type.object,
			[ createToken(token_type.object_unresolved, '') ]
		) ];
	}

	const refIndex = context.references.indexOf(obj);

	if (refIndex !== -1) {
		return [ createToken(
			token_type.object_reference,
			(context.references.length - refIndex - 1).toFixed(0)
		) ];
	}

	const keys:Dict<number> = {};
	let resolved = false;
	let source:object|null = obj;

	for (let i = 0; i < context.depthLeft; i += 1) {
		for (const key of Object.keys(source)) keys[key] = keys[key] ?? i;

		source = Object.getPrototypeOf(source);

		if (source === Object.prototype || source === null) {
			resolved = true;

			break;
		}
	}

	let items:LogTokens = [];
	const childContext = {
		...context,
		depthLeft : context.depthLeft - 1,
		references : [ ...context.references, obj ]
	};

	for (const [ name, depth ] of Object.entries(keys)) {
		if (depth === undefined) continue;

		let value:unknown;

		try {
			value = obj[name as keyof typeof obj];
		}
		catch (err) {
			value = err;
		}

		items = [
			...items,
			...(depth > 0 ? [ createToken(token_type.property_inherited, depth.toFixed()) ] : []),
			createToken(token_type.property_name, name),
			...childContext.inferAndParse(value)
		];
	}

	if (!resolved) items = [ ...items, createToken(token_type.object_unresolved, '') ];

	return [ createScopeToken(token_type.object, items) ];
}

export function parseArray(arr:unknown[], context:ParseContext) : LogTokens {
	if (context.depthLeft <= 0) {
		return [ createScopeToken(
			token_type.object_array,
			[ createToken(token_type.object_unresolved, '') ]
		) ];
	}

	const refIndex = context.references.indexOf(arr);

	if (refIndex !== -1) {
		return [ createToken(
			token_type.object_reference,
			(context.references.length - refIndex - 1).toFixed(0)
		) ];
	}

	const childContext = {
		...context,
		depthLeft: context.depthLeft - 1,
		references : [ ...context.references, arr ]
	};
	const items = [];

	for (const item of arr) items.push(...childContext.inferAndParse(item));

	return [ createScopeToken(token_type.object_array, items)];
}
