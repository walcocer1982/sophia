import { getClient, pickModel } from '@/lib/ai';

type Decision = 'ACCEPT'|'HINT'|'REASK';

export async function escalateReasoning(input: {
  student: string;
  objective: string;
  acceptable: string[];
  expected: string[];
  matched: string[];
  missing: string[];
  hintsUsed: number;
}) {
  const ai = getClient();
  const model = pickModel('thinker'); // <-- o3-mini por env
  const sys = [
    'Eres un evaluador estricto.',
    'Devuelve SOLO JSON con: { "decision": "ACCEPT|HINT|REASK", "short": "texto breve" }. Sin comentarios.'
  ].join('\n');

  const user = `
Objetivo: ${input.objective}
Respuesta del alumno: ${input.student}
Acceptable: ${input.acceptable.join(', ')}
Expected: ${input.expected.join(', ')}
Matched: ${input.matched.join(', ')}
Missing: ${input.missing.join(', ')}
Hints usadas: ${input.hintsUsed}
Regla: si faltan conceptos críticos -> HINT con pista breve; si es off-topic/vago -> REASK; si cumple -> ACCEPT.
`;

  const res = await ai.responses.create({
    model,
    // Opcional: esfuerzo de razonamiento bajo/medio
    reasoning: { effort: 'medium' },
    input: [
      { role: 'system', content: sys },
      { role: 'user',   content: user }
    ],
    max_output_tokens: 120,
    response_format: { type: 'json_object' }
  });

  const raw = res.output_text || '{}';
  let parsed: { decision: Decision; short: string } = { decision: 'REASK', short: 'Reformula tu idea con más precisión.' };
  try { parsed = JSON.parse(raw); } catch {}
  return parsed;
}
