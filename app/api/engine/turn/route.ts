import { runDocenteLLM } from '@/ai/orchestrator';
import { runAdvanceAgent, runAskAgent, runAskOptionsAgent, runEndAgent, runExplainAgent, runFeedbackAgent, runHintAgent } from '@/ai/agents';
import { isNoSeInput, shouldGateByMinTokens } from '@/engine/clarify';
import { evaluateSemanticOnly, type AskPolicy } from '@/engine/eval';
// import { extractKeywords } from '@/engine/hints';
import { isAffirmativeToResume, isStudentAskingQuestion, isStudentAskingQuestionSem } from '@/engine/questions';
import { isGreetingInput } from '@/engine/questions';
import { isPersonalInfoQuery, isPlatformHelpQuery, isGeneralKnowledgeStyleQuestion } from '@/engine/questions';
import { advanceTo, currentStep, decideAction, decideNextAction, getNextAskInSameCycle, next } from '@/engine/runner';
import { loadAndCompile } from '@/plan/compilePlan';
import { appendHistory, clearHistory, getRecentHistory } from '@/session/history';
import { SessionState, initSession } from '@/session/state';
import { getSessionStore } from '@/session/store';
import { resolveTeacherProfile } from '@/teacher/resolveProfile';
import fs from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';
import { getHintWordLimit } from '@/ai/tools/PolicyTool';
import { pickTwoOptions } from '@/ai/tools/OptionsTool';
import { decideForceAdvanceByNoSe } from '@/ai/tools/InputGuardrail';
import { pickVariant, varyHintLimit } from '@/ai/ab';
import { buildLessonRagIndex, retrieveTopKWithScores, maxSimilarity } from '@/ai/tools/RagTool';


// Evita repetir frases casi idénticas al componer mensajes
function composeUniqueText(...parts: Array<string | undefined>): string {
	const norm = (s: string) => s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	const seen = new Set<string>();
	const out: string[] = [];
	for (const p of parts) {
		const text = String(p || '').trim();
		if (!text) continue;
		const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
		for (const line of lines) {
			const key = norm(line);
			if (key && !seen.has(key)) {
				seen.add(key);
				out.push(line);
			}
		}
	}
	return out.join('\n\n');
}


type ClientState = {
  momentIdx?: number;
  stepIdx?: number;
  attemptsByAskCode?: Record<string, number>;
  noSeCountByAskCode?: Record<string, number>;
  lastActionByAskCode?: Record<string, string>;
  lastAnswerByAskCode?: Record<string, string>;
  done?: boolean;
};

type Body = { sessionKey: string; userInput?: string; planUrl?: string; reset?: boolean; clientState?: ClientState; adaptiveMode?: boolean };

const SESSIONS = new Map<string, SessionState>();
const COURSE_POLICIES_CACHE = new Map<string, any>();

function mapMomentKind(title?: string): 'SALUDO'|'CONEXION'|'ADQUISICION'|'APLICACION'|'DISCUSION'|'REFLEXION'|'OTRO' {
  const t = (title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (t.includes('saludo')) return 'SALUDO';
  if (t.includes('conexion')) return 'CONEXION';
  if (t.includes('adquisicion')) return 'ADQUISICION';
  if (t.includes('aplicacion')) return 'APLICACION';
  if (t.includes('discusion')) return 'DISCUSION';
  if (t.includes('reflexion')) return 'REFLEXION';
  return 'OTRO';
}

function deriveCourseId(planUrl: string): string | undefined {
  const m = planUrl.match(/\/courses\/(.*?)\//);
  return m?.[1];
}

async function loadCoursePolicies(courseId?: string) {
  if (!courseId) return undefined;
  if (COURSE_POLICIES_CACHE.has(courseId)) return COURSE_POLICIES_CACHE.get(courseId);

  try {
    const url = `/courses/${courseId}/policies.json`;
    let json: any;
    if (/^https?:/i.test(url)) {                       // remoto
      const res = await fetch(url);
      if (!res.ok) return undefined;
      json = await res.json();
    } else {                                           // relativo -> public/
      const filePath = path.join(process.cwd(), 'public', url.replace(/^\//, ''));
      const raw = await fs.readFile(filePath, 'utf-8');
      json = JSON.parse(raw);
    }
    COURSE_POLICIES_CACHE.set(courseId, json);
    return json;
  } catch {
    return undefined;
  }
}

// buildStudentFacingBase eliminado: reutilizar el de src/engine/hints

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as Body;
		const { sessionKey, userInput = '', planUrl = '/courses/SSO001/lessons/lesson02.json', reset = false, clientState, adaptiveMode = false } = body;
		let pendingInput = (userInput || '').toString();
		if (reset) {
			SESSIONS.delete(sessionKey);
			try { await getSessionStore().delete(sessionKey); } catch {}
			try { await clearHistory(sessionKey); } catch {}
		}
		let state = (await getSessionStore().get(sessionKey)) || SESSIONS.get(sessionKey);
    		if (!state) {
			const plan = await loadAndCompile(planUrl);
			state = initSession(planUrl, plan);
			// Aplicar modo adaptativo si se solicita
			if (adaptiveMode) {
				state.adaptiveMode = true;
			}
      try { (state as any).ragIndex = await buildLessonRagIndex((state as any).plan); } catch {}
			SESSIONS.set(sessionKey, state);
			try { await getSessionStore().set(sessionKey, state); } catch {}
		}
    if (!state) {
      throw new Error('No se pudo inicializar la sesión');
    }
    // Rehidratar desde clientState si viene en el request (persistencia sin servidor)
    if (clientState) {
      // No sobrescribir con índices más antiguos del cliente
      if (typeof clientState.momentIdx === 'number') {
        const m = Number(clientState.momentIdx);
        if (typeof state.momentIdx !== 'number' || m > (state.momentIdx as number)) {
          state.momentIdx = m;
        }
      }
      if (typeof clientState.stepIdx === 'number') {
        const sIdx = Number(clientState.stepIdx);
        if (typeof state.stepIdx !== 'number' || sIdx > (state.stepIdx as number)) {
          state.stepIdx = sIdx;
        }
      }
      state.attemptsByAskCode = { ...(state.attemptsByAskCode || {}), ...(clientState.attemptsByAskCode || {}) };
      state.noSeCountByAskCode = { ...(state.noSeCountByAskCode || {}), ...(clientState.noSeCountByAskCode || {}) };
      state.lastActionByAskCode = { ...(state.lastActionByAskCode || {}), ...(clientState.lastActionByAskCode || {}) };
      state.lastAnswerByAskCode = { ...(state.lastAnswerByAskCode || {}), ...(clientState.lastAnswerByAskCode || {}) };
      // Flag opcional
      if (typeof (clientState as any).justAskedFollowUp === 'boolean') {
        state.justAskedFollowUp = Boolean((clientState as any).justAskedFollowUp);
      }
		}
    const coursePolicies = await loadCoursePolicies(deriveCourseId(state.planUrl));
    const teacherProfile = resolveTeacherProfile({
      reqProfile: (body as any)?.teacherProfile,
      planProfile: (state as any)?.plan?.meta?.teacherProfile,
      stateProfile: (state as any)?.teacherProfile
    });
    (state as any).teacherProfile = teacherProfile;
		const step = currentStep(state);
		// Debug inicio de turno
		try {
			const debugOn = process.env.ENGINE_DEBUG === 'true' || process.env.NEXT_PUBLIC_ENGINE_DEBUG === 'true' || Boolean((coursePolicies as any)?.debug?.logs);
			if (debugOn) {
				const st0 = currentStep(state);
				const payload0 = {
					tag: 'engine.turn.start',
					sessionKey,
					momentTitle: state.plan?.moments?.[st0?.momentIndex || 0]?.title,
					stepType: st0?.type,
					stepIdx: state.stepIdx,
					userInputLen: (pendingInput || '').length
				};
				// eslint-disable-next-line no-console
				console.debug(JSON.stringify(payload0));
			}
		} catch {}
		
		// Interceptor universal de consultas (antes de evaluar el ASK)
		state.consultCtx = state.consultCtx || {};
		
		// Variables de salida
		let message = '';
		let followUp = '';
		let displayValue: string | undefined;
		// Variables para rúbrica/evaluación
		let assessment: any = null;
		let lastClsKind: 'ACCEPT'|'PARTIAL'|'HINT'|'REFOCUS'|null = null;
		let lastMatched: string[] = [];
		let lastMissing: string[] = [];
		let lastAttempts = 0;
		let lastHints = 0;
		let lastStepCodeForAssess = '';
		
		// --- REEMITIR REPREGUNTA SI AÚN NO RESPONDE (continuidad) ---
		if (!pendingInput.trim() && state.justAskedFollowUp && state.lastFollowUpText) {
			return NextResponse.json({
				message: '',
				followUp: state.lastFollowUpText,
				state
			});
		}

		// Saludos: responder cálido y retomar la pregunta vigente
		if (pendingInput.trim() && isGreetingInput(pendingInput)) {
			const st = currentStep(state);
			const q = st?.type === 'ASK' ? (st as any).data?.question || '' : '';
			try {
				const recent = await getRecentHistory(sessionKey, 6);
				const greet = await runFeedbackAgent({
					language: 'es',
					action: 'feedback',
					stepType: 'ASK',
					questionText: pendingInput,
					objective: String((st as any)?.data?.objective || state.plan?.meta?.lesson_name || ''),
					recentHistory: recent,
					allowQuestions: true,
					conversationMode: true
				} as any);
				message = (greet.message || '').trim();
			} catch { message = ''; }
			followUp = q;
			state.justAskedFollowUp = Boolean(followUp);
			return NextResponse.json({ message, followUp, state });
		}

		// Consulta personal: responder con alias y redirigir al objetivo (vía LLM)
		if (pendingInput.trim() && isPersonalInfoQuery(pendingInput)) {
			const st = currentStep(state);
			const q = st?.type === 'ASK' ? (st as any).data?.question || '' : '';
			try {
				const recent = await getRecentHistory(sessionKey, 6);
				const resp = await runFeedbackAgent({
					language: 'es',
					action: 'feedback',
					stepType: 'ASK',
					questionText: pendingInput,
					objective: String((st as any)?.data?.objective || state.plan?.meta?.lesson_name || ''),
					recentHistory: recent,
					allowQuestions: true,
					conversationMode: true
				} as any);
				message = (resp.message || '').trim();
			} catch { message = ''; }
			followUp = q;
			state.justAskedFollowUp = Boolean(followUp);
			return NextResponse.json({ message, followUp, state });
		}

		// Consulta general/plataforma: responder breve y retomar el plan
		if (!state.consultCtx.active && pendingInput.trim() && (isPlatformHelpQuery(pendingInput) || isGeneralKnowledgeStyleQuestion(pendingInput))) {
			const st = currentStep(state);
			const q = st?.type === 'ASK' ? (st as any).data?.question || '' : '';
			try {
				// Registrar punto de pausa y el desvío
				(state as any).diversionStack = Array.isArray((state as any).diversionStack) ? (state as any).diversionStack : [];
				(state.consultCtx ||= {}).pausedAt = { momentIndex: state.momentIdx, stepIndex: state.stepIdx } as any;
				(state as any).diversionStack.push({ fromMomentIndex: state.momentIdx, fromStepIndex: state.stepIdx, reason: isPlatformHelpQuery(pendingInput) ? 'PLATFORM' : 'GENERAL', query: pendingInput, timestamp: Date.now() });
			} catch {}
			try {
				const recent = await getRecentHistory(sessionKey, 6);
				const rel = await retrieveTopKWithScores(pendingInput, (state as any).ragIndex, 3);
				const items = rel.map(r => r.text);
				const resp = await runFeedbackAgent({
					language: 'es',
					action: 'feedback',
					stepType: 'ASK',
					questionText: pendingInput,
					objective: String(state.plan?.meta?.lesson_name || ''),
					contentBody: items,
					recentHistory: recent,
					allowQuestions: false,
					conversationMode: true
				} as any);
				message = (resp.message || '').trim();
			} catch { message = ''; }
			// Retomar con la pregunta actual si existe
			followUp = q;
			state.justAskedFollowUp = Boolean(followUp);
			return NextResponse.json({ message, followUp, state });
		}
		
		// --- CONSULTA ACTIVA: si ya estamos en modo consulta, responder cualquier entrada como consulta ---
		if (state.consultCtx.active && pendingInput.trim()) {
			const recent = await getRecentHistory(sessionKey, 6);
			const qa = await runFeedbackAgent({
				language: 'es',
				action: 'feedback',
				stepType: 'ASK',
				questionText: pendingInput,
				objective: String(state.plan?.meta?.lesson_name || ''),
				recentHistory: recent,
				allowQuestions: true,
				conversationMode: true
			} as any);
			message = (qa.message || '').trim();
			state.consultCtx.turns = Number(state.consultCtx.turns || 0) + 1;
			const consultMax2 = Number((coursePolicies as any)?.conversation?.maxTurns ?? 3);
			if (state.consultCtx.turns >= consultMax2) {
				state.consultCtx.active = false;
				state.consultCtx.turns = 0;
				// Restaurar el punto pausado si existe
				try {
					const paused = (state.consultCtx as any).pausedAt;
					if (paused && typeof paused.stepIndex === 'number') {
						state = advanceTo(state, paused.stepIndex);
						state.momentIdx = paused.momentIndex ?? state.momentIdx;
						SESSIONS.set(sessionKey, state);
						try { await getSessionStore().set(sessionKey, state); } catch {}
						(state.consultCtx as any).pausedAt = undefined;
					}
				} catch {}
				const st = currentStep(state);
				if (st?.type === 'ASK') {
					followUp = st.data?.question || '';
					message = composeUniqueText(message, 'Retomando…');
					state.justAskedFollowUp = Boolean(followUp);
				}
			}
			return NextResponse.json({ message, followUp: followUp || '', state });
		}
		
		// 1) Si el alumno pide "permiso" para preguntar (detección semántica de intención)
		const isNoSeRegex = /^\s*(no\s*(lo\s*)?s[eé]|no\s*est[oó]y?\s*seguro|no\s*s[eé]\s*bien)\s*$/i;
		const consultMax = Number((coursePolicies as any)?.conversation?.maxTurns ?? 3);
		state.consultCtx = state.consultCtx || { active: false, turns: 0 };
		if (!isNoSeRegex.test(pendingInput) && (await isStudentAskingQuestionSem(pendingInput, (state as any).teacherProfile)) && !/\?\s*$/.test(pendingInput)) {
			// Intención sin pregunta explícita → pedir la consulta (vía LLM)
			state.consultCtx.active = true;
			state.consultCtx.turns = 0;
			try { (state.consultCtx as any).pausedAt = { momentIndex: state.momentIdx, stepIndex: state.stepIdx }; } catch {}
			try { (state as any).diversionStack?.push({ fromMomentIndex: state.momentIdx, fromStepIndex: state.stepIdx, reason: 'GENERAL', query: pendingInput, timestamp: Date.now() }); } catch {}
			try {
				const recent = await getRecentHistory(sessionKey, 6);
				const askC = await runFeedbackAgent({
					language: 'es',
					action: 'feedback',
					stepType: 'ASK',
					questionText: pendingInput,
					objective: String(state.plan?.meta?.lesson_name || ''),
					recentHistory: recent,
					allowQuestions: true,
					conversationMode: true
				} as any);
				message = (askC.message || '').trim();
			} catch { message = ''; }
			return NextResponse.json({ message, followUp: '', state });
		}
		
		// 2) Si trae una pregunta concreta (termina en ?)
		if (!isNoSeRegex.test(pendingInput) && /\?\s*$/.test(pendingInput)) {
			state.consultCtx.active = true;
			state.consultCtx.turns = Number(state.consultCtx.turns || 0) + 1;
			try { (state.consultCtx as any).pausedAt = (state.consultCtx as any).pausedAt || { momentIndex: state.momentIdx, stepIndex: state.stepIdx }; } catch {}
			try { (state as any).diversionStack?.push({ fromMomentIndex: state.momentIdx, fromStepIndex: state.stepIdx, reason: 'GENERAL', query: pendingInput, timestamp: Date.now() }); } catch {}
			const recent = await getRecentHistory(sessionKey, 6);
			const qa = await runFeedbackAgent({
				language: 'es',
				action: 'feedback',
				stepType: 'ASK',
				questionText: pendingInput,
				objective: String(state.plan?.meta?.lesson_name || ''),
				recentHistory: recent,
				allowQuestions: true,
				conversationMode: true
			} as any);
			message = (qa.message || '').trim();
			if (state.consultCtx.turns >= consultMax) {
				state.consultCtx.active = false;
				state.consultCtx.turns = 0;
				const st = currentStep(state);
				if (st?.type === 'ASK') {
					followUp = st.data?.question || '';
					message = composeUniqueText(message, 'Retomando…');
					state.justAskedFollowUp = Boolean(followUp);
				}
			}
			return NextResponse.json({ message, followUp: followUp || '', state });
		}

		// 3) Si el alumno confirma que ya entendió, retomas donde quedó, incluyendo señales conversacionales
		if (state.consultCtx.active && isAffirmativeToResume(pendingInput, (state as any).teacherProfile)) {
			state.consultCtx.active = false;
			state.consultCtx.turns = 0;
			// Restaurar el punto pausado si existe
			try {
				const paused = (state.consultCtx as any).pausedAt;
				if (paused && typeof paused.stepIndex === 'number') {
					state = advanceTo(state, paused.stepIndex);
					state.momentIdx = paused.momentIndex ?? state.momentIdx;
					SESSIONS.set(sessionKey, state);
					try { await getSessionStore().set(sessionKey, state); } catch {}
					(state.consultCtx as any).pausedAt = undefined;
				}
			} catch {}
			const st = currentStep(state);
			if (st?.type === 'ASK') {
				const q = st.data?.question || '';
				message = '';
				followUp = q;
				state.justAskedFollowUp = Boolean(followUp);
				return NextResponse.json({ message, followUp, state });
			}
		}
		
		// Bucle: saltar SKIP consecutivos y construir salida adecuada
		// Debug vars
		let dbg: any = null;
		let safety = 0;
    let skipGuarantee = false;
		while (safety++ < 20) {
			const act = decideAction(currentStep(state));
			if (act.kind === 'skip') {
				state = next(state);
				SESSIONS.set(sessionKey, state);
				try { await getSessionStore().set(sessionKey, state); } catch {}
				continue;
			}
			if (act.kind === 'explain') {
				const data = act.step.data;
				const parts = [data.title, ...(data.body || []), data.text, ...(data.items || [])].filter(Boolean) as string[];
				const bodyArr: string[] = parts as string[];
				try {
					// Anti-repetición: emite narrativa sólo una vez por momento
					const mIdx = act.step.momentIndex;
					const already = Boolean(state.narrativesShownByMoment?.[mIdx]);
					const recent = await getRecentHistory(sessionKey, 4);
					const llm = await runDocenteLLM({
						language: 'es',
						action: 'explain',
						stepType: act.step.type,
						momentTitle: state.plan?.moments[act.step.momentIndex]?.title,
						objective: state.plan?.meta?.lesson_name || '',
						contentBody: bodyArr,
						recentHistory: recent
					});
					message = already ? '' : llm.message;
				} catch {
					message = bodyArr.join(' — ') || 'Continuemos con el contenido.';
				}
				state = next(state);
				SESSIONS.set(sessionKey, state);
				try { await getSessionStore().set(sessionKey, state); } catch {}
				// Buscar la siguiente ASK saltando pasos de metadatos y avanzar el puntero a ella
				const steps = state.plan?.allSteps || [];
				let targetIdx: number | undefined;
				for (let i = state.stepIdx; i < steps.length; i++) {
					const s = steps[i];
					const t = s.type;
					if (t === 'KEY_CONTENT' || t === 'KEY_POINTS' || t === 'EXPECTED_LEARNING') continue;
					if (t === 'ASK') { followUp = s.data.question || ''; targetIdx = i; }
					break;
				}
				// marcar flag para evitar eco y adelantar estado a la ASK
				state.justAskedFollowUp = Boolean(followUp);
				state.lastFollowUpText = followUp;
				// marca narrativa mostrada
				try { (state.narrativesShownByMoment ||= {})[act.step.momentIndex] = true; } catch {}
				if (typeof targetIdx === 'number') { state = advanceTo(state, targetIdx); }
				SESSIONS.set(sessionKey, state);
				try { await getSessionStore().set(sessionKey, state); } catch {}
				break;
			}
        if (act.kind === 'ask') {
				const q = act.step.data.question || '';
				const acceptable = act.step.data.acceptable_answers || [];
				// Política por tipo con K dinámico para LISTADO
				const qtype = String(act.step.data.question_type || '').toLowerCase();
				// Identificador del paso para contar intentos/acciones previas
				const stepCodeDyn = act.step.code || `Q:${q.substring(0,50)}`;
				const attemptsSoFar = Number(state.attemptsByAskCode?.[stepCodeDyn] || 0);
				const lastActionForStep = String(state.lastActionByAskCode?.[stepCodeDyn] || 'ask');
				const firstAttempt = attemptsSoFar === 0;
				const afterHint = lastActionForStep === 'hint';
				// Escala por intento: S1 exige 2; S2/S3 exige 1
				const dynamicK = qtype.includes('lista') ? (firstAttempt ? 2 : 1) : undefined;
				const policy: AskPolicy = qtype.includes('lista') ? { type: 'listado', thresholdK: dynamicK }
					: qtype.includes('aplica') ? { type: 'aplicacion', requiresJustification: true }
					: (qtype.includes('abierta') ? { type: 'metacognitiva' } : { type: (qtype as any) || 'conceptual' });
				// Usar solo el objective para generar preguntas y pistas
				let expected: string[] = [];
				try {
					const objective = String(act.step.data?.objective || '');
					// Extraer palabras clave del objective para usar como expected
					const objectiveWords = objective.split(/\s+/).filter(word => word.length > 3).slice(0, 5);
					expected = objectiveWords;
				} catch {}
          const momentKind = mapMomentKind(state.plan?.moments?.[act.step.momentIndex]?.title);
          const maxAttempts = Number(coursePolicies?.advance?.maxAttemptsBeforeForce ?? 3);
          const allowForcedOn: string[] = Array.isArray(coursePolicies?.advance?.allowForcedOn) ? coursePolicies.advance.allowForcedOn : ['CONEXION'];
          const forceNoSeThreshold = Number((coursePolicies as any)?.advance?.forceOnNoSeThreshold ?? 3);
          const stepCode = act.step.code || `Q:${q.substring(0,50)}`;
          if (!pendingInput.trim()) {
            // evitar eco si acabamos de adjuntar followUp
            if (state.justAskedFollowUp) {
              message = '';
              followUp = '';
              state.justAskedFollowUp = false;
              SESSIONS.set(sessionKey, state);
              try { await getSessionStore().set(sessionKey, state); } catch {}
              skipGuarantee = true;
              break;
            }
            // F0/F1: emitir pista motivadora + micro-pregunta y contabilizar intento/ayuda
            try {
              const askData: any = (act as any)?.step?.data || {};
              const recent = await getRecentHistory(sessionKey, 4);
              const sevIdx0 = Number(state.hintsByAskCode?.[stepCode] || 0);
              let hintLimit0 = getHintWordLimit(coursePolicies, sevIdx0);
              try { hintLimit0 = varyHintLimit(hintLimit0, pickVariant(sessionKey)); } catch {}
              const llmHint = await runHintAgent({
                language: 'es',
                action: 'hint',
                stepType: 'ASK',
                questionText: q,
                objective: String(askData.objective || ''),
                contentBody: [String(act.step.data?.objective || '')],
                hintWordLimit: hintLimit0,
                allowQuestions: true,
                recentHistory: recent,
                attempts: Number(state.attemptsByAskCode?.[stepCode] || 0),
                hintsUsed: Number(state.hintsByAskCode?.[stepCode] || 0)
              } as any);
              const fu0 = (llmHint.followUp || q).trim();
              message = composeUniqueText(fu0, llmHint.message || '');
              followUp = fu0;
            } catch {
              message = '';
              followUp = q;
            }
            // Contadores y estado de hint
            const attemptsMap: any = state.attemptsByAskCode || (state.attemptsByAskCode = {} as any);
            const hintsMap0: any = state.hintsByAskCode || (state.hintsByAskCode = {} as any);
            const lastActionMap0: any = state.lastActionByAskCode || (state.lastActionByAskCode = {} as any);
            attemptsMap[stepCode] = (attemptsMap[stepCode] || 0) + 1;
            hintsMap0[stepCode] = (hintsMap0[stepCode] || 0) + 1;
            lastActionMap0[stepCode] = 'hint';
            state.justAskedFollowUp = Boolean(followUp);
            state.lastFollowUpText = followUp;
            // Force advance si aplica tras intentos
            if ((state.attemptsByAskCode[stepCode] || 0) >= maxAttempts && allowForcedOn.includes(momentKind)) {
              const nextAskIdx = getNextAskInSameCycle(state, state.stepIdx);
              if (typeof nextAskIdx === 'number') {
                state = advanceTo(state, nextAskIdx);
                followUp = (currentStep(state) as any)?.data?.question || '';
                state.justAskedFollowUp = Boolean(followUp);
              }
              try {
                const recent = await getRecentHistory(sessionKey, 4);
                const bridge = await runDocenteLLM({ language: 'es', action: 'advance', stepType: 'ASK', objective: String(act.step.data.objective || ''), recentHistory: recent });
                message = [message, bridge.message].filter(Boolean).join('\n\n');
              } catch {}
            }
            SESSIONS.set(sessionKey, state);
            try { await getSessionStore().set(sessionKey, state); } catch {}
            break;
          }
          // Evaluación para preguntas abiertas (answer_type: "open")
          const answerType = (act.step.data as any)?.answer_type || '';
          const rubric = (act.step.data as any)?.rubric || {};
          const objText = String(act.step.data?.objective || '');
          const isOpen = (answerType === 'open') || String((act.step.data as any)?.question_type || '').toLowerCase().includes('abierta') || ['SALUDO','CONEXION'].includes(momentKind);
          
          let cls: any;
          let vague: boolean = false;
          const hintsUsed = Number(state.hintsByAskCode?.[stepCode] || 0);
          const attempts = state.attemptsByAskCode?.[stepCode] || 0;
          
          {
            // Gate previo por tokens útiles (evitar PARTIAL fantasma)
            const minTokens = Number(((coursePolicies as any)?.evaluation?.thresholds?.minTokens) ?? 3);
            if (shouldGateByMinTokens(pendingInput, minTokens)) {
              cls = { kind: 'HINT', reason: 'MIN_TOKENS', matched: [], missing: (Array.isArray(acceptable) && acceptable.length ? acceptable : (expected||[])).slice(0,3) } as any;
              vague = true;
            }
            // Evaluación SOLO con embeddings (incluye abiertas), con umbral de parcial más cercano configurable
            const evalCfg = (coursePolicies as any)?.evaluation?.semantic || {};
            const semOpen = evalCfg.open || { semThresh: 0.28, semBestThresh: 0.24 };
            const semClosed = evalCfg.closed || { semThresh: 0.44, semBestThresh: 0.34 };
            const th = isOpen ? semOpen : semClosed;
                          const acceptablesEff = isOpen ? [String(act.step.data?.objective || '')] : acceptable;
            if (!vague) {
              const sem = await evaluateSemanticOnly(
                pendingInput,
                acceptablesEff,
                expected,
                policy,
                { semThresh: Number(th.semThresh ?? (isOpen ? 0.28 : 0.44)), semBestThresh: Number(th.semBestThresh ?? (isOpen ? 0.22 : 0.34)), maxHints: Number(coursePolicies?.hints?.maxHints ?? 2), vagueCenter: {
                  corpus: (state as any)?.teacherProfile?.eval?.vagueCenter?.corpus,
                  tauVagueMin: (state as any)?.teacherProfile?.eval?.vagueCenter?.tauVagueMin,
                  delta: (state as any)?.teacherProfile?.eval?.vagueCenter?.delta,
                  tauObj: isOpen ? (Number((state as any)?.teacherProfile?.eval?.vagueCenter?.tauObjOpen ?? th.semThresh)) : (Number((state as any)?.teacherProfile?.eval?.vagueCenter?.tauObjClosed ?? th.semThresh))
                } },
                { hintsUsed }
              );
              cls = { kind: sem.kind, matched: sem.matched, missing: sem.missing, sem: sem.sem };
              vague = false;
            }
            // Evaluación basada en objective (no keywords específicos)
            if (!vague && cls?.kind !== 'ACCEPT') {
              try {
                const objective = String(act.step.data?.objective || '');
                const textN = String(pendingInput || '').toLowerCase();
                // Evaluar si la respuesta está alineada con el objective
                const objectiveWords = objective.split(/\s+/).filter(word => word.length > 3);
                const kwHits = objectiveWords.filter(k => textN.includes(String(k).toLowerCase())).length;
                const kwMin = Number(((coursePolicies as any)?.evaluation?.thresholds?.keywordMin) ?? 1);
                if (kwHits < kwMin) { (cls as any).kind = 'HINT'; }
              } catch {}
            }
            // Capturar evaluación para rúbrica
            lastClsKind = cls.kind as any;
            lastMatched = Array.isArray(cls.matched) ? cls.matched : [];
            lastMissing = Array.isArray(cls.missing) ? cls.missing : [];
            lastAttempts = attempts;
            lastHints = hintsUsed;
            lastStepCodeForAssess = stepCode;
          }
          
          // Endurecer aceptación en SALUDO/CONEXIÓN (evitar falsos ACCEPT)
          const isSaludoConexion = ['SALUDO','CONEXION'].includes(momentKind);
          const isMeta = String(qtype).includes('abierta') || isSaludoConexion;
          
          // Aceptación en metacognitivas: permitir avance con 1 señal válida
          if (isMeta && cls.kind === 'ACCEPT') {
            const matchedCount = (cls.matched || []).length;
            const strongEnough = matchedCount >= 1;
            if (!strongEnough) {
              (cls as any).kind = 'HINT';
            }
          }
          
          // Regla del cuadro: PARTIAL -> Avanza y registra pendientes (sin reask)
          if (!vague && cls.kind === 'PARTIAL') {
            try {
              // Registrar pendientes y marcar como parcialmente respondida
              const faltos = Array.isArray(cls.missing) ? cls.missing.slice(0, 3) : [];
              (state as any).partiallyAnsweredAskCodes = Array.from(new Set([
                (((state as any).partiallyAnsweredAskCodes || []) as string[]), stepCode
              ]));
              (state as any).pendingRemediation = (state as any).pendingRemediation || {};
              if (faltos.length) (state as any).pendingRemediation[stepCode] = faltos;

              // Feedback breve de tipo PARCIAL
              let fb = '';
              try {
                const fbCfg: any = (coursePolicies as any)?.feedback || {};
                const recent = await getRecentHistory(sessionKey, 4);
                const llm = await runDocenteLLM({ language: 'es', action: 'feedback', stepType: 'ASK', questionText: q, userAnswer: pendingInput, matched: cls.matched, missing: cls.missing, objective: String(act.step.data.objective || ''), contentBody: [String(act.step.data?.objective || '')], hintWordLimit: Number(fbCfg.maxSentences ?? 2), allowQuestions: fbCfg.allowQuestions !== false, kind: 'PARTIAL' as any, recentHistory: recent });
                fb = llm.message || '';
              } catch {}

              // Avanzar y preparar siguiente paso
              state = next(state);
              SESSIONS.set(sessionKey, state);
              try { await getSessionStore().set(sessionKey, state); } catch {}

              let nextMsg = '';
              const nextStep = currentStep(state);
              if (nextStep?.type === 'NARRATION' || nextStep?.type === 'CONTENT') {
                const shownMap = state.shownByStepIndex || (state.shownByStepIndex = {});
                const stepKey = `${nextStep.momentIndex}-${nextStep.stepIndex}`;
                if (!(shownMap as any)[stepKey]) {
                  try {
                    const recent = await getRecentHistory(sessionKey, 4);
                    const explain = await runDocenteLLM({ language: 'es', action: 'explain', stepType: nextStep.type, narrationText: nextStep.data?.text || '', contentBody: nextStep.data?.body || [], caseText: (nextStep.data as any)?.case || '', objective: String(nextStep.data?.objective || state.plan?.meta?.lesson_name || ''), recentHistory: recent });
                    if ((explain.message || '').trim()) { nextMsg = explain.message!; (shownMap as any)[stepKey] = true; }
                  } catch { nextMsg = ''; }
                }
                state = next(state);
                SESSIONS.set(sessionKey, state);
                try { await getSessionStore().set(sessionKey, state); } catch {}
              }

              const nextAskStep = currentStep(state);
              if (nextAskStep?.type === 'ASK') {
                followUp = nextAskStep.data?.question || '';
                state.justAskedFollowUp = Boolean(followUp);
              }
              message = [fb, nextMsg].filter(Boolean).join('\n\n');
              dbg = { ...(dbg || {}), kind: 'PARTIAL', feedbackKind: 'PARTIAL', matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], stepCode };
              pendingInput = '';
              break;
            } catch {}
          }
          
          // En metacognitiva (Saludo) NO aceptar respuestas DONT_KNOW/VAGUE ni por longitud.
          // La aceptación debe basarse en señales reales del objetivo/expected o acceptable.
          // Feedback determinista usando util reutilizable
          if (!vague && cls.kind === 'ACCEPT') {
            let fb = '';
            try {
              const fbCfg: any = (coursePolicies as any)?.feedback || {};
              const recent = await getRecentHistory(sessionKey, 4);
              const llm = await runDocenteLLM({ language: 'es', action: 'feedback', stepType: 'ASK', questionText: q, userAnswer: pendingInput, matched: cls.matched, missing: cls.missing, objective: String(act.step.data.objective || ''), contentBody: [String(act.step.data?.objective || '')], hintWordLimit: Number(fbCfg.maxSentences ?? 3), allowQuestions: fbCfg.allowQuestions !== false, kind: 'ACCEPT' as any, recentHistory: recent });
              fb = llm.message || '';
            } catch {}
            
            // ✅ Marcar cumplimiento de la ASK actual
            state.answeredAskCodes = Array.isArray(state.answeredAskCodes) ? state.answeredAskCodes : [];
            const code = act.step.data?.code || stepCode;
            if (!state.answeredAskCodes.includes(code)) {
              state.answeredAskCodes.push(code);
            }
            SESSIONS.set(sessionKey, state);
            try { await getSessionStore().set(sessionKey, state); } catch {}
            
            // Protección de cumplimiento: verificar que la ASK actual esté respondida antes de avanzar
            const currentStepCode = act.step.code || stepCode;
            const isAnswered = Array.isArray(state.answeredAskCodes) && state.answeredAskCodes.includes(currentStepCode);

            if (!isAnswered && act.step.type === 'ASK') {
              // No avanzar si la ASK actual no está respondida (excepto SALUDO/CONEXIÓN)
              const mk = mapMomentKind(state.plan?.moments?.[act.step.momentIndex]?.title);
              const policyAllowsForce = ['SALUDO', 'CONEXION'].includes(mk);

              if (!policyAllowsForce) {
                // Re-preguntar la ASK actual
                followUp = q;
                state.justAskedFollowUp = Boolean(followUp);
                dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction: 'reask', stepCode };
                pendingInput = '';
                break;
              }
            }
            
            // Avanzar al siguiente paso en orden secuencial (no saltar ASKs)
            state = next(state);
            SESSIONS.set(sessionKey, state);
            try { await getSessionStore().set(sessionKey, state); } catch {}
            
            // Componer salida según el tipo de paso siguiente
            let nextMsg = '';
            const nextStep = currentStep(state);
            
            // Debug: verificar qué paso es el siguiente
            if (process.env.ENGINE_DEBUG === 'true') {
              console.log('[AVANCE_ACCEPT]', { 
                nextStepType: nextStep?.type, 
                nextStepCode: nextStep?.code,
                nextStepText: nextStep?.data?.text?.slice(0, 50),
                momentIndex: nextStep?.momentIndex,
                stepIndex: nextStep?.stepIndex
              });
            }
            
            if (nextStep?.type === 'NARRATION' || nextStep?.type === 'CONTENT') {
              // Blindaje anti-repetición: verificar si ya se mostró este contenido
              const shownMap = state.shownByStepIndex || (state.shownByStepIndex = {});
              const stepKey = `${nextStep.momentIndex}-${nextStep.stepIndex}`;
              
              if (!(shownMap as any)[stepKey]) {
                // Si NO se ha mostrado, ejecutarlo y marcar como mostrado
                try {
                  const recent = await getRecentHistory(sessionKey, 4);
                  const explain = await runDocenteLLM({ 
                    language: 'es', 
                    action: 'explain', 
                    stepType: nextStep.type, 
                    narrationText: nextStep.data?.text || '',
                    contentBody: nextStep.data?.body || [],
                    caseText: (nextStep.data as any)?.case || '',
                    objective: String(nextStep.data?.objective || state.plan?.meta?.lesson_name || ''),
                    recentHistory: recent 
                  });
                  // Blindaje: solo marcar como mostrado si hay contenido real
                  if ((explain.message || '').trim()) {
                    nextMsg = explain.message!;
                    (shownMap as any)[stepKey] = true; // marca solo si hubo contenido
                  } else {
                    nextMsg = '';
                    // NO marcar shownMap si está vacío
                  }
                  
                  // Debug: confirmar que se ejecutó la narrativa
                  if (process.env.ENGINE_DEBUG === 'true') {
                    console.log('[NARRATIVA_EJECUTADA]', { 
                      stepKey, 
                      nextMsgLength: nextMsg.length,
                      nextMsgPreview: nextMsg.slice(0, 100)
                    });
                  }
                } catch (error) { 
                  nextMsg = '';
                  if (process.env.ENGINE_DEBUG === 'true') {
                    console.log('[NARRATIVA_ERROR]', { stepKey, error: String(error) });
                  }
                }
              } else {
                // Debug: confirmar que ya se mostró
                if (process.env.ENGINE_DEBUG === 'true') {
                  console.log('[NARRATIVA_YA_MOSTRADA]', { stepKey });
                }
              }
              // Avanzar al siguiente paso después de la narrativa (se haya mostrado o no)
              state = next(state);
              SESSIONS.set(sessionKey, state);
              try { await getSessionStore().set(sessionKey, state); } catch {}
            }
            
            // Si hay una pregunta siguiente, ponerla como followUp
            const nextAskStep = currentStep(state);
            if (nextAskStep?.type === 'ASK') {
              followUp = nextAskStep.data?.question || '';
              state.justAskedFollowUp = Boolean(followUp);
              dbg = { ...(dbg || {}), messageType: 'ask', nextAction: 'ask' };
            }
            
            SESSIONS.set(sessionKey, state);
            try { await getSessionStore().set(sessionKey, state); } catch {}
            message = composeUniqueText(fb, nextMsg);
            
            // Debug: verificar la composición final del mensaje
            if (process.env.ENGINE_DEBUG === 'true') {
              console.log('[MENSAJE_FINAL]', { 
                fbLength: fb.length,
                nextMsgLength: nextMsg.length,
                messageLength: message.length,
                messagePreview: message.slice(0, 200),
                hasNarrativa: nextMsg.length > 0
              });
            }
            dbg = { ...(dbg || {}), kind: 'ACCEPT', feedbackKind: 'ACCEPT', matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], stepCode };
					pendingInput = '';
            break;
				}
          // Contabilizar respuesta previa y contadores separados para 'no sé'
          state.lastAnswerByAskCode![stepCode] = pendingInput;
          const noSeMap = state.noSeCountByAskCode || (state.noSeCountByAskCode = {});
          // Detección real de "no sé" / evasivas - MÁS PERMISIVO
          const isNo = isNoSeInput(pendingInput);
          if (isNo) {
            noSeMap[stepCode] = (noSeMap[stepCode] || 0) + 1;
            // Si es "no sé", además de noSeCount, cuenta intento pedagógico
            state.attemptsByAskCode[stepCode] = (state.attemptsByAskCode[stepCode] || 0) + 1;
          } else {
            state.attemptsByAskCode[stepCode] = (state.attemptsByAskCode[stepCode] || 0) + 1;
          }
          const vagueCfg = coursePolicies?.vague || {};
          if (vague || cls.kind === 'HINT' || isNo || cls.reason === 'MAX_HINTS' || cls.reason === 'SEM_LOW') {
            // Política de reintentos por pregunta (loop control)
            const lastActionMap = state.lastActionByAskCode || (state.lastActionByAskCode = {});
            const hintsMap = state.hintsByAskCode || (state.hintsByAskCode = {} as any);
            const attempts = state.attemptsByAskCode[stepCode] || 0;
            const currentHints = hintsMap[stepCode] || 0;
            const lastAction = (lastActionMap[stepCode] as any) || 'ask';
            // Avance forzado temprano: tras 2 "no se" consecutivos en momentos permitidos
            try {
              const momentKindNow = mapMomentKind(state.plan?.moments?.[act.step.momentIndex]?.title);
              const noSeCountNow = state.noSeCountByAskCode?.[stepCode] || 0;
              const forceDecision = decideForceAdvanceByNoSe({ noSeCount: noSeCountNow, forceNoSeThreshold, allowForcedOn, momentKind: momentKindNow });
              if (isNo && forceDecision.shouldForceAdvance) {
                // Mover a la siguiente ASK del mismo ciclo, respetando narrativa previa
                const nextAskIdx = getNextAskInSameCycle(state, state.stepIdx);
                if (typeof nextAskIdx === 'number') {
                  try {
                    const steps: any[] = state?.plan?.allSteps || [];
                    const ask = steps[nextAskIdx];
                    const targetMoment = ask?.momentIndex;
                    let narrationIdx: number | undefined = undefined;
                    for (let i = 0; i < steps.length; i++) {
                      const s = steps[i];
                      if (s?.momentIndex !== targetMoment) continue;
                      if (s.stepIndex < ask.stepIndex && (s.type === 'NARRATION' || s.type === 'CONTENT')) { narrationIdx = i; break; }
                      if (s.stepIndex >= ask.stepIndex) break;
                    }
                    if (typeof narrationIdx === 'number') {
                      const stKey = `${steps[narrationIdx].momentIndex}-${steps[narrationIdx].stepIndex}`;
                      const shownMap = state.shownByStepIndex || (state.shownByStepIndex = {});
                      if (!(shownMap as any)[stKey]) {
                        try {
                          const recent = await getRecentHistory(sessionKey, 4);
                          const explain = await runDocenteLLM({ language: 'es', action: 'explain', stepType: steps[narrationIdx].type, narrationText: steps[narrationIdx].data?.text || '', contentBody: steps[narrationIdx].data?.body || [], objective: String(state.plan?.meta?.lesson_name || ''), recentHistory: recent });
                          message = composeUniqueText(message, explain.message || '');
                          (shownMap as any)[stKey] = true;
                        } catch {}
                      }
                    }
                  } catch {}
                  state = advanceTo(state, nextAskIdx);
                  SESSIONS.set(sessionKey, state);
                  try { await getSessionStore().set(sessionKey, state); } catch {}
                  followUp = (currentStep(state) as any)?.data?.question || '';
                  state.justAskedFollowUp = Boolean(followUp);
                  state.lastFollowUpText = followUp;
                }
                try {
                  const recent = await getRecentHistory(sessionKey, 4);
                  const bridge = await runDocenteLLM({ language: 'es', action: 'advance', stepType: 'ASK', objective: String(act.step.data.objective || ''), recentHistory: recent });
                  message = composeUniqueText(message, bridge.message);
                } catch {}
                dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction: 'force_advance', stepCode };
                pendingInput = '';
                break;
              }
            } catch {}
            
            // Actualizar contadores: diferir incremento de hints
            if (cls.kind === 'HINT' || vague || isNo) {
              // El incremento real de hints se realiza solo cuando emitimos una pista más abajo
              lastActionMap[stepCode] = 'hint';
            }
            
            // Detectar si el estudiante está haciendo una pregunta (solo si NO es no‑sé/vago/HINT)
            const shouldClarify = !vague && !isNo && cls.kind !== 'HINT' && isStudentAskingQuestion(pendingInput, (state as any).teacherProfile);
            if (shouldClarify) {
              // Ruta clarify: insertar micro-explicación del objetivo actual
              try {
                const recent = await getRecentHistory(sessionKey, 4);
                const clarify = await runDocenteLLM({ 
                  language: 'es', 
                  action: 'explain', 
                  stepType: 'ASK', 
                  objective: String(act.step.data.objective || ''),
                  contentBody: [String(act.step.data.objective || '')],
                  recentHistory: recent 
                });
                message = clarify.message || '';
                // Re-preguntar la ASK actual con reformulación
                followUp = q;
                state.justAskedFollowUp = Boolean(followUp);
                dbg = { kind: 'CLARIFY', matched: [], missing: [], nextAction: 'clarify', stepCode };
              } catch {
                message = '';
                followUp = q;
                state.justAskedFollowUp = Boolean(followUp);
              }
              pendingInput = '';
              break;
            }
            
            // Política de reintentos: 0→HINT_1, 1→HINT_2, ≥2→opciones o transición pedagógica
            let fb = '';
            if (attempts < maxAttempts && (cls.kind === 'HINT' || vague || isNo)) {
              // Caso especial: segundo "no sé" → ofrecer DOS opciones (ask_options)
              try {
                const noSeCountNow = Number(state.noSeCountByAskCode?.[stepCode] || 0);
                if (isNo && noSeCountNow === 2) {
                  const itemsSrc = (Array.isArray(cls.missing) && (cls.missing as any[]).length > 0) ? (cls.missing as string[]) : [String(act.step.data?.objective || '')];
                  const items = pickTwoOptions(itemsSrc, [String(act.step.data?.objective || '')]);
                  if (items.length >= 2) {
                const recent = await getRecentHistory(sessionKey, 4);
                    const llm = await runDocenteLLM({
                      language: 'es',
                      action: 'ask_options',
                      stepType: 'ASK',
                      questionText: q,
                      objective: String(act.step.data.objective || state.plan?.meta?.lesson_name || ''),
                      optionItems: items,
                      recentHistory: recent
                    } as any);
                    message = llm.message || '';
                    followUp = '';
                    state.justAskedFollowUp = false;
                    const lastActionMap2 = state.lastActionByAskCode || (state.lastActionByAskCode = {});
                    lastActionMap2[stepCode] = 'options';
                    dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction: 'options', stepCode };
                    pendingInput = '';
                    break;
                  }
                }
              } catch {}
              // Mensaje alentador exclusivamente desde LLM
              try {
                const fbCfg: any = (coursePolicies as any)?.feedback || {};
                const recent = await getRecentHistory(sessionKey, 4);
                const llmFb = await runDocenteLLM({ language: 'es', action: 'feedback', stepType: 'ASK', questionText: q, userAnswer: pendingInput, matched: cls.matched, missing: cls.missing, objective: String(act.step.data.objective || ''), contentBody: [String(act.step.data?.objective || '')], hintWordLimit: Number(fbCfg.maxSentences ?? 3), allowQuestions: false, kind: cls.kind as any, recentHistory: recent });
                fb = llmFb.message || '';
              } catch {}
              // Pista y micro‑pregunta exclusivamente desde LLM
              {
                const objText = String(act.step.data.objective || state.plan?.meta?.lesson_name || '');
                const expectedArr = Array.isArray(expected) ? expected : [];
                const missingArr = Array.isArray(cls.missing) ? cls.missing : [];
                try {
                  const recent = await getRecentHistory(sessionKey, 4);
                  const sevIdx = Number(state.hintsByAskCode?.[stepCode] || 0);
                  let hintLimit = getHintWordLimit(coursePolicies, sevIdx);
                  try { hintLimit = varyHintLimit(hintLimit, pickVariant(sessionKey)); } catch {}
                  const llmHint = await runHintAgent({
                    language: 'es',
                    action: 'hint',
                    stepType: 'ASK',
                    questionText: q,
                    userAnswer: pendingInput,
                    matched: cls.matched,
                    missing: missingArr,
                    objective: objText,
                    contentBody: expectedArr,
                    hintWordLimit: hintLimit,
                    allowQuestions: true,
                    recentHistory: recent,
                    attempts,
                    hintsUsed
                  } as any);
                  const hintMsg = llmHint.message || '';
                  // Micro‑pregunta primero y luego la pista (y mantener followUp)
                  let fu = (llmHint.followUp || '').trim();
                  if (!fu) {
                    try {
                      const recent2 = await getRecentHistory(sessionKey, 4);
                      const reask2 = await runDocenteLLM({ language: 'es', action: 'ask', stepType: 'ASK', questionText: q, objective: objText, recentHistory: recent2 });
                      fu = (reask2.followUp || reask2.message || q || '').trim();
                    } catch {
                      fu = q;
                    }
                  }
                  message = composeUniqueText(fb, fu, hintMsg);
                  followUp = fu || q;
                } catch {
                  message = fb || '';
                  followUp = q;
                }

                // Anti‑repetición de follow‑up con LLM
                if (state.lastFollowUpText && state.lastFollowUpText === followUp) {
                  try {
                    const recent2 = await getRecentHistory(sessionKey, 4);
                    const reask2 = await runDocenteLLM({ language: 'es', action: 'ask', stepType: 'ASK', questionText: q, objective: objText, recentHistory: recent2 });
                    followUp = reask2.followUp || reask2.message || q;
                  } catch { followUp = q; }
                }
                state.justAskedFollowUp = Boolean(followUp);
                state.lastFollowUpText = followUp;
                // Incrementar UNA sola pista por turno y por paso
                (state as any).__hintBumpedForStep = (state as any).__hintBumpedForStep || {};
                const bumped = Boolean((state as any).__hintBumpedForStep[stepCode]);
                if (!bumped) {
                  hintsMap[stepCode] = (hintsMap[stepCode] || 0) + 1;
                  (state as any).__hintBumpedForStep[stepCode] = true;
                }
              }
              dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction: 'hint', stepCode };
              pendingInput = '';
              break;
            }
            // Transición pedagógica: usar decideNextAction en lugar de DEFAULT_ACCEPT agresivo
            {
              const momentKind = state.plan?.moments?.[act.step.momentIndex]?.code || '';
              const lastAction = state.lastActionByAskCode?.[stepCode] || '';
              const noSeCount = state.noSeCountByAskCode?.[stepCode] || 0;
              
              const forceDecision = decideForceAdvanceByNoSe({ noSeCount, forceNoSeThreshold, allowForcedOn, momentKind });
              const earlyForce = (cls.kind === 'HINT') && forceDecision.shouldForceAdvance;
              const nextAction = (earlyForce || (attempts >= maxAttempts && cls.kind === 'HINT')) ? 'force_advance' : decideNextAction({
                lastAction,
                noSeCount,
                attempts,
                momentKind
              });
              
              if (nextAction === 'force_advance') {
                // En avance forzado: omitir feedback determinista; el puente vendrá del LLM
                // Avance forzado respetando orden del JSON: NARRATION/CONTENT -> ASK
                const nextAskIdx = getNextAskInSameCycle(state, state.stepIdx);
                if (typeof nextAskIdx === 'number') {
                  try {
                    // Intentar emitir narrativa previa del mismo momento si existe
                    const steps: any[] = state?.plan?.allSteps || [];
                    const ask = steps[nextAskIdx];
                    const targetMoment = ask?.momentIndex;
                    let narrationIdx: number | undefined = undefined;
                    for (let i = 0; i < steps.length; i++) {
                      const s = steps[i];
                      if (s?.momentIndex !== targetMoment) continue;
                      if (s.stepIndex < ask.stepIndex && (s.type === 'NARRATION' || s.type === 'CONTENT')) { narrationIdx = i; break; }
                      if (s.stepIndex >= ask.stepIndex) break;
                    }
                    if (typeof narrationIdx === 'number') {
                      // Emitir narrativa si no se mostró
                      const stKey = `${steps[narrationIdx].momentIndex}-${steps[narrationIdx].stepIndex}`;
                      const shownMap = state.shownByStepIndex || (state.shownByStepIndex = {});
                      if (!(shownMap as any)[stKey]) {
                        try {
                          const recent = await getRecentHistory(sessionKey, 4);
                          const explain = await runDocenteLLM({ language: 'es', action: 'explain', stepType: steps[narrationIdx].type, narrationText: steps[narrationIdx].data?.text || '', contentBody: steps[narrationIdx].data?.body || [], objective: String(state.plan?.meta?.lesson_name || ''), recentHistory: recent });
                          message = composeUniqueText(message, explain.message || '');
                          (shownMap as any)[stKey] = true;
                        } catch {}
                      }
                    }
                  } catch {}
                  // Posicionar en la ASK objetivo y setear followUp
                  state = advanceTo(state, nextAskIdx);
                  SESSIONS.set(sessionKey, state);
                  try { await getSessionStore().set(sessionKey, state); } catch {}
                  followUp = (currentStep(state) as any)?.data?.question || '';
                  state.justAskedFollowUp = Boolean(followUp);
                  state.lastFollowUpText = followUp;
                }
                // Puente breve (si procede)
                try {
                  // Feedback breve del LLM antes del puente
                  try {
                    const fbCfg: any = (coursePolicies as any)?.feedback || {};
                    const recent = await getRecentHistory(sessionKey, 4);
                    const llmFb = await runDocenteLLM({ language: 'es', action: 'feedback', stepType: 'ASK', questionText: q, userAnswer: pendingInput, matched: cls.matched, missing: cls.missing, objective: String(act.step.data.objective || ''), contentBody: expected, hintWordLimit: Number(fbCfg.maxSentences ?? 2), allowQuestions: false, kind: cls.kind as any, recentHistory: recent });
                    message = composeUniqueText(message, llmFb.message || '');
                  } catch {}
                  const recent = await getRecentHistory(sessionKey, 4);
                  const bridge = await runDocenteLLM({ language: 'es', action: 'advance', stepType: 'ASK', objective: String(act.step.data.objective || ''), recentHistory: recent });
                  message = composeUniqueText(message, bridge.message);
                } catch {}
                dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction: 'force_advance', stepCode };
              } else if (nextAction === 'options') {
                // Presentar opciones basadas en expected
                const items = pickTwoOptions([String(act.step.data?.objective || '')]);
                try {
                  const recent = await getRecentHistory(sessionKey, 4);
                  const llm = await runDocenteLLM({
                    language: 'es',
                    action: 'ask_options',
                    stepType: 'ASK',
                    questionText: q,
                    optionItems: items,
                    recentHistory: recent
                  } as any);
                  message = llm.message || '';
                  followUp = '';
                  state.justAskedFollowUp = false;
                } catch {
                  message = q;
                }
                // Actualizar última acción
                lastActionMap[stepCode] = 'options';
                dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction: 'options', stepCode };
              } else if (nextAction === 'reask') {
                // Reformular pregunta breve con LLM
                try {
                  const recent = await getRecentHistory(sessionKey, 4);
                  const reask = await runDocenteLLM({ language: 'es', action: 'ask', stepType: 'ASK', questionText: q, objective: String(act.step.data.objective || ''), recentHistory: recent });
                  message = '';
                  followUp = reask.followUp || reask.message || q;
                  state.justAskedFollowUp = Boolean(followUp);
                } catch {
                  message = '';
                  followUp = q;
                  state.justAskedFollowUp = Boolean(followUp);
                }
                // Actualizar última acción
                lastActionMap[stepCode] = 'reask';
                dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction: 'reask', stepCode };
              } else if (nextAction === 'hint') {
                // Emitir una pista adicional breve exclusivamente desde LLM
                try {
                const objText = String(act.step.data.objective || state.plan?.meta?.lesson_name || '');
                const expectedArr = [String(act.step.data?.objective || '')];
                const missingArr = Array.isArray(cls.missing) ? cls.missing : [];
                  const recent = await getRecentHistory(sessionKey, 4);
                  const sevIdx3 = Number(state.hintsByAskCode?.[stepCode] || 0);
                  let hintLimit3 = getHintWordLimit(coursePolicies, sevIdx3);
                  try { hintLimit3 = varyHintLimit(hintLimit3, pickVariant(sessionKey)); } catch {}
                  const llmHint2 = await runHintAgent({
                    language: 'es',
                    action: 'hint',
                    stepType: 'ASK',
                  questionText: q,
                    userAnswer: pendingInput,
                    matched: cls.matched,
                  missing: missingArr,
                    objective: objText,
                    contentBody: expectedArr,
                    hintWordLimit: hintLimit3,
                    allowQuestions: true,
                    recentHistory: recent
                  } as any);
                  message = llmHint2.message || '';
                  followUp = llmHint2.followUp || '';
                  state.justAskedFollowUp = Boolean(followUp);
                } catch {
                  message = '';
                followUp = '';
                state.justAskedFollowUp = false;
                }
                // Actualizar última acción
                lastActionMap[stepCode] = 'hint';
                dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction: 'hint', stepCode };
              } else {
                // Transición pedagógica por defecto
                dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction, stepCode };
              }
              pendingInput = '';
              break;
            }
          }
			}
			if (act.kind === 'end') {
				try {
					const recent = await getRecentHistory(sessionKey, 4);
					const llm = await runDocenteLLM({ language: 'es', action: 'end', stepType: 'END', objective: String(state.plan?.meta?.lesson_name || ''), recentHistory: recent });
					message = llm.message || '';
				} catch {
					message = '';
				}
				break;
			}
		}
		// Componer assessment (rúbrica) si hubo una evaluación reciente
		try {
			if (lastClsKind) {
				const ev: any = (coursePolicies as any)?.evaluation || {};
				const scoring: Record<string, number> = ev.scoring || { R2: 2, R1: 1, R0: 0 };
				const level = lastClsKind === 'ACCEPT' ? 'R2' : (lastClsKind === 'PARTIAL' ? 'R1' : 'R0');
				const levelNum = level === 'R2' ? 2 : (level === 'R1' ? 1 : 0);
				const aids = Math.max(0, lastHints);
				const aidTag = aids > 0 ? `${levelNum}${'A'.repeat(Math.min(aids, 2))}` : undefined;
				assessment = {
					level,
					score: typeof scoring[level] === 'number' ? scoring[level] : levelNum,
					tags: aidTag ? [aidTag] : [],
					matched: lastMatched,
					missing: lastMissing,
					attempt: lastAttempts,
					hintsUsed: lastHints,
					stepCode: lastStepCodeForAssess
				};
			}
		} catch {}
		
		// Garantía final: siempre devolver un mensaje del docente usando datos del plan
		if (!skipGuarantee && (!message || !String(message).trim()) && (!followUp || !String(followUp).trim())) {
			try {
				const st = currentStep(state);
				const recent = await getRecentHistory(sessionKey, 4);
				if (st?.type === 'ASK') {
					const q2 = (st as any).data?.question || '';
					const llm2 = await runDocenteLLM({ language: 'es', action: 'ask', stepType: 'ASK', questionText: q2, objective: String(((st as any).data?.objective) || state.plan?.meta?.lesson_name || ''), recentHistory: recent });
					message = llm2.message || q2;
					followUp = llm2.followUp || followUp;
				} else {
					const d: any = (st as any)?.data || {};
					const parts = [d.title, ...(d.body || []), d.text, ...(d.items || [])].filter(Boolean) as string[];
					const bodyArr: string[] = parts as string[];
					const llm2 = await runDocenteLLM({ language: 'es', action: 'explain', stepType: (st?.type as any) || 'CONTENT', momentTitle: state.plan?.moments[(st as any)?.momentIndex || 0]?.title, objective: state.plan?.meta?.lesson_name || '', contentBody: bodyArr, recentHistory: recent });
					message = llm2.message || bodyArr.join(' — ');
				}
			} catch {
				const st: any = currentStep(state);
				const q2 = st?.data?.question || '';
				message = q2 || message || '';
			}
		}
		// Persist history (JSONL estilo MongoDB-like)
		try {
			await appendHistory(sessionKey, {
				planUrl: state.planUrl,
				stepIdx: state.stepIdx,
				momentIdx: state.momentIdx,
				message,
				followUp
			});
		} catch {}

		// Debug logging opcional
		try {
			const debugOn = process.env.ENGINE_DEBUG === 'true' || process.env.NEXT_PUBLIC_ENGINE_DEBUG === 'true' || Boolean((coursePolicies as any)?.debug?.logs);
			if (debugOn) {
				const st = currentStep(state);
				const messageType = (dbg && dbg.messageType) || (dbg && dbg.nextAction) || (st?.type === 'ASK' ? 'ask' : String(st?.type || '').toLowerCase());
				const payload = {
					tag: 'engine.turn',
					sessionKey,
					momentTitle: state.plan?.moments?.[st?.momentIndex || 0]?.title,
					momentKind: mapMomentKind(state.plan?.moments?.[st?.momentIndex || 0]?.title),
					stepType: st?.type,
					stepIdx: state.stepIdx,
					stepCode: (st as any)?.code || dbg?.stepCode,
					classification: dbg?.kind,
					feedbackKind: dbg?.feedbackKind || dbg?.kind,
					messageType,
					matched: dbg?.matched,
					missing: dbg?.missing,
					nextAction: dbg?.nextAction,
					messageChars: (message || '').length,
					followUpChars: (followUp || '').length,
					hasFollowUp: Boolean(followUp && String(followUp).trim()),
					userInputLen: (pendingInput || '').length,
					thresholds: { jaccardMin: 0.25, semThresh: 0.48, semBest: 0.40 },
					hintsUsed: Number(state.hintsByAskCode?.[(st as any)?.code || dbg?.stepCode] || 0)
				};
				// eslint-disable-next-line no-console
				console.debug(JSON.stringify(payload));
			}
		} catch {}
		// Obtener métricas de presupuesto si está disponible
		const budgetMetrics = state.budgetCentsLeft !== undefined ? {
			budgetCentsLeft: state.budgetCentsLeft,
			escalationsUsed: state.escalationsUsed || 0,
			adaptiveMode: state.adaptiveMode || false
		} : null;

		// Enriquecer con hints usados para el paso actual y máximo desde políticas
		let hintsUsedOut = 0;
		try {
			const currCode = (currentStep(state) as any)?.code;
			hintsUsedOut = Number((state as any)?.hintsByAskCode?.[currCode || ''] || 0);
		} catch {}
		const maxHintsOut = Number((coursePolicies as any)?.hints?.maxHints ?? 3);

		return NextResponse.json({ 
			message, 
			followUp, 
			assessment,
			state: { stepIdx: state.stepIdx, done: state.done, hintsUsed: hintsUsedOut, maxHints: maxHintsOut },
			stepCode: (currentStep(state) as any)?.code || undefined,
			momentIdx: state.momentIdx,
			budgetMetrics 
		});
	} catch (err: any) {
		return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
	}
}


