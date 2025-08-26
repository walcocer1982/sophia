import type { DocentePromptContext } from './prompt_parts/types';

function normalizeWhitespace(text: string): string {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function splitIntoSentences(text: string): string[] {
  const raw = normalizeWhitespace(text);
  if (!raw) return [];
  return raw.split(/(?<=[\.!?])\s+/).map(s => s.trim()).filter(Boolean);
}

function joinFirstSentences(text: string, maxSentences: number): string {
  const sentences = splitIntoSentences(text);
  return sentences.slice(0, Math.max(1, maxSentences)).join(' ').trim();
}

function removeInterrogativeSentences(text: string): string {
  const sentences = splitIntoSentences(text);
  const kept = sentences.filter(s => !/[?¿]\s*$/.test(s));
  return kept.join(' ').trim();
}

function wordCount(text: string): number {
  const t = normalizeWhitespace(text);
  if (!t) return 0;
  return t.split(' ').length;
}

function truncateToWords(text: string, maxWords: number): string {
  const t = normalizeWhitespace(text);
  if (!t) return '';
  const parts = t.split(' ');
  if (parts.length <= maxWords) return t;
  return parts.slice(0, Math.max(1, maxWords)).join(' ').trim();
}

export function guardHintOutput(
  ctx: DocentePromptContext,
  out: { message: string; followUp?: string }
): { message: string; followUp: string } {
  const limit = Number(ctx.hintWordLimit || 18);

  // Limpiar followUp (MICRO)
  let fu = String(out.followUp || '').replace(/^\s*MICRO\s*:\s*/i, '').trim();
  if (!fu) {
    fu = String(ctx.questionText || '').trim();
  }
  // ≤ 8 palabras
  fu = truncateToWords(fu, 8);

  // Limpiar message (PISTA)
  let msg = String(out.message || '')
    .replace(/^\s*PISTA\s*:\s*/i, '')
    .replace(/^\s*te\s+doy\s+una\s+pista\s*:\s*/i, '')
    .trim();
  // Sin preguntas en pista
  msg = removeInterrogativeSentences(msg);
  // Límite de palabras
  msg = truncateToWords(msg, limit);

  return { message: msg, followUp: fu };
}

export function guardAdvanceOutput(
  _ctx: DocentePromptContext,
  message: string
): string {
  if (!message) return 'Puente breve al siguiente foco.';
  // Breve y sin preguntas
  let out = removeInterrogativeSentences(message);
  out = joinFirstSentences(out, 2);
  return out || 'Puente breve al siguiente foco.';
}

export function guardFeedbackOutput(
  ctx: DocentePromptContext,
  message: string,
  maxSentences: number = 3
): string {
  let out = String(message || '').trim();
  if (ctx.allowQuestions === false) {
    out = removeInterrogativeSentences(out);
  }
  out = joinFirstSentences(out, Math.max(1, maxSentences));
  return out;
}
