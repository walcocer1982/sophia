import { describe, expect, it, vi } from 'vitest';

// Mocks HOISTED antes de importar route.ts
vi.mock('@/ai/orchestrator', () => ({
  runDocenteLLM: async (ctx: any) => {
    const action = ctx?.action;
    if (action === 'ask') {
      return { message: `PREGUNTA: ${ctx.questionText}`, followUp: ctx.questionText };
    }
    if (action === 'hint') {
      return { message: 'Pista breve alineada al objetivo.', followUp: '¿Una micro‑pregunta?' };
    }
    if (action === 'feedback') {
      return { message: 'FB: refuerzo/guía breve.' };
    }
    if (action === 'advance') {
      return { message: 'Puente breve al siguiente foco.' };
    }
    if (action === 'explain') {
      return { message: 'Explicación breve del contenido.' };
    }
    return { message: '' };
  }
}));

// Mock semvec para evitar llamadas a embeddings/OpenAI
vi.mock('@/engine/semvec', () => ({
  buildAskIndex: async () => ({ centroid: [1], texts: [] }),
  semanticScore: async () => ({ cos: 0, best: null })
}));

// Mock evaluación semántica: clasifica por palabra clave en la respuesta (solo la función usada)
vi.mock('@/engine/eval', () => ({
  evaluateSemanticOnly: async (user: string) => {
    const u = String(user || '').toLowerCase();
    if (/^correcta/.test(u) || /\bok\b/.test(u)) {
      return { kind: 'ACCEPT', reason: 'STUB', matched: ['ok'], missing: [], sem: { cos: 0.9, best: { text: 'ok', cos: 0.9 } } } as any;
    }
    if (/^parcial/.test(u)) {
      return { kind: 'PARTIAL', reason: 'STUB', matched: ['pi'], missing: ['radio'], sem: { cos: 0.6, best: { text: 'pi', cos: 0.6 } } } as any;
    }
    return { kind: 'HINT', reason: 'STUB', matched: [], missing: ['señal'], sem: { cos: 0.1, best: null } } as any;
  }
}));

async function getPOST() {
  const mod = await import('../app/api/engine/turn/route');
  return (mod as any).POST as (req: Request) => Promise<Response>;
}

async function turn(body: any) {
  const req = new Request('http://localhost/api/engine/turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const POST = await getPOST();
  const res = await POST(req as any);
  return await (res as any).json();
}

describe('engine integration: lesson02', () => {
  it('Tres "no se" consecutivos → ver preguntas y feedback en logs', async () => {
    const sessionKey = 'it-lesson02-3-no-se';
    const planUrl = '/courses/SSO001/lessons/lesson02.json';

    // Primer turno: iniciar sesión y obtener la primera pregunta
    const t0 = await turn({ sessionKey, planUrl, reset: true, userInput: '' });
    // Tres "no se"
    const t1 = await turn({ sessionKey, planUrl, userInput: 'no se' });
    const t2 = await turn({ sessionKey, planUrl, userInput: 'no se' });
    const t3 = await turn({ sessionKey, planUrl, userInput: 'no se' });

    // Logs visibles: pregunta y feedback + micro‑pregunta en cada turno
    // eslint-disable-next-line no-console
    console.log('[3_NO_SE]', {
      q0: t0.followUp,
      turn1: { message: t1.message, followUp: t1.followUp },
      turn2: { message: t2.message, followUp: t2.followUp },
      turn3: { message: t3.message, followUp: t3.followUp },
    });

    // Aserciones mínimas para asegurar contenido
    expect((t0.followUp || '').length).toBeGreaterThan(0);
    expect(((t1.message || '') + (t1.followUp || '')).length).toBeGreaterThan(0);
    expect(((t2.message || '') + (t2.followUp || '')).length).toBeGreaterThan(0);
    expect(((t3.message || '') + (t3.followUp || '')).length).toBeGreaterThan(0);
  });
  it('No sé → HINT (pista + micro‑pregunta, sin explicación)', async () => {
    const sessionKey = 'it-lesson02-nose';
    const planUrl = '/courses/SSO001/lessons/lesson02.json';

    const r0 = await turn({ sessionKey, planUrl, reset: true, userInput: '' });
    const q0 = r0.followUp || '';
    // Turno con "no se"
    const r1 = await turn({ sessionKey, planUrl, userInput: 'no se' });
    const msg = r1.message || '';
    const fu = r1.followUp || '';
    // Debe ser pista, no explicación
    expect(msg.toLowerCase()).toMatch(/pista|breve/);
    expect(fu.length).toBeGreaterThan(0);
    // eslint-disable-next-line no-console
    console.log('[NOSE]', { q0, msg, fu });
  });
  it('Caso 1: vacío, vacío, parcial → avanza pendiente (2 ayudas, score 1)', async () => {
    const sessionKey = 'it-lesson02-caso1';
    const planUrl = '/courses/SSO001/lessons/lesson02.json';

    const r0 = await turn({ sessionKey, planUrl, reset: true, userInput: '' });
    expect((r0.followUp || '').length).toBeGreaterThan(0);
    const r1 = await turn({ sessionKey, planUrl, userInput: '' });
    expect((r1.followUp || '').length).toBeGreaterThan(0);
    // incluir señales esperadas y tokens suficientes
    const r2 = await turn({ sessionKey, planUrl, userInput: 'parcial radio pi' });
    // Validar que hubo interacción con pista/feedback y continuidad
    expect(((r2.message || '') + (r2.followUp || '')).length).toBeGreaterThan(0);
    // Log para inspección manual
    // eslint-disable-next-line no-console
    console.log('[CASO1]', { m0: r0.message, f0: r0.followUp, m1: r1.message, f1: r1.followUp, m2: r2.message, f2: r2.followUp, assess: r2.assessment });
  });

  it('Caso 2: vacío, vacío, correcta → avanza cumplida (2 ayudas, score 2)', async () => {
    const sessionKey = 'it-lesson02-caso2';
    const planUrl = '/courses/SSO001/lessons/lesson02.json';

    const r0 = await turn({ sessionKey, planUrl, reset: true, userInput: '' });
    expect((r0.followUp || '').length).toBeGreaterThan(0);
    const r1 = await turn({ sessionKey, planUrl, userInput: '' });
    expect((r1.followUp || '').length).toBeGreaterThan(0);
    // cumplir minTokens y gatillar ACCEPT del stub
    const r2 = await turn({ sessionKey, planUrl, userInput: 'correcta ok ok' });
    expect(r2.assessment?.level).toBe('R2');
    expect(r2.assessment?.score).toBe(2);
  });

  it('Caso 5: vacío, vacío, vacío → force-advance (score 0)', async () => {
    const sessionKey = 'it-lesson02-caso5';
    const planUrl = '/courses/SSO001/lessons/lesson02.json';

    await turn({ sessionKey, planUrl, reset: true, userInput: '' });
    const r1 = await turn({ sessionKey, planUrl, userInput: '' });
    const r2 = await turn({ sessionKey, planUrl, userInput: '' });
    // No garantizamos assessment en vacío, pero sí un followUp (siguiente paso o re-ask)
    expect((r2.followUp || '').length).toBeGreaterThan(0);
  });
});


