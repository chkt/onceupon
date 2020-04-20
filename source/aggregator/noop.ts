import { attachEmitter } from "../aggregate";


export function createNoopAggregator() : attachEmitter {
	return emit => ({
		append : data => emit(data),
		flush : () => undefined
	});
}
