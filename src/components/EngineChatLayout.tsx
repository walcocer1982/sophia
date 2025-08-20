'use client';
// Legacy layout: remove tight coupling with legacy core types
type LessonVM = any;
type EngineState = any;
import { Clock, Menu, Send, User, X } from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import VoiceRecorder from './VoiceRecorder';

export type EngineChatMessage = { id: string; sender: 'ai'|'student'; content: string; timestamp: Date };

export default function EngineChatLayout({
  messages,
  isTyping,
  onSend,
  vm,
  state
}: {
  messages: EngineChatMessage[];
  isTyping: boolean;
  onSend: (text: string) => void;
  vm: LessonVM | null;
  state: EngineState | null;
}) {
  const [inputValue, setInputValue] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSend(inputValue);
    setInputValue('');
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg" />
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-900">{vm?.title || 'DocenteIA'}</h1>
              <p className="text-xs md:text-sm text-slate-600">Versión {vm?.version} · {vm?.locale}</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-72px)]">
        {/* Left side: Panel informativo (Aprendizaje esperado, Puntos clave y Progreso) */}
        <div className={`hidden lg:block transition-all duration-300 pl-3 ${sidebarOpen ? 'lg:basis-[15%] xl:basis-[15%] opacity-100' : 'lg:basis-0 opacity-0 pointer-events-none'}`}>
          <div className={`h-full m-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col bg-white transition-all duration-300 ${sidebarOpen ? 'scale-100' : 'scale-95'}`}>
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Resumen de la sesión</h3>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {vm && state && (
                <>
                  {Array.isArray(vm.expectedLearning) && vm.expectedLearning.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-700 mb-2">Aprendizaje esperado</h4>
                      <ul className="list-disc ml-4 space-y-1">
                        {vm.expectedLearning.map((it: string, i: number) => (
                          <li key={`el-${i}`} className="text-xs text-slate-700">{it}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    {vm.keyPoints && vm.keyPoints.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-slate-700 mb-2">Puntos Clave</h4>
                        <div className="space-y-2">
                          {vm.keyPoints.map((kp: any) => (
                            <div key={kp.id} className={`p-3 rounded-lg border ${kp.completed ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                              <div className="text-xs font-medium text-slate-800">{kp.title}</div>
                              {kp.description && <div className="text-[11px] text-slate-600 mt-1">{kp.description}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Momento</span>
                      <span className="font-medium text-slate-900">{vm.moments.length > 0 ? Math.min(state.momentIdx + 1, vm.moments.length) : 0}/{vm.moments.length}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all" style={{ width: `${Math.round(((vm.moments.length > 0 ? Math.min(state.momentIdx + 1, vm.moments.length) : 0) / Math.max(1, vm.moments.length)) * 100)}%` }} />
                    </div>
                    <div className="mt-3">
                      <h4 className="text-xs font-medium text-slate-700 mb-2">Momentos</h4>
                      <div className="space-y-2">
                        {vm.moments.map((m: any, i: number) => (
                          <div key={`${m.title}-${i}`} className={`flex items-center gap-2 text-xs ${i === state.momentIdx ? 'text-blue-700' : 'text-slate-500'}`}>
                            <span className={`w-2 h-2 rounded-full ${i === state.momentIdx ? 'bg-blue-600' : 'bg-slate-300'}`} />
                            <span className="truncate">{m.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main chat (centro, más ancho que multimedia) */}
        <div className={`transition-all duration-300 w-full ${sidebarOpen ? 'lg:basis-[60%] xl:basis-[65%]' : 'lg:basis-[70%] xl:basis-[75%]'}`}>
          <div className="h-full bg-white m-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((m) => (
                <div key={m.id} className={`flex items-start space-x-4 ${m.sender === 'student' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {m.sender === 'ai' ? (
                    <button
                      type="button"
                      className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-blue-500 shadow-md bg-white flex items-center justify-center cursor-pointer"
                      onClick={() => vm?.avatarUrl && setPreviewSrc(vm.avatarUrl)}
                      aria-label="Ver foto de la instructora"
                    >
                      {vm?.avatarUrl ? (
                        <Image src={vm.avatarUrl} alt="Instructora" width={40} height={40} className="object-cover w-10 h-10" />
                      ) : (
                        <div className="w-10 h-10 flex items-center justify-center text-sm font-semibold bg-gradient-to-br from-blue-600 to-indigo-600 text-white">AI</div>
                      )}
                    </button>
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shadow-md bg-gradient-to-br from-slate-600 to-slate-700 text-white">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <div className={`flex-1 max-w-[85%] ${m.sender === 'student' ? 'text-right' : ''}`}>
                    <div className={`inline-block px-5 py-3 rounded-2xl shadow-sm ${m.sender === 'student' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' : 'bg-white border border-slate-200 text-slate-900'}`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    </div>
                    <div className={`mt-2 flex items-center space-x-2 ${m.sender === 'student' ? 'justify-end' : 'justify-start'}`}>
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500">{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-start space-x-4">
                  <button
                    type="button"
                    className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-blue-500 shadow-md bg-white flex items-center justify-center cursor-pointer"
                    onClick={() => vm?.avatarUrl && setPreviewSrc(vm.avatarUrl)}
                    aria-label="Ver foto de la instructora"
                  >
                    {vm?.avatarUrl ? (
                      <Image src={vm.avatarUrl} alt="Instructora" width={40} height={40} className="object-cover w-10 h-10" />
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center text-sm font-semibold bg-gradient-to-br from-blue-600 to-indigo-600 text-white">AI</div>
                    )}
                  </button>
                  <div className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-500 px-3 py-2 rounded-2xl">
                    <span className="sr-only">Escribiendo…</span>
                    <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.2s]"></span>
                    <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.1s]"></span>
                    <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <div className="flex items-end space-x-2">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Escribe tu respuesta..."
                  rows={1}
                  className="flex-1 w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
                <VoiceRecorder onResult={(t)=>setInputValue((v)=> (v ? (v+ ' ' + t) : t))} />
                <button onClick={handleSend} disabled={!inputValue.trim()} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 text-white p-3 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg disabled:shadow-none">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: Contenido Multimedia */}
        <div className={`hidden lg:block transition-all duration-300 ${sidebarOpen ? 'lg:basis-[25%] xl:basis-[20%]' : 'lg:basis-[30%] xl:basis-[25%]'} `}>
          <div className="h-full bg-white m-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Contenido Multimedia</h3>
            </div>
            <div className="flex-1 p-6">
              <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl text-slate-400 border border-slate-200 flex items-center justify-center aspect-video min-h-[180px]">
                <span className="text-xs">Imagen/Video</span>
              </div>
              <div className="mt-4 text-xs text-slate-600">Contenido multimedia de la sesión</div>
            </div>
          </div>
        </div>
      </div>
      {previewSrc && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewSrc(null)}
        >
          <div className="relative bg-white rounded-xl shadow-xl p-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute -top-3 -right-3 bg-white rounded-full shadow p-1 border"
              onClick={() => setPreviewSrc(null)}
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
            <Image
              src={previewSrc}
              alt="Instructora"
              width={640}
              height={640}
              className="max-h-[80vh] h-auto w-auto rounded-lg"
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}


