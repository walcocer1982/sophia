import { SessionData, AIResponse, Moment, Fragment } from '../types';
import { OpenAIService } from '../services/OpenAIService';
import { SessionManager } from '../services/SessionManager';
import { VectorStoreService } from '../services/VectorStoreService';
import { PromptBuilder } from '../services/PromptBuilder';

export class VectorStoreExtractor {
  private openAIService: OpenAIService;
  private sessionManager: SessionManager;
  private vectorStoreService: VectorStoreService;

  constructor() {
    this.openAIService = new OpenAIService(process.env.OPENAI_API_KEY!);
    this.sessionManager = new SessionManager();
    this.vectorStoreService = new VectorStoreService(this.openAIService, this.sessionManager);
  }

  /**
   * Inicia una sesión optimizada con fragmentos pre-calculados
   */
  async startSession(courseId: string, sessionId: string): Promise<{
    sessionKey: string;
    momentos: number;
    fragmentos: number;
    currentMoment: string;
  }> {
    try {
      // Iniciar sesión básica
      const sessionKey = await this.sessionManager.startSession(courseId, sessionId);
      const session = this.sessionManager.getSession(sessionKey);
      
      if (!session) {
        throw new Error('Error iniciando sesión');
      }

      console.log(`🚀 Iniciando sesión optimizada: ${session.course.name} - ${session.session.name}`);
      console.log(`📁 Vector Store: ${session.vectorStoreId}`);
      console.log(`📁 Archivo: ${session.fileName} (${session.fileId})`);

      // Verificar que el archivo existe en el vector store
      await this.vectorStoreService.validateFileExists(session.vectorStoreId, session.fileId);
      console.log(`✅ Archivo ${session.fileId} validado en vector store`);

      console.log(`🎯 Tema esperado: ${session.expectedTheme}`);

      // Extraer momentos con precisión
      const momentos = await this.vectorStoreService.extractMomentosWithPrecision(
        session.vectorStoreId,
        session.fileId,
        session.fileName,
        session.course,
        session.session,
        session.expectedTheme
      );
      
      console.log(`✅ Momentos validados para tema ${session.expectedTheme}`);

      // Pre-calcular fragmentos para cada momento (OPTIMIZACIÓN FASE 1)
      const fragmentos = await this.vectorStoreService.preCalculateFragmentos(
        session.vectorStoreId,
        momentos,
        session.expectedTheme
      );

      // Actualizar sesión con momentos y fragmentos
      this.sessionManager.updateSession(sessionKey, {
        momentos,
        fragmentos,
        currentMomentIndex: 0
      });

      console.log(`✅ Sesión iniciada: ${momentos.length} momentos, ${fragmentos.length} fragmentos`);
      console.log(`💾 Estado guardado con clave: ${sessionKey}`);

      return {
        sessionKey,
        momentos: momentos.length,
        fragmentos: fragmentos.length,
        currentMoment: momentos[0]?.momento || 'N/A'
      };

    } catch (error) {
      console.error('Error iniciando sesión optimizada:', error);
      throw error;
    }
  }

  /**
   * Maneja la interacción del estudiante usando fragmentos pre-calculados
   */
  async handleStudent(sessionKey: string, studentMessage: string): Promise<AIResponse> {
    try {
      const session = this.sessionManager.getSession(sessionKey);
      if (!session) {
        throw new Error(`Sesión ${sessionKey} no encontrada`);
      }

      // Actualizar última actividad
      this.sessionManager.updateSession(sessionKey, { lastActivity: new Date() });

      console.log(`🎓 ${session.course.specialist_role} respondiendo en ${session.session.name}`);
      console.log(`📊 Progreso: Momento ${session.currentMomentIndex + 1}/${session.momentos.length}`);

      // Obtener el momento actual y fragmentos pre-calculados
      const momentoActual = session.momentos[session.currentMomentIndex] || null;
      const fragmentosActuales = session.fragmentos.filter(f => 
        f.texto.includes(momentoActual?.momento || '')
      );
      const siguienteMomento = session.momentos[session.currentMomentIndex + 1] || null;

      // Construir prompts optimizados
      const systemPrompt = PromptBuilder.buildSystemPrompt({
        specialistRole: session.course.specialist_role,
        sessionName: session.session.name,
        courseName: session.course.name,
        learningObjective: session.session.learning_objective,
        keyPoints: session.session.key_points,
        momentos: session.momentos,
        currentIndex: session.currentMomentIndex,
        fragmentos: fragmentosActuales
      });

      const userPrompt = PromptBuilder.buildUserPrompt(studentMessage, {
        currentMoment: momentoActual ? momentoActual.momento : 'N/A',
        progress: `${session.currentMomentIndex + 1}/${session.momentos.length}`
      });

      // Llamar a OpenAI con parámetros optimizados
      const { response, metrics } = await this.openAIService.callOpenAI({
        systemPrompt,
        userPrompt,
        vectorStoreIds: [session.vectorStoreId],
        maxResults: 3
      });

      // Registrar costo de la sesión
      this.openAIService.clearSessionCost(sessionKey);
      this.openAIService.addSessionCost(sessionKey, metrics.estimated_cost);

      // Parsear respuesta JSON del modelo
      let parsedResponse = this.parseAIResponse(response.output_text);
      
      // Asegurar que la respuesta tenga la estructura correcta
      if (!parsedResponse || typeof parsedResponse !== 'object') {
        parsedResponse = {
          respuesta: response.output_text,
          momento_actual: momentoActual ? momentoActual.momento : 'N/A',
          progreso: session.currentMomentIndex + 1,
          total_momentos: session.momentos.length,
          debe_avanzar: false,
          razon_avance: "Respuesta no estructurada",
          siguiente_momento: siguienteMomento ? siguienteMomento.momento : 'FIN'
        };
      }

      // Actualizar progreso si debe avanzar
      if (parsedResponse.debe_avanzar && session.currentMomentIndex < session.momentos.length - 1) {
        this.sessionManager.updateSession(sessionKey, {
          currentMomentIndex: session.currentMomentIndex + 1
        });
        console.log(`💾 Avanzando al momento ${session.currentMomentIndex + 2}: ${session.momentos[session.currentMomentIndex + 1]?.momento}`);
      } else if (parsedResponse.debe_avanzar) {
        console.log(`🎉 ¡Clase completada! Todos los momentos han sido cubiertos.`);
      }

      return {
        ...parsedResponse,
        momentoActual: session.currentMomentIndex,
        momentos: session.momentos,
        sessionKey
      };

    } catch (error) {
      console.error('Error en respuesta del docente especializado:', error);
      return {
        respuesta: "Lo siento, tuve un problema generando la respuesta. ¿Podrías reformular tu pregunta?",
        momento_actual: 'ERROR',
        progreso: 0,
        total_momentos: 0,
        debe_avanzar: false,
        razon_avance: "Error en el sistema",
        siguiente_momento: 'ERROR',
        momentoActual: 0,
        momentos: [],
        sessionKey
      };
    }
  }

  /**
   * Recoge los momentos del file_id con su vector store (MÉTODO LEGACY - mantiene compatibilidad)
   */
  async getMomentosDelArchivo(courseId: string, sessionId: string): Promise<Moment[]> {
    try {
      // Iniciar sesión optimizada
      const sessionInfo = await this.startSession(courseId, sessionId);
      
      // Obtener la sesión para devolver los momentos
      const session = this.sessionManager.getSession(sessionInfo.sessionKey);
      
      return session ? session.momentos : [];
    } catch (error) {
      console.error('Error recogiendo momentos del archivo:', error);
      return [];
    }
  }

  /**
   * El modelo actúa como docente especializado siguiendo los momentos (MÉTODO LEGACY - mantiene compatibilidad)
   */
  async docenteEspecializadoResponde(
    courseId: string, 
    sessionId: string, 
    userMessage: string, 
    momentos: Moment[], 
    momentoActual: number
  ): Promise<AIResponse> {
    try {
      // Buscar sesión activa
      const sessionKey = `${courseId}-${sessionId}`;
      const session = this.sessionManager.getSession(sessionKey);
      
      if (!session) {
        // Si no hay sesión activa, iniciar una nueva
        await this.startSession(courseId, sessionId);
      }
      
      // Usar el método optimizado
      return await this.handleStudent(sessionKey, userMessage);
    } catch (error) {
      console.error('Error en respuesta del docente especializado:', error);
      return {
        respuesta: "Lo siento, tuve un problema generando la respuesta. ¿Podrías reformular tu pregunta?",
        momento_actual: 'ERROR',
        progreso: momentoActual + 1,
        total_momentos: momentos.length,
        debe_avanzar: false,
        razon_avance: "Error en el sistema",
        siguiente_momento: 'ERROR',
        momentoActual: momentoActual,
        momentos: momentos
      };
    }
  }

  /**
   * Parsea respuesta JSON del modelo
   */
  private parseAIResponse(responseText: string): any {
    try {
      // Buscar JSON en la respuesta (varios formatos de markdown)
      const jsonMatch = responseText.match(/```(?:json|js)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Buscar JSON sin markdown
      const jsonObjectMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        return JSON.parse(jsonObjectMatch[0]);
      }
      
      // Si no hay markdown, intentar parsear directamente
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error parseando JSON:', error);
      return null;
    }
  }

  // MÉTODOS DE GESTIÓN DE SESIONES (delegados al SessionManager)
  getSessionInfo(sessionKey: string) {
    return this.sessionManager.getSession(sessionKey);
  }

  listActiveSessions() {
    return this.sessionManager.listActiveSessions();
  }

  clearSession(sessionKey: string) {
    return this.sessionManager.clearSession(sessionKey);
  }

  clearAllSessions() {
    this.sessionManager.clearAllSessions();
  }

  getCacheStats() {
    return this.sessionManager.getCacheStats();
  }

  clearCache() {
    this.sessionManager.clearCache();
  }
} 