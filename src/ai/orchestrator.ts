import { getClient, pickModel } from '@/lib/ai';
import { DocentePromptContext, buildSystemPrompt, buildUserPrompt } from './prompt';

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
		.replace(/[\u0300-\u036f]/g, '')
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
  const model = pickModel('cheap');
  let offline = false;
  let out = '';
  try {
    const client = getClient();
    const r = await client.responses.create({
      model,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.30,
    });
    out = ((r as any).output_text || '').trim();
  } catch {
    offline = true;
  }

  if (!offline) {
    if (ctx.action === 'explain') {
      return { message: stripQuestions(out) };
    }
    if (ctx.action === 'ask') {
      const q = (ctx.questionText || '').trim();
      let msg = stripQuestions(out).replace(/^\s*Docente\s*:\s*/i, '').trim();
      msg = stripRepeatedFromHistory(msg, ctx);
      const norm = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();
      const already = norm(msg).includes(norm(q));
      const merged = already ? msg : [msg, q].filter(Boolean).join('\n\n');
      return { message: merged };
    }
    if (ctx.action === 'ok' || ctx.action === 'advance') {
      let msg = stripQuestions(out).replace(/^\s*Docente\s*:\s*/i, '').trim();
      msg = stripRepeatedFromHistory(msg, ctx);
      return { message: msg };
    }
    if (ctx.action === 'hint') {
      let msg = stripQuestions(out).replace(/^\s*Docente\s*:\s*/i, '').trim();
      msg = stripRepeatedFromHistory(msg, ctx);
      const follow = lastQuestion(out);
      return { message: msg, followUp: follow };
    }
    if (ctx.action === 'ask_simple' || ctx.action === 'ask_options') {
      const msg = stripRepeatedFromHistory(out.replace(/^\s*Docente\s*:\s*/i, '').trim(), ctx);
      return { message: msg };
    }
    if (ctx.action === 'feedback') {
      const msg = stripRepeatedFromHistory(out.replace(/^\s*Docente\s*:\s*/i, '').trim(), ctx);
      return { message: msg };
    }
    return { message: out };
  }

  // Offline fallback determinista (sin OpenAI)
  const q = (ctx.questionText || '').trim();
  if (ctx.action === 'explain') {
    const parts = [
      ctx.narrationText,
      ...(Array.isArray(ctx.contentBody) ? ctx.contentBody : []),
      ctx.caseText,
      ctx.objective,
    ].filter(Boolean).join(' ');
    return { message: stripQuestions(parts).slice(0, 400) };
  }
  if (ctx.action === 'ask') {
    return { message: q };
  }
  if (ctx.action === 'advance') {
    return { message: 'Puente breve al siguiente foco.' };
  }
  if (ctx.action === 'hint') {
    return { message: 'Pista breve alineada al objetivo.', followUp: q ? q : '¿Una micro‑pregunta?' };
  }
  if (ctx.action === 'ask_simple' || ctx.action === 'ask_options') {
    return { message: q };
  }
  if (ctx.action === 'feedback') {
    return { message: 'FB: refuerzo/guía breve.' };
  }
  return { message: q };
}


