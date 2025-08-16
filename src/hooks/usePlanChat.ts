import { useEffect, useRef, useState } from 'react';

export type PlanChatMessage = { id: string; sender: 'ai'|'student'; content: string; timestamp: Date };

function generateSessionKey(): string {
	return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function usePlanChat(planUrl: string = '/courses/SSO001/lessons/lesson02.json') {
	const [messages, setMessages] = useState<PlanChatMessage[]>([]);
	const [isTyping, setIsTyping] = useState<boolean>(false);
	const [done, setDone] = useState<boolean>(false);
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
		setIsTyping(true);
		try {
			const res = await fetch('/api/engine/turn', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionKey: sessionKeyRef.current, userInput, planUrl, reset: !messages.length })
			});
			if (!res.ok) throw new Error('engine turn failed');
			const { message, followUp, state } = await res.json();
			const chunks = [message, followUp].filter(Boolean) as string[];
			if (userInput && userInput.trim()) {
				setMessages(prev => [...prev, { id: `${idSeq.current++}`, sender: 'student', content: userInput, timestamp: new Date() }]);
			}
			if (chunks.length) {
				setMessages(prev => {
					let out = prev;
					for (const c of chunks) {
						out = [...out, { id: `${idSeq.current++}`, sender: 'ai', content: c, timestamp: new Date() }];
					}
					return out;
				});
			}
			setDone(Boolean(state?.done));
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

	return { messages, isTyping, done, sendMessage, clearMessages };
}


