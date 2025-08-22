'use client';
// Legacy layout: remove tight coupling with legacy core types
type LessonVM = any;
type EngineState = any;
import { Clock, Menu, Send, User, X } from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const stickRef = useRef<boolean>(true);
  const [mediaIdx, setMediaIdx] = useState<number>(0);

  const mediaImages: string[] = useMemo(() => {
    try {
      const stepCode: string | undefined = (state as any)?.stepCode || (state as any)?.state?.stepCode;
      const images = (vm as any)?.media?.[stepCode || '']?.images;
      return Array.isArray(images) ? images.filter(Boolean) : [];
    } catch { return []; }
  }, [vm, state]);

  type MediaItem = { url: string; name?: string; description?: string; caption?: string };
  const deriveNameFromUrl = (u?: string): string => {
    try {
      if (!u) return '';
      const last = u.split('?')[0].split('#')[0].split('/').pop() || '';
      const base = last.replace(/\.[a-zA-Z0-9]+$/, '');
      return base.replace(/[\-_]+/g, ' ');
    } catch { return ''; }
  };
  const currentMultimedia: MediaItem[] = useMemo(() => {
    try {
      const stepCode: string | undefined = (state as any)?.stepCode || (state as any)?.state?.stepCode;
      const entry = (vm as any)?.media?.[stepCode || ''] || {};
      const items = Array.isArray(entry?.items) ? entry.items : [];
      if (items.length) {
        return items
          .map((it: any) => ({
            url: it?.url || it?.src || it?.image || '',
            name: it?.name || it?.title || deriveNameFromUrl(it?.url || it?.src || it?.image),
            description: it?.description || it?.desc || '',
            caption: it?.caption || it?.label || ''
          }))
          .filter((it: MediaItem) => !!it.url);
      }
      const imgs = mediaImages;
      return imgs.map((url) => ({ url, name: deriveNameFromUrl(url), caption: deriveNameFromUrl(url) }));
    } catch { return mediaImages.map((url) => ({ url, name: deriveNameFromUrl(url), caption: deriveNameFromUrl(url) })); }
  }, [vm, state, mediaImages]);

  useEffect(() => { setMediaIdx(0); }, [mediaImages?.length]);

  useEffect(() => {
    if (stickRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const onMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    try {
      const el = e.currentTarget;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickRef.current = distanceFromBottom < 120; // pegarse al fondo salvo que el usuario suba
    } catch { stickRef.current = true; }
  };

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

      <div className="flex h-[calc(100vh-72px)] max-w-screen-2xl mx-auto">
        {/* Left side: Panel informativo (Aprendizaje esperado, Puntos clave y Progreso) */}
        <div className={`hidden lg:block transition-all duration-300 pl-3 ${sidebarOpen ? 'lg:basis-[22%] xl:basis-[22%] opacity-100' : 'lg:basis-0 opacity-0 pointer-events-none'} min-w-[240px]`}>
          <div className={`h-full m-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col bg-white transition-all duration-300 ${sidebarOpen ? 'scale-100' : 'scale-95'}`}>
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-600" />
                Resumen de la sesión
              </h3>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {vm && state && (
                <>
                  {Array.isArray(vm.expectedLearning) && vm.expectedLearning.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Aprendizaje esperado
                      </h4>
                      <div className="space-y-2">
                        {vm.expectedLearning.map((it: string, i: number) => (
                          <div key={`el-${i}`} className="text-xs text-slate-800 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-lg px-3 py-2">
                            {it}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    {vm.keyPoints && vm.keyPoints.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Puntos clave
                        </h4>
                        <div className="space-y-2">
                          {vm.keyPoints.map((kp: any) => (
                            <div key={kp.id} className={`p-3 rounded-lg border ${kp.completed ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100'}`}>
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
                          <div
                            key={`${m.title}-${i}`}
                            className={`flex items-center gap-3 text-xs p-3 rounded-xl border transition-all duration-200 ${
                              i === state.momentIdx
                                ? 'bg-blue-50 border-blue-300 shadow-sm ring-2 ring-blue-200 text-blue-700'
                                : i < state.momentIdx
                                  ? 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-green-700'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600'
                            }`}
                          >
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                i < state.momentIdx ? 'bg-green-600' : (i === state.momentIdx ? 'bg-blue-600' : 'bg-slate-300')
                              }`}
                            />
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
        <div className={`transition-all duration-300 w-full flex-1 min-w-[420px]`}>
          <div className="h-full bg-white m-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6" onScroll={onMessagesScroll}>
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
                  <div className={`flex-1 ${m.sender === 'student' ? 'text-right' : ''}`}>
                    <div className={`inline-block px-5 py-3 rounded-2xl shadow-sm max-w-[70ch] ${m.sender === 'student' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' : 'bg-white border border-slate-200 text-slate-900'}`}>
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
        <div className={`hidden lg:block transition-all duration-300 ${sidebarOpen ? 'lg:basis-[42%] xl:basis-[44%]' : 'lg:basis-[42%] xl:basis-[44%]'} min-w-[360px]`}>
          <div className="h-full bg-white m-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Contenido Multimedia</h3>
            </div>
            <div className="flex-1 p-6">
              {isTyping || !currentMultimedia?.length ? (
                <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl text-slate-400 border border-slate-200 flex items-center justify-center aspect-video min-h-[180px]">
                  <span className="text-xs">{isTyping ? 'Pensando…' : 'Sin contenido para este paso'}</span>
                </div>
              ) : (
                <>
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-black/5">
                    <img
                      src={currentMultimedia[Math.min(mediaIdx, currentMultimedia.length - 1)]?.url}
                      alt="Paso"
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="eager"
                      fetchPriority="high"
                    />
                  </div>
                  {/* Texto debajo de la imagen (caption > description > name) */}
                  <div className="mt-3 text-sm text-slate-700 text-center">
                    {(currentMultimedia[Math.min(mediaIdx, currentMultimedia.length - 1)]?.caption
                      || currentMultimedia[Math.min(mediaIdx, currentMultimedia.length - 1)]?.description
                      || currentMultimedia[Math.min(mediaIdx, currentMultimedia.length - 1)]?.name
                      || '')}
                  </div>
                  {/* Radio buttons para selección de imagen (mostrar también con 1 imagen) */}
                  {currentMultimedia.length > 0 && (
                    <div className="flex flex-col space-y-2 mt-3">
                      {currentMultimedia.map((image, index) => (
                        <label
                          key={`mopt-${index}`}
                          className={`flex items-center space-x-3 cursor-pointer p-3 rounded-xl border transition-all duration-200 ${
                            mediaIdx === index
                              ? 'bg-blue-50 border-blue-300 shadow-sm ring-2 ring-blue-200'
                              : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="imageSelector"
                            checked={mediaIdx === index}
                            onChange={() => setMediaIdx(index)}
                            className={`w-4 h-4 focus:ring-2 focus:ring-blue-500 ${
                              mediaIdx === index
                                ? 'text-blue-600 bg-blue-600 border-blue-600'
                                : 'text-blue-600 bg-white border-slate-300'
                            }`}
                          />
                          <span className={`text-sm font-medium ${mediaIdx === index ? 'text-blue-700' : 'text-slate-700'}`}>
                            {image?.name || `Imagen ${index + 1}`}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
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


