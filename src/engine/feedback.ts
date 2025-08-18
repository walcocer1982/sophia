export type FeedbackClass = {
  kind: 'ACCEPT'|'PARTIAL'|'HINT'|'REFOCUS';
  matched?: string[];
  missing?: string[];
};

export function buildDeterministicFeedback(
  cls: FeedbackClass,
  opts: {
    attempts: number;            // intentos de respuesta del alumno
    hintsUsed: number;           // pistas ya usadas en ESTA pregunta
    coursePolicies?: any;        // policies.json ya cargadas
  }
): string {
  const has = (arr?: string[]) => Array.isArray(arr) && arr.length > 0;

  // 1) Mensajes cortos por estado (evita muletillas)
  if (cls.kind === 'ACCEPT' && has(cls.matched)) {
    return `Bien: mencionaste ${cls.matched!.join(', ')}.`;
  }
  if (cls.kind === 'PARTIAL') {
    const a = has(cls.matched) ? `acertaste ${cls.matched!.join(', ')}` : 'ya estás cerca';
    const missTop = has(cls.missing) ? `Te falta incluir ${cls.missing!.slice(0,2).join(', ')}.` : '';
    return `Vas bien: ${a}. ${missTop}`.trim();
  }

  // 2) Abridores configurables (rotar por número de pistas, no por attempts)
  const openers: string[] = (opts.coursePolicies?.feedback?.openers?.hint || []) as string[];
  const idx = (opts.hintsUsed % Math.max(1, openers.length || 1)); // <— ROTA DE VERDAD
  const opener = openers[idx] || 'Intenta precisar un poco más.';
  
  // 3) En HINT/REFOCUS devolver solo el opener.
  // La pista concreta se compone en hints.ts y se integra en route.ts
  return opener;
}
