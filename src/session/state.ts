import type { LessonPlan } from '@/plan/types';

export type SessionState = {
	planUrl: string;
	plan?: LessonPlan;
	momentIdx: number;
	stepIdx: number;
	attemptsByAskCode: Record<string, number>;
	hintsByAskCode?: Record<string, number>;
	lastAnswerByAskCode?: Record<string, string>;
	noSeCountByAskCode?: Record<string, number>;
	lastActionByAskCode?: Record<string, string>;
	justAskedFollowUp?: boolean;
	// Anti-repetición de narrativa por momento
	narrativesShownByMoment?: Record<number, boolean>;
	lastNarrativeHashByMoment?: Record<number, string>;
	// Blindaje anti-repetición de historias/contenidos
	shownByStepIndex?: Record<number, boolean>;
	shownByMomentIndex?: Record<number, boolean>;
	askedAskCodes: string[];
	answeredAskCodes: string[];
	done: boolean;
};

export function initSession(planUrl: string, plan: LessonPlan): SessionState {
	return {
		planUrl,
		plan,
		momentIdx: 0,
		stepIdx: 0,
		attemptsByAskCode: {},
		hintsByAskCode: {},
		lastAnswerByAskCode: {},
		noSeCountByAskCode: {},
		lastActionByAskCode: {},
		justAskedFollowUp: false,
		narrativesShownByMoment: {},
		lastNarrativeHashByMoment: {},
		shownByStepIndex: {},
		shownByMomentIndex: {},
		askedAskCodes: [],
		answeredAskCodes: [],
		done: false
	};
}


