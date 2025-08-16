'use client';
import { Mic } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function VoiceRecorder({ onResult, language = 'es' }: { onResult: (text: string) => void; language?: string }) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!navigator.mediaDevices || typeof window === 'undefined' || !(window as any).MediaRecorder) {
      setSupported(false);
    }
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const form = new FormData();
          form.append('audio', blob, 'audio.webm');
          form.append('language', language);
          const res = await fetch('/api/audio/transcribe', { method: 'POST', body: form });
          const data = await res.json();
          if (data?.text) onResult(data.text);
        } catch {}
      };
      mr.start();
      setRecording(true);
    } catch {
      setSupported(false);
    }
  };

  const stop = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.stop();
      setRecording(false);
    }
  };

  if (!supported) return null;

  return (
    <button
      onClick={() => (recording ? stop() : start())}
      className={`rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg ${
        recording ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white p-3' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-3'
      }`}
      title={recording ? 'Detener dictado' : 'Dictar con voz'}
      aria-label={recording ? 'Detener dictado' : 'Dictar con voz'}
      type="button"
    >
      <Mic className="w-5 h-5" />
    </button>
  );
}


