import { describe, expect, it, vi } from 'vitest';

// Mock semvec and escalation to evitar dependencias de IA en tests
vi.mock('@/engine/semvec', () => ({
  buildAskIndex: async () => ({ centroid: [1], texts: [] }),
  semanticScore: async () => ({ cos: 0, best: null })
}));
vi.mock('@/engine/eval-escalation', () => ({
  escalateReasoning: async () => ({ decision: 'HINT', short: 'stub' })
}));

import { classifyTurn, type AskPolicy } from '../src/engine/eval';

describe('evaluate/classifyTurn basic cases', () => {
  it('capital of France: ACCEPT with "París"', () => {
    const policy: AskPolicy = { type: 'conceptual' };
    const acceptable = ['Paris', 'París'];
    const expected: string[] = [];
    const r = classifyTurn('París', policy, acceptable, expected);
    expect(r.kind).toBe('ACCEPT');
  });

  it('area circle: PARTIAL with mention of "pi"', () => {
    const policy: AskPolicy = { type: 'conceptual' };
    const acceptable: string[] = ['πr2', 'πr^2', 'pi r2'];
    const expected: string[] = ['pi', 'radio', 'cuadrado'];
    const r = classifyTurn('algo con pi', policy, acceptable, expected);
    expect(r.kind).toBe('PARTIAL');
  });

  it('listado: ACCEPT when k-of-n is met', () => {
    const policy: AskPolicy = { type: 'listado', thresholdK: 2 };
    const acceptable: string[] = ['casco', 'guantes', 'lentes'];
    const expected: string[] = [];
    const r = classifyTurn('casco y guantes obligatorios', policy, acceptable, expected);
    expect(r.kind).toBe('ACCEPT');
  });

  it('listado: PARTIAL when below k', () => {
    const policy: AskPolicy = { type: 'listado', thresholdK: 2 };
    const acceptable: string[] = ['casco', 'guantes', 'lentes'];
    const expected: string[] = [];
    const r = classifyTurn('casco', policy, acceptable, expected);
    expect(r.kind).toBe('PARTIAL');
  });

  it('no sé -> HINT', () => {
    const policy: AskPolicy = { type: 'conceptual' };
    const acceptable: string[] = ['procedimiento'];
    const expected: string[] = ['partes', 'aplicación'];
    const r = classifyTurn('no sé', policy, acceptable, expected);
    expect(r.kind).toBe('HINT');
  });
});


