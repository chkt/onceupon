export const enum token_type {
	time,
	level,
	message
}

export interface LogToken {
	readonly type : number;
	readonly content : string;
}

export type LogTokens = ReadonlyArray<LogToken>;


export function createToken(type:token_type, content:string) {
	return { type, content };
}
