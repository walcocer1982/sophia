import { SessionData, SessionInfo } from '../core/types';
import { Logger } from '../utils/Logger';
import * as fs from 'fs';
import * as path from 'path';

export class SessionStore {
  private static sessions: Map<string, SessionData> = new Map();
  private static logger: Logger = new Logger('SessionStore');

  /**
   * 🚀 CREAR SESIÓN - LÓGICA SIMPLIFICADA
   */
  static async create(courseId: string, sessionId: string): Promise<string> {
    const sessionKey = `${courseId}-${sessionId}`;
    
    try {
      // Cargar datos
      const courseData = await this.loadCourseData();
      const sessionContent = await this.loadSessionContent(courseId, sessionId);
      
      const course = courseData.courses.find((c: any) => c.id === courseId);
      if (!course) {
        throw new Error(`Curso ${courseId} no encontrado`);
      }

      // Crear sesión
      const sessionData: SessionData = {
        courseId,
        sessionId,
        course,
        session: sessionContent,
        momentos: sessionContent.momentos,
        currentMomentIndex: 0,
        preguntasPendientes: [...(sessionContent.momentos[0]?.preguntas || [])],
        preguntasRespondidas: [],
        startTime: new Date(),
        lastActivity: new Date()
      };

      this.sessions.set(sessionKey, sessionData);
      this.logger.info(`✅ Sesión creada: ${sessionKey}`);
      
      return sessionKey;

    } catch (error) {
      this.logger.error(`Error creando sesión: ${error}`);
      throw error;
    }
  }

  /**
   * 📖 OBTENER SESIÓN
   */
  static async get(sessionKey: string): Promise<SessionData | null> {
    const session = this.sessions.get(sessionKey);
    if (session) {
      session.lastActivity = new Date();
    }
    return session || null;
  }

  /**
   * 💾 ACTUALIZAR SESIÓN
   */
  static async update(sessionKey: string, sessionData: SessionData): Promise<void> {
    sessionData.lastActivity = new Date();
    this.sessions.set(sessionKey, sessionData);
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
    this.sessions.delete(sessionKey);
    this.logger.info(`Sesión eliminada: ${sessionKey}`);
  }

  /**
   * 🔧 MÉTODOS DE CARGA PRIVADOS
   */
  private static async loadCourseData(): Promise<any> {
    const filePath = path.join(__dirname, '../data/courses-database.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }

  private static async loadSessionContent(courseId: string, sessionId: string): Promise<any> {
    const filePath = path.join(__dirname, `../data/sessions/${courseId}_${sessionId}.json`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Archivo de sesión no encontrado: ${courseId}_${sessionId}.json`);
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    const rawData = JSON.parse(data);
    
    // Normalización simple
    if (rawData.curso && rawData.sesion) {
      return {
        id: rawData.sesion,
        name: rawData.nombre,
        learning_objective: rawData.objetivo,
        key_points: rawData.key_points || [],
        momentos: rawData.momentos
      };
    }
    
    return rawData;
  }

  static async initialize(): Promise<void> {
    this.logger.info('SessionStore inicializado');
  }
}