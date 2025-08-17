import { runDocenteLLM } from '@/ai/orchestrator';
import { evaluateHybrid, type AskPolicy } from '@/engine/eval';
import { extractKeywords } from '@/engine/hints';
import { advanceTo, currentStep, decideAction, getNextAskInSameCycle, next } from '@/engine/runner';
import { loadAndCompile } from '@/plan/compilePlan';
import { appendHistory, clearHistory, getRecentHistory } from '@/session/history';
import { SessionState, initSession } from '@/session/state';
import { getSessionStore } from '@/session/store';
import { NextResponse } from 'next/server';

type ClientState = {
  momentIdx?: number;
  stepIdx?: number;
  attemptsByAskCode?: Record<string, number>;
  noSeCountByAskCode?: Record<string, number>;
  lastActionByAskCode?: Record<string, string>;
  lastAnswerByAskCode?: Record<string, string>;
  done?: boolean;
};

type Body = { sessionKey: string; userInput?: string; planUrl?: string; reset?: boolean; clientState?: ClientState };

const SESSIONS = new Map<string, SessionState>();
const COURSE_POLICIES_CACHE = new Map<string, any>();

function mapMomentKind(title?: string): 'SALUDO'|'CONEXION'|'ADQUISICION'|'APLICACION'|'DISCUSION'|'REFLEXION'|'OTRO' {
  const t = (title || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
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
    const res = await fetch(`/courses/${courseId}/policies.json`);
    if (!res.ok) return undefined;
    const json = await res.json();
    COURSE_POLICIES_CACHE.set(courseId, json);
    return json;
  } catch {
    return undefined;
  }
}

