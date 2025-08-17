const STOPWORDS = new Set(['el','la','los','las','un','una','unos','unas','de','en','y','o','a','para','con','sobre','que','es','son','del','al','por','se','como','mas','más','menos','no','si','sí','qué','cuales','cuáles']);

function tokenize(s: string): string[] {
	return (s || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/["'()\[\]{}]/g, '')
		.split(/[^a-záéíóúñ0-9]+/)
		.filter(Boolean)
		.filter(w => w.length > 2 && !STOPWORDS.has(w));
}

export function extractKeywords(from: string[]): string[] {
	const out: string[] = [];
	for (const item of from) {
		for (const w of tokenize(item)) {
			if (!out.includes(w)) out.push(w);
		}
	}
	return out.slice(0, 40);
}

export function buildHint10(keywords: string[]): string {
	return `Incluye ideas como ${keywords.slice(0, 6).join(', ')}`.trim();
}

export function buildHint20(keywords: string[]): string {
	return `Explica brevemente criterios y ejemplos, enfocándote en ${keywords.slice(0, 10).join(', ')}`.trim();
}








