import { describe, expect, it } from 'vitest';
import { buildUserPrompt } from '../src/ai/prompt';

describe('prompt: hint anti-meta rule', () => {
  it('includes anti-meta guidance in hint prompts', () => {
    const prompt = buildUserPrompt({
      language: 'es',
      action: 'hint',
      stepType: 'ASK',
      questionText: '¿Qué esperas aprender sobre procedimientos de seguridad?',
      objective: 'procedimientos de seguridad',
      contentBody: ['partes del procedimiento', 'cómo se aplica', 'importancia de seguirlos'],
      hintWordLimit: 18,
    } as any);
    expect(prompt).toMatch(/Evita frases meta/i);
  });
});


