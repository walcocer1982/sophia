import type { TimelineFile, TimelineStep } from '@/schema/timeline';

export type StepType = 'NARRATION'|'CONTENT'|'ASK'|'CASE'|'KEY_CONTENT'|'KEY_POINTS'|'KEY_ELEMENTS'|'TOPICS'|'EXPECTED_LEARNING'|'REFLECTION_AREAS';

export type PlanStep = {
	momentIndex: number;
	stepIndex: number;
	code?: string;
	order?: number;
	type: StepType;
	data: TimelineStep;
};

export type LessonPlan = {
	meta: TimelineFile['meta'];
	moments: Array<{ title: string; code?: string; order?: number; steps: PlanStep[] }>;
	allSteps: PlanStep[];
	contentCycles: Array<{ contentStepIndex: number; askStepIndices: number[] }>;
	askCatalog: Array<{ globalIndex: number; momentIndex: number; stepIndex: number; code?: string; question: string; acceptable: string[] }>;
};



