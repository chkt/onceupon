import { LogToken, LogTokens, token_type } from "../token";


export interface ScopeToken extends LogToken {
	readonly children : LogTokens;
}


export function isScopeToken(token:LogToken) : token is ScopeToken {
	return 'children' in token;
}

export function createScopeToken(type:token_type, children:LogTokens) : ScopeToken {
	return { type, content : '', children };
}
