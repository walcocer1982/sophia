import { ResponsesService } from '../ai/ResponsesService';
import { SessionFlow } from '../pedagogy/SessionFlow';
import { SessionStore } from '../data/SessionStore';
import { PedagogicalResponse, SessionInfo, SessionData } from './types';
import { Logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';

export class DocenteAI {
  private responses: ResponsesService;
  private sessionFlow: SessionFlow;
  private logger: Logger;

  constructor() {
    this.responses = new ResponsesService();
    this.sessionFlow = new SessionFlow();
    this.logger = new Logger('DocenteAI');
  }

  /**
   * 🚀 API PRINCIPAL - Solo 3 métodos públicos
   */

  /**
   * 1. Iniciar sesión y generar mensaje inicial
   */
  async startSession(courseId: string, sessionId: string): Promise<{
    sessionKey: string;
    initialMessage: string;
  }> {
    try {
      this.logger.info(`Iniciando sesión: ${courseId} - ${sessionId}`);

      const sessionKey = await SessionStore.create(courseId, sessionId);
      const sessionData = await SessionStore.get(sessionKey);
      
      if (!sessionData) {
        throw ErrorHandler.handleSessionError(sessionKey, 'start');
      }

      const initialMessage = await this.responses.createInitialMessage(sessionKey, sessionData);

      this.logger.info(`Sesión iniciada exitosamente: ${sessionKey}`);
      return { sessionKey, initialMessage };

    } catch (error) {
      const { error: processedError } = ErrorHandler.processError(error, 'startSession');
      throw processedError;
    }
  }

  /**
   * 2. Manejar respuesta del estudiante
   */
  async handleStudent(sessionKey: string, message: string): Promise<PedagogicalResponse> {
    try {
      this.logger.info(`Procesando mensaje del estudiante en sesión: ${sessionKey}`);

      const response = await this.sessionFlow.processStudentMessage(sessionKey, message);
      
      this.logger.info(`Respuesta procesada exitosamente para sesión: ${sessionKey}`);
      return response;

    } catch (error) {
      const { error: processedError } = ErrorHandler.processError(error, 'handleStudent');
      throw processedError;
    }
  }

  /**
   * 3. Obtener información de la sesión
   */
  async getSessionInfo(sessionKey: string): Promise<SessionInfo> {
    try {
      const info = await SessionStore.getInfo(sessionKey);
      
      if (!info) {
        throw new Error(`Sesión ${sessionKey} no encontrada`);
      }

      return info;

    } catch (error) {
      this.logger.error(`Error obteniendo información de sesión: ${error}`);
      throw error;
    }
  }

  /**
   * 🧹 Limpiar sesión (método adicional para gestión)
   */
  async clearSession(sessionKey: string): Promise<void> {
    try {
      await SessionStore.delete(sessionKey);
      this.responses.clearSessionHistory(sessionKey);
      this.logger.info(`Sesión limpiada: ${sessionKey}`);
    } catch (error) {
      this.logger.error(`Error limpiando sesión: ${error}`);
      throw error;
    }
  }

  /**
   * 📊 Obtener estadísticas de costos
   */
  async getCostStats(): Promise<any> {
    // Implementar cuando se agregue el CostTracker
    return { message: "Estadísticas de costos disponibles" };
  }
} 