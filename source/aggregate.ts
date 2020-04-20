import { Log, LogContext } from './context';


export type trigger = () => void;
export type processLog = (data:Log) => void;

export interface Aggregator {
	readonly append : processLog;
	readonly flush : trigger;
}

export type attachEmitter = (emit:processLog) => Aggregator;


export function updateContext(base:LogContext, supplement:LogContext) {
	return {
		...supplement,
		from : base.from,
		count : base.count + supplement.count
	};
}
