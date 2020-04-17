import { createLog, Log, LogContext } from "./context";
import { isTokensEqual } from "./token";


type processLog<T extends LogContext> = (data:Log<T>) => void;


export interface AggregatedContext extends LogContext {
	readonly count : number;
	readonly earliest : string;
}

function createAggregatedContext(context:LogContext) : AggregatedContext {
	return { ...context, count : 1, earliest : context.time };
}

function updateAggregatedContext(base:AggregatedContext, supplement:LogContext) {
	return {
		...supplement,
		earliest : base.earliest,
		count : base.count + 1
	};
}


type trigger = () => void;

interface TimerContext {
	readonly id : NodeJS.Timer;
	readonly delay : number;
	readonly fn : trigger;
}

function createTimer(fn:trigger, delay:number) : TimerContext {
	return {
		id : setTimeout(fn, delay),
		delay,
		fn
	};
}

function resetTimer(context:TimerContext, fn?:trigger) : TimerContext {
	if (context.id !== null) clearTimeout(context.id);

	const cb = fn ?? context.fn;
	const id = setTimeout(cb, context.delay);

	return {
		id,
		delay : context.delay,
		fn : cb
	};
}

function tripTimer(context:TimerContext) : void {
	if (context.id !== null) clearTimeout(context.id);

	context.fn();
}


export interface Aggregator {
	readonly append : processLog<LogContext>;
	readonly flush : trigger;
}

export type createAggregator = (emit:processLog<AggregatedContext>) => Aggregator;


export function createNoopAggregator(emit:processLog<AggregatedContext>) : Aggregator {
	return {
		append : data => emit(createLog(
			data.tokens,
			createAggregatedContext(data.context)
		)),
		flush : () => undefined
	};
}

export function createTLAggregator(emit:processLog<AggregatedContext>, maxDelay:number = 100) : Aggregator {
	let prev:Log<AggregatedContext>;
	let timer:TimerContext|null = null;

	return {
		append: data => {
			if (timer !== null && (!isTokensEqual(data.tokens, prev.tokens) || data.context.level !== prev.context.level)) {
				tripTimer(timer);
				timer = null;
			}

			let next:Log<AggregatedContext>;

			if (timer === null) {
				next = createLog(data.tokens, createAggregatedContext(data.context));

				timer = createTimer(() => {
					emit(next);
					timer = null;
				}, maxDelay);
			}
			else {
				next = createLog(data.tokens, updateAggregatedContext(prev.context, data.context));

				timer = resetTimer(timer, () => {
					emit(next);
					timer = null;
				});
			}

			prev = next;
		},
		flush : () => {
			if (timer !== null) {
				tripTimer(timer);
				timer = null;
			}
		}
	}
}
