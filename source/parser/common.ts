import { LogToken, LogTokens, token_type } from "../token";


interface ScopeToken extends LogToken {
	readonly children : LogTokens;
}


export function isScopeToken(token:LogToken) : token is ScopeToken {
	return 'children' in token;
}

export function createScopeToken(type:token_type, children:LogTokens) : ScopeToken {
	// tslint:disable-next-line:object-literal-sort-keys
	return { type, content : '', children };
}
