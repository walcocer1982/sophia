import { OpenAI } from 'openai';
import { PedagogicalResponseSchema, PedagogicalResponse, SessionData } from '../core/types';
import { Logger } from '../utils/Logger';
import { CostTracker } from '../utils/CostTracker';
import { OpenAIValidator } from './OpenAIValidator';

export class ResponsesService {
  private client: OpenAI;
  private responseHistory: Map<string, string> = new Map();
  private logger: Logger;
  private costTracker: CostTracker;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no configurada en variables de entorno');
    }

    this.client = new OpenAI({ apiKey });
    this.model = 'gpt-4o-mini'; // Default
    this.logger = new Logger('ResponsesService');
    this.costTracker = new CostTracker();
    
    // ✅ VALIDAR EN CONSTRUCCIÓN (opcional - puede ralentizar inicio)
    // this.validateSetup();
  }

  private async validateSetup(): Promise<void> {
    try {
      await OpenAIValidator.validateApiKey(process.env.OPENAI_API_KEY!);
      const isModelAvailable = await OpenAIValidator.checkModelAvailability(
        process.env.OPENAI_API_KEY!, 
        this.model
      );
      
      if (!isModelAvailable) {
        this.model = 'gpt-3.5-turbo'; // Fallback
      }
      
    } catch (error) {
      this.logger.error(`Error en setup de OpenAI: ${error}`);
      throw error;
    }
  }

  /**
   * 🚀 NUEVO: Responses API con estado automático y structured outputs
   */
  async createResponse(params: {
    sessionKey: string;
    input: string;
    instructions: string;
    sessionData?: SessionData;
  }): Promise<PedagogicalResponse> {
    
    try {
      this.logger.info(`Creando respuesta para sesión: ${params.sessionKey}`);

      // 🚨 NUEVO: Responses API con structured outputs garantizados
      const response = await this.client.responses.create({
        model: this.model, // Usar modelo configurado
        input: params.input,
        instructions: params.instructions,
        previous_response_id: this.responseHistory.get(params.sessionKey) || null,
        text: {
          format: {
            type: "json_schema",
            name: "pedagogical_response",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                respuesta: {
                  type: "string",
                  description: "La respuesta pedagógica del docente"
                },
                momento_actual: {
                  type: "string",
                  description: "El momento actual de la sesión"
                },
                progreso: {
                  type: "integer",
                  description: "Número del momento actual"
                },
                total_momentos: {
                  type: "integer",
                  description: "Total de momentos en la sesión"
                },
                debe_avanzar: {
                  type: "boolean",
                  description: "Si debe avanzar al siguiente momento"
                },
                razon_avance: {
                  type: "string",
                  description: "Razón por la que avanza o no"
                },
                siguiente_momento: {
                  type: "string",
                  description: "Nombre del siguiente momento"
                },
                preguntas_pendientes: {
                  type: "integer",
                  description: "Número de preguntas pendientes"
                },
                preguntas_respondidas: {
                  type: "integer",
                  description: "Número de preguntas respondidas"
                }
              },
              required: [
                "respuesta",
                "momento_actual",
                "progreso",
                "total_momentos",
                "debe_avanzar",
                "razon_avance",
                "siguiente_momento",
                "preguntas_pendientes",
                "preguntas_respondidas"
              ]
            },
            strict: true // 👈 JSON garantizado por OpenAI
          }
        },
        store: true, // 👈 Estado gestionado automáticamente por OpenAI
      });

      // Guardar ID para continuidad de conversación
      this.responseHistory.set(params.sessionKey, response.id);

      // 🎯 PARSING GARANTIZADO (no más try/catch)
      const parsed = JSON.parse(response.output_text);
      
      // Validación adicional con Zod
      const validated = PedagogicalResponseSchema.parse(parsed);

      // 📊 Tracking de costos
      this.costTracker.trackResponse(params.sessionKey, response);

      this.logger.info(`Respuesta creada exitosamente para sesión: ${params.sessionKey}`);
      return validated;

    } catch (error) {
      this.logger.error(`Error creando respuesta: ${error}`);
      throw new Error(`Error en Responses API: ${error}`);
    }
  }

  /**
   * 🚀 Crear mensaje inicial con Responses API
   */
  async createInitialMessage(sessionKey: string, sessionData: SessionData): Promise<string> {
    const instructions = this.buildInitialInstructions(sessionData);
    
    const response = await this.createResponse({
      sessionKey,
      input: "Inicia la clase con saludo pedagógico apropiado",
      instructions,
      sessionData
    });

    return response.respuesta;
  }

  /**
   * 🚀 Crear respuesta para momento específico
   */
  async createMomentResponse(params: {
    sessionKey: string;
    studentMessage: string;
    sessionData: SessionData;
    currentMoment: any;
  }): Promise<PedagogicalResponse> {
    
    const instructions = this.buildMomentInstructions(params.sessionData, params.currentMoment);
    
    return await this.createResponse({
      sessionKey: params.sessionKey,
      input: params.studentMessage,
      instructions,
      sessionData: params.sessionData
    });
  }

  /**
   * 🎯 Construir instrucciones para mensaje inicial
   */
  private buildInitialInstructions(sessionData: SessionData): string {
    return `
Eres un ${sessionData.course.specialist_role} especializado en metodología inductiva.

OBJETIVO DE LA SESIÓN: ${sessionData.session.learning_objective}

PUNTOS CLAVE:
${sessionData.session.key_points.map(point => `- ${point}`).join('\n')}

INSTRUCCIONES:
1. 🫂 SIEMPRE sé EMPÁTICO y COMPRENSIVO con el estudiante.
2. 🎯 La sesión es solo de un estudiante, no hay otros estudiantes en la sesión.
3. 📚 El estudiante no tiene experiencia en el trabajo, puede conocer algunos conceptos básicos, pero no tiene experiencia práctica.
4. 🌟 Inicia la clase con un saludo cálido y profesional, pregunta cómo se siente el estudiante.
5. 💙 Si el estudiante responde que se siente "mal", "triste", "cansado", etc., muestra EMPATÍA y comprensión. Pregúntale por qué y ofrécele apoyo.
6. 🎯 Presenta brevemente el objetivo de la sesión y los puntos clave (key points).
7. ✨ Crea expectativa sobre lo que aprenderán de manera motivadora.
8. 🤝 Realiza pregunta por pregunta, si el estudiante las esquiva, ayúdalo a responderlas con paciencia y comprensión.
9. 🚀 Si consideras pasar al siguiente momento, pregúntale si le gustaría pasar al siguiente momento, menciona el nombre del momento.
10. 🔄 Si la sesión se desvía de la secuencia de los momentos, trata de volver a la secuencia de manera amigable.

MOMENTO ACTUAL: ${sessionData.momentos[0]?.momento || 'Inicio'}

Responde EXACTAMENTE en el formato JSON especificado.
`;
  }

  /**
   * 🎯 Construir instrucciones para momento específico
   */
  private buildMomentInstructions(sessionData: SessionData, currentMoment: any): string {
    return `
Eres un ${sessionData.course.specialist_role} especializado en metodología inductiva.

OBJETIVO: ${sessionData.session.learning_objective}
MOMENTO ACTUAL: ${currentMoment.momento}

🧠 RECONOCE Y MEMORIZA ESTA SECUENCIA OBLIGATORIA:

MOMENTO 0 (Saludo):
1. Saludo empático
2. Respuesta del estudiante
3. Presentación del objetivo y puntos clave
4. Pregunta específica del JSON
5. Respuesta del estudiante
6. Pregunta específica del JSON
7. Respuesta del estudiante

MOMENTO 1 (Conexión):
1. NARRAR la historia completa de la fábrica textil
2. Pregunta específica del JSON
3. Respuesta del estudiante
4. Pregunta específica del JSON
5. Respuesta del estudiante
6. Pregunta específica del JSON
7. Respuesta del estudiante
8. Pregunta específica del JSON
9. Respuesta del estudiante

MOMENTO 2 (Adquisición):
1. PRESENTAR el contenido técnico del Triángulo del Fuego
2. Pregunta específica del JSON
3. Respuesta del estudiante
4. Pregunta específica del JSON
5. Respuesta del estudiante
6. Pregunta específica del JSON
7. Respuesta del estudiante
8. Pregunta específica del JSON
9. Respuesta del estudiante
10. Pregunta específica del JSON
11. Respuesta del estudiante
12. Pregunta específica del JSON
13. Respuesta del estudiante

MOMENTO 3 (Aplicación):
1. PRESENTAR el caso de la carpintería
2. Pregunta específica del JSON
3. Respuesta del estudiante
4. Pregunta específica del JSON
5. Respuesta del estudiante
6. Pregunta específica del JSON
7. Respuesta del estudiante
8. Pregunta específica del JSON
9. Respuesta del estudiante
10. Pregunta específica del JSON
11. Respuesta del estudiante

REGLAS:
1. 🫂 Sé EMPÁTICO y COMPRENSIVO con el estudiante.
2. 🚨 OBLIGATORIO: Si hay HISTORIA o CASO, nárralo PRIMERO antes de cualquier pregunta.
3. ✅ SOLO haz las preguntas de la lista "PREGUNTAS DEL MOMENTO".
4. ✅ Haz UNA pregunta a la vez, en orden.
5. ✅ SIEMPRE responde al estudiante.
6. 💙 Si responde "mal", "triste", etc., muestra empatía.
7. ✅ Si preguntas_pendientes = 0, evalúa avanzar al siguiente momento.
8. ✅ Responde SOLO en formato JSON.
9. 🧠 SIGUE EXACTAMENTE la secuencia que reconociste arriba.

PREGUNTAS DEL MOMENTO:
${sessionData.preguntasPendientes.map((p: string, i: number) => `${i+1}. ${p}`).join('\n')}

CONTENIDO DEL MOMENTO:
${this.getMomentoContent(currentMoment)}

PROGRESO: ${sessionData.currentMomentIndex + 1}/${sessionData.momentos.length}
`;
  }

  /**
   * 🎯 Obtener contenido del momento
   */
  private getMomentoContent(momento: any): string {
    let content = '';
    
    if (momento.historia) {
      content += `HISTORIA: ${momento.historia}\n\n`;
    }
    
    if (momento.caso) {
      content += `CASO: ${momento.caso}\n\n`;
    }
    
    if (momento.contenido_tecnico) {
      content += `CONTENIDO TÉCNICO:\n${momento.contenido_tecnico.join('\n')}\n\n`;
    }
    
    if (momento.instrucciones_docenteia) {
      content += `INSTRUCCIONES: ${momento.instrucciones_docenteia}`;
    }
    
    return content || 'N/A';
  }

  /**
   * 🧹 Limpiar historial de sesión
   */
  clearSessionHistory(sessionKey: string): void {
    this.responseHistory.delete(sessionKey);
    this.logger.info(`Historial limpiado para sesión: ${sessionKey}`);
  }
} 