import { ResponsesService } from '../ai/ResponsesService';
import { QuestionValidator } from './QuestionValidator';
import { SessionStore } from '../data/SessionStore';
import { PedagogicalResponse, SessionData } from '../core/types';
import { Logger } from '../utils/Logger';

export class SessionFlow {
  private responses: ResponsesService;
  private validator: QuestionValidator;
  private logger: Logger;

  constructor() {
    this.responses = new ResponsesService();
    this.validator = new QuestionValidator();
    this.logger = new Logger('SessionFlow');
  }

  /**
   * 🎯 LÓGICA CENTRAL SIMPLIFICADA
   */
  async processStudentMessage(sessionKey: string, message: string): Promise<PedagogicalResponse> {
    try {
      const sessionData = await SessionStore.get(sessionKey);
      if (!sessionData) {
        throw new Error(`Sesión ${sessionKey} no encontrada`);
      }

      const currentMoment = sessionData.momentos[sessionData.currentMomentIndex];
      const currentQuestion = sessionData.preguntasPendientes[0];

      this.logger.info(`Procesando mensaje para momento: ${currentMoment?.momento}`);

      // 🎯 VALIDAR RESPUESTA DEL ESTUDIANTE
      const isValidResponse = currentQuestion ? this.validator.validate(message, currentQuestion) : false;
      
      if (isValidResponse && currentQuestion) {
        // Mover pregunta de pendiente a respondida
        sessionData.preguntasPendientes.shift();
        sessionData.preguntasRespondidas.push(currentQuestion);
        
        this.logger.info(`Pregunta respondida: "${currentQuestion}"`);
        this.logger.info(`Preguntas pendientes restantes: ${sessionData.preguntasPendientes.length}`);
      }

      // 🚨 LLAMADA A RESPONSES API CON STRUCTURED OUTPUT
      const response = await this.responses.createMomentResponse({
        sessionKey,
        studentMessage: message,
        sessionData,
        currentMoment
      });

      // 🔄 CONTROL DE AVANCE AUTOMÁTICO
      if (response.debe_avanzar && sessionData.preguntasPendientes.length === 0) {
        await this.advanceToNextMoment(sessionKey, sessionData);
      }

      // Actualizar sesión
      await SessionStore.update(sessionKey, sessionData);

      return response;

    } catch (error) {
      this.logger.error(`Error procesando mensaje del estudiante: ${error}`);
      throw error;
    }
  }

  /**
   * 🔄 Avanzar al siguiente momento
   */
  private async advanceToNextMoment(sessionKey: string, sessionData: SessionData): Promise<void> {
    const nextIndex = sessionData.currentMomentIndex + 1;
    
    if (nextIndex < sessionData.momentos.length) {
      const nextMoment = sessionData.momentos[nextIndex];
      
      if (!nextMoment) {
        this.logger.error(`Error: Momento ${nextIndex} no encontrado`);
        return;
      }
      
      // Actualizar sesión
      sessionData.currentMomentIndex = nextIndex;
      sessionData.preguntasPendientes = nextMoment.preguntas || [];
      sessionData.preguntasRespondidas = [];
      sessionData.lastActivity = new Date();
      
      this.logger.info(`✅ Avanzando al momento ${nextIndex + 1}: ${nextMoment.momento}`);
      this.logger.info(`📋 Nuevas preguntas pendientes: ${sessionData.preguntasPendientes.length}`);
      
    } else {
      this.logger.info(`🎉 ¡Sesión completada! Todos los momentos han sido cubiertos.`);
    }
  }

  /**
   * 📊 Obtener estadísticas del flujo
   */
  getFlowStats(sessionData: SessionData): {
    currentMoment: string;
    progress: string;
    pendingQuestions: number;
    completedQuestions: number;
  } {
    const currentMoment = sessionData.momentos[sessionData.currentMomentIndex];
    
    return {
      currentMoment: currentMoment?.momento || 'N/A',
      progress: `${sessionData.currentMomentIndex + 1}/${sessionData.momentos.length}`,
      pendingQuestions: sessionData.preguntasPendientes.length,
      completedQuestions: sessionData.preguntasRespondidas.length
    };
  }
} 