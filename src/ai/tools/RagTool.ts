import type { LessonPlan } from '@/plan/types';
import { embedTexts } from '@/engine/semvec';

export type RagItem = { text: string; vec: number[] };
export type RagIndex = { byItem: RagItem[] };

function chunkText(text: string, maxLen: number = 280): string[] {
	const t = String(text || '').trim();
	if (!t) return [];
	if (t.length <= maxLen) return [t];
	const sentences = t.split(/(?<=[\.\!\?])\s+/).map(s => s.trim()).filter(Boolean);
	const chunks: string[] = [];
	let cur = '';
	for (const s of sentences) {
		if ((cur + ' ' + s).trim().length > maxLen) {
			if (cur) chunks.push(cur.trim());
			cur = s;
		} else {
			cur = (cur ? cur + ' ' : '') + s;
		}
	}
	if (cur) chunks.push(cur.trim());
	return chunks;
}

export async function buildLessonRagIndex(plan?: LessonPlan): Promise<RagIndex | undefined> {
	try {
		if (!plan) return undefined;
		const texts: string[] = [];
		for (const step of plan.allSteps || []) {
			const t = String(step?.data?.text || '').trim();
			const body = Array.isArray(step?.data?.body) ? (step.data.body as string[]) : [];
			const q = String(step?.data?.question || '').trim();
			const objective = String(step?.data?.objective || '').trim();
			const acceptable = Array.isArray(step?.data?.acceptable_answers) ? (step.data.acceptable_answers as string[]) : [];
			if (t) texts.push(...chunkText(t));
			for (const b of body) texts.push(...chunkText(b));
			if (q) texts.push(q);
			if (objective) texts.push(objective);
			for (const a of acceptable) texts.push(...chunkText(a));
		}
		const items = Array.from(new Set(texts.map(s => s.trim()).filter(Boolean)));
		const vecs = await embedTexts(items);
		const byItem: RagItem[] = items.map((text, i) => ({ text, vec: vecs[i] || [] }));
		return { byItem };
	} catch {
		return undefined;
	}
}

function cosine(a: number[], b: number[]): number {
	let dot = 0;
	let na = 0;
	let nb = 0;
	const len = Math.min(a.length, b.length);
	for (let i = 0; i < len; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
	if (!na || !nb) return 0;
	return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function retrieveTopK(query: string, index?: RagIndex, k: number = 3): Promise<string[]> {
	const q = String(query || '').trim();
	if (!q || !index || !Array.isArray(index.byItem) || index.byItem.length === 0) return [];
	const [qv] = await embedTexts([q]);
	if (!qv || qv.length === 0) return [];
	const scored = index.byItem.map(it => ({ text: it.text, score: cosine(qv, it.vec || []) }));
	scored.sort((a, b) => b.score - a.score);
	return scored.slice(0, Math.max(0, k)).map(s => s.text);
}


