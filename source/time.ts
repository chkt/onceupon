export type timingFunction = AsyncIterator<string>;


function padTimeComponent(n:number) : string {
	return String(n).padStart(2, '0');
}


export async function* nowToISO() : AsyncIterableIterator<string> {
	while (true) {
		const now = new Date();

		yield `${
			now.getUTCFullYear()
		}-${
			padTimeComponent(now.getUTCMonth() + 1)
		}-${
			padTimeComponent(now.getUTCDate())
		}T${
			padTimeComponent(now.getUTCHours())
		}:${
			padTimeComponent(now.getUTCMinutes())
		}:${
			padTimeComponent(now.getUTCSeconds())
		}Z`;
	}
}
