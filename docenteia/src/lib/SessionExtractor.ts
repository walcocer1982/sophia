import { AIResponse, Moment } from '../types';
import { OpenAIService } from '../services/OpenAIService';
import { SessionManager } from '../services/SessionManager';
import { PromptBuilder } from '../services/PromptBuilder';

export class SessionExtractor {
  private openAIService: OpenAIService;
  private sessionManager: SessionManager;

  constructor() {
    this.openAIService = new OpenAIService(process.env.OPENAI_API_KEY!);
    this.sessionManager = new SessionManager();
  }

  /**
   * Inicia una sesión cargando JSON directamente
   */
  async startSession(courseId: string, sessionId: string): Promise<{
    sessionKey: string;
    momentos: number;
    currentMoment: string;
  }> {
    try {
      // Iniciar sesión básica
      const sessionKey = await this.sessionManager.startSession(courseId, sessionId);
      const session = this.sessionManager.getSession(sessionKey);
      
      if (!session) {
        throw new Error('Error iniciando sesión');
      }

      console.log(`🚀 Iniciando sesión: ${session.course.name} - ${session.session.name}`);
      console.log(`📁 Archivo: ${session.sessionFile}`);

      console.log(`✅ Sesión iniciada: ${session.momentos.length} momentos`);

      return {
        sessionKey,
        momentos: session.momentos.length,
        currentMoment: session.momentos[0]?.momento || 'N/A'
      };

    } catch (error) {
      console.error('Error iniciando sesión:', error);
      throw error;
    }
  }

  /**
   * Maneja la interacción del estudiante usando contenido del JSON con memoria conversacional
   */
  async handleStudent(sessionKey: string, studentMessage: string): Promise<AIResponse> {
    try {
      const session = this.sessionManager.getSession(sessionKey);
      if (!session) {
        throw new Error(`Sesión ${sessionKey} no encontrada`);
      }

      // Actualizar última actividad
      this.sessionManager.updateSession(sessionKey, { lastActivity: new Date() });

      console.log(`🎓 ${session.course.specialist_role} respondiendo...`);

      // Guardar mensaje del estudiante en la memoria conversacional
      session.conversationLog.push({
        role: 'user',
        content: studentMessage,
        timestamp: new Date()
      });

      // Obtener el momento actual
      const momentoActual = session.momentos[session.currentMomentIndex] || null;
      const siguienteMomento = session.momentos[session.currentMomentIndex + 1] || null;

      // Construir historial de conversación (últimas 6 interacciones para no saturar tokens)
      const MAX_HISTORIA = 6;
      const historialRecortado = session.conversationLog
        .slice(-MAX_HISTORIA)
        .map(m => `${m.role === 'user' ? 'Estudiante' : 'Docente'}: "${m.content}"`)
        .join('\n');

      // Construir prompts optimizados
      const systemPrompt = PromptBuilder.buildSystemPrompt({
        specialistRole: session.course.specialist_role,
        sessionName: session.session.name,
        courseName: session.course.name,
        learningObjective: session.session.learning_objective,
        keyPoints: session.session.key_points,
        momentos: session.momentos,
        currentIndex: session.currentMomentIndex
      });



      // Preparar mensajes para OpenAI
      let finalSystemPrompt = '';
      
      // Si es el primer turno, enviar el mensaje de "espíritu"
      if (session.isFirstTurn) {
        const spiritPrompt = PromptBuilder.buildSpiritPrompt({
          specialistRole: session.course.specialist_role,
          sessionName: session.session.name,
          courseName: session.course.name,
          learningObjective: session.session.learning_objective
        });
        finalSystemPrompt += spiritPrompt + '\n\n';
        
        // Marcar que ya no es el primer turno
        this.sessionManager.updateSession(sessionKey, { isFirstTurn: false });
      }

      // Agregar historial de conversación si existe
      if (historialRecortado.trim()) {
        finalSystemPrompt += `HISTORIAL RECIENTE DE LA CLASE:\n${historialRecortado}\n\n[Si ya hiciste esa pregunta, dilo claramente y continúa con la siguiente.]\n\n`;
      }

      // Agregar el prompt del sistema
      finalSystemPrompt += systemPrompt;

      // Llamar a OpenAI con parámetros optimizados
      const { response, metrics } = await this.openAIService.callOpenAI({
        systemPrompt: finalSystemPrompt,
        userPrompt: studentMessage,
        model: 'gpt-3.5-turbo'  // Usar gpt-3.5-turbo para interacciones
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

      // Guardar respuesta del docente en la memoria conversacional
      session.conversationLog.push({
        role: 'assistant',
        content: parsedResponse.respuesta,
        timestamp: new Date()
      });

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
        momentos: session.momentos,
        sessionKey
      };

    } catch (error) {
      console.error('Error en respuesta del docente:', error);
      return {
        respuesta: "Lo siento, tuve un problema generando la respuesta. ¿Podrías reformular tu pregunta?",
        momento_actual: 'ERROR',
        progreso: 0,
        total_momentos: 0,
        debe_avanzar: false,
        razon_avance: "Error en el sistema",
        siguiente_momento: 'ERROR',
        momentos: [],
        sessionKey
      };
    }
  }

  /**
   * Recoge los momentos del archivo JSON (MÉTODO LEGACY - mantiene compatibilidad)
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