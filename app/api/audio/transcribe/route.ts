import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('audio') as File | null;
    const language = (form.get('language') as string) || 'es';

    if (!file) return NextResponse.json({ error: 'Archivo de audio requerido (field: audio)' }, { status: 400 });

    const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const aiFile = new File([buffer], file.name || 'audio.webm', { type: file.type || 'audio/webm' });

    const result = await ai.audio.transcriptions.create({ file: aiFile, model: 'whisper-1', language });
    return NextResponse.json({ text: (result as any)?.text || '' });
  } catch (error) {
    console.error('Transcribe error:', error);
    return NextResponse.json({ error: 'Error transcribiendo audio' }, { status: 500 });
  }
}


