import type { SessionState } from '@/session/state';
import { z } from 'zod';
import { getCycleIndexForStep, getNextAskInSameCycle } from './runner';

// Esquema Zod para comandos de adaptación acotados
export const AdaptCommandSchema = z.object({
  op: z.enum(['reask', 'hint', 'goto', 'repeat', 'insert_micro']),
  targetAskCode: z.string().optional(),
  note: z.string().optional(),
  reason: z.enum(['SEM_LOW', 'THINKER_ESCALATION', 'OFF_TOPIC', 'BUDGET_LIMIT']).optional()
});

export type AdaptCommand = z.infer<typeof AdaptCommandSchema>;

// Tipos para el contexto de planificación
export type PlanningContext = {
  state: SessionState;
  currentCycleIndex?: number;
  shortHistory: Array<{
    stepIdx: number;
    action: string;
    response?: string;
  }>;
  budgetCentsLeft: number;
  escalationsUsed: number;
};

// Evaluación de desvío de tema
export type TopicDeviation = 'ON_TOPIC' | 'VAGUE' | 'OFF_TOPIC';

export function detectTopicDeviation(
  studentResponse: string,
  currentStep: any,
  objective: string
): TopicDeviation {
  const response = studentResponse.toLowerCase().trim();
  const objectiveWords = objective.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  // Palabras clave del objetivo presentes
  const objectiveMatches = objectiveWords.filter(word => response.includes(word));
  const matchRatio = objectiveMatches.length / Math.max(1, objectiveWords.length);
  
  if (matchRatio >= 0.3) return 'ON_TOPIC';
  if (matchRatio >= 0.1) return 'VAGUE';
  return 'OFF_TOPIC';
}

// Planificador principal acotado
export function planAdaptation(context: PlanningContext): AdaptCommand | null {
  const { state, budgetCentsLeft, escalationsUsed } = context;
  const currentStep = state.plan?.allSteps?.[state.stepIdx];
  
  if (!currentStep || currentStep.type !== 'ASK') {
    return null; // Solo adaptamos en pasos ASK
  }

  // Verificar presupuesto antes de escalar
  const canEscalate = budgetCentsLeft > 10 && escalationsUsed < 5;
  
  // Si no hay presupuesto, forzar HINT determinista
  if (!canEscalate) {
    return {
      op: 'hint',
      reason: 'BUDGET_LIMIT',
      note: 'Presupuesto agotado, usando hint determinista'
    };
  }

  // Detectar desvío de tema
  const deviation = detectTopicDeviation(
    context.shortHistory[context.shortHistory.length - 1]?.response || '',
    currentStep,
    currentStep.data?.objective ?? ''
  );

  if (deviation === 'OFF_TOPIC') {
    // Proponer bridge corto y volver al ciclo actual
    const nextAskInCycle = getNextAskInSameCycle(state, state.stepIdx);
    if (nextAskInCycle !== undefined) {
      return {
        op: 'goto',
        targetAskCode: state.plan?.allSteps?.[nextAskInCycle]?.code,
        reason: 'OFF_TOPIC',
        note: 'Desvío detectado, redirigiendo a siguiente pregunta del ciclo'
      };
    }
  }

  if (deviation === 'VAGUE') {
    return {
      op: 'reask',
      reason: 'SEM_LOW',
      note: 'Respuesta vaga, solicitando reformulación'
    };
  }

  // Si está on-topic pero necesita escalación, el evaluador decidirá
  return null;
}

// Validar comando antes de ejecutar
export function validateAdaptCommand(command: AdaptCommand, state: SessionState): boolean {
  try {
    AdaptCommandSchema.parse(command);
    
    // Validaciones adicionales de contexto
    if (command.op === 'goto' && command.targetAskCode) {
      const targetStep = state.plan?.allSteps?.find(s => s.code === command.targetAskCode);
      if (!targetStep) return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// Aplicar comando al estado (sin modificar el plan)
export function applyAdaptCommand(command: AdaptCommand, state: SessionState): SessionState {
  if (!validateAdaptCommand(command, state)) {
    return state; // No aplicar si no es válido
  }

  switch (command.op) {
    case 'repeat':
      // Repetir el paso actual sin avanzar
      return { ...state };
      
    case 'goto':
      if (command.targetAskCode) {
        const targetIdx = state.plan?.allSteps?.findIndex(s => s.code === command.targetAskCode);
        if (targetIdx !== undefined && targetIdx >= 0) {
          return { ...state, stepIdx: targetIdx };
        }
      }
      return state;
      
    case 'reask':
    case 'hint':
      // No avanzar, mantener en el paso actual
      return { ...state };
      
    case 'insert_micro':
      // Solo permitir micro-pasos dentro del ciclo actual
      const currentCycle = getCycleIndexForStep(state, state.stepIdx);
      if (currentCycle !== undefined) {
        // Aquí se podría insertar un paso temporal, pero por ahora solo mantenemos posición
        return { ...state };
      }
      return state;
      
    default:
      return state;
  }
}
