import type { LessonPlan } from '@/plan/types';
import type { RagIndex } from '@/ai/tools/RagTool';

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
	teacherProfile?: any;
	justAskedFollowUp?: boolean;
	// Anti-repetición de narrativa por momento
	narrativesShownByMoment?: Record<number, boolean>;
	lastNarrativeHashByMoment?: Record<number, string>;
	// Blindaje anti-repetición de historias/contenidos
	shownByStepIndex?: Record<number, boolean>;
	shownByMomentIndex?: Record<number, boolean>;
	askedAskCodes: string[];
	answeredAskCodes: string[];
	partiallyAnsweredAskCodes?: string[];
	pendingRemediation?: Record<string, string[]>;
	done: boolean;
	// Nuevos campos para adaptación y presupuesto
	dynamicQueue: Array<{
		op: 'reask' | 'hint' | 'goto' | 'repeat' | 'insert_micro';
		targetAskCode?: string;
		note?: string;
		reason?: 'SEM_LOW' | 'THINKER_ESCALATION' | 'OFF_TOPIC' | 'BUDGET_LIMIT';
	}>;
	budgetCentsLeft: number;
	escalationsUsed: number;
	// Modo de operación
	adaptiveMode: boolean;
	// Contexto de consultas para pausar/retomar
	consultCtx?: {
		pausedAt?: { momentIndex: number; stepIndex: number };
		active?: boolean;
		turns?: number;
	};
	lastFollowUpText?: string;
  // RAG index construido desde la lección (guía)
  ragIndex?: RagIndex;
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
		done: false,
		// Inicializar nuevos campos
		dynamicQueue: [],
		budgetCentsLeft: 100, // 100 centavos = $1.00 por sesión
		escalationsUsed: 0,
		adaptiveMode: false, // Por defecto modo determinista
		consultCtx: {} // Contexto de consultas
	};
}


