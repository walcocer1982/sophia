import { PedagogicalResponse, SessionInfo } from './types';
import { SessionOrchestrator } from '../pedagogy/SessionOrchestrator';
import { SessionStore } from '../data/SessionStore';
import { Logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';

export class DocenteAI {
  private orchestrator: SessionOrchestrator;
  private logger: Logger;

  constructor() {
    this.orchestrator = new SessionOrchestrator();
    this.logger = new Logger('DocenteAI');
  }

  /**
   * 🚀 API PRINCIPAL - Solo 3 métodos públicos
   */

  async startSession(courseId: string, sessionId: string): Promise<{
    sessionKey: string;
    initialMessage: string;
  }> {
    try {
      this.logger.info(`🚀 Iniciando sesión: ${courseId} - ${sessionId}`);
      
      // Crear sesión
      const sessionKey = await SessionStore.create(courseId, sessionId);
      
      // Generar mensaje inicial
      const initialMessage = await this.orchestrator.generateInitialMessage(sessionKey);
      
      this.logger.info(`✅ Sesión iniciada: ${sessionKey}`);
      return { sessionKey, initialMessage };
      
    } catch (error) {
      const { error: processedError } = ErrorHandler.processError(error, 'startSession');
      throw processedError;
    }
  }

  async handleStudent(sessionKey: string, message: string): Promise<PedagogicalResponse> {
    try {
      this.logger.info(`📝 Procesando mensaje: ${sessionKey}`);
      
      const response = await this.orchestrator.processStudentMessage(sessionKey, message);
      
      this.logger.info(`✅ Mensaje procesado: ${sessionKey}`);
      return response;
      
    } catch (error) {
      const { error: processedError } = ErrorHandler.processError(error, 'handleStudent');
      throw processedError;
    }
  }

  async getSessionInfo(sessionKey: string): Promise<SessionInfo> {
    try {
      const info = await SessionStore.getInfo(sessionKey);
      if (!info) {
        throw new Error(`Sesión ${sessionKey} no encontrada`);
      }
      return info;
    } catch (error) {
      const { error: processedError } = ErrorHandler.processError(error, 'getSessionInfo');
      throw processedError;
    }
  }

  // Métodos auxiliares
  async clearSession(sessionKey: string): Promise<void> {
    await SessionStore.delete(sessionKey);
    this.logger.info(`✅ Sesión limpiada: ${sessionKey}`);
  }

  async getCostStats(): Promise<any> {
    return { message: 'Estadísticas disponibles en logs' };
  }
}