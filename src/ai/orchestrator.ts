import { getClient, pickModel } from '@/lib/ai';
import { DocentePromptContext, buildSystemPrompt, buildUserPrompt } from './prompt';

const client = getClient();

function stripQuestions(text?: string): string {
  const raw = (text || '').trim();
  if (!raw) return '';
  // Quita oraciones que terminen en ? o ¿ a nivel de frase, manteniendo el resto
  const sentences = raw.split(/(?<=[\.!?¿])\s+/).filter(Boolean);
  return sentences.filter(s => !/[?¿]\s*$/.test(s.trim())).join(' ');
}

function lastQuestion(text?: string): string {
  const lines = (text || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
  const qs = lines.filter(l => /[?¿]\s*$/.test(l));
  return qs[qs.length - 1] || '';
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Anti re‑narración: elimina párrafos exactos presentes en el historial reciente
function stripRepeatedFromHistory(text: string, ctx: DocentePromptContext): string {
  const raw = (text || '').trim();
  if (!raw || !Array.isArray(ctx.recentHistory) || ctx.recentHistory.length === 0) return raw;
  const historyBlob = normalizeForMatch(ctx.recentHistory.join(' \n '));
  const paras = raw.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
  const kept: string[] = [];
  for (const p of paras) {
    const pNorm = normalizeForMatch(p);
    const isRepeated = pNorm.length >= 60 && historyBlob.includes(pNorm);
    if (!isRepeated) kept.push(p);
  }
  return kept.join('\n\n').trim();
}

export async function runDocenteLLM(ctx: DocentePromptContext): Promise<{ message: string; followUp?: string }> {
  const system = buildSystemPrompt(ctx);
  const user = buildUserPrompt(ctx);
  const model = pickModel('cheap'); // Usar modelo barato para redacción docente
  const r = await client.responses.create({
    model,
    input: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.30,
  });
  const out = ((r as any).output_text || '').trim();
  if (ctx.action === 'explain') {
    return { message: stripQuestions(out) };
  }
  if (ctx.action === 'ask') {
    // Garantizar que la pregunta final sea la del JSON
    const q = (ctx.questionText || '').trim();
    let msg = stripQuestions(out);
    msg = stripRepeatedFromHistory(msg, ctx);
    const norm = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();
    const already = norm(msg).includes(norm(q));
    return { message: already ? msg : [msg, q].filter(Boolean).join('\n\n') };
  }
  if (ctx.action === 'ok' || ctx.action === 'advance') {
    // Evitar que el reconocimiento o el puente incluyan preguntas
    let msg = stripQuestions(out);
    msg = stripRepeatedFromHistory(msg, ctx);
    return { message: msg };
  }
  if (ctx.action === 'hint') {
    let msg = stripQuestions(out);
    msg = stripRepeatedFromHistory(msg, ctx);
    const follow = lastQuestion(out);
    return { message: msg, followUp: follow };
  }
  if (ctx.action === 'ask_simple' || ctx.action === 'ask_options') {
    const msg = stripRepeatedFromHistory(out, ctx);
    return { message: msg };
  }
  if (ctx.action === 'feedback') {
    // No eliminar preguntas en feedback; solo evitar re‑narración repetida
    const msg = stripRepeatedFromHistory(out, ctx);
    return { message: msg };
  }
  return { message: out };
}


