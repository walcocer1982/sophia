import { useEffect, useRef, useState } from 'react';

export type PlanChatMessage = { id: string; sender: 'ai'|'student'; content: string; timestamp: Date };

function generateSessionKey(): string {
	return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function usePlanChat(planUrl: string = '/courses/SSO001/lessons/lesson02.json') {
	const [messages, setMessages] = useState<PlanChatMessage[]>([]);
	const [isTyping, setIsTyping] = useState<boolean>(false);
	const [done, setDone] = useState<boolean>(false);
	const [engineState, setEngineState] = useState<{ stepIdx: number; momentIdx: number; done: boolean } | null>(null);
	const [adaptiveMode, setAdaptiveMode] = useState<boolean>(false);
	const [budgetMetrics, setBudgetMetrics] = useState<any>(null);
	const sessionKeyRef = useRef<string>('');
	const idSeq = useRef<number>(1);
  const bootedRef = useRef<boolean>(false);

	useEffect(() => {
		if (!sessionKeyRef.current) {
			// Persistir la sesión para recargas superficiales
			try {
				const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem('planSessionKey') : '';
				if (stored) sessionKeyRef.current = stored;
				else {
					sessionKeyRef.current = generateSessionKey();
					if (typeof window !== 'undefined') window.sessionStorage.setItem('planSessionKey', sessionKeyRef.current);
				}
			} catch {
				sessionKeyRef.current = generateSessionKey();
			}
		}
		// Primer turno para obtener el primer paso del plan (evitar doble invocación en StrictMode)
		if (!bootedRef.current) {
			bootedRef.current = true;
			void turn('');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [planUrl]);

  async function turn(userInput: string) {
		if (done) return;
		// Mostrar inmediatamente el mensaje del estudiante
		if (userInput && userInput.trim()) {
			setMessages(prev => [...prev, { id: `${idSeq.current++}`, sender: 'student', content: userInput, timestamp: new Date() }]);
		}
		setIsTyping(true);
		try {
			const res = await fetch('/api/engine/turn', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					sessionKey: sessionKeyRef.current, 
					userInput, 
					planUrl, 
					reset: !messages.length,
					adaptiveMode 
				})
			});
			if (!res.ok) throw new Error('engine turn failed');
			const { message, followUp, state, budgetMetrics: newBudgetMetrics } = await res.json();
			
			// Crear UNA sola burbuja del asistente (message + followUp)
			if (message || followUp) {
				const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
				const hasQ = followUp && norm(message || '').includes(norm(followUp));
				const combined = [message, (!hasQ && followUp) ? followUp : '']
					.map(s => (s || '').trim())
					.filter(Boolean)
					.join('\n\n');
				
				// Evitar repetir exactamente el mismo texto que la última burbuja del assistant
				setMessages(prev => {
					const last = prev.slice().reverse().find(m => m.sender === 'ai');
					if (last && norm(last.content) === norm(combined)) return prev;
					return [...prev, { id: `${idSeq.current++}`, sender: 'ai', content: combined, timestamp: new Date() }];
				});
			}
			setDone(Boolean(state?.done));
			setEngineState(state || null);
			if (newBudgetMetrics) {
				setBudgetMetrics(newBudgetMetrics);
			}
		} catch (_err) {
			// Emitir mensaje de error simple
			setMessages(prev => [...prev, { id: `${idSeq.current++}`, sender: 'ai', content: 'Ocurrió un error al avanzar el plan.', timestamp: new Date() }]);
		} finally {
			setIsTyping(false);
		}
	}

	function sendMessage(content: string) {
		if (!content || !content.trim()) return;
		void turn(content);
	}

	function clearMessages() {
		setMessages([]);
	}

	function resetSession() {
		// Limpiar sessionStorage y regenerar sessionKey
		if (typeof window !== 'undefined') {
			window.sessionStorage.removeItem('planSessionKey');
		}
		sessionKeyRef.current = generateSessionKey();
		if (typeof window !== 'undefined') {
			window.sessionStorage.setItem('planSessionKey', sessionKeyRef.current);
		}
		// Resetear estado
		setMessages([]);
		setDone(false);
		setIsTyping(false);
		setBudgetMetrics(null);
		setEngineState(null);
		bootedRef.current = false;
		// Reiniciar con nuevo plan
		void turn('');
	}

	return { messages, isTyping, done, sendMessage, clearMessages, resetSession, adaptiveMode, setAdaptiveMode, budgetMetrics, state: engineState };
}


