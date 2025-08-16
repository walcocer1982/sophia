import { runDocenteLLM } from '@/ai/orchestrator';
import { classifyTurn, type AskPolicy } from '@/engine/eval';
import { decideNextAction } from '@/engine/flow/transition';
import { extractKeywords } from '@/engine/hints';
import { currentStep, decideAction, next } from '@/engine/runner';
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
      state.momentIdx = typeof clientState.momentIdx === 'number' ? clientState.momentIdx : state.momentIdx;
      state.stepIdx = typeof clientState.stepIdx === 'number' ? clientState.stepIdx : state.stepIdx;
      state.attemptsByAskCode = { ...state.attemptsByAskCode, ...(clientState.attemptsByAskCode || {}) };
      state.noSeCountByAskCode = { ...(state.noSeCountByAskCode || {}), ...(clientState.noSeCountByAskCode || {}) };
      state.lastActionByAskCode = { ...(state.lastActionByAskCode || {}), ...(clientState.lastActionByAskCode || {}) };
      state.lastAnswerByAskCode = { ...(state.lastAnswerByAskCode || {}), ...(clientState.lastAnswerByAskCode || {}) };
    }
    const coursePolicies = await loadCoursePolicies(deriveCourseId(state.planUrl));
		const step = currentStep(state);
		// Bucle: saltar SKIP consecutivos y construir salida adecuada
		let message = '';
		let followUp = '';
		// Debug vars
		let dbg: any = null;
		let safety = 0;
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
					const llm = await runDocenteLLM({
						language: 'es',
						action: 'explain',
						stepType: act.step.type,
						momentTitle: state.plan?.moments[act.step.momentIndex]?.title,
						objective: state.plan?.meta?.lesson_name || '',
						contentBody: bodyArr
					});
					message = llm.message;
				} catch {
					message = bodyArr.join(' — ') || 'Continuemos con el contenido.';
				}
				state = next(state);
				SESSIONS.set(sessionKey, state);
				try { await getSessionStore().set(sessionKey, state); } catch {}
				// Buscar la siguiente ASK saltando pasos de metadatos
				const steps = state.plan?.allSteps || [];
				for (let i = state.stepIdx; i < steps.length; i++) {
					const s = steps[i];
					const t = s.type;
					if (t === 'KEY_CONTENT' || t === 'KEY_POINTS' || t === 'EXPECTED_LEARNING') continue;
          if (t === 'ASK') {
            // Cerrar la narración con la pregunta actual del paso
            followUp = s.data.question || '';
          }
					break;
				}
				break;
			}
        if (act.kind === 'ask') {
				const q = act.step.data.question || '';
				const acceptable = act.step.data.acceptable_answers || [];
				// Política básica por question_type
				const qtype = String(act.step.data.question_type || '').toLowerCase();
				const policy: AskPolicy = qtype.includes('lista') ? { type: 'listado', thresholdK: 2 }
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
          const maxAttempts = Number(coursePolicies?.advance?.maxAttemptsBeforeForce ?? 999);
          const allowForcedOn: string[] = Array.isArray(coursePolicies?.advance?.allowForcedOn) ? coursePolicies.advance.allowForcedOn : ['SALUDO','CONEXION'];
          const stepCode = act.step.code || `Q:${q.substring(0,50)}`;
          if (!pendingInput.trim()) {
            try {
              const llm = await runDocenteLLM({ language: 'es', action: 'ask', stepType: 'ASK', questionText: q, objective: String(act.step.data.objective || '') });
              message = llm.message;
            } catch { message = q; }
            break;
          }
          // Evaluar respuesta del usuario
          const cls = classifyTurn(pendingInput, policy, acceptable, expected);
                // En metacognitiva (Saludo) NO aceptar respuestas DONT_KNOW/VAGUE ni por longitud.
                // La aceptación debe basarse en señales reales del objetivo/expected o acceptable.
          if (cls.kind === 'ACCEPT') {
            let fb = '';
            try {
              const fbCfg: any = (coursePolicies as any)?.feedback || {};
              const recent = await getRecentHistory(sessionKey, 4);
              const llm = await runDocenteLLM({ language: 'es', action: 'feedback', stepType: 'ASK', questionText: q, userAnswer: pendingInput, matched: cls.matched, missing: cls.missing, objective: String(act.step.data.objective || ''), contentBody: expected, hintWordLimit: Number(fbCfg.maxSentences ?? 3), allowQuestions: fbCfg.allowQuestions !== false, kind: 'ACCEPT' as any, recentHistory: recent });
              fb = llm.message || '';
            } catch {}
            // Avanzar al siguiente paso y componer salida (evaluación + siguiente acción)
            state = next(state);
            SESSIONS.set(sessionKey, state);
            try { await getSessionStore().set(sessionKey, state); } catch {}
            let nextMsg = '';
            const nxt = decideAction(currentStep(state));
            if (nxt.kind === 'explain' && nxt.step) {
              const d: any = nxt.step.data || {};
              const parts = [d.title, ...(d.body || []), d.text, ...(d.items || [])].filter(Boolean) as string[];
              const bodyArr: string[] = parts as string[];
              try {
                // Puente breve al siguiente foco (ej. conexión) generado por LLM, sin hardcodear
                const bridge = await runDocenteLLM({ language: 'es', action: 'advance', stepType: nxt.step.type, momentTitle: state.plan?.moments[nxt.step.momentIndex]?.title, objective: state.plan?.meta?.lesson_name || '' });
                const llm2 = await runDocenteLLM({ language: 'es', action: 'explain', stepType: nxt.step.type, momentTitle: state.plan?.moments[nxt.step.momentIndex]?.title, objective: state.plan?.meta?.lesson_name || '', contentBody: bodyArr });
                nextMsg = [bridge.message, llm2.message || bodyArr.join(' — ')].filter(Boolean).join('\n\n');
              } catch {
                nextMsg = bodyArr.join(' — ');
              }
              // No mezclar: prepara sólo followUp (sin avanzar state) para el próximo bubble
              {
                const stepsAfter = state.plan?.allSteps || [];
                for (let i = state.stepIdx + 1; i < stepsAfter.length; i++) {
                  const s = stepsAfter[i];
                  const t = s.type;
                  if (t === 'KEY_CONTENT' || t === 'KEY_POINTS' || t === 'EXPECTED_LEARNING') continue;
                  if (t === 'ASK') { followUp = s.data.question || ''; break; }
                }
              }
            } else if (nxt.kind === 'end') {
              try {
                const adv = await runDocenteLLM({ language: 'es', action: 'advance', stepType: 'END', objective: String(state.plan?.meta?.lesson_name || '') });
                nextMsg = adv.message || '';
              } catch { nextMsg = ''; }
            }
            message = [fb, nextMsg].filter(Boolean).join('\n\n');
            dbg = { kind: 'ACCEPT', matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], stepCode };
            pendingInput = '';
            break;
          }
          // Contabilizar respuesta previa y contadores separados para 'no sé'
          state.lastAnswerByAskCode![stepCode] = pendingInput;
          const noSeMap = state.noSeCountByAskCode || (state.noSeCountByAskCode = {});
          const isNo = false; // la detección de evasivas se maneja en el prompt
          if (isNo) {
            noSeMap[stepCode] = (noSeMap[stepCode] || 0) + 1;
          } else {
            state.attemptsByAskCode[stepCode] = (state.attemptsByAskCode[stepCode] || 0) + 1;
          }
          const attempts = state.attemptsByAskCode[stepCode] || 0;
          const vagueCfg = coursePolicies?.vague || {};
          if (cls.kind === 'PARTIAL' || cls.kind === 'HINT' || isNo) {
            // Mensaje alentador unificado por prompt
            let fb = '';
            try {
              const fbCfg: any = (coursePolicies as any)?.feedback || {};
              const recent = await getRecentHistory(sessionKey, 4);
              const llmFb = await runDocenteLLM({ language: 'es', action: 'feedback', stepType: 'ASK', questionText: q, userAnswer: pendingInput, matched: cls.matched, missing: cls.missing, objective: String(act.step.data.objective || ''), contentBody: expected, hintWordLimit: Number(fbCfg.maxSentences ?? 3), allowQuestions: fbCfg.allowQuestions !== false, kind: cls.kind as any, recentHistory: recent });
              fb = llmFb.message || '';
            } catch {}
            const pool = (cls.missing && cls.missing.length ? cls.missing : expected).filter(Boolean).map(String);
            // Decidir acción de apoyo leyendo policies.advance y no por intentos fijos
            const lastActionMap = state.lastActionByAskCode || (state.lastActionByAskCode = {});
            const lastAction = (lastActionMap[stepCode] as any) || 'ask';
            const { nextAction } = decideNextAction({ lastAction, classKind: cls.kind as any, attempts, noSeCount: noSeMap[stepCode] || 0, cfg: coursePolicies?.advance });
            lastActionMap[stepCode] = nextAction;
            if (nextAction === 'hint') {
              try {
                const wordLimits = coursePolicies?.hints?.wordLimits || [18,35,60];
                const limit = wordLimits[0] ?? 18;
                const llm = await runDocenteLLM({ language: 'es', action: 'hint', stepType: 'ASK', questionText: q, userAnswer: pendingInput, matched: cls.matched, missing: cls.missing, objective: String(act.step.data.objective || ''), contentBody: expected, hintWordLimit: limit });
                message = [fb, llm.message].filter(Boolean).join('\n\n');
                followUp = llm.followUp || '';
              } catch { message = ''; followUp = ''; }
              dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction: 'hint', stepCode };
              pendingInput = '';
              break;
            }
            if (nextAction === 'ask_simple') {
              try {
                const simpleOptions = (pool.length ? pool : expected).slice(0, 3);
                const llm = await runDocenteLLM({ language: 'es', action: 'ask_simple', stepType: 'ASK', questionText: q, objective: String(act.step.data.objective || ''), simpleOptions });
                message = [fb, llm.message].filter(Boolean).join('\n\n');
                followUp = '';
              } catch { message = ''; followUp = ''; }
              dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction: 'ask_simple', stepCode };
              pendingInput = '';
              break;
            }
            // attempts >= 3
            try {
              const optionItems = (pool.length ? pool : expected).slice(0, 3);
              const llm = await runDocenteLLM({ language: 'es', action: (nextAction === 'ask_options' ? 'ask_options' : 'explain') as any, stepType: 'ASK', questionText: q, objective: String(act.step.data.objective || ''), optionItems });
              message = [fb, llm.message].filter(Boolean).join('\n\n');
              followUp = '';
            } catch { message = ''; followUp = ''; }
            dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction: nextAction, stepCode };
            pendingInput = '';
            break;
          }
			}
			if (act.kind === 'end') {
				message = 'Fin de la lección.';
				break;
			}
		}
		// Garantía final: siempre devolver un mensaje del docente usando datos del plan
		if ((!message || !String(message).trim()) && (!followUp || !String(followUp).trim())) {
			try {
				const st = currentStep(state);
				if (st?.type === 'ASK') {
					const q2 = (st as any).data?.question || '';
					const llm2 = await runDocenteLLM({ language: 'es', action: 'ask', stepType: 'ASK', questionText: q2, objective: String(((st as any).data?.objective) || state.plan?.meta?.lesson_name || '') });
					message = llm2.message || q2;
					followUp = llm2.followUp || followUp;
				} else {
					const d: any = (st as any)?.data || {};
					const parts = [d.title, ...(d.body || []), d.text, ...(d.items || [])].filter(Boolean) as string[];
					const bodyArr: string[] = parts as string[];
					const llm2 = await runDocenteLLM({ language: 'es', action: 'explain', stepType: (st?.type as any) || 'CONTENT', momentTitle: state.plan?.moments[(st as any)?.momentIndex || 0]?.title, objective: state.plan?.meta?.lesson_name || '', contentBody: bodyArr });
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
				const payload = {
					tag: 'engine.turn',
					sessionKey,
					momentTitle: state.plan?.moments?.[st?.momentIndex || 0]?.title,
					stepType: st?.type,
					stepIdx: state.stepIdx,
					stepCode: (st as any)?.code || dbg?.stepCode,
					classification: dbg?.kind,
					matched: dbg?.matched,
					missing: dbg?.missing,
					nextAction: dbg?.nextAction,
					messageChars: (message || '').length,
					followUpChars: (followUp || '').length,
					userInputLen: (pendingInput || '').length
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


