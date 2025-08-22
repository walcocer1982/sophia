export type FeedbackKind = 'ACCEPT' | 'PARTIAL' | 'HINT' | 'REFOCUS' | string;

export function computeFeedbackLabel(kind: FeedbackKind, attempt: number): 'F0'|'F1'|'F2' {
  const a = Math.max(0, Number(attempt || 0));
  if (String(kind).toUpperCase() === 'HINT') {
    return a <= 1 ? 'F0' : 'F1';
  }
  return 'F2';
}

export function buildTraceEntry(args: {
  question: string;
  response: string;
  feedback: string;
  kind: FeedbackKind;
  attempt: number;
  hintsUsed?: number;
  stepCode?: string;
}) {
  const { question, response, feedback, kind, attempt, hintsUsed = 0, stepCode = '' } = args;
  const label = computeFeedbackLabel(kind, attempt);
  return {
    label, // F0/F1/F2
    kind,
    p: String(question || ''),
    r: String(response || ''),
    f: String(feedback || ''),
    attempt: Number(attempt || 0),
    hintsUsed: Number(hintsUsed || 0),
    stepCode: String(stepCode || '')
  };
}


