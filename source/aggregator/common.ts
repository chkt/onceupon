import { trigger } from '../aggregate';


export interface Timer {
	expired : boolean;
	reset(fn?:trigger) : Timer;
	trip() : void;
	kill() : void;
}


export function createTimer(fn:trigger, delay:number) : Timer {
	let expired = false;

	const id = setTimeout(() => {
		fn();

		expired = true;
	}, delay);

	return {
		get expired() {
			return expired;
		},
		reset(next?:trigger) {
			if (!expired) clearTimeout(id);

			expired = true;

			return createTimer(next ?? fn, delay);
		},
		trip() {
			if (expired) return;

			clearTimeout(id);
			fn();

			expired = true;
		},
		kill() {
			if (expired) return;

			clearTimeout(id);

			expired = true;
		}
	};
}