function buildStudentFacingBase(questionText: string, objective: string, expected: string[]): string {
  const q = (questionText || '').toLowerCase();
  const idx = q.indexOf('sobre ');
  if (idx !== -1) {
    const topic = questionText.slice(idx + 'sobre '.length).replace(/[?¿.]/g, '').trim();
    if (topic) return `lo que esperas aprender sobre ${topic}`;
  }
  const fallback = (expected || []).filter(Boolean)[0] || objective || '';
  if (fallback) return `aspectos clave de ${fallback}`;
  return 'el tema actual';
}

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as Body;
		const { sessionKey, userInput = '', planUrl = '/courses/SSO001/lessons/lesson02.json', reset = false, clientState } = body;
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
      state.attemptsByAskCode = { ...state.attemptsByAskCode, ...(clientState.attemptsByAskCode || {}) };
      state.noSeCountByAskCode = { ...(state.noSeCountByAskCode || {}), ...(clientState.noSeCountByAskCode || {}) };
      state.lastActionByAskCode = { ...(state.lastActionByAskCode || {}), ...(clientState.lastActionByAskCode || {}) };
      state.lastAnswerByAskCode = { ...(state.lastAnswerByAskCode || {}), ...(clientState.lastAnswerByAskCode || {}) };
      // Flag opcional
      if (typeof (clientState as any).justAskedFollowUp === 'boolean') {
        state.justAskedFollowUp = Boolean((clientState as any).justAskedFollowUp);
      }
		}
    const coursePolicies = await loadCoursePolicies(deriveCourseId(state.planUrl));
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
		// Bucle: saltar SKIP consecutivos y construir salida adecuada
		let message = '';
		let followUp = '';
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
				const dynamicK = qtype.includes('lista') ? (firstAttempt ? 1 : (afterHint ? 2 : 2)) : undefined;
				const policy: AskPolicy = qtype.includes('lista') ? { type: 'listado', thresholdK: dynamicK }
					: qtype.includes('aplica') ? { type: 'aplicacion', requiresJustification: true }
					: (qtype.includes('abierta') ? { type: 'metacognitiva' } : { type: (qtype as any) || 'conceptual' });
				// Derivar expected desde pasos previos (CONTENT/KEY_*) del mismo momento
				let expected: string[] = [];
				try {
					const moment = state.plan?.moments?.[act.step.momentIndex];
					const prior = (moment?.steps || []).slice(0, act.step.stepIndex);
					const texts: string[] = [];
					for (const ps of prior) {
						const t = ps.type;
						const d: any = ps.data;
						if (t === 'CONTENT') {
							if (d.title) texts.push(String(d.title));
							if (Array.isArray(d.body)) texts.push(...d.body.map((x: any)=>String(x)));
						} else if (t === 'KEY_CONTENT' || t === 'KEY_POINTS' || t === 'KEY_ELEMENTS' || t === 'TOPICS') {
							if (Array.isArray(d.items)) texts.push(...d.items.map((x: any)=>String(x)));
						} else if (t === 'NARRATION' && d.text) {
							texts.push(String(d.text));
						}
					}
					expected = extractKeywords(texts);
				} catch {}
          const momentKind = mapMomentKind(state.plan?.moments?.[act.step.momentIndex]?.title);
          const maxAttempts = Number(coursePolicies?.advance?.maxAttemptsBeforeForce ?? 2);
          const allowForcedOn: string[] = Array.isArray(coursePolicies?.advance?.allowForcedOn) ? coursePolicies.advance.allowForcedOn : ['SALUDO','CONEXION'];
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
            try {
              const recent = await getRecentHistory(sessionKey, 4);
              const llm = await runDocenteLLM({ language: 'es', action: 'ask', stepType: 'ASK', questionText: q, objective: String(act.step.data.objective || ''), recentHistory: recent });
						message = llm.message;
					} catch { message = q; }
					break;
				}
          // Evaluación híbrida: vaguedad → rápido → semántica (embeddings bajo demanda)
          const hintsUsed = Number(state.hintsByAskCode?.[stepCode] || 0);
          const hybrid = await evaluateHybrid(
            pendingInput,
            acceptable,
            expected,
            policy,
            { fuzzy: { maxEditDistance: 1, similarityMin: 0.25 }, semThresh: 0.52, semBestThresh: 0.42, maxHints: 2 },
            { lastAnswer: state.lastAnswerByAskCode?.[stepCode], hintsUsed }
          );
          const cls = { kind: hybrid.kind, matched: hybrid.matched, missing: hybrid.missing } as const;
          const vague = hybrid.reason === 'VAGUE';
                // En metacognitiva (Saludo) NO aceptar respuestas DONT_KNOW/VAGUE ni por longitud.
                // La aceptación debe basarse en señales reales del objetivo/expected o acceptable.
          // Feedback determinista breve basado en matched/missing
          const buildDeterministicFeedback = () => {
            const has = (arr?: string[]) => Array.isArray(arr) && arr.length > 0;
            if (cls.kind === 'ACCEPT' && has(cls.matched)) return `Bien: mencionaste ${cls.matched.join(', ')}.`;
            if (cls.kind === 'PARTIAL') {
              const a = has(cls.matched) ? `acertaste ${cls.matched.join(', ')}` : 'ya estás cerca';
              const b = has(cls.missing) ? `Te falta incluir ${cls.missing.join(', ')}.` : '';
              return `Vas bien: ${a}. ${b}`.trim();
            }
            // Abridores configurables para variar el feedback (evita repetición)
            const openers: string[] = (coursePolicies?.feedback?.openers?.hint || []) as string[];
            const idx = Math.max(0, (attempts % Math.max(1, openers.length)) - 1);
            const opener = openers[idx] || 'Intenta precisar un poco más.';
            if (has(cls.missing)) return `${opener} Menciona: ${cls.missing.join(', ')}.`;
            return `${opener} Da un ejemplo o una idea concreta.`;
          };
          if (!vague && cls.kind === 'ACCEPT') {
            let fb = '';
            try {
              const fbCfg: any = (coursePolicies as any)?.feedback || {};
              const recent = await getRecentHistory(sessionKey, 4);
              const deterministic = buildDeterministicFeedback();
              const llm = await runDocenteLLM({ language: 'es', action: 'feedback', stepType: 'ASK', questionText: q, userAnswer: pendingInput, matched: cls.matched, missing: cls.missing, objective: String(act.step.data.objective || ''), contentBody: expected, hintWordLimit: Number(fbCfg.maxSentences ?? 3), allowQuestions: fbCfg.allowQuestions !== false, kind: 'ACCEPT' as any, recentHistory: recent });
              fb = [deterministic, llm.message || ''].filter(Boolean).join('\n\n');
            } catch {}
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
                  nextMsg = explain.message || '';
                  // Marcar como mostrado
                  (shownMap as any)[stepKey] = true;
                  
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
            message = [fb, nextMsg].filter(Boolean).join('\n\n');
            
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
          const isNo = /^\s*(no\s*se|no\s*lo\s*se|no\s*sé|no\s*lo\s*sé|ns|n\/a|no|mmm|mm|ok|si|no\s*est[oó]\s*seguro)\s*$/i.test(pendingInput);
          if (isNo) {
            noSeMap[stepCode] = (noSeMap[stepCode] || 0) + 1;
          } else {
            state.attemptsByAskCode[stepCode] = (state.attemptsByAskCode[stepCode] || 0) + 1;
          }
          const attempts = state.attemptsByAskCode[stepCode] || 0;
          const vagueCfg = coursePolicies?.vague || {};
          if (vague || cls.kind === 'PARTIAL' || cls.kind === 'HINT' || isNo || hybrid.reason === 'MAX_HINTS' || hybrid.reason === 'SEM_LOW') {
            // Política de reintentos por pregunta (loop control)
            const lastActionMap = state.lastActionByAskCode || (state.lastActionByAskCode = {});
            const hintsMap = state.hintsByAskCode || (state.hintsByAskCode = {} as any);
            const attempts = state.attemptsByAskCode[stepCode] || 0;
            const currentHints = hintsMap[stepCode] || 0;
            const lastAction = (lastActionMap[stepCode] as any) || 'ask';
            
            // Actualizar contadores
            if (cls.kind === 'HINT' || vague || isNo) {
              if (lastAction === 'hint') hintsMap[stepCode] = currentHints + 1;
              lastActionMap[stepCode] = 'hint';
            }
            
            // Política de reintentos: 0→HINT_1, 1→HINT_2, ≥2→opciones o DEFAULT_ACCEPT
            let fb = '';
            if (attempts < 2 && (cls.kind === 'HINT' || vague || isNo)) {
              // Mensaje alentador
              try {
                const fbCfg: any = (coursePolicies as any)?.feedback || {};
                const recent = await getRecentHistory(sessionKey, 4);
                const deterministic = buildDeterministicFeedback();
                const llmFb = await runDocenteLLM({ language: 'es', action: 'feedback', stepType: 'ASK', questionText: q, userAnswer: pendingInput, matched: cls.matched, missing: cls.missing, objective: String(act.step.data.objective || ''), contentBody: expected, hintWordLimit: Number(fbCfg.maxSentences ?? 3), allowQuestions: fbCfg.allowQuestions !== false, kind: cls.kind as any, recentHistory: recent });
                fb = [deterministic, llmFb.message || ''].filter(Boolean).join('\n\n');
              } catch {}
              const pool = (cls.missing && cls.missing.length ? cls.missing : expected).filter(Boolean).map(String);
              try {
                const wordLimits = coursePolicies?.hints?.wordLimits || [18,35,60];
                const limit = wordLimits[0] ?? 18;
                // Hints con keywords del curso (objetivos + contenido del momento)
                const moment = state.plan?.moments?.[act.step.momentIndex];
                const objText = String(state.plan?.meta?.lesson_name || act.step.data.objective || '');
                const priorTexts: string[] = [];
                for (const ps of (moment?.steps || []).slice(0, act.step.stepIndex)) {
                  const d: any = ps.data;
                  if (Array.isArray(d?.body)) priorTexts.push(...d.body.map((x:any)=>String(x)));
                  if (Array.isArray(d?.items)) priorTexts.push(...d.items.map((x:any)=>String(x)));
                  if (d?.text) priorTexts.push(String(d.text));
                  if (d?.title) priorTexts.push(String(d.title));
                }
                const expectedPlus = extractKeywords([objText, ...priorTexts]);
                // Variación de hint (pool configurable)
                const variants = Array.isArray(coursePolicies?.hints?.variants) ? coursePolicies?.hints?.variants as string[] : [];
                const vIdx = (hintsMap[stepCode] || 0) % Math.max(1, variants.length || 1);
                const variantCue = variants.length ? variants[vIdx] : '';
                const recent = await getRecentHistory(sessionKey, 4);
                const llm = await runDocenteLLM({ language: 'es', action: 'hint', stepType: 'ASK', questionText: q, userAnswer: pendingInput, matched: cls.matched, missing: cls.missing, objective: String(act.step.data.objective || ''), contentBody: variantCue ? [variantCue, ...expectedPlus] : expectedPlus, hintWordLimit: limit, recentHistory: recent });
                message = [fb, llm.message].filter(Boolean).join('\n\n');
                followUp = llm.followUp || '';
              } catch { message = ''; followUp = ''; }
              // Incrementar hints usados cada vez que emitimos un hint
              hintsMap[stepCode] = (hintsMap[stepCode] || 0) + 1;
              dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction: 'hint', stepCode };
              pendingInput = '';
              break;
            }
            // DEFAULT_ACCEPT: 3º intento vago o REFOCUS → avanzar a la siguiente ASK (sin opciones)
            {
              const nextAskIdx = getNextAskInSameCycle(state, state.stepIdx);
              if (typeof nextAskIdx === 'number') {
                state = advanceTo(state, nextAskIdx);
                followUp = (currentStep(state) as any)?.data?.question || '';
                state.justAskedFollowUp = Boolean(followUp);
              }
            }
            // Mensaje de cierre suave
            try {
              const recent = await getRecentHistory(sessionKey, 4);
              const bridge = await runDocenteLLM({ language: 'es', action: 'advance', stepType: 'ASK', objective: String(act.step.data.objective || ''), recentHistory: recent });
              message = [fb, bridge.message].filter(Boolean).join('\n\n');
            } catch {}
            dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction: 'advance', stepCode };
            pendingInput = '';
            break;
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
					thresholds: { jaccardMin: 0.25, semThresh: 0.52, semBest: 0.42 },
					hintsUsed: Number(state.hintsByAskCode?.[(st as any)?.code || dbg?.stepCode] || 0)
				};
				// eslint-disable-next-line no-console
				console.debug(JSON.stringify(payload));
			}
		} catch {}
		return NextResponse.json({ message, followUp, state: { stepIdx: state.stepIdx, done: state.done } });
	} catch (err: any) {
		return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
	}
}


