// src/services/SessionManager.ts

import * as fs from 'fs';
import * as path from 'path';
import { SessionData, Course, Session } from '../types';

export class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private cache: Map<string, any> = new Map();

  constructor() {
    // Limpiar sesiones al iniciar
    this.sessions.clear();
    this.cache.clear();
  }

  /**
   * Inicia una nueva sesión
   */
  async startSession(courseId: string, sessionId: string): Promise<string> {
    try {
      const sessionKey = `${courseId}-${sessionId}`;
      
      // Cargar datos del curso
      const courseData = await this.loadCourseData(courseId);
      const course = courseData.courses.find((c: Course) => c.id === courseId);
      
      if (!course) {
        throw new Error(`Curso ${courseId} no encontrado`);
      }

      const session = course.sessions.find((s: Session) => s.id === sessionId);
      if (!session) {
        throw new Error(`Sesión ${sessionId} no encontrada`);
      }

      // Cargar contenido de la sesión
      const sessionContent = await this.loadSessionContent(courseId, sessionId);
      
      // Crear datos de sesión
      const sessionData: SessionData = {
        courseId,
        sessionId,
        sessionFile: `${courseId}_${sessionId}.json`,
        course,
        session,
        expectedTheme: this.extractThemeFromSession(session.name),
        momentos: sessionContent.momentos || [],
        currentMomentIndex: 0,
        startTime: new Date(),
        lastActivity: new Date(),
        sessionContent,
        conversationLog: [],
        isFirstTurn: true,
        preguntasPendientes: sessionContent.momentos?.[0]?.preguntas || [],
        preguntasRespondidas: []
      };

      // Guardar sesión
      this.sessions.set(sessionKey, sessionData);
      
      console.log(`🚀 Iniciando nueva sesión: ${sessionKey}`);
      console.log(`✅ Contenido cargado desde: ${this.getSessionFilePath(courseId, sessionId)}`);
      
      return sessionKey;

    } catch (error) {
      console.error('Error iniciando sesión:', error);
      throw error;
    }
  }

  /**
   * Obtiene una sesión por clave
   */
  getSession(sessionKey: string): SessionData | undefined {
    return this.sessions.get(sessionKey);
  }

  /**
   * Actualiza una sesión
   */
  updateSession(sessionKey: string, updates: Partial<SessionData>): boolean {
    const session = this.sessions.get(sessionKey);
    if (!session) return false;

    Object.assign(session, updates);
    return true;
  }

  /**
   * Lista todas las sesiones activas
   */
  listActiveSessions(): Array<{
    sessionKey: string;
    course: string;
    session: string;
    progress: string;
  }> {
    return Array.from(this.sessions.entries()).map(([key, data]) => ({
      sessionKey: key,
      course: data.course.name,
      session: data.session.name,
      progress: `${data.currentMomentIndex + 1}/${data.momentos.length}`
    }));
  }

  /**
   * Limpia una sesión específica
   */
  clearSession(sessionKey: string): boolean {
    return this.sessions.delete(sessionKey);
  }

  /**
   * Limpia todas las sesiones
   */
  clearAllSessions(): void {
    this.sessions.clear();
  }

  /**
   * Obtiene estadísticas del cache
   */
  getCacheStats(): {
    activeSessions: number;
    cacheSize: number;
    sessionsSize: number;
  } {
    return {
      activeSessions: this.sessions.size,
      cacheSize: this.cache.size,
      sessionsSize: this.sessions.size
    };
  }

  /**
   * Limpia el cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Carga datos del curso desde la base de datos
   */
  private async loadCourseData(courseId: string): Promise<any> {
    const cacheKey = `course_${courseId}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const filePath = path.join(__dirname, '../data/courses-database.json');
      const data = fs.readFileSync(filePath, 'utf8');
      const parsedData = JSON.parse(data);
      
      this.cache.set(cacheKey, parsedData);
      return parsedData;
    } catch (error) {
      console.error('Error cargando datos del curso:', error);
      throw error;
    }
  }

  /**
   * Carga contenido de la sesión desde archivo JSON
   */
  private async loadSessionContent(courseId: string, sessionId: string): Promise<any> {
    const cacheKey = `session_${courseId}_${sessionId}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Intentar múltiples rutas posibles
      const possiblePaths = [
        path.join(__dirname, '../data/sessions', `${courseId}_${sessionId}.json`),
        path.join(__dirname, '../data/sessions', `${sessionId}.json`),
        path.join(__dirname, '../data/sessions', `${courseId}_${sessionId.replace('sesion', 'sesion0')}.json`)
      ];

      let sessionData = null;
      let loadedPath = '';

      for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
          const data = fs.readFileSync(filePath, 'utf8');
          sessionData = JSON.parse(data);
          loadedPath = filePath;
          break;
        }
      }

      if (!sessionData) {
        throw new Error(`No se pudo cargar el contenido de la sesión ${courseId}_${sessionId}`);
      }

      this.cache.set(cacheKey, sessionData);
      console.log(`✅ Contenido cargado desde: ${loadedPath}`);
      
      return sessionData;

    } catch (error) {
      console.error('Error cargando contenido de sesión:', error);
      throw error;
    }
  }

  /**
   * Obtiene la ruta del archivo de sesión
   */
  private getSessionFilePath(courseId: string, sessionId: string): string {
    return path.join(__dirname, '../data/sessions', `${courseId}_${sessionId}.json`);
  }

  /**
   * Extrae el tema de una sesión
   */
  private extractThemeFromSession(sessionName: string): string {
    const sessionNameLower = sessionName.toLowerCase();
    if (sessionNameLower.includes('iperc')) return 'IPERC';
    if (sessionNameLower.includes('incendio')) return 'Incendios';
    return 'Seguridad';
  }
} 