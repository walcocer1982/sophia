import { PedagogicalResponse } from '../core/types';
import { SessionStore } from '../data/SessionStore';
import { OpenAIService } from '../ai/OpenAIService';
import { InstructionsBuilder } from './InstructionsBuilder';
import { ResponseValidator } from './ResponseValidator';
import { ContentNarrator } from './ContentNarrator';
import { Logger } from '../utils/Logger';

export class SessionOrchestrator {
  private aiService: OpenAIService;
  private instructionsBuilder: InstructionsBuilder;
  private validator: ResponseValidator;
  private narrator: ContentNarrator;
  private logger: Logger;

  constructor() {
    this.aiService = new OpenAIService();
    this.instructionsBuilder = new InstructionsBuilder();
    this.validator = new ResponseValidator();
    this.narrator = new ContentNarrator();
    this.logger = new Logger('SessionOrchestrator');
  }

  /**
   * 🎯 GENERAR MENSAJE INICIAL
   */
  async generateInitialMessage(sessionKey: string): Promise<string> {
    const sessionData = await SessionStore.get(sessionKey);
    if (!sessionData) {
      throw new Error(`Sesión ${sessionKey} no encontrada`);
    }

    const instructions = this.instructionsBuilder.buildInitialInstructions(sessionData);
    
    const response = await this.aiService.createResponse({
      sessionKey,
      input: "Iniciar sesión",
      instructions
    });

    return response.respuesta;
  }

  /**
   * 🎯 PROCESAR MENSAJE DEL ESTUDIANTE - LÓGICA SIMPLIFICADA
   */
  async processStudentMessage(sessionKey: string, message: string): Promise<PedagogicalResponse> {
    this.logger.info(`🎯 Procesando mensaje: ${sessionKey}`);

    // 1. Obtener datos de sesión
    const sessionData = await SessionStore.get(sessionKey);
    if (!sessionData) {
      throw new Error(`Sesión ${sessionKey} no encontrada`);
    }

    const currentMoment = sessionData.momentos[sessionData.currentMomentIndex];

    // 2. Determinar acción pedagógica
    const action = this.determineAction(sessionData, currentMoment, message);
    
    // 3. Construir instrucciones
    const instructions = this.instructionsBuilder.buildInstructions(sessionData, action, message);

    // 4. Obtener respuesta de IA
    const response = await this.aiService.createResponse({
      sessionKey,
      input: message,
      instructions
    });

    // 5. Actualizar estado de sesión
    await this.updateSessionState(sessionKey, sessionData, response, message);

    return response;
  }

  /**
   * 🎯 DETERMINAR ACCIÓN PEDAGÓGICA - LÓGICA SIMPLE
   */
  private determineAction(sessionData: any, currentMoment: any, message: string): string {
    // ¿Necesita narrar contenido?
    if (this.narrator.needsNarration(currentMoment, sessionData)) {
      return 'NARRATE_CONTENT';
    }

    // ¿Respuesta válida?
    const isValid = this.validator.isValidResponse(message);
    
    // ¿Hay preguntas pendientes?
    const hasPendingQuestions = sessionData.preguntasPendientes.length > 0;

    if (!isValid && hasPendingQuestions) {
      return 'HELP_STUDENT';
    }

    if (isValid && hasPendingQuestions) {
      return 'CONTINUE_QUESTIONS';
    }

    if (isValid && !hasPendingQuestions) {
      return 'ADVANCE_MOMENT';
    }

    return 'HELP_STUDENT'; // Fallback
  }

  /**
   * 🎯 ACTUALIZAR ESTADO - LÓGICA SIMPLE
   */
  private async updateSessionState(
    sessionKey: string,
    sessionData: any,
    response: PedagogicalResponse,
    message: string
  ): Promise<void> {
    
    // Marcar pregunta como respondida si es válida
    if (this.validator.isValidResponse(message) && sessionData.preguntasPendientes.length > 0) {
      const answeredQuestion = sessionData.preguntasPendientes.shift();
      sessionData.preguntasRespondidas.push(answeredQuestion);
    }

    // Avanzar momento si es necesario
    if (response.debe_avanzar) {
      await this.advanceMoment(sessionKey, sessionData);
    }

    // Guardar cambios
    await SessionStore.update(sessionKey, sessionData);
  }

  /**
   * 🎯 AVANZAR MOMENTO - LÓGICA SIMPLE
   */
  private async advanceMoment(sessionKey: string, sessionData: any): Promise<void> {
    const nextIndex = sessionData.currentMomentIndex + 1;
    
    if (nextIndex < sessionData.momentos.length) {
      sessionData.currentMomentIndex = nextIndex;
      const nextMoment = sessionData.momentos[nextIndex];
      sessionData.preguntasPendientes = [...(nextMoment.preguntas || [])];
      sessionData.preguntasRespondidas = [];
      
      this.logger.info(`✅ Momento avanzado: ${nextMoment.momento}`);
    } else {
      this.logger.info(`✅ Sesión completada`);
    }
  }
}
