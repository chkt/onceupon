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
	object = 'obj',
	error = 'err'
}

export type inferType = (loggable:any) => loggable_type;


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


export function getType(loggable:any) : loggable_type {
	const type = typeof loggable;

	if (type !== 'object') return getPrimitiveType(type);
	else if (loggable === null) return loggable_type.null;
	else if (loggable instanceof Error) return loggable_type.error;
	else if (Array.isArray(loggable)) return loggable_type.array;
	else return loggable_type.object;
}
