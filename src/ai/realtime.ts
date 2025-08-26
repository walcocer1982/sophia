export type RealtimeSessionConfig = {
	transport?: 'websocket' | 'webrtc';
	url?: string;
};

export class RealtimeClientStub {
	private readonly config: RealtimeSessionConfig;

	constructor(config: RealtimeSessionConfig = {}) {
		this.config = config;
	}

	async connect(): Promise<void> {
		// Stub only: integration planned with @openai/agents Realtime
		return;
	}

	async sendAudioChunk(_pcm16: ArrayBuffer): Promise<void> {
		// Stub
		return;
	}

	async close(): Promise<void> {
		// Stub
		return;
	}
}


