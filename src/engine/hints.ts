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

export function buildStudentFacingBase(questionText: string, objective: string, expected: string[]): string {
	// devuelve algo tipo: "aspectos clave de {tema/objetivo}"
	// usa 'sobre ...' del texto de la pregunta cuando exista
	return (questionText && questionText.toLowerCase().includes('sobre '))
		? `lo que esperas aprender sobre ${questionText.split('sobre ')[1].replace(/[?¿.]/g,'').trim()}`
		: (expected?.[0] || objective || 'el tema actual');
}

export function makeObjectiveHint(args: {
	objective: string;
	expected: string[];
	missing: string[];           // del clasificador
	variants?: string[];         // policies.hints.variants
	wordLimit?: number;          // policies.hints.wordLimits[0]
}) {
	const { objective, expected, missing, variants = [], wordLimit = 18 } = args;
	const cues = (missing && missing.length ? missing : expected).slice(0, 2);
	const keywords = extractKeywords([objective, ...expected]);
	const cueLine = cues.length ? `Menciona: ${cues.join(', ')}.` : '';
	const variantCue = variants.length ? variants[0] : ''; // puedes rotar con hintsUsed

	// 18 palabras aprox; si quieres más, concatena otra línea corta
	const core = `Enfócate en ${keywords.slice(0, 6).join(', ')}.`;
	const msg = [variantCue, core, cueLine].filter(Boolean).join(' ').trim();

	return msg.length > (wordLimit * 5) ? msg.slice(0, wordLimit * 5) : msg; // seguro
}

export function makeObjectiveReask(args: {
	questionText: string;
	objective: string;
	expected: string[];
	answerType?: 'list' | 'definition' | 'procedure' | 'choice';
	maxWords?: number;           // policies.vague.simplifiedAskMaxWords (≈10)
}) {
	const { questionText, objective, expected, answerType = 'list', maxWords = 10 } = args;
	const base = buildStudentFacingBase(questionText, objective, expected);
	let reask = '';

	switch (answerType) {
		case 'definition':
			reask = `Define en ${maxWords} palabras ${base}.`;
			break;
		case 'procedure':
			reask = `Enumera en ${maxWords} palabras 2 pasos clave de ${base}.`;
			break;
		case 'choice':
			reask = `Indica en ${maxWords} palabras la opción que aplica sobre ${base}.`;
			break;
		default: // 'list'
			reask = `Menciona en ${maxWords} palabras 2 elementos de ${base}.`;
	}
	return reask;
}

export function makeOpenHint({ objective, aspects = [], minWords = 12 }: {
	objective: string; aspects?: string[]; minWords?: number;
}) {
	const cues = aspects.slice(0,3).join(', ');
	return [
		`Comparte tus ideas en al menos ${minWords} palabras.`,
		`Guíate por: ${cues}.`,
		`Concéntrate en cómo esto se conecta con tu trabajo.`
	].join(' ');
}

export function makeOpenReask({ objective, aspects = [], minWords = 12 }: {
	objective: string; aspects?: string[]; minWords?: number;
}) {
	const a = aspects.length ? aspects.slice(0,2).join(' y ') : 'tus ideas principales';
	return `En ${minWords}–${minWords+8} palabras, cuéntame ${a} sobre "${objective}".`;
}








