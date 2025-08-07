import { SessionData, SessionInfo } from '../core/types';
import { Logger } from '../utils/Logger';
import * as fs from 'fs';
import * as path from 'path';

export class SessionStore {
  private static logger: Logger = new Logger('SessionStore');
  private static sessionsFilePath = path.join(process.cwd(), 'src', 'data', 'active-sessions.json');

  /**
   * 🚀 CREAR SESIÓN - CON PERSISTENCIA
   */
  static async create(courseId: string, sessionId: string): Promise<string> {
    const sessionKey = `${courseId}-${sessionId}`;
    
    try {
      this.logger.info(`🔧 Creando sesión: ${sessionKey}`);
      
      // Cargar datos
      const courseData = await this.loadCourseData();
      const sessionContent = await this.loadSessionContent(courseId, sessionId);
      
      const course = courseData.courses.find((c: any) => c.id === courseId);
      if (!course) {
        throw new Error(`Curso ${courseId} no encontrado`);
      }

      // Mapear datos de sesión del formato español al formato esperado
      const mappedSession = {
        id: sessionContent.sesion,
        name: sessionContent.nombre,
        learning_objective: sessionContent.objetivo,
        key_points: sessionContent.key_points.map((kp: string, index: number) => ({
          id: `kp-${index + 1}`,
          title: kp,
          description: kp,
          completed: false
        }))
      };

      // Debug: verificar el mapeo
      console.log('DEBUG - sessionContent.objetivo:', sessionContent.objetivo);
      console.log('DEBUG - mappedSession.learning_objective:', mappedSession.learning_objective);
      console.log('DEBUG - key_points count:', sessionContent.key_points.length);
      console.log('DEBUG - mapped key_points count:', mappedSession.key_points.length);

      // Crear sesión
      const sessionData: SessionData = {
        courseId,
        sessionId,
        course,
        session: mappedSession,
        momentos: sessionContent.momentos,
        currentMomentIndex: 0,
        preguntasPendientes: [...(sessionContent.momentos[0]?.preguntas || [])],
        preguntasRespondidas: [],
        startTime: new Date(),
        lastActivity: new Date(),
        // 🆕 Sistema de memoria para evitar repeticiones
        respuestasAnteriores: [],
        contenidoNarrado: [],
        contadorInteracciones: 0
      };

      // Guardar en "MongoDB simulado" (archivo JSON)
      await this.saveSession(sessionKey, sessionData);
      
      this.logger.info(`✅ Sesión creada y persistida: ${sessionKey}`);
      
      return sessionKey;

    } catch (error) {
      this.logger.error(`Error creando sesión: ${error}`);
      throw error;
    }
  }

  /**
   * 📖 OBTENER SESIÓN - DESDE PERSISTENCIA
   */
  static async get(sessionKey: string): Promise<SessionData | null> {
    try {
      this.logger.info(`🔍 Buscando sesión: ${sessionKey}`);
      
      const sessionData = await this.loadSession(sessionKey);
      
      if (sessionData) {
        sessionData.lastActivity = new Date();
        await this.saveSession(sessionKey, sessionData); // Actualizar timestamp
        this.logger.info(`✅ Sesión encontrada: ${sessionKey}`);
        return sessionData;
      } else {
        this.logger.info(`❌ Sesión no encontrada: ${sessionKey}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error obteniendo sesión: ${error}`);
      return null;
    }
  }

  /**
   * 💾 ACTUALIZAR SESIÓN - CON PERSISTENCIA
   */
  static async update(sessionKey: string, sessionData: SessionData): Promise<void> {
    sessionData.lastActivity = new Date();
    await this.saveSession(sessionKey, sessionData);
    this.logger.info(`💾 Sesión actualizada: ${sessionKey}`);
  }

  /**
   * 📊 OBTENER INFO
   */
  static async getInfo(sessionKey: string): Promise<SessionInfo | null> {
    const session = await this.get(sessionKey);
    if (!session) return null;

    const currentMoment = session.momentos[session.currentMomentIndex];
    
    return {
      sessionKey,
      progress: `${session.currentMomentIndex + 1}/${session.momentos.length}`,
      currentMoment: currentMoment?.momento || 'N/A',
      pendingQuestions: session.preguntasPendientes.length
    };
  }

  /**
   * 🗑️ ELIMINAR SESIÓN
   */
  static async delete(sessionKey: string): Promise<void> {
    await this.removeSession(sessionKey);
    this.logger.info(`Sesión eliminada: ${sessionKey}`);
  }

  /**
   * 🔧 MÉTODOS DE PERSISTENCIA (MongoDB simulado)
   */
  private static async loadSessions(): Promise<Record<string, SessionData>> {
    try {
      if (!fs.existsSync(this.sessionsFilePath)) {
        return {};
      }
      const data = fs.readFileSync(this.sessionsFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Error cargando sesiones: ${error}`);
      return {};
    }
  }

  private static async saveSessions(sessions: Record<string, SessionData>): Promise<void> {
    try {
      // Asegurar que el directorio existe
      const dir = path.dirname(this.sessionsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.sessionsFilePath, JSON.stringify(sessions, null, 2));
    } catch (error) {
      this.logger.error(`Error guardando sesiones: ${error}`);
    }
  }

  private static async saveSession(sessionKey: string, sessionData: SessionData): Promise<void> {
    const sessions = await this.loadSessions();
    sessions[sessionKey] = sessionData;
    await this.saveSessions(sessions);
  }

  private static async loadSession(sessionKey: string): Promise<SessionData | null> {
    const sessions = await this.loadSessions();
    return sessions[sessionKey] || null;
  }

  private static async removeSession(sessionKey: string): Promise<void> {
    const sessions = await this.loadSessions();
    delete sessions[sessionKey];
    await this.saveSessions(sessions);
  }

  /**
   * 🔧 MÉTODOS DE CARGA PRIVADOS
   */
  private static async loadCourseData(): Promise<any> {
    const filePath = path.join(process.cwd(), 'src', 'data', 'courses-database.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }

  private static async loadSessionContent(courseId: string, sessionId: string): Promise<any> {
    const filePath = path.join(process.cwd(), 'src', 'data', 'sessions', `${courseId}_${sessionId}.json`);
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }

  /**
   * 🔧 INICIALIZAR
   */
  static async initialize(): Promise<void> {
    this.logger.info('SessionStore inicializado con persistencia');
  }
}