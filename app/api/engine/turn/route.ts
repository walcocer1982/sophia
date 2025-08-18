import { runDocenteLLM } from '@/ai/orchestrator';
import { computeMatchedMissing, detectTopicDeviation, evaluateHybrid, type AskPolicy } from '@/engine/eval';
import { buildDeterministicFeedback as mkFb } from '@/engine/feedback';
import { extractKeywords, makeHintMessage, makeReaskMessage } from '@/engine/hints';
import { isAffirmativeToResume, isStudentAskingQuestion } from '@/engine/questions';
import { advanceTo, currentStep, decideAction, decideNextAction, getNextAskInSameCycle, next } from '@/engine/runner';
import { loadAndCompile } from '@/plan/compilePlan';
import { appendHistory, clearHistory, getRecentHistory } from '@/session/history';
import { SessionState, initSession } from '@/session/state';
import { getSessionStore } from '@/session/store';
import fs from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';

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
		
		// --- REEMITIR REPREGUNTA SI AÚN NO RESPONDE (continuidad) ---
		if (!pendingInput.trim() && state.justAskedFollowUp && state.lastFollowUpText) {
			return NextResponse.json({
				message: '',
				followUp: state.lastFollowUpText,
				state
			});
		}
		
		// 1) Si el alumno pide "permiso" para preguntar (p.ej. "te puedo hacer una pregunta"):
		if (isStudentAskingQuestion(pendingInput) && !/\w+\?/.test(pendingInput)) {
			message = '¡Claro! Dime cuál es tu consulta y, cuando quede claro, me lo confirmas para continuar con la clase.';
			// "pausa": recuerda dónde estás para retomar
			state.consultCtx.pausedAt = { momentIndex: state.momentIdx!, stepIndex: state.stepIdx! };
			// Debug log
			if (process.env.ENGINE_DEBUG === 'true') {
				console.log('[CONSULTA_INTENCION]', { pausedAt: state.consultCtx.pausedAt });
			}
			// No avances el plan ni evalúes; solo responde
			return NextResponse.json({ message, followUp: '', state });
		}
		
		// 2) Si trae una pregunta concreta (termina en ? o contiene palabras de pregunta):
		if (isStudentAskingQuestion(pendingInput) && /\w+\?/.test(pendingInput)) {
			const recent = await getRecentHistory(sessionKey, 6);
			const qa = await runDocenteLLM({
				language: 'es',
				action: 'feedback',
				stepType: 'ASK',
				questionText: pendingInput,
				objective: String(state.plan?.meta?.lesson_name || ''),
				recentHistory: recent
			});
			message = (qa.message || '').trim();
			// pides confirmación para retomar
			const tail = '\n\n¿Te quedó claro? Responde "sí" para continuar o formula otra pregunta.';
			// Debug log
			if (process.env.ENGINE_DEBUG === 'true') {
				console.log('[CONSULTA_QA]', { len: message.length });
			}
			return NextResponse.json({ message: message + tail, followUp: '', state });
		}
		
		// 3) Si el alumno confirma que ya entendió, retomas donde quedó
		if (state.consultCtx.pausedAt && isAffirmativeToResume(pendingInput)) {
			// Debug log
			if (process.env.ENGINE_DEBUG === 'true') {
				console.log('[CONSULTA_RESUME]', { resumedFrom: state.consultCtx.pausedAt });
			}
			// Limpiar contexto de pausa
			state.consultCtx.pausedAt = undefined;
			
			// Si estamos sobre una ASK, re-emitirla ya
			const st = currentStep(state);
			if (st?.type === 'ASK') {
				const q = st.data?.question || '';
				message = 'Perfecto, retomemos.';
				followUp = q;
				state.justAskedFollowUp = Boolean(followUp);
				return NextResponse.json({ message, followUp, state });
			}
			// Si no es ASK, continúa flujo normal
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
					const explicit: string[] = Array.isArray(act.step.data?.expected) ? (act.step.data.expected as string[]) : [];
					const derived = extractKeywords(texts);
					const union = Array.from(new Set([...(explicit || []), ...(derived || [])]));
					expected = union;
				} catch {}
          const momentKind = mapMomentKind(state.plan?.moments?.[act.step.momentIndex]?.title);
          const maxAttempts = Number(coursePolicies?.advance?.maxAttemptsBeforeForce ?? 2);
          const allowForcedOn: string[] = Array.isArray(coursePolicies?.advance?.allowForcedOn) ? coursePolicies.advance.allowForcedOn : ['CONEXION'];
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
          // Evaluación para preguntas abiertas (answer_type: "open")
          const answerType = (act.step.data as any)?.answer_type || '';
          const rubric = (act.step.data as any)?.rubric || {};
          const objText = String(act.step.data?.objective || '');
          const isOpen = (answerType === 'open') || String((act.step.data as any)?.question_type || '').toLowerCase().includes('abierta') || ['SALUDO','CONEXION'].includes(momentKind);
          
          let cls: any;
          let vague: boolean;
          const hintsUsed = Number(state.hintsByAskCode?.[stepCode] || 0);
          const attempts = state.attemptsByAskCode?.[stepCode] || 0;
          
          if (isOpen) {
            // 1) Reglas rápidas + lectura de señales de contenido
            const text = (pendingInput || '').trim();
            const minWords = Number(rubric.min_words ?? 12);
            const words = text.split(/\s+/).filter(Boolean);
            const tooShort = words.length < minWords;
            // Señales de contenido (antes de gatear por longitud)
            const { matched: openMatched, missing: openMissing } = computeMatchedMissing(text, acceptable, expected, { maxEditDistance: 1, similarityMin: 0.25 });
            // 2) ON_TOPIC / VAGUE / OFF_TOPIC con detectTopicDeviation
            const deviation = detectTopicDeviation(text, act.step, objText);

            if (!text || (deviation === 'OFF_TOPIC' && openMatched.length === 0) || (tooShort && attempts < 1 && openMatched.length === 0)) {
              // Rama OPEN insuficiente: usar modelo y actualizar contadores/acciones para permitir escalamiento
              const aspectsFallback = coursePolicies?.hints?.templates?.open?.fallbackAspects || [];
              const contentForHint = rubric.aspects || aspectsFallback;
              const lastActionMap = state.lastActionByAskCode || (state.lastActionByAskCode = {});
              const hintsMap = state.hintsByAskCode || (state.hintsByAskCode = {} as any);
              const attemptsSoFarOpen = state.attemptsByAskCode?.[stepCode] || 0;

              try {
                const recent = await getRecentHistory(sessionKey, 4);
                if (attemptsSoFarOpen >= 2) {
                  // Escalar a micro‑explicación + re‑pregunta (no avanzar)
                  const explain = await runDocenteLLM({
                    language: 'es',
                    action: 'explain',
                    stepType: 'ASK',
                    objective: objText,
                    contentBody: contentForHint,
                    recentHistory: recent
                  });
                  message = explain.message || '';
                  followUp = q;
                } else {
                  // Pista + micro‑pregunta con LLM (usando señales si existen)
                  const llmHint = await runDocenteLLM({
                    language: 'es',
                    action: 'hint',
                    stepType: 'ASK',
                    questionText: q,
                    userAnswer: text,
                    matched: openMatched,
                    missing: (openMissing && openMissing.length ? openMissing.slice(0,2) : (contentForHint || []).slice(0,2)),
                    objective: objText,
                    contentBody: contentForHint,
                    hintWordLimit: Number((coursePolicies?.hints?.wordLimits || [16])[0] || 16),
                    allowQuestions: true,
                    recentHistory: recent
                  } as any);
                  message = llmHint.message || '';
                  followUp = llmHint.followUp || '';
                }
              } catch {
                message = '';
                followUp = q;
              }

              // Actualizar contadores y última acción
              state.attemptsByAskCode[stepCode] = attemptsSoFarOpen + 1;
              hintsMap[stepCode] = (hintsMap[stepCode] || 0) + 1;
              lastActionMap[stepCode] = 'hint';

              state.justAskedFollowUp = Boolean(followUp);
              state.lastFollowUpText = followUp;
              pendingInput = '';
              break;
            }

            // 3) Conversación con evaluación ligera para abiertas: aceptar si hay señales suficientes; si no, retroalimentar y re‑preguntar
            {
              const acceptOpen = (openMatched.length >= 1) || (words.length >= minWords && attempts >= 1);
              if (acceptOpen) {
                cls = { kind: 'ACCEPT', reason: 'OPEN_OK', matched: openMatched, missing: openMissing };
                vague = false;
              } else {
                try {
                  const recent = await getRecentHistory(sessionKey, 4);
                  const fb = await runDocenteLLM({
                    language: 'es',
                    action: 'feedback',
                    stepType: 'ASK',
                    questionText: q,
                    userAnswer: text,
                    matched: openMatched,
                    missing: openMissing,
                    objective: objText,
                    contentBody: expected,
                    hintWordLimit: Number((coursePolicies?.feedback?.maxSentences ?? 2)),
                    allowQuestions: coursePolicies?.feedback?.allowQuestions !== false,
                    recentHistory: recent
                  });
                  message = fb.message || '';
                } catch { message = ''; }
                followUp = q; // re‑preguntar la misma abierta para mantener la conversación centrada
                // Actualizar contadores y última acción para permitir escalamiento
                state.attemptsByAskCode[stepCode] = (state.attemptsByAskCode[stepCode] || 0) + 1;
                const lastActionMap = state.lastActionByAskCode || (state.lastActionByAskCode = {});
                lastActionMap[stepCode] = 'reask';
                state.justAskedFollowUp = Boolean(followUp);
                state.lastFollowUpText = followUp;
                pendingInput = '';
                break;
              }
            }

            // 4) Aceptar reflexión abierta por defecto
            cls = { kind: 'ACCEPT', reason: 'OPEN_OK', matched: [], missing: [] };
            vague = false;
          } else {
            // Evaluación híbrida: vaguedad → rápido → semántica (embeddings bajo demanda)
            const hybrid = await evaluateHybrid(
              pendingInput,
              acceptable,
              expected,
              policy,
              {
                fuzzy: { maxEditDistance: 1, similarityMin: 0.25 },
                semThresh: 0.48,
                semBestThresh: 0.40,
                maxHints: Number(coursePolicies?.hints?.maxHints ?? 2),
                vague: {
                  stopwords: coursePolicies?.language?.stopwords || [],
                  minUsefulTokens: coursePolicies?.vague?.minUsefulTokens,
                  maxStopwordRatio: coursePolicies?.vague?.maxStopwordRatio,
                  echoOverlap: coursePolicies?.vague?.echoOverlap,
                  repeatSimilarity: coursePolicies?.vague?.repeatSimilarity,
                }
              },
              { lastAnswer: state.lastAnswerByAskCode?.[stepCode], hintsUsed }
            );
            cls = { kind: hybrid.kind, matched: hybrid.matched, missing: hybrid.missing };
            vague = hybrid.reason === 'VAGUE';
            
            // Manejar casos VAGUE/REFOCUS con pista + micro‑pregunta generada por LLM
            if (hybrid.reason === 'VAGUE' || cls.kind === 'REFOCUS') {
              try {
                const recent = await getRecentHistory(sessionKey, 4);
                const llmHint = await runDocenteLLM({
                  language: 'es',
                  action: 'hint',
                  stepType: 'ASK',
                  questionText: q,
                  userAnswer: pendingInput,
                  matched: hybrid.matched,
                  missing: hybrid.missing,
                  objective: objText,
                  contentBody: expected,
                  hintWordLimit: Number((coursePolicies?.hints?.wordLimits || [16])[0] || 16),
                  allowQuestions: true,
                  recentHistory: recent
                } as any);
                message = llmHint.message || '';
                followUp = llmHint.followUp || '';
              } catch {
                message = '';
                followUp = q;
              }
              // NO avanzar
              state.justAskedFollowUp = Boolean(followUp);
              state.lastFollowUpText = followUp;
              pendingInput = '';
              break;
            }
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
          
          // En metacognitiva (Saludo) NO aceptar respuestas DONT_KNOW/VAGUE ni por longitud.
          // La aceptación debe basarse en señales reales del objetivo/expected o acceptable.
          // Feedback determinista usando util reutilizable
          if (!vague && cls.kind === 'ACCEPT') {
            let fb = '';
            try {
              const fbCfg: any = (coursePolicies as any)?.feedback || {};
              const recent = await getRecentHistory(sessionKey, 4);
              const deterministic = mkFb(
                { kind: cls.kind, matched: cls.matched, missing: cls.missing },
                { attempts, hintsUsed, coursePolicies }
              );
              const llm = await runDocenteLLM({ language: 'es', action: 'feedback', stepType: 'ASK', questionText: q, userAnswer: pendingInput, matched: cls.matched, missing: cls.missing, objective: String(act.step.data.objective || ''), contentBody: expected, hintWordLimit: Number(fbCfg.maxSentences ?? 3), allowQuestions: fbCfg.allowQuestions !== false, kind: 'ACCEPT' as any, recentHistory: recent });
              
              // Aplicar la misma lógica de priorización LLM
              const showDeterministic = fbCfg.showDeterministic !== false; // default: true
              const llmHasContent = llm.message && llm.message.trim().length > 30;
              
              if (showDeterministic && !llmHasContent) {
                fb = deterministic || '';
              } else {
                fb = llm.message || '';  // Siempre priorizar LLM
              }
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
          const isNo = /^\s*(no\s*(lo\s*)?s[eé]|no\s*est[oó]y?\s*seguro|no\s*s[eé]\s*bien)\s*$/i.test(pendingInput);
          if (isNo) {
            noSeMap[stepCode] = (noSeMap[stepCode] || 0) + 1;
            // Si es "no sé", además de noSeCount, cuenta intento pedagógico
            state.attemptsByAskCode[stepCode] = (state.attemptsByAskCode[stepCode] || 0) + 1;
          } else {
            state.attemptsByAskCode[stepCode] = (state.attemptsByAskCode[stepCode] || 0) + 1;
          }
          const vagueCfg = coursePolicies?.vague || {};
          if (vague || cls.kind === 'PARTIAL' || cls.kind === 'HINT' || isNo || cls.reason === 'MAX_HINTS' || cls.reason === 'SEM_LOW') {
            // Política de reintentos por pregunta (loop control)
            const lastActionMap = state.lastActionByAskCode || (state.lastActionByAskCode = {});
            const hintsMap = state.hintsByAskCode || (state.hintsByAskCode = {} as any);
            const attempts = state.attemptsByAskCode[stepCode] || 0;
            const currentHints = hintsMap[stepCode] || 0;
            const lastAction = (lastActionMap[stepCode] as any) || 'ask';
            
            // Actualizar contadores
            if (cls.kind === 'HINT' || vague || isNo) {
              hintsMap[stepCode] = (currentHints || 0) + 1;   // <— SIEMPRE suma
              lastActionMap[stepCode] = 'hint';
            }
            
            // Detectar si el estudiante está haciendo una pregunta
            if (isStudentAskingQuestion(pendingInput)) {
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
            if (attempts < 2 && (cls.kind === 'HINT' || vague || isNo)) {
              // Mensaje alentador
              try {
                const fbCfg: any = (coursePolicies as any)?.feedback || {};
                const recent = await getRecentHistory(sessionKey, 4);
                const deterministic = mkFb(
                  { kind: cls.kind, matched: cls.matched, missing: cls.missing },
                  { attempts, hintsUsed, coursePolicies }
                );
                const llmFb = await runDocenteLLM({ language: 'es', action: 'feedback', stepType: 'ASK', questionText: q, userAnswer: pendingInput, matched: cls.matched, missing: cls.missing, objective: String(act.step.data.objective || ''), contentBody: expected, hintWordLimit: Number(fbCfg.maxSentences ?? 3), allowQuestions: fbCfg.allowQuestions !== false, kind: cls.kind as any, recentHistory: recent });
                
                // Siempre priorizar LLM, solo usar determinista como último recurso
                const showDeterministic = fbCfg.showDeterministic !== false; // default: true
                const llmHasContent = llmFb.message && llmFb.message.trim().length > 30;
                
                // Solo usar determinista si:
                // 1. Está habilitado
                // 2. El LLM no proporcionó contenido
                if (showDeterministic && !llmHasContent) {
                  fb = deterministic || '';
                } else {
                  fb = llmFb.message || '';  // Siempre priorizar LLM
                }
              } catch {}
              // HINT generado por LLM (objetivo-primero)
              {
                const objText = String(act.step.data.objective || state.plan?.meta?.lesson_name || '');
                const expectedArr = Array.isArray(expected) ? expected : [];
                const missingArr = Array.isArray(cls.missing) ? cls.missing : [];
                try {
                  const recent = await getRecentHistory(sessionKey, 4);
                  const llmHint = await runDocenteLLM({
                    language: 'es',
                    action: 'hint',
                    stepType: 'ASK',
                    questionText: q,
                    userAnswer: pendingInput,
                    matched: cls.matched,
                    missing: missingArr,
                    objective: objText,
                    contentBody: expectedArr,
                    hintWordLimit: Number((coursePolicies?.hints?.wordLimits || [16])[0] || 16),
                    allowQuestions: true,
                    recentHistory: recent
                  } as any);
                  message = llmHint.message || '';
                  followUp = llmHint.followUp || '';
                } catch {
                  message = '';
                  followUp = q;
                }

                // Anti‑repetición de follow‑up
                if (state.lastFollowUpText && state.lastFollowUpText === followUp) {
                  const reask = makeReaskMessage({
                    questionText: q,
                    objective: objText,
                    expected: expectedArr,
                    answerType: (act.step.data as any)?.answer_type || 'list',
                    coursePolicies
                  });
                  followUp = reask;
                }
                state.justAskedFollowUp = Boolean(followUp);
                state.lastFollowUpText = followUp;
                hintsMap[stepCode] = (hintsMap[stepCode] || 0) + 1;   // solo si emitimos hint
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
              
              const nextAction = decideNextAction({
                lastAction,
                noSeCount,
                attempts,
                momentKind
              });
              
              if (nextAction === 'force_advance') {
                // Solo avance forzado en SALUDO/CONEXIÓN
                const nextAskIdx = getNextAskInSameCycle(state, state.stepIdx);
                if (typeof nextAskIdx === 'number') {
                  state = advanceTo(state, nextAskIdx);
                  followUp = (currentStep(state) as any)?.data?.question || '';
                  state.justAskedFollowUp = Boolean(followUp);
                }
                // Mensaje de cierre suave
                try {
                  const recent = await getRecentHistory(sessionKey, 4);
                  const bridge = await runDocenteLLM({ language: 'es', action: 'advance', stepType: 'ASK', objective: String(act.step.data.objective || ''), recentHistory: recent });
                  message = [fb, bridge.message].filter(Boolean).join('\n\n');
                } catch {}
                dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction: 'force_advance', stepCode };
              } else if (nextAction === 'options') {
                // Presentar opciones basadas en expected
                const items = (expected || []).filter(Boolean).slice(0, 5);
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
                // Reformular pregunta breve (ask_simple)
                const reask = makeReaskMessage({
                  questionText: q,
                  objective: String(act.step.data.objective || ''),
                  expected,
                  answerType: (act.step.data as any)?.answer_type || 'list',
                  coursePolicies
                });
                message = reask;
                followUp = '';
                state.justAskedFollowUp = false;
                // Actualizar última acción
                lastActionMap[stepCode] = 'reask';
                dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction: 'reask', stepCode };
              } else if (nextAction === 'hint') {
                // Emitir una pista adicional breve
                const objText = String(act.step.data.objective || state.plan?.meta?.lesson_name || '');
                const expectedArr = Array.isArray(expected) ? expected : [];
                const missingArr = Array.isArray(cls.missing) ? cls.missing : [];
                const hintMsg = makeHintMessage({
                  questionText: q,
                  objective: objText,
                  expected: expectedArr,
                  missing: missingArr,
                  answerType: (act.step.data as any)?.answer_type || 'list',
                  hintsUsed: (state.hintsByAskCode?.[stepCode] || 0),
                  attempts,
                  coursePolicies
                });
                message = hintMsg;
                followUp = '';
                state.justAskedFollowUp = false;
                // Actualizar última acción
                lastActionMap[stepCode] = 'hint';
                dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction: 'hint', stepCode };
              } else if (nextAction === 'explain') {
                // Micro‑explicación del objetivo actual
                try {
                  const recent = await getRecentHistory(sessionKey, 4);
                  const explain = await runDocenteLLM({
                    language: 'es',
                    action: 'explain',
                    stepType: 'ASK',
                    objective: String(act.step.data.objective || ''),
                    contentBody: expected,
                    recentHistory: recent
                  });
                  message = explain.message || '';
                } catch { message = ''; }
                followUp = q;
                state.justAskedFollowUp = Boolean(followUp);
                // Actualizar última acción
                lastActionMap[stepCode] = 'explain';
                dbg = { kind: cls.kind, matched: cls.matched?.slice(0,3) || [], missing: cls.missing?.slice(0,3) || [], nextAction: 'explain', stepCode };
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

		return NextResponse.json({ 
			message, 
			followUp, 
			state: { stepIdx: state.stepIdx, done: state.done },
			budgetMetrics 
		});
	} catch (err: any) {
		return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
	}
}


