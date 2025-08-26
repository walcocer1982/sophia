export function pickTwoOptions(source: string[], fallback: string[] = []): string[] {
	const pool = Array.from(new Set([...(source || []), ...(fallback || [])].filter(Boolean)));
	if (pool.length <= 2) return pool;
	// prefer first relevant 2, but ensure deterministic order
	return pool.slice(0, 2);
}


