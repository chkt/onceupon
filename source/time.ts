export type getTime = () => Promise<string>;


function padTimeComponent(n:number) : string {
	return String(n).padStart(2, '0');
}


export async function nowToUtcIso() : Promise<string> {
	const now = new Date();

	return Promise.resolve(`${
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
	}Z`);
}
