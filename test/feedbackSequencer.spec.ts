import { describe, expect, it } from 'vitest';
import { buildTraceEntry, computeFeedbackLabel } from '../src/engine/feedbackSequencer';

describe('feedbackSequencer', () => {
  it('computeFeedbackLabel: HINT → F0/F1 según intento', () => {
    expect(computeFeedbackLabel('HINT', 0)).toBe('F0');
    expect(computeFeedbackLabel('HINT', 1)).toBe('F0');
    expect(computeFeedbackLabel('HINT', 2)).toBe('F1');
  });

  it('computeFeedbackLabel: PARTIAL/ACCEPT → F2', () => {
    expect(computeFeedbackLabel('PARTIAL', 0)).toBe('F2');
    expect(computeFeedbackLabel('ACCEPT', 1)).toBe('F2');
  });

  it('buildTraceEntry: estructura P/R/F con metadatos', () => {
    const t = buildTraceEntry({
      question: 'P0',
      response: 'R0',
      feedback: 'F0',
      kind: 'HINT',
      attempt: 1,
      hintsUsed: 2,
      stepCode: 'M1-Q01'
    });
    expect(t.label).toBe('F0');
    expect(t.kind).toBe('HINT');
    expect(t.p).toBe('P0');
    expect(t.r).toBe('R0');
    expect(t.f).toBe('F0');
    expect(t.attempt).toBe(1);
    expect(t.hintsUsed).toBe(2);
    expect(t.stepCode).toBe('M1-Q01');
  });
});



