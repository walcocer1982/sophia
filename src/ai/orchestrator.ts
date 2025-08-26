import { getClient, pickModel } from '@/lib/ai';
import type { DocentePromptContext } from './prompt_parts/types';
import { buildSystemPrompt, buildUserPrompt } from './prompt';
import { guardAdvanceOutput, guardFeedbackOutput, guardHintOutput } from './outputGuardrails';
import { trace } from './tracing';

function stripQuestions(text?: string): string {
  const raw = (text || '').trim();
  if (!raw) return '';
  // Quita oraciones que terminen en ? o ¿ a nivel de frase, manteniendo el resto
  const sentences = raw.split(/(?<=[\.!?¿])\s+/).filter(Boolean);
  return sentences.filter(s => /[?¿]\s*$/.test(s.trim()) === false).join(' ');
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

// Antiduplicación interna: elimina oraciones repetidas dentro del mismo mensaje
function stripSelfDuplicates(text: string): string {
  const raw = (text || '').trim();
  if (!raw) return '';
  const bannedStart = /^los\s+procedimientos\s+de\s+seguridad\s+incluyen/i;
  const normMap = new Set<string>();
  const bannedSeen = new Set<string>();

  const paragraphs = raw.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
  const keptParas: string[] = [];
  for (const p of paragraphs) {
    const sentences = p.split(/(?<=[\.!?])\s+/).map(s => s.trim()).filter(Boolean);
    const keptSentences: string[] = [];
    for (const s of sentences) {
      if (!s) continue;
      const n = normalizeForMatch(s);
      if (!n) continue;
      if (bannedStart.test(s)) {
        const key = 'banned:los_procedimientos_de_seguridad_incluyen';
        if (bannedSeen.has(key)) continue;
        bannedSeen.add(key);
      }
      if (normMap.has(n)) continue;
      normMap.add(n);
      keptSentences.push(s);
    }
    const joined = keptSentences.join(' ')
      .replace(/\s+\n/g, '\n')
      .trim();
    if (joined) keptParas.push(joined);
  }
  return keptParas.join('\n\n').trim();
}

export async function runDocenteLLM(ctx: DocentePromptContext): Promise<{ message: string; followUp?: string }> {
  const system = buildSystemPrompt(ctx);
  const user = buildUserPrompt(ctx);
  const model = pickModel('cheap');
  let offline = false;
  let out = '';
  try {
    trace({ name: 'llm.call', timestamp: Date.now(), props: { action: ctx.action, model } });
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
    trace({ name: 'llm.ok', timestamp: Date.now(), props: { action: ctx.action, chars: out.length } });
  } catch {
    offline = true;
    trace({ name: 'llm.offline', timestamp: Date.now(), props: { action: ctx.action } });
  }

  if (!offline) {
    if (ctx.action === 'explain') {
      return { message: stripQuestions(out) };
    }
    if (ctx.action === 'ask') {
      const q = (ctx.questionText || '').trim();
      let msg = stripQuestions(out).replace(/^\s*Docente\s*:\s*/i, '').trim();
      msg = stripRepeatedFromHistory(msg, ctx);
      msg = stripSelfDuplicates(msg);
      const norm = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();
      const already = norm(msg).includes(norm(q));
      const merged = already ? msg : [msg, q].filter(Boolean).join('\n\n');
      return { message: merged };
    }
    if (ctx.action === 'ok' || ctx.action === 'advance') {
      let raw = out.replace(/^\s*Docente\s*:\s*/i, '').trim();
      // Intentar parsear PUENTE: en advance
      if (ctx.action === 'advance') {
        const m = raw.match(/PUENTE\s*:\s*(.+)$/im);
        if (m) {
          const bridge = stripSelfDuplicates(stripQuestions(m[1] || '').trim());
          const guarded = guardAdvanceOutput(ctx, bridge);
          trace({ name: 'llm.out.advance', timestamp: Date.now(), props: { chars: guarded.length } });
          return { message: guarded };
        }
      }
      let msg = stripQuestions(raw);
      msg = stripRepeatedFromHistory(msg, ctx);
      msg = stripSelfDuplicates(msg);
      const guarded = guardAdvanceOutput(ctx, msg);
      trace({ name: 'llm.out.advance', timestamp: Date.now(), props: { chars: guarded.length } });
      return { message: guarded };
    }
    if (ctx.action === 'hint') {
      let raw = out.replace(/^\s*Docente\s*:\s*/i, '').trim();
      // Parse labels: MICRO / PISTA
      const microMatch = raw.match(/^\s*MICRO\s*:\s*(.+)$/im);
      const pistaMatch = raw.match(/^\s*PISTA\s*:\s*(.+)$/im);
      if (microMatch || pistaMatch) {
        const fuLines = (microMatch?.[1] || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
        const fu = (fuLines[0] || '').trim();
        let hint = (pistaMatch?.[1] || '').trim();
        // Quitar prefijos redundantes como "Te doy una pista:" si vinieran del modelo
        hint = hint.replace(/^te\s+doy\s+una\s+pista\s*:\s*/i, '').trim();
        const cleaned = stripSelfDuplicates(stripRepeatedFromHistory(stripQuestions(hint), ctx));
        const guarded = guardHintOutput(ctx, { message: cleaned, followUp: fu });
        trace({ name: 'llm.out.hint', timestamp: Date.now(), props: { fuChars: (fu || '').length, msgChars: (guarded.message || '').length } });
        return guarded;
      }
      // Fallback a lógica anterior si no hay etiquetas
      let msg = stripQuestions(raw).trim();
      msg = stripRepeatedFromHistory(msg, ctx);
      msg = stripSelfDuplicates(msg);
      const follow = lastQuestion(raw);
      const guarded = guardHintOutput(ctx, { message: msg, followUp: follow });
      trace({ name: 'llm.out.hint', timestamp: Date.now(), props: { fuChars: (follow || '').length, msgChars: (guarded.message || '').length } });
      return guarded;
    }
    if (ctx.action === 'ask_simple' || ctx.action === 'ask_options') {
      const msg = stripSelfDuplicates(stripRepeatedFromHistory(out.replace(/^\s*Docente\s*:\s*/i, '').trim(), ctx));
      trace({ name: 'llm.out.ask', timestamp: Date.now(), props: { chars: msg.length, kind: ctx.action } });
      return { message: msg };
    }
    if (ctx.action === 'feedback') {
      const msg = stripSelfDuplicates(stripRepeatedFromHistory(out.replace(/^\s*Docente\s*:\s*/i, '').trim(), ctx));
      const guarded = guardFeedbackOutput(ctx, msg);
      trace({ name: 'llm.out.feedback', timestamp: Date.now(), props: { chars: guarded.length, kind: (ctx as any).kind } });
      return { message: guarded };
    }
    trace({ name: 'llm.out.raw', timestamp: Date.now(), props: { chars: out.length } });
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
    return { message: 'Te doy una pista: menciona 1–2 elementos clave del objetivo.', followUp: q ? q : '¿Una micro‑pregunta?' };
  }
  if (ctx.action === 'ask_simple' || ctx.action === 'ask_options') {
    return { message: q };
  }
  if (ctx.action === 'feedback') {
    return { message: 'FB: refuerzo/guía breve.' };
  }
  return { message: q };
}


