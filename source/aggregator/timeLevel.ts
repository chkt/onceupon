import { createLog, Log } from "../context";
import { isTokensEqual } from "../token";
import { attachEmitter, processLog, updateContext } from "../aggregate";
import { createTimer, Timer } from "./common";


interface Config {
	readonly maxDelay : number
}

interface Context {
	readonly timerDelay : number;
	readonly emit : processLog;
}

interface ActiveContext extends Context {
	readonly prev : Log;
	readonly timer : Timer;
}

function isActiveContext(context:Context) : context is ActiveContext {
	return 'timer' in context;
}


function create(config:Config, emit:processLog) : Context {
	return {
		timerDelay : config.maxDelay ?? 100,
		emit
	}
}

function activate(context:Context, data:Log) : ActiveContext {
	return {
		...context,
		prev : data,
		timer : createTimer(() => context.emit(data), context.timerDelay)
	};
}

function update(context:ActiveContext, data:Log) : ActiveContext {
	const next = createLog(data.tokens, updateContext(context.prev.context, data.context));

	return {
		...context,
		prev : next,
		timer : context.timer.reset(() => context.emit(next))
	};
}

function deactivate(context:ActiveContext) : Context {
	context.timer.trip();

	return {
		timerDelay : context.timerDelay,
		emit : context.emit
	};
}


function append(data:Log, context:Context) : Context {
	if (isActiveContext(context) && (
		context.timer.expired ||
		!isTokensEqual(data.tokens, context.prev.tokens) ||
		data.context.level !== context.prev.context.level
	)) context = deactivate(context);

	return !isActiveContext(context) ? activate(context, data) : update(context, data);
}

function flush(context:Context) : Context {
	return isActiveContext(context) ? deactivate(context) : context;
}

function getDefaultConfig() : Config {
	return { maxDelay : 100 };
}


export function createTLAggregator(config:Partial<Config> = {}) : attachEmitter {
	return emit => {
		let context:Context = create({ ...getDefaultConfig(), ...config}, emit);

		return {
			append : data => {
				context = append(data, context);
			},
			flush : () => {
				context = flush(context)
			}
		}
	};
}
