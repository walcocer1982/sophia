import { describe, expect, it, vi } from 'vitest';

// Mocks hoisted para aislar el handler del engine
let __hintCount = 0;
vi.mock('@/ai/orchestrator', () => ({
  runDocenteLLM: async (ctx: any) => {
    const action = ctx?.action;
    if (action === 'ask') {
      return { message: `PREGUNTA: ${ctx.questionText}`, followUp: ctx.questionText };
    }
    if (action === 'hint') {
      __hintCount += 1;
      const fu = __hintCount === 1
        ? '¿Una micro‑pregunta?'
        : (__hintCount === 2 ? '¿Una micro‑pregunta más fácil?' : '¿Una micro‑pregunta?');
      return { message: 'Pista breve alineada al objetivo.', followUp: fu };
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

// Mock semvec para evitar embeddings/OpenAI
vi.mock('@/engine/semvec', () => ({
  buildAskIndex: async () => ({ centroid: [1], texts: [] }),
  semanticScore: async () => ({ cos: 0, best: null })
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

describe('engine: tres "no se" consecutivos', () => {
  it('emite HINT dos veces y luego puente de avance (force_advance)', async () => {
    const sessionKey = 'it-3-no-se';
    const planUrl = '/courses/SSO001/lessons/lesson02.json';

    // Inicio de sesión → obtener primera pregunta
    const t0 = await turn({ sessionKey, planUrl, reset: true, userInput: '' });
    expect((t0.followUp || '').length).toBeGreaterThan(0);

    // 1) no se → HINT
    const t1 = await turn({ sessionKey, planUrl, userInput: 'no se' });
    expect(((t1.message || '') + (t1.followUp || '')).length).toBeGreaterThan(0);
    // 2) no se → HINT
    const t2 = await turn({ sessionKey, planUrl, userInput: 'no se' });
    expect(((t2.message || '') + (t2.followUp || '')).length).toBeGreaterThan(0);
    // 3) no se → avance forzado: debe incluir el puente de avance del mock
    const t3 = await turn({ sessionKey, planUrl, userInput: 'no se' });
    expect((t3.message || '').toLowerCase()).toContain('puente breve al siguiente foco');
    expect((t3.followUp || '').length).toBeGreaterThan(0);
  });

  it('valida feedback y followUp en HINT→HINT/ADV→force_advance', async () => {
    const sessionKey = 'it-3-no-se-fb';
    const planUrl = '/courses/SSO001/lessons/lesson02.json';

    const t0 = await turn({ sessionKey, planUrl, reset: true, userInput: '' });
    expect((t0.followUp || '').length).toBeGreaterThan(0);

    // 1) no se → HINT con feedback/hint y micro‑pregunta
    const t1 = await turn({ sessionKey, planUrl, userInput: 'no se' });
    const msg1 = (t1.message || '').toLowerCase();
    const fu1 = (t1.followUp || '').toLowerCase();
    expect(msg1).toMatch(/fb: refuerzo|pista breve alineada|explicación breve|puente breve/);
    expect(fu1.length).toBeGreaterThan(0);

    // 2) no se → HINT o transición temprana según política
    const t2 = await turn({ sessionKey, planUrl, userInput: 'no se' });
    const msg2 = (t2.message || '').toLowerCase();
    const fu2 = (t2.followUp || '').toLowerCase();
    expect(msg2).toMatch(/fb: refuerzo|pista breve alineada|explicación breve|puente breve/);
    expect(fu2.length).toBeGreaterThan(0);

    // 3) no se → avance con puente y nueva followUp (force_advance)
    const t3 = await turn({ sessionKey, planUrl, userInput: 'no se' });
    const msg3 = (t3.message || '').toLowerCase();
    const fu3 = (t3.followUp || '').toLowerCase();
    expect(msg3).toContain('puente breve al siguiente foco');
    expect(fu3.length).toBeGreaterThan(0);
  });

  it('force_advance tras dos "no se" (dos HINT → avance)', async () => {
    const sessionKey = 'it-2-no-se-advance';
    const planUrl = '/courses/SSO001/lessons/lesson02.json';

    const t0 = await turn({ sessionKey, planUrl, reset: true, userInput: '' });
    expect((t0.followUp || '').length).toBeGreaterThan(0);

    const t1 = await turn({ sessionKey, planUrl, userInput: 'no se' });
    const msg1 = (t1.message || '').toLowerCase();
    expect(msg1.length).toBeGreaterThan(0);

    const t2 = await turn({ sessionKey, planUrl, userInput: 'no se' });
    const msg2 = (t2.message || '').toLowerCase();
    const fu2 = (t2.followUp || '').toLowerCase();
    // Debe contener el puente de avance y un nuevo followUp
    expect(msg2).toContain('puente breve al siguiente foco');
    expect(fu2.length).toBeGreaterThan(0);
  });

  it('pregunta → no se → pista fácil → no se → pista más fácil → no se → avance', async () => {
    const sessionKey = 'it-escalada-hints';
    const planUrl = '/courses/SSO001/lessons/lesson02.json';

    const t0 = await turn({ sessionKey, planUrl, reset: true, userInput: '' });
    expect((t0.followUp || '').length).toBeGreaterThan(0);

    // 1) no se → feedback+hint con followUp “micro‑pregunta”
    const t1 = await turn({ sessionKey, planUrl, userInput: 'no se' });
    expect(((t1.message || '').toLowerCase())).toMatch(/pista breve|fb: refuerzo/);
    const fu1s = (t1.followUp || '').toLowerCase();
    expect(fu1s.length).toBeGreaterThan(0);

    // 2) no se → feedback+hint con followUp “más fácil”
    const t2 = await turn({ sessionKey, planUrl, userInput: 'no se' });
    expect(((t2.message || '').toLowerCase())).toMatch(/pista breve|fb: refuerzo|puente breve/);
    const fu2s = (t2.followUp || '').toLowerCase();
    expect(fu2s.length).toBeGreaterThan(0);
    // Si ya hubo avance en el segundo, igual debe haber followUp (siguiente pregunta)

    // 3) no se → feedback + mensaje “avancemos” (puente) y nueva pregunta
    const t3 = await turn({ sessionKey, planUrl, userInput: 'no se' });
    expect((t3.message || '').toLowerCase()).toContain('puente breve al siguiente foco');
    expect((t3.followUp || '').length).toBeGreaterThan(0);
  });
});


