"use client";
import EngineChatLayout from '@/components/EngineChatLayout';
import { usePlanChat } from '@/hooks/usePlanChat';
import { useEffect, useMemo, useState } from 'react';

type LessonRef = { id: string; name?: string; planUrl: string };
type CourseRef = { id: string; name?: string; lessons: LessonRef[] };
type Registry = { courses: CourseRef[] };

export default function EngineChatPage() {
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');

  // derive current planUrl from selection
  const planUrl: string | null = useMemo(() => {
    if (!registry || !selectedCourseId || !selectedLessonId) return null;
    const course = registry.courses.find(c => c.id === selectedCourseId);
    const lesson = course?.lessons.find(l => l.id === selectedLessonId);
    return lesson?.planUrl || null;
  }, [registry, selectedCourseId, selectedLessonId]);

  const { messages, isTyping, done, sendMessage, clearMessages, adaptiveMode, setAdaptiveMode, budgetMetrics } = usePlanChat(planUrl || '/courses/SSO001/lessons/lesson02.json');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/courses/registry.json');
        if (!res.ok) return;
        const json = (await res.json()) as Registry;
        if (!alive) return;
        setRegistry(json);
        // default selection: first course/lesson
        const c = json.courses?.[0];
        if (c) {
          setSelectedCourseId(prev => prev || c.id);
          const l = c.lessons?.[0];
          if (l) setSelectedLessonId(prev => prev || l.id);
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  // Simple VM/state placeholders for EngineChatLayout
  const vm = useMemo(() => {
    const course = registry?.courses.find(c => c.id === selectedCourseId);
    const lesson = course?.lessons.find(l => l.id === selectedLessonId);
    return {
      title: [course?.name || course?.id, lesson?.name || lesson?.id].filter(Boolean).join(' · ') || 'DocenteIA',
      version: 'plan',
      locale: 'es-CL',
      moments: [],
      keyPoints: []
    } as any;
  }, [registry, selectedCourseId, selectedLessonId]);

  const state = useMemo(() => ({ momentIdx: 0 }), []);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="w-full px-2 md:px-4 py-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              className="border rounded-lg px-3 py-2"
              value={selectedCourseId}
              onChange={(e) => { setSelectedCourseId(e.target.value); setSelectedLessonId(''); clearMessages(); }}
            >
              <option value="">Selecciona curso…</option>
              {registry?.courses.map(c => (
                <option key={c.id} value={c.id}>{c.name || c.id}</option>
              ))}
            </select>
            <select
              className="border rounded-lg px-3 py-2"
              value={selectedLessonId}
              onChange={(e) => { setSelectedLessonId(e.target.value); clearMessages(); }}
              disabled={!selectedCourseId}
            >
              <option value="">Selecciona lección…</option>
              {registry?.courses.find(c => c.id === selectedCourseId)?.lessons.map(l => (
                <option key={l.id} value={l.id}>{l.name || l.id}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button onClick={() => clearMessages()} className="border rounded-lg px-3 py-2">Nueva sesión</button>
              {done && <span className="text-green-600 text-sm">Fin de la lección</span>}
            </div>
          </div>
          
          {/* Controles de modo adaptativo y presupuesto */}
          <div className="flex items-center gap-4 border-t pt-4 mt-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Modo:</label>
              <select 
                value={adaptiveMode ? 'adaptive' : 'deterministic'} 
                onChange={(e) => setAdaptiveMode(e.target.value === 'adaptive')}
                className="border rounded-lg px-2 py-1 text-sm"
              >
                <option value="deterministic">Determinista</option>
                <option value="adaptive">Adaptativo</option>
              </select>
            </div>
            
            {budgetMetrics && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Presupuesto:</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(budgetMetrics.budgetCentsLeft / 100) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600">
                  ${(budgetMetrics.budgetCentsLeft / 100).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        <EngineChatLayout
          messages={messages as any}
          isTyping={isTyping}
          onSend={(t) => sendMessage(t)}
          vm={vm}
          state={state as any}
        />
      </div>
    </div>
  );
}


