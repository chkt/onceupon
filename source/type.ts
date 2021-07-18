import { Composition } from './compose';


// TODO incompatible, rename to loggableType in version 2.0
export const enum loggable_type {
	any = 'any',
	other = 'unid',
	undefined = 'udef',
	null = 'nul',
	boolean = 'bool',
	number = 'fnum',
	bigint = 'bint',
	string = 'str',
	symbol = 'sym',
	function = 'fn',
	array = 'arr',
	bytes = 'byte',
	object = 'obj',
	error = 'err',
	message = 'msg',
	composition = 'cmp'
}

export type inferType = (loggable:unknown) => loggable_type;


const primitiveType:ReadonlyMap<string, loggable_type> = new Map([
	[ 'undefined', loggable_type.undefined ],
	[ 'boolean', loggable_type.boolean ],
	[ 'number', loggable_type.number ],
	[ 'bigint', loggable_type.bigint ],
	[ 'string', loggable_type.string ],
	[ 'symbol', loggable_type.symbol ],
	[ 'function', loggable_type.function ]
]);


function getPrimitiveType(tag:string) : loggable_type {
	const type = primitiveType.get(tag);

	return type !== undefined ? type : loggable_type.other;
}


export function getType(loggable:unknown) : loggable_type {
	const type = typeof loggable;

	if (type !== 'object') return getPrimitiveType(type);
	else if (loggable === null) return loggable_type.null;
	else if (loggable instanceof Error) return loggable_type.error;
	else if (Array.isArray(loggable)) return loggable_type.array;
	else if (loggable instanceof Uint8Array) return loggable_type.bytes;
	else if (loggable instanceof Composition) return loggable_type.composition;
	else return loggable_type.object;
}
