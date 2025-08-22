import { describe, expect, it } from 'vitest';
import { isNoSeInput, shouldClarifyQuestion, shouldGateByMinTokens } from '../src/engine/clarify';

describe('clarify helpers', () => {
  it('gates by min tokens', () => {
    expect(shouldGateByMinTokens('', 3)).toBe(true);
    expect(shouldGateByMinTokens('no se', 3)).toBe(true);
    expect(shouldGateByMinTokens('algo breve', 2)).toBe(false);
  });

  it('detects no se patterns', () => {
    expect(isNoSeInput('no se')).toBe(true);
    expect(isNoSeInput('No sé')).toBe(true);
    expect(isNoSeInput('no estoy seguro')).toBe(true);
    expect(isNoSeInput('sí')).toBe(false);
  });

  it('clarify only when not vague/no and not hint', () => {
    expect(shouldClarifyQuestion({ isVague: false, isNo: false, classificationKind: 'PARTIAL', studentAsking: true })).toBe(true);
    expect(shouldClarifyQuestion({ isVague: true, isNo: false, classificationKind: 'PARTIAL', studentAsking: true })).toBe(false);
    expect(shouldClarifyQuestion({ isVague: false, isNo: true, classificationKind: 'PARTIAL', studentAsking: true })).toBe(false);
    expect(shouldClarifyQuestion({ isVague: false, isNo: false, classificationKind: 'HINT', studentAsking: true })).toBe(false);
    expect(shouldClarifyQuestion({ isVague: false, isNo: false, classificationKind: 'PARTIAL', studentAsking: false })).toBe(false);
  });
});


