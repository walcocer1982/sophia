import { getClient } from '@/lib/ai';
import { z } from 'zod';
import { getBudgetManager, pickModelWithBudget } from './costs';

// Esquema Zod para validación estricta del JSON
const EscalationResponseSchema = z.object({
  decision: z.enum(['ACCEPT', 'HINT', 'REASK']),
  short: z.string().min(1).max(200),
  reason: z.enum(['SEM_LOW', 'THINKER_ESCALATION', 'OFF_TOPIC', 'BUDGET_LIMIT']).optional()
});

export type EscalationResponse = z.infer<typeof EscalationResponseSchema>;

export async function escalateReasoning(input: {
  student: string;
  objective: string;
  acceptable: string[];
  expected: string[];
  matched: string[];
  missing: string[];
  hintsUsed: number;
}): Promise<EscalationResponse> {
  const budgetManager = getBudgetManager();
  
  // Verificar presupuesto antes de escalar
  if (!budgetManager.canEscalate()) {
    return {
      decision: 'HINT',
      short: 'Considera revisar los conceptos clave mencionados.',
      reason: 'BUDGET_LIMIT'
    };
  }

  const ai = getClient();
  const model = pickModelWithBudget('thinker');
  
  const sys = [
    'Eres un evaluador estricto.',
    'Devuelve SOLO JSON con: { "decision": "ACCEPT|HINT|REASK", "short": "texto breve", "reason": "SEM_LOW|THINKER_ESCALATION|OFF_TOPIC" }. Sin comentarios.'
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

  try {
    const res = await ai.responses.create({
      model,
      reasoning: { effort: 'medium' },
      input: [
        { role: 'system', content: sys },
        { role: 'user',   content: user }
      ],
      max_output_tokens: 120
    });

    const raw = res.output_text || '{}';
    
    // Validar con Zod antes de usar
    const parsed = JSON.parse(raw);
    const validated = EscalationResponseSchema.parse(parsed);
    
    // Registrar uso en el presupuesto
    budgetManager.recordUsage('thinker', 200);
    
    return validated;
  } catch (error) {
    // Fallback seguro si falla la validación o la llamada
    return {
      decision: 'REASK',
      short: 'Reformula tu respuesta con más precisión.',
      reason: 'THINKER_ESCALATION'
    };
  }
}
