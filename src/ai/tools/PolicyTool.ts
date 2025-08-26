export function getHintWordLimit(policies: any, hintsUsedOrSeverityIndex: number, fallbackLimits: number[] = [16, 28, 40]): number {
	try {
		const wl: number[] = Array.isArray(policies?.hints?.wordLimits)
			? (policies.hints.wordLimits as number[])
			: fallbackLimits;
		const idx = Math.min(Math.max(Number(hintsUsedOrSeverityIndex) || 0, 0), Math.max(0, wl.length - 1));
		const val = Number(wl[idx]);
		return Number.isFinite(val) ? val : fallbackLimits[0];
	} catch {
		return fallbackLimits[0];
	}
}


