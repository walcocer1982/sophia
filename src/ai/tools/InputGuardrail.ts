export type NoSeDecision = {
	shouldForceAdvance: boolean;
	reason?: 'NOSE_THRESHOLD' | 'ATTEMPTS_MAX' | 'NONE';
};

export function decideForceAdvanceByNoSe(params: {
	noSeCount: number;
	forceNoSeThreshold: number; // e.g., 3
	allowForcedOn: string[]; // e.g., ['CONEXION']
	momentKind: string;
}): NoSeDecision {
	const { noSeCount, forceNoSeThreshold, allowForcedOn, momentKind } = params;
	if (
		forceNoSeThreshold > 0 &&
		noSeCount >= forceNoSeThreshold &&
		Array.isArray(allowForcedOn) && allowForcedOn.includes(String(momentKind))
	) {
		return { shouldForceAdvance: true, reason: 'NOSE_THRESHOLD' };
	}
	return { shouldForceAdvance: false, reason: 'NONE' };
}


