import { OpenAI } from 'openai';
import { PedagogicalResponse, PedagogicalResponseSchema } from '../core/types';
import { Logger } from '../utils/Logger';
import { CostTracker } from '../utils/CostTracker';

export class OpenAIService {
  private client: OpenAI;
  private responseHistory: Map<string, string> = new Map();
  private logger: Logger;
  private costTracker: CostTracker;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no configurada');
    }

    this.client = new OpenAI({ apiKey });
    this.logger = new Logger('OpenAIService');
    this.costTracker = new CostTracker();
  }

  /**
   * 🎯 CREAR RESPUESTA - MÉTODO ÚNICO Y LIMPIO
   */
  async createResponse(params: {
    sessionKey: string;
    input: string;
    instructions: string;
  }): Promise<PedagogicalResponse> {
    
    try {
      const response = await this.client.responses.create({
        model: 'gpt-4o-mini',
        input: params.input,
        instructions: params.instructions,
        previous_response_id: this.responseHistory.get(params.sessionKey) || null,
        text: {
          format: {
            type: "json_schema",
            name: "pedagogical_response",
            schema: this.getResponseSchema(),
            strict: true
          }
        },
        store: true,
      });

      this.responseHistory.set(params.sessionKey, response.id);
      
      const parsed = this.parseAndValidateResponse(response.output_text);
      this.costTracker.trackResponse(params.sessionKey, response);
      
      return parsed;

    } catch (error) {
      this.logger.error(`Error en OpenAI: ${error}`);
      throw new Error(`Error en Responses API: ${error}`);
    }
  }

  /**
   * 🔧 MÉTODOS AUXILIARES PRIVADOS
   */
  private getResponseSchema() {
    return {
      type: "object",
      additionalProperties: false,
      properties: {
        respuesta: { type: "string", description: "La respuesta pedagógica" },
        momento_actual: { type: "string", description: "El momento actual" },
        progreso: { type: "integer", description: "Número del momento" },
        total_momentos: { type: "integer", description: "Total de momentos" },
        debe_avanzar: { type: "boolean", description: "Si debe avanzar" },
        razon_avance: { type: "string", description: "Razón del avance" },
        siguiente_momento: { type: "string", description: "Siguiente momento" },
        preguntas_pendientes: { type: "integer", description: "Preguntas pendientes" },
        preguntas_respondidas: { type: "integer", description: "Preguntas respondidas" }
      },
      required: [
        "respuesta", "momento_actual", "progreso", "total_momentos", 
        "debe_avanzar", "razon_avance", "siguiente_momento", 
        "preguntas_pendientes", "preguntas_respondidas"
      ]
    };
  }

  private parseAndValidateResponse(outputText: string): PedagogicalResponse {
    const cleanedText = this.cleanResponseText(outputText);
    const parsed = JSON.parse(cleanedText);
    return PedagogicalResponseSchema.parse(parsed);
  }

  private cleanResponseText(text: string): string {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '');
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.replace(/\s*```$/, '');
    }
    return cleaned;
  }

  clearSessionHistory(sessionKey: string): void {
    this.responseHistory.delete(sessionKey);
  }
}
