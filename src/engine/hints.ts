type HintPolicies = {
  mentionCount?: number;
  wordLimits?: number[]; // [S1, S2, S3]
  variants?: string[];
  templates?: {
    objective?: string;
    reask?: Record<'list'|'definition'|'procedure'|'choice', string>;
    open?: { hint: string; reask: string };
  };
};

type LangPolicies = { stopwords?: string[] };

export function makeTokenizer(stop: string[] = []) {
  const STOP = new Set(stop);
  return (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/["'()\[\]{}]/g, '')
      .split(/[^a-záéíóúñ0-9]+/)
      .filter(Boolean)
      .filter(w => w.length > 2 && !STOP.has(w));
}

export function extractKeywords(from: string[], stop: string[] = []): string[] {
  const tok = makeTokenizer(stop);
  const uniq: string[] = [];
  for (const item of from) for (const w of tok(item)) if (!uniq.includes(w)) uniq.push(w);
  return uniq.slice(0, 40);
}

export function buildStudentFacingBase(questionText: string, objective: string, expected: string[]): string {
  return (questionText && questionText.toLowerCase().includes('sobre '))
    ? `lo que esperas aprender sobre ${questionText.split('sobre ')[1].replace(/[?¿.]/g,'').trim()}`
    : (expected?.[0] || objective || 'el tema actual');
}

// Nivel de severidad según intentos/pistas
function severity(attempts: number, hintsUsed: number): 0|1|2 {
  if (attempts <= 1 && hintsUsed === 0) return 0; // S1
  if (hintsUsed <= 1) return 1;                    // S2
  return 2;                                        // S3
}

export function makeHintMessage(opts: {
  questionText: string;
  objective: string;
  expected: string[];
  missing: string[];
  answerType?: 'open'|'list'|'definition'|'procedure'|'choice';
  hintsUsed: number;
  attempts: number;
  coursePolicies?: { hints?: HintPolicies; language?: LangPolicies; feedback?: any };
}) {
  const { questionText, objective, expected, missing, answerType = 'list', hintsUsed, attempts, coursePolicies } = opts;
  const hp = coursePolicies?.hints || {};
  const lp = coursePolicies?.language || {};
  const wordLimits = hp.wordLimits || [16, 22, 28];
  const mentionCount = hp.mentionCount ?? 2;
  const sev = severity(attempts, hintsUsed);
  const maxMsgChars = wordLimits[Math.min(sev, wordLimits.length-1)] * 5;

  const stop = lp.stopwords || [];
  const kws = extractKeywords([objective, ...(expected||[])], stop).slice(0, 6);

  // cues: prioriza missing; si no hay, usa expected
  const cuesArr = (missing?.length ? missing : expected || []).slice(0, mentionCount);
  const cueLine = cuesArr.length ? `Menciona: ${cuesArr.join(', ')}.` : '';

  const variants = hp.variants || [];
  const opener = variants.length ? variants[hintsUsed % variants.length] : '';

  if (answerType === 'open') {
    const tmpl = hp.templates?.open?.hint || `Comparte tus ideas en al menos {minWords} palabras. {cuesLine}`;
    const fallbackAspects: string[] = (hp.templates as any)?.open?.fallbackAspects || [];
    const aspects = cuesArr.length ? cuesArr : fallbackAspects;
    const cuesLine = aspects.length ? `Guíate por: ${aspects.join(', ')}.` : '';
    const msg = tmpl
      .replace('{minWords}', String(wordLimits[0]))
      .replace('{cuesLine}', cuesLine);
    // Para preguntas abiertas, evitar cortar el mensaje por caracteres para no truncar frases
    return msg.trim();
  }

  const base = hp.templates?.objective || '{opener} Enfócate en {keywords}. {cueLine}';
  const msg = base
    .replace('{opener}', opener)
    .replace('{keywords}', kws.join(', '))
    .replace('{cueLine}', cueLine);

  return msg.trim().slice(0, maxMsgChars);
}

export function makeReaskMessage(opts: {
  questionText: string;
  objective: string;
  expected: string[];
  answerType?: 'open'|'list'|'definition'|'procedure'|'choice';
  coursePolicies?: { hints?: HintPolicies };
}) {
  const { questionText, objective, expected, answerType = 'list', coursePolicies } = opts;
  const hp = coursePolicies?.hints || {};
  const baseStr = buildStudentFacingBase(questionText, objective, expected);
  if (answerType === 'open') {
    const tmpl = hp.templates?.open?.reask || 'En {minWords}-{maxWords} palabras, cuéntame {aspects} sobre "{objective}".';
    const minw = (hp.wordLimits || [16])[0];
    const base = buildStudentFacingBase(questionText, objective, expected);
    const aspectsLabel = (hp.templates as any)?.open?.aspectsLabel || 'tus ideas principales';
    return tmpl
      .replace('{minWords}', String(minw))
      .replace('{maxWords}', String(minw + 8))
      .replace('{aspects}', aspectsLabel)
      .replace('{objective}', base);
  }
  const reaskTmpls = (hp.templates?.reask || {}) as Record<'list'|'definition'|'procedure'|'choice', string>;
  const maxWords = (hp.wordLimits || [16])[0];
  const map: Record<string, string> = {
    list: reaskTmpls.list || '',
    definition: reaskTmpls.definition || '',
    procedure: reaskTmpls.procedure || '',
    choice: reaskTmpls.choice || ''
  };
  const fallback = `Menciona en ${maxWords} palabras 2 elementos de ${baseStr}.`;
  return (map[answerType] || '')
    .replace('{maxWords}', String(maxWords))
    .replace('{base}', baseStr) || fallback;
}

// Funciones legacy para compatibilidad - eliminar después de migración
export function makeObjectiveHint(args: {
  objective: string;
  expected: string[];
  missing: string[];
  variants?: string[];
  wordLimit?: number;
}) {
  return makeHintMessage({
    questionText: '',
    objective: args.objective,
    expected: args.expected,
    missing: args.missing,
    hintsUsed: 0,
    attempts: 1,
    coursePolicies: {
      hints: {
        variants: args.variants,
        wordLimits: [args.wordLimit || 16]
      }
    }
  });
}

export function makeObjectiveReask(args: {
  questionText: string;
  objective: string;
  expected: string[];
  answerType?: 'list' | 'definition' | 'procedure' | 'choice';
  maxWords?: number;
}) {
  return makeReaskMessage({
    questionText: args.questionText,
    objective: args.objective,
    expected: args.expected,
    answerType: args.answerType,
    coursePolicies: {
      hints: {
        wordLimits: [args.maxWords || 16]
      }
    }
  });
}

export function makeOpenHint({ objective, aspects = [], minWords = 12 }: {
  objective: string; aspects?: string[]; minWords?: number;
}) {
  return makeHintMessage({
    questionText: '',
    objective,
    expected: aspects,
    missing: [],
    answerType: 'open',
    hintsUsed: 0,
    attempts: 1,
    coursePolicies: {
      hints: {
        wordLimits: [minWords]
      }
    }
  });
}

export function makeOpenReask({ objective, aspects = [], minWords = 12 }: {
  objective: string; aspects?: string[]; minWords?: number;
}) {
  return makeReaskMessage({
    questionText: '',
    objective,
    expected: aspects,
    answerType: 'open',
    coursePolicies: {
      hints: {
        wordLimits: [minWords]
      }
    }
  });
}








