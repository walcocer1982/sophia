export type TraceEvent = {
	name: string;
	timestamp: number;
	props?: Record<string, unknown>;
};

export function trace(event: TraceEvent) {
	try {
		if (process.env.ENGINE_DEBUG === 'true' || process.env.NEXT_PUBLIC_ENGINE_DEBUG === 'true') {
			// eslint-disable-next-line no-console
			console.debug(JSON.stringify({ tag: 'trace', ...event }));
		}
	} catch {
		// noop
	}
}


