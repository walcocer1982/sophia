import OpenAI from 'openai';
import { buildSystemPrompt, buildUserPrompt, DocentePromptContext } from './prompt';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

export async function runDocenteLLM(ctx: DocentePromptContext): Promise<{ message: string; followUp?: string }> {
  const system = buildSystemPrompt(ctx);
  const user = buildUserPrompt(ctx);
  const r = await client.responses.create({
    model: 'gpt-4o-mini',
    input: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.4,
  });
  const out = ((r as any).output_text || '').trim();
  if (ctx.action === 'explain') {
    return { message: stripQuestions(out) };
  }
  if (ctx.action === 'ask') {
    // Garantizar que la pregunta final sea la del JSON
    const q = (ctx.questionText || '').trim();
    let msg = stripQuestions(out);
    const norm = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();
    const already = norm(msg).includes(norm(q));
    return { message: already ? msg : [msg, q].filter(Boolean).join('\n\n') };
  }
  if (ctx.action === 'ok' || ctx.action === 'advance') {
    // Evitar que el reconocimiento o el puente incluyan preguntas
    const msg = stripQuestions(out);
    return { message: msg };
  }
  if (ctx.action === 'hint') {
    const msg = stripQuestions(out);
    const follow = lastQuestion(out);
    return { message: msg, followUp: follow };
  }
  return { message: out };
}


