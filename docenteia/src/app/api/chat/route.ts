import { NextRequest, NextResponse } from 'next/server';
import { sendChatMessage, ChatMessage } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model = 'gpt-3.5-turbo' } = body;

    // Validar que se proporcionen mensajes
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Se requieren mensajes válidos' },
        { status: 400 }
      );
    }

    // Validar que cada mensaje tenga la estructura correcta
    const validMessages: ChatMessage[] = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Enviar mensaje a OpenAI
    const response = await sendChatMessage(validMessages, model);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error en API chat:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 