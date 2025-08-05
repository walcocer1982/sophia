import { SessionData, SessionInfo, Course, Session } from '../core/types';
import { SessionAdapter } from '../core/schemas';
import { Logger } from '../utils/Logger';
import * as fs from 'fs';
import * as path from 'path';

export class SessionStore {
  private static sessions: Map<string, SessionData> = new Map();
  private static logger: Logger = new Logger('SessionStore');
  private static sessionsFilePath: string = path.join(__dirname, '../data/sessions.json');

  /**
   * 🚀 Crear nueva sesión
   */
  static async create(courseId: string, sessionId: string): Promise<string> {
    try {
      const sessionKey = `${courseId}-${sessionId}`;
      
      this.logger.info(`Creando sesión: ${sessionKey}`);

      // Cargar datos del curso y sesión
      const courseData = await this.loadCourseData(courseId);
      const sessionContent = await this.loadSessionContent(courseId, sessionId);
      
      if (!courseData || !sessionContent) {
        throw new Error(`No se pudieron cargar los datos para ${courseId} - ${sessionId}`);
      }

      const course = courseData.courses.find((c: Course) => c.id === courseId);
      if (!course) {
        throw new Error(`Curso ${courseId} no encontrado`);
      }

      const session = sessionContent;
      if (!session) {
        throw new Error(`Sesión ${sessionId} no encontrada`);
      }

      const sessionData: SessionData = {
        courseId,
        sessionId,
        course,
        session,
        momentos: session.momentos,
        currentMomentIndex: 0,
        preguntasPendientes: session.momentos[0]?.preguntas || [],
        preguntasRespondidas: [],
        startTime: new Date(),
        lastActivity: new Date()
      };

      this.sessions.set(sessionKey, sessionData);
      
      // ✅ PERSISTENCIA DESHABILITADA - Mantener solo en memoria
      // await this.persistSessions();
      
      this.logger.info(`Sesión creada exitosamente: ${sessionKey}`);
      return sessionKey;

    } catch (error) {
      this.logger.error(`Error creando sesión: ${error}`);
      throw error;
    }
  }

  /**
   * 📖 Obtener sesión
   */
  static async get(sessionKey: string): Promise<SessionData | null> {
    const session = this.sessions.get(sessionKey);
    
    if (session) {
      // Actualizar actividad
      session.lastActivity = new Date();
    }
    
    return session || null;
  }

  /**
   * 💾 Actualizar sesión
   */
  static async update(sessionKey: string, sessionData: SessionData): Promise<void> {
    try {
      sessionData.lastActivity = new Date();
      this.sessions.set(sessionKey, sessionData);
      
      // ✅ PERSISTENCIA DESHABILITADA - Mantener solo en memoria
      // await this.persistSessions();
      
      this.logger.debug(`Sesión actualizada: ${sessionKey}`);
    } catch (error) {
      this.logger.error(`Error actualizando sesión: ${error}`);
      throw error;
    }
  }

  /**
   * 🗑️ Eliminar sesión
   */
  static async delete(sessionKey: string): Promise<void> {
    try {
      this.sessions.delete(sessionKey);
      this.logger.info(`Sesión eliminada: ${sessionKey}`);
    } catch (error) {
      this.logger.error(`Error eliminando sesión: ${error}`);
      throw error;
    }
  }

  /**
   * 📊 Obtener información de sesión
   */
  static async getInfo(sessionKey: string): Promise<SessionInfo | null> {
    try {
      const session = await this.get(sessionKey);
      if (!session) return null;

      const currentMoment = session.momentos[session.currentMomentIndex];
      
      return {
        sessionKey,
        progress: `${session.currentMomentIndex + 1}/${session.momentos.length}`,
        currentMoment: currentMoment?.momento || 'N/A',
        pendingQuestions: session.preguntasPendientes.length
      };

    } catch (error) {
      this.logger.error(`Error obteniendo información de sesión: ${error}`);
      return null;
    }
  }

