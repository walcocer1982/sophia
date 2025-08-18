import type { PlanStep } from '@/plan/types';
import type { SessionState } from '@/session/state';
import { getBudgetManager } from './costs';
import { log } from './logger';
import { applyAdaptCommand, planAdaptation, type PlanningContext } from './planner';

export type SkipAction = { kind: 'skip'; step?: PlanStep };
export type ExplainAction = { kind: 'explain'; step: PlanStep };
export type AskAction = { kind: 'ask'; step: PlanStep };
export type EndAction = { kind: 'end' };
export type EngineAction = SkipAction | ExplainAction | AskAction | EndAction;

export function currentStep(state?: SessionState): PlanStep | undefined {
	const steps = state?.plan?.allSteps || [];
	if (typeof state?.stepIdx !== 'number') return undefined;
	if (state.stepIdx < 0 || state.stepIdx >= steps.length) return undefined;
	return steps[state.stepIdx];
}

export function decideAction(step?: PlanStep, state?: SessionState): EngineAction {
	if (!step) return { kind: 'end' };
	
			// Si el modo adaptativo está activado y es un paso ASK, consultar al planificador
		if (state?.adaptiveMode && step.type === 'ASK') {
			const budgetManager = getBudgetManager();
			const metrics = budgetManager.getUsageMetrics();
			
			// Obtener historial corto para el contexto
			const shortHistory: Array<{
				stepIdx: number;
				action: string;
				response?: string;
			}> = []; // TODO: Implementar historial real cuando se necesite
			
			const context: PlanningContext = {
				state: state,
				shortHistory,
				budgetCentsLeft: metrics.budgetCentsLeft,
				escalationsUsed: state.escalationsUsed || 0
			};
			
			const adaptation = planAdaptation(context);
			if (adaptation) {
				// Aplicar la adaptación al estado
				const adaptedState = applyAdaptCommand(adaptation, state);
				// Actualizar el estado global con la adaptación
				Object.assign(state, adaptedState);
				// Log de adaptación aplicada
				log.adaptation('session-' + Date.now(), adaptation);
			}
		}
	
	switch (step.type) {
		case 'ASK':
			return { kind: 'ask', step };
		case 'CONTENT':
		case 'NARRATION':
		case 'CASE':
		case 'REFLECTION_AREAS':
			return { kind: 'explain', step };
		case 'KEY_CONTENT':
		case 'KEY_POINTS':
		case 'KEY_ELEMENTS':
		case 'TOPICS':
		case 'EXPECTED_LEARNING':
		default:
			return { kind: 'skip', step } as SkipAction;
	}
}

export function next(state?: SessionState): SessionState {
	if (!state) {
		throw new Error('Session state not initialized');
	}
	const steps = state.plan?.allSteps || [];
	const nextIdx = (state.stepIdx ?? 0) + 1;
	if (nextIdx >= steps.length) {
		const lastMomentIdx = steps.length ? steps[steps.length - 1].momentIndex : state.momentIdx;
		return { ...state, stepIdx: steps.length, momentIdx: lastMomentIdx, done: true };
	}
	const newStep = steps[nextIdx];
	const newMomentIdx = typeof newStep?.momentIndex === 'number' ? newStep.momentIndex : state.momentIdx;
	return { ...state, stepIdx: nextIdx, momentIdx: newMomentIdx, done: false };
}

export function advanceTo(state: SessionState, targetStepIndex?: number): SessionState {
  if (targetStepIndex === undefined || targetStepIndex === null) {
    const steps = state.plan?.allSteps || [];
    const lastMomentIdx = steps.length ? steps[steps.length - 1].momentIndex : state.momentIdx;
    return { ...state, done: true, stepIdx: steps.length, momentIdx: lastMomentIdx };
  }
  const steps = state.plan?.allSteps || [];
  const boundedIndex = Math.max(0, Math.min(targetStepIndex, Math.max(0, steps.length)));
  const step = steps[boundedIndex];
  const newMomentIdx = typeof step?.momentIndex === 'number' ? step.momentIndex : state.momentIdx;
  return { ...state, stepIdx: boundedIndex, momentIdx: newMomentIdx, done: false };
}

export function getCycleIndexForStep(state: SessionState, stepIdx: number): number | undefined {
  const cycles = state.plan?.contentCycles || [];
  for (let i = 0; i < cycles.length; i++) {
    const c = cycles[i];
    if (c.contentStepIndex === stepIdx) return i;
    if (c.askStepIndices.includes(stepIdx)) return i;
  }
  return undefined;
}

export function getNextAskInSameCycle(state: SessionState, stepIdx: number): number | undefined {
  const plan = state.plan;
  if (!plan) return undefined;
  const cycles = plan.contentCycles || [];
  const cycleIdx = getCycleIndexForStep(state, stepIdx);
  if (cycleIdx === undefined) return undefined;
  const cycle = cycles[cycleIdx];
  const askList = cycle.askStepIndices || [];
  const pos = askList.indexOf(stepIdx);
  if (pos === -1) return askList.length ? askList[0] : undefined; // si estamos en CONTENT, volver a la primera ASK
  return askList[pos + 1];
}

export function getFirstAskOfNextCycle(state: SessionState, stepIdx: number): number | undefined {
  const plan = state.plan;
  if (!plan) return undefined;
  const cycles = plan.contentCycles || [];
  const currentCycleIdx = getCycleIndexForStep(state, stepIdx);
  const startIdx = currentCycleIdx === undefined ? 0 : currentCycleIdx + 1;
  for (let i = startIdx; i < cycles.length; i++) {
    const askList = cycles[i].askStepIndices || [];
    if (askList.length > 0) return askList[0];
  }
  return undefined;
}

export function decideNextAction(context: {
  lastAction: string;
  noSeCount: number;
  attempts: number;
  momentKind?: string;
}): 'reask' | 'hint' | 'explain' | 'options' | 'force_advance' {
  const { lastAction, noSeCount, attempts, momentKind } = context;
  
  // Solo permitir avance forzado en CONEXIÓN (no SALUDO)
  const policyAllowsForce = ['CONEXION'].includes(momentKind || '');
  
  // Si no permite forzar y hay muchos intentos, usar transición pedagógica
  if (!policyAllowsForce && attempts >= 2) {
    if (lastAction === 'hint') return 'explain';
    if (lastAction === 'explain') return 'options';
    if (lastAction === 'options') return 'reask';
    return 'hint';
  }
  
  // Si permite forzar, solo después de agotar opciones (umbral más alto)
  if (policyAllowsForce && attempts >= 4) {
    return 'force_advance';
  }
  
  // Lógica normal de transición
  if (noSeCount > 0) return 'hint';
  if (lastAction === 'hint') return 'explain';
  if (lastAction === 'explain') return 'options';
  
  return 'reask';
}



