export type ClassificationKind = 'ACCEPT' | 'PARTIAL' | 'HINT' | 'REFOCUS' | string;

export function shouldClarifyQuestion(opts: {
  isVague: boolean;
  isNo: boolean;
  classificationKind: ClassificationKind;
  studentAsking: boolean;
}): boolean {
  const { isVague, isNo, classificationKind, studentAsking } = opts;
  return !isVague && !isNo && classificationKind !== 'HINT' && Boolean(studentAsking);
}

export function shouldGateByMinTokens(text: string, minTokens: number = 3): boolean {
  const raw = String(text || '').trim();
  if (!raw) return true;
  const tokens = raw.split(/\s+/).filter(Boolean);
  return tokens.length < Math.max(1, Math.floor(minTokens));
}

export function isNoSeInput(text?: string): boolean {
  const t = String(text || '').trim();
  if (!t) return true;
  return /^(no\s*(lo\s*)?s[eé]|no\s*est[oó]y?\s*seguro|no\s*s[eé]\s*bien)$/i.test(t);
}


