export function normalize(input: string): string {
	return (input || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		// Colapsa repeticiones largas de caracteres: accidenteee -> accidentee
		.replace(/([a-zñ])\1{2,}/g, '$1$1')
		.replace(/[^\p{L}\p{N}\s]/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function matchesAcceptable(user: string, acceptable: string[]): boolean {
	const u = normalize(user);
	return acceptable.some(a => {
		const n = normalize(a);
		return n.length > 0 && (u === n || u.includes(n) || n.includes(u));
	});
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function tokenSet(s: string): Set<string> {
  return new Set(normalize(s).split(' ').filter(Boolean));
}

function jaccard(a: string, b: string): number {
  const A = tokenSet(a), B = tokenSet(b);
  const interArr: string[] = [];
  A.forEach(v => { if (B.has(v)) interArr.push(v); });
  const inter = interArr.length;
  const unionSet = new Set<string>();
  A.forEach(v => unionSet.add(v));
  B.forEach(v => unionSet.add(v));
  const union = unionSet.size || 1;
  return inter / union;
}

export function computeMatchedMissing(user: string, acceptable: string[] = [], expected: string[] = [], fuzzy?: { maxEditDistance?: number; similarityMin?: number }) {
	const u = normalize(user);
	const essentials = acceptable;
	const matched: string[] = [];
	const uTokens = u.split(' ').filter(Boolean);
	for (const a of essentials) {
		const n = normalize(a);
		if (!n) continue;
		// Coincidencia estricta por frase completa
		if (u === n || u.includes(n) || n.includes(u)) { matched.push(a); continue; }
		if (fuzzy) {
			const dist = levenshtein(u, n);
			const sim = jaccard(u, n);
			if ((fuzzy.maxEditDistance && dist <= fuzzy.maxEditDistance) || (fuzzy.similarityMin && sim >= fuzzy.similarityMin)) { matched.push(a); continue; }
			// Fuzzy a nivel de tokens: si algún token del usuario se parece a un token del aceptable
			const nTokens = n.split(/\s+/).filter(t => t.length >= 4);
			const tokenHit = uTokens.some(ut => nTokens.some(nt => {
				if (!ut || !nt) return false;
				if (ut === nt || ut.includes(nt) || nt.includes(ut)) return true;
				const d = levenshtein(ut, nt);
				return typeof fuzzy.maxEditDistance === 'number' ? d <= fuzzy.maxEditDistance : d <= 1;
			}));
			if (tokenHit) { matched.push(a); continue; }
			// Soft token match conservador por inclusión directa
			const tokens = n.split(/\s+/).filter(t => t.length >= 4);
			if (tokens.some(t => u.includes(t))) { matched.push(a); }
			continue;
		}
		// Sin fuzzy: aplicar soft token match mínimo
		const tokens = n.split(/\s+/).filter(t => t.length >= 4);
		if (tokens.some(t => u.includes(t))) { matched.push(a); continue; }
	}
	if (matched.length === 0 && expected?.length) {
		const extras = expected.filter(e => {
			const n = normalize(e);
			if (!n) return false;
			if (u.includes(n)) return true;
			if (fuzzy) {
				const dist = levenshtein(u, n);
				const sim = jaccard(u, n);
				return (fuzzy.maxEditDistance && dist <= fuzzy.maxEditDistance) || (fuzzy.similarityMin && sim >= fuzzy.similarityMin);
			}
			// Soft token para expected
			const tokens = n.split(/\s+/).filter(t => t.length >= 4);
			if (tokens.some(t => u.includes(t))) return true;
			return false;
		}).slice(0, 2);
		matched.push(...extras);
	}
	const missing = essentials.filter(a => !matched.includes(a)).slice(0, 3);
	return { matched, missing };
}

export function evaluateAnswer(user: string, acceptable: string[] = [], expected: string[] = [], fuzzy?: { maxEditDistance?: number; similarityMin?: number }) {
	const { matched, missing } = computeMatchedMissing(user, acceptable, expected, fuzzy);
	return { ok: matched.length > 0, matched, missing };
}

export type AskPolicy = {
	type: 'conceptual'|'listado'|'aplicacion'|'identificacion'|'experiencial'|'metacognitiva'|'reflexiva'|string;
	thresholdK?: number; // para listado
	requiresJustification?: boolean; // para aplicacion
};

export function classifyTurn(
	user: string,
	policy: AskPolicy,
	acceptable: string[] = [],
	expected: string[] = [],
	fuzzy?: { maxEditDistance?: number; similarityMin?: number }
): { kind: 'ACCEPT'|'PARTIAL'|'HINT'|'REFOCUS'; matched: string[]; missing: string[]; reason: string } {
	const u = normalize(user);
	if (!u) {
		return { kind: 'HINT', matched: [], missing: acceptable.slice(0, 3), reason: 'DONT_KNOW' };
	}
	const { matched, missing } = computeMatchedMissing(u, acceptable, expected, fuzzy);
	const hasAny = matched.length > 0;
	if (policy.type === 'listado') {
		const k = Math.max(1, policy.thresholdK || 2);
		if (matched.length >= k) return { kind: 'ACCEPT', matched, missing, reason: 'K_OF_N' };
		if (matched.length > 0 || expected.some(e => u.includes(normalize(e)))) return { kind: 'PARTIAL', matched, missing, reason: 'PARTIAL_LISTADO' };
		return { kind: 'HINT', matched, missing, reason: 'INSUFFICIENT' };
	}
	if (policy.type === 'aplicacion') {
		if (hasAny && (!policy.requiresJustification || /porque|para|ya que/i.test(user))) return { kind: 'ACCEPT', matched, missing, reason: 'APLICACION_OK' };
		if (hasAny) return { kind: 'PARTIAL', matched, missing, reason: 'FALTA_JUSTIFICACION' };
		if (expected.some(e => u.includes(normalize(e)))) return { kind: 'PARTIAL', matched, missing, reason: 'OBJETIVO_ALINEADO' };
		return { kind: 'HINT', matched, missing, reason: 'INSUFFICIENT' };
	}
	// conceptual, identificacion, etc.
	if (hasAny) return { kind: 'ACCEPT', matched, missing, reason: 'MATCH_ACCEPTABLE' };
	if (expected.some(e => u.includes(normalize(e)))) return { kind: 'PARTIAL', matched, missing, reason: 'OBJETIVO_ALINEADO' };
	return { kind: 'HINT', matched, missing, reason: 'INSUFFICIENT' };
}

export function isVagueAnswer(
	user: string,
	question?: string,
	opts?: { stopwords?: string[]; minUsefulTokens?: number; maxStopwordRatio?: number; echoOverlap?: number; repeatSimilarity?: number; lastAnswer?: string }
): boolean {
	const u = normalize(user);
	if (!u) return true;
	const tokens = u.split(' ').filter(Boolean);
	const stop = new Set((opts?.stopwords || []).map(s => normalize(s)));
	const useful = tokens.filter(t => !stop.has(t));
	const stopRatio = tokens.length ? (tokens.length - useful.length) / tokens.length : 1;
	if (useful.length < (opts?.minUsefulTokens ?? 3)) return true;
	if (stopRatio > (opts?.maxStopwordRatio ?? 0.6)) return true;
	const q = question ? normalize(question) : '';
	if (q) {
		const overlap = jaccard(u, q);
		if (overlap >= (opts?.echoOverlap ?? 0.7)) return true;
	}
	const last = normalize(opts?.lastAnswer || '');
	if (last) {
		const sim = jaccard(u, last);
		if (sim >= (opts?.repeatSimilarity ?? 0.8)) return true;
	}
	return false;
}

export function isNoSe(answer?: string): boolean {
	const a = (answer || '').trim().toLowerCase();
	if (!a) return true;
	const patterns = [
		/^no\s*se$/, /^no\s*lo\s*se$/, /^no\s*sé$/, /^no\s*lo\s*sé$/,
		/^ns$/, /^n\/a$/, /^no\s*sab[oó]$/, /^no\s*est[oó]\s*seguro$/,
		/^no$/,
		/^[\.\!\?…]+$/
	];
	if (patterns.some(rx => rx.test(a))) return true;
	const words = a.split(/\s+/).filter(Boolean);
	return words.length <= 2;
}
