import OpenAI from 'openai';

// Configuración de OpenAI
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: false, // Solo para servidor
});

// Tipos para las respuestas de OpenAI
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Función para enviar mensaje a ChatGPT
export async function sendChatMessage(
  messages: ChatMessage[],
  model: string = 'gpt-3.5-turbo'
): Promise<ChatResponse> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no está configurada');
    }

    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || '';
    
    return {
      content: response,
      usage: completion.usage ? {
        prompt_tokens: completion.usage.prompt_tokens,
        completion_tokens: completion.usage.completion_tokens,
        total_tokens: completion.usage.total_tokens,
      } : undefined,
    };
  } catch (error) {
    console.error('Error al comunicarse con OpenAI:', error);
    throw new Error('Error al procesar la solicitud');
  }
}

// Función para generar texto con GPT
export async function generateText(
  prompt: string,
  model: string = 'gpt-3.5-turbo'
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error al generar texto:', error);
    throw new Error('Error al generar texto');
  }
}

// Función para analizar sentimientos
export async function analyzeSentiment(text: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Analiza el sentimiento del siguiente texto y responde solo con: POSITIVO, NEGATIVO o NEUTRAL.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 10,
      temperature: 0.3,
    });

    return completion.choices[0]?.message?.content || 'NEUTRAL';
  } catch (error) {
    console.error('Error al analizar sentimiento:', error);
    return 'NEUTRAL';
  }
} 