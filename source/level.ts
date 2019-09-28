export const enum log_level {
	fatal,
	error,
	warn,
	notice,
	info,
	verbose,
	debug
}


const logLevel = new Map([
	[ log_level.fatal, 'fatal' ],
	[ log_level.error, 'error' ],
	[ log_level.warn, 'warn' ],
	[ log_level.notice, 'notice' ],
	[ log_level.info, 'info' ],
	[ log_level.verbose, 'verbose' ],
	[ log_level.debug, 'debug' ]
]);


export function isLevelWithinThreshold(level:log_level, threshold:log_level) : boolean {
	return level <= threshold;
}

export function getNameOfLevel(level:log_level) : string {
	return logLevel.get(level) as string;
}
