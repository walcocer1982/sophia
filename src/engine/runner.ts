import type { PlanStep } from '@/plan/types';
import type { SessionState } from '@/session/state';

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

export function decideAction(step?: PlanStep): EngineAction {
	if (!step) return { kind: 'end' };
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



