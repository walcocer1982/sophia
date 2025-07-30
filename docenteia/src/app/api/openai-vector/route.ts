import { NextRequest, NextResponse } from 'next/server';
import { queryOpenAIVectorStore } from '../../../lib/vector-store';

export async function POST(request: NextRequest) {
  try {
    const { query, sessionId, courseId } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query es requerida' },
        { status: 400 }
      );
    }

    const response = await queryOpenAIVectorStore(query, sessionId, courseId);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error en la ruta OpenAI vector:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 