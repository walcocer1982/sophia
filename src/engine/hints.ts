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
  teacherProfile?: any;
}) {
  const { questionText, objective, expected, missing, answerType = 'list', hintsUsed, attempts } = opts as any;
  const policy = (opts as any).teacherProfile || (opts as any).coursePolicies || {};
  const hp = policy?.hints || {};
  const lp = policy?.language || policy?.lang || {};
  const wordLimits = hp.wordLimits || [16, 22, 28];
  const mentionCount = hp.mentionCount ?? 2;
  const sev = severity(attempts, hintsUsed);
  const maxMsgChars = wordLimits[Math.min(sev, wordLimits.length-1)] * 5;

  const stop = lp.stopwords || [];
  const kws = extractKeywords([objective, ...(expected||[])], stop).slice(0, 6);

  // cues: prioriza missing; si no hay, usa expected
  const cuesArr = (missing?.length ? missing : expected || []).slice(0, mentionCount);
  const cueLine = cuesArr.length ? `Menciona ${cuesArr.join(', ')}.` : '';

  const variants = hp.variants || [];
  const opener = variants.length ? variants[hintsUsed % variants.length] : '';
  const openerClean = opener ? (/[.!?]$/.test(opener.trim()) ? opener.trim() : `${opener.trim()}.`) : '';

  const replaceTokens = (tmpl: string, tokens: Record<string, string>): string => {
    let out = String(tmpl || '');
    for (const [k, v] of Object.entries(tokens)) {
      const re2 = new RegExp(`\\{\\{\s*${k}\s*\\}\\}`, 'g');
      const re1 = new RegExp(`\\{\s*${k}\s*\\}`, 'g');
      out = out.replace(re2, v).replace(re1, v);
    }
    return out;
  };

  if (answerType === 'open') {
    const fallbackAspects: string[] = (hp.templates as any)?.open?.fallbackAspects || [];
    const aspects = cuesArr.length ? cuesArr : fallbackAspects;
    const cuesLine = aspects.length ? `Por ejemplo, considera ${aspects.join(', ')}.` : '';
    const msg = [`Comparte tus ideas en al menos ${wordLimits[0]} palabras.`, cuesLine]
      .map(s => s.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/gu[ií]ate\s+por\s*:\s*/i, '');
    return msg.trim();
  }

  // Construcción más natural: oraciones separadas y sin duplicados
  const focus = kws.length ? `Enfócate en ${kws.join(', ')}.` : '';
  const parts = [openerClean, focus, cueLine].map(s => (s || '').trim()).filter(Boolean);
  const msg = parts.join(' ');
  return msg.slice(0, maxMsgChars);
}

export function makeReaskMessage(opts: {
  questionText: string;
  objective: string;
  expected: string[];
  answerType?: 'open'|'list'|'definition'|'procedure'|'choice';
  coursePolicies?: { hints?: HintPolicies };
  teacherProfile?: any;
}) {
  const { questionText, objective, expected, answerType = 'list' } = opts as any;
  const policy = (opts as any).teacherProfile || (opts as any).coursePolicies || {};
  const hp = policy?.hints || {};
  const baseStr = buildStudentFacingBase(questionText, objective, expected);
  if (answerType === 'open') {
    const tmpl = hp.templates?.open?.reask || 'En {minWords}-{maxWords} palabras, cuéntame {aspects} sobre "{objective}".';
    const minw = (hp.wordLimits || [16])[0];
    const base = buildStudentFacingBase(questionText, objective, expected);
    const aspectsLabel = (hp.templates as any)?.open?.aspectsLabel || 'tus ideas principales';
    const replaceTokens = (s: string, tokens: Record<string, string>) => {
      let out = s;
      for (const [k, v] of Object.entries(tokens)) {
        const re2 = new RegExp(`\\{\\{\s*${k}\s*\\}\\}`, 'g');
        const re1 = new RegExp(`\\{\s*${k}\s*\\}`, 'g');
        out = out.replace(re2, v).replace(re1, v);
      }
      return out;
    };
    return replaceTokens(tmpl, {
      minWords: String(minw),
      maxWords: String(minw + 8),
      aspects: aspectsLabel,
      objective: base
    });
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
  const replaceTokens = (s: string, tokens: Record<string, string>) => {
    let out = s;
    for (const [k, v] of Object.entries(tokens)) {
      const re2 = new RegExp(`\\{\\{\s*${k}\s*\\}\\}`, 'g');
      const re1 = new RegExp(`\\{\s*${k}\s*\\}`, 'g');
      out = out.replace(re2, v).replace(re1, v);
    }
    return out;
  };
  const raw = map[answerType] || '';
  const rendered = replaceTokens(raw, { maxWords: String(maxWords), base: baseStr });
  return rendered || fallback;
}

// Funciones legacy para compatibilidad - eliminar después de migración
// (legacy wrappers eliminados tras migración)








