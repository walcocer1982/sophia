import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.EMBED_MODEL || 'text-embedding-3-small';

export type AskVectorIndex = {
	acceptables: string[];
	expected: string[];
	centroid: number[];
	byItem: { text: string; vec: number[] }[];
};

function cosine(a: number[], b: number[]): number {
	let dot = 0;
	let na = 0;
	let nb = 0;
	const len = Math.min(a.length, b.length);
	for (let i = 0; i < len; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
	if (!na || !nb) return 0;
	return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
	if (!texts || texts.length === 0) return [];
	const res = await client.embeddings.create({ model: MODEL as any, input: texts });
	return res.data.map(x => (x as any).embedding as number[]);
}

export async function buildAskIndex(acceptables: string[] = [], expected: string[] = []): Promise<AskVectorIndex> {
	const items = Array.from(new Set([...(acceptables || []), ...(expected || [])].map(s => String(s || '').trim()).filter(Boolean)));
	if (items.length === 0) return { acceptables, expected, centroid: [], byItem: [] };
	const vecs = await embedTexts(items);
	const dim = vecs[0]?.length || 0;
	const centroid = dim ? Array.from({ length: dim }, (_, j) => vecs.reduce((acc, v) => acc + (v[j] || 0), 0) / vecs.length) : [];
	return {
		acceptables,
		expected,
		centroid,
		byItem: items.map((t, i) => ({ text: t, vec: vecs[i] || [] }))
	};
}

export async function semanticScore(answer: string, index: AskVectorIndex): Promise<{ cos: number; best?: { text: string; cos: number } }> {
	const text = String(answer || '').trim();
	if (!text || !index || !index.centroid || index.centroid.length === 0) return { cos: 0 };
	const [u] = await embedTexts([text]);
	const cosC = cosine(u || [], index.centroid || []);
	let best = { text: '', cos: 0 };
	for (const it of index.byItem || []) {
		const c = cosine(u || [], it.vec || []);
		if (c > best.cos) best = { text: it.text, cos: c };
	}
	return { cos: cosC, best };
}