  /**
   * 📋 Listar sesiones activas
   */
  static listActiveSessions(): Array<{ sessionKey: string; lastActivity: Date }> {
    const activeSessions: Array<{ sessionKey: string; lastActivity: Date }> = [];
    
    for (const [sessionKey, sessionData] of this.sessions.entries()) {
      activeSessions.push({
        sessionKey,
        lastActivity: sessionData.lastActivity
      });
    }
    
    return activeSessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  /**
   * 🧹 Limpiar sesiones inactivas
   */
  static cleanInactiveSessions(maxInactiveMinutes: number = 60): number {
    const now = new Date();
    const maxInactiveMs = maxInactiveMinutes * 60 * 1000;
    let cleanedCount = 0;
    
    for (const [sessionKey, sessionData] of this.sessions.entries()) {
      const inactiveTime = now.getTime() - sessionData.lastActivity.getTime();
      
      if (inactiveTime > maxInactiveMs) {
        this.sessions.delete(sessionKey);
        cleanedCount++;
        this.logger.info(`Sesión inactiva eliminada: ${sessionKey}`);
      }
    }
    
    this.logger.info(`Limpieza completada: ${cleanedCount} sesiones eliminadas`);
    return cleanedCount;
  }

  /**
   * 📁 Cargar datos del curso
   */
  private static async loadCourseData(courseId: string): Promise<any> {
    try {
      const filePath = path.join(__dirname, '../data/courses-database.json');
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Error cargando datos del curso: ${error}`);
      throw error;
    }
  }

  /**
   * 📁 Cargar contenido de la sesión
   */
  private static async loadSessionContent(courseId: string, sessionId: string): Promise<any> {
    try {
      const filePath = path.join(__dirname, `../data/sessions/${courseId}_${sessionId}.json`);
      const data = fs.readFileSync(filePath, 'utf8');
      const rawData = JSON.parse(data);
      
      // ✅ NORMALIZAR DATOS CON ADAPTER
      return SessionAdapter.normalize(rawData);
      
    } catch (error) {
      this.logger.error(`Error cargando contenido de sesión: ${error}`);
      throw error;
    }
  }

  /**
   * 📊 Obtener estadísticas del store
   */
  static getStats(): {
    totalSessions: number;
    activeSessions: number;
    memoryUsage: string;
  } {
    const totalSessions = this.sessions.size;
    const now = new Date();
    const activeSessions = Array.from(this.sessions.values()).filter(
      session => (now.getTime() - session.lastActivity.getTime()) < 30 * 60 * 1000 // 30 minutos
    ).length;
    
    return {
      totalSessions,
      activeSessions,
      memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
    };
  }

  /**
   * 💾 Persistir sesiones a archivo
   */
  private static async persistSessions(): Promise<void> {
    try {
      const sessionsData = Array.from(this.sessions.entries()).map(([key, session]) => ({
        sessionKey: key,
        sessionData: {
          ...session,
          startTime: session.startTime.toISOString(),
          lastActivity: session.lastActivity.toISOString()
        }
      }));

      const data = JSON.stringify(sessionsData, null, 2);
      fs.writeFileSync(this.sessionsFilePath, data, 'utf8');
      this.logger.debug(`Sesiones persistidas: ${this.sessions.size} sesiones`);
    } catch (error) {
      this.logger.error(`Error persistiendo sesiones: ${error}`);
    }
  }

  /**
   * 📖 Cargar sesiones desde archivo
   */
  private static async loadPersistedSessions(): Promise<void> {
    try {
      if (!fs.existsSync(this.sessionsFilePath)) {
        this.logger.info('No hay sesiones persistentes para cargar');
        return;
      }

      const data = fs.readFileSync(this.sessionsFilePath, 'utf8');
      const sessionsData = JSON.parse(data);

      for (const { sessionKey, sessionData } of sessionsData) {
        // Convertir fechas de string a Date
        sessionData.startTime = new Date(sessionData.startTime);
        sessionData.lastActivity = new Date(sessionData.lastActivity);
        
        this.sessions.set(sessionKey, sessionData);
      }

      this.logger.info(`Sesiones cargadas: ${this.sessions.size} sesiones`);
    } catch (error) {
      this.logger.error(`Error cargando sesiones persistentes: ${error}`);
    }
  }

  /**
   * 🔄 Inicializar store (cargar sesiones persistentes)
   */
  static async initialize(): Promise<void> {
    // ✅ PERSISTENCIA DESHABILITADA - No cargar sesiones persistentes
    // await this.loadPersistedSessions();
    this.logger.info('Sistema iniciado sin persistencia - sesiones solo en memoria');
  }
} 