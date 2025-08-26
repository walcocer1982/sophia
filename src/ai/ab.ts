export type ABVariant = 'A' | 'B';

export function pickVariant(sessionKey?: string): ABVariant {
	const key = String(sessionKey || 'default');
	let hash = 0;
	for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
	return (Math.abs(hash) % 2) === 0 ? 'A' : 'B';
}

export function varyHintLimit(base: number, variant: ABVariant): number {
	// B empuja un 20% más largo (tope 60)
	if (variant === 'B') return Math.min(Math.round(base * 1.2), 60);
	return base;
}


