import type { DocenteAction, DocentePromptContext } from './prompt_parts/types';
import { buildSystemPrompt as buildSystemPromptParts } from './prompt_parts/system';
import { renderAsk, renderExplain, renderFeedback, renderHint } from './prompt_parts/user';

export function buildSystemPrompt(ctx: DocentePromptContext): string { return buildSystemPromptParts(ctx); }

export function buildUserPrompt(ctx: DocentePromptContext): string {
  const lines: string[] = [];

  // Helpers
  const pushIf = (cond: any, s: string) => { if (cond) lines.push(s.trim()); };
  const hasAny = (...vals: Array<string | string[] | undefined | null>) =>
    vals.some(v => Array.isArray(v) ? v.filter(Boolean).length > 0 : !!v);

  // Header
  pushIf(true, `Momento: ${ctx.momentTitle || ''}`); // permite vacío pero mantiene etiqueta
  pushIf(ctx.objective, `Objetivo: ${ctx.objective}`);

  // Normalizaciones
  const contentItems = Array.from(new Set((ctx.contentBody || [])
    .filter(Boolean)
    .map(s => String(s).trim())))
    .slice(0, 20);
  const safeAnswer = String(ctx.userAnswer || '').trim().slice(0, 300);
  const matched = Array.from(new Set(ctx.matched || [])).filter(Boolean).slice(0, 8);
  const missing = Array.from(new Set(ctx.missing || [])).filter(Boolean).slice(0, 8);
  const recent = (ctx.recentHistory || []).slice(-3).join(' | ');
  pushIf(recent, `Historial reciente: ${recent}`);
  pushIf(ctx.closureCriteria, `Criterio de cierre: ${ctx.closureCriteria}`);

  switch (ctx.action) {
    case 'explain': { renderExplain(ctx, lines, contentItems); break; }

    case 'ask': { renderAsk(ctx, lines); break; }

    case 'hint': { renderHint(ctx, lines, contentItems, matched, missing); break; }

    case 'ask_simple': {
      if (!ctx.questionText) lines.push('Falta la pregunta.');
      pushIf(ctx.questionText, `Pregunta: ${ctx.questionText}`);
      const opts = Array.from(new Set(ctx.simpleOptions || [])).filter(Boolean).slice(0, 5);
      if (opts.length) {
        lines.push(`Opciones (elige una): ${opts.join(' / ')}`);
      }
      lines.push('Tarea: formula la elección de forma clara y breve. No re‑narrar el caso.');
      break;
    }

    case 'ask_options': {
      if (!ctx.questionText) lines.push('Falta la pregunta.');
      pushIf(ctx.questionText, `Pregunta: ${ctx.questionText}`);
      pushIf(ctx.objective, `Objetivo: ${ctx.objective}`);
      const items = Array.from(new Set(ctx.optionItems || [])).filter(Boolean).slice(0, 5);
      if (items.length) {
        const labeled = items.map((s, i) => `${String.fromCharCode(65 + i)}) ${s}`);
        lines.push(`Opciones (alineadas al Objetivo): ${labeled.join(' | ')}`);
      }
      lines.push('Tarea: pide que elija una opción (A, B, C, …) y espera su selección. No re‑narrar el caso. Si procede, recuerda en 1 frase cómo la elección ayuda a cumplir el Objetivo.');
      break;
    }

    case 'ok': {
      if (!ctx.questionText) lines.push('Falta la pregunta que se está validando.');
      pushIf(ctx.questionText, `Pregunta: ${ctx.questionText}`);
      pushIf(matched.length, `Aciertos: ${matched.join(', ')}`);
      pushIf(missing.length, `Faltantes: ${missing.join(', ')}`);
      lines.push('Tarea: en 1–2 frases, reconoce lo correcto citando los aciertos y, si aplica, orienta brevemente lo que falta, sin preguntas. No introduzcas contenido nuevo.');
      break;
    }

    case 'advance': {
      lines.push('Tarea: puente corto al siguiente foco en ≤14 palabras.');
      lines.push('Formato de salida: EXACTAMENTE 1 línea:');
      lines.push('PUENTE: <tu puente breve>');
      break;
    }

    case 'end': {
      lines.push('Tarea: cierre final breve.');
      break;
    }

    case 'feedback': { renderFeedback(ctx, lines, contentItems, matched, missing); break; }

    default: {
      lines.push(`Acción desconocida: ${String((ctx as any).action)}`);
      break;
    }
  }

  // Limpieza final: sin líneas vacías y con espacios normalizados
  return lines
    .map(s => s.trim())
    .filter(Boolean)
    .join('\n');
}


