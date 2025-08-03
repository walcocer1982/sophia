import { SessionData, SessionInfo, CacheStats, Course, Session, Moment } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class SessionManager {
  private sessions = new Map<string, SessionData>();
  private cache = new Map<string, any>();
  private courseData: any;

  constructor() {
    this.courseData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/courses-database.json'), 'utf8'));
  }

  /**
   * Inicia una sesión optimizada
   */
  async startSession(courseId: string, sessionId: string): Promise<string> {
    const sessionKey = `${courseId}-${sessionId}`;
    
    // Si la sesión ya existe, retornarla
    if (this.sessions.has(sessionKey)) {
      console.log(`✅ Sesión ${sessionKey} ya existe, reutilizando`);
      return sessionKey;
    }

    console.log(`🚀 Iniciando nueva sesión: ${sessionKey}`);
    
    // Obtener información del curso y sesión
    const { course, session, vectorStoreId, fileId, fileName } = this.getCourseSessionInfo(courseId, sessionId);
    
    // Extraer tema esperado
    const expectedTheme = this.extractThemeFromSession(session.name);
    
    // Crear datos de sesión iniciales
    const sessionData: SessionData = {
      courseId,
      sessionId,
      vectorStoreId,
      fileId,
      fileName,
      course,
      session,
      expectedTheme,
      momentos: [],
      fragmentos: [],
      currentMomentIndex: 0,
      startTime: new Date(),
      lastActivity: new Date()
    };

    this.sessions.set(sessionKey, sessionData);
    
    return sessionKey;
  }

  /**
   * Obtiene información del curso y sesión
   */
  getCourseSessionInfo(courseId: string, sessionId: string): {
    course: Course;
    session: Session;
    vectorStoreId: string;
    fileId: string;
    fileName: string;
  } {
    const course = this.courseData.courses.find((c: Course) => c.id === courseId);
    if (!course) {
      throw new Error(`Curso ${courseId} no encontrado`);
    }

    const session = course.sessions.find((s: Session) => s.id === sessionId);
    if (!session) {
      throw new Error(`Sesión ${sessionId} no encontrada en curso ${courseId}`);
    }

    return {
      course,
      session,
      vectorStoreId: course.vector_store_id,
      fileId: session.file_id,
      fileName: session.file_name
    };
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
  updateSession(sessionKey: string, updates: Partial<SessionData>): void {
    const session = this.sessions.get(sessionKey);
    if (session) {
      Object.assign(session, updates);
      session.lastActivity = new Date();
    }
  }

  /**
   * Lista todas las sesiones activas
   */
  listActiveSessions(): SessionInfo[] {
    return Array.from(this.sessions.entries()).map(([key, session]) => ({
      sessionKey: key,
      course: session.course.name,
      session: session.session.name,
      currentMoment: session.momentos[session.currentMomentIndex]?.momento || 'N/A',
      progress: `${session.currentMomentIndex + 1}/${session.momentos.length}`,
      startTime: session.startTime,
      lastActivity: session.lastActivity
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
   * Obtiene estadísticas del caché
   */
  getCacheStats(): CacheStats {
    return {
      cacheSize: this.cache.size,
      sessionsSize: this.sessions.size,
      activeSessions: this.sessions.size
    };
  }

  /**
   * Limpia el caché
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Obtiene un valor del caché
   */
  getFromCache(key: string): any {
    return this.cache.get(key);
  }

  /**
   * Guarda un valor en el caché
   */
  setCache(key: string, value: any): void {
    this.cache.set(key, value);
  }

  /**
   * Verifica si existe una clave en el caché
   */
  hasCache(key: string): boolean {
    return this.cache.has(key);
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

  /**
   * Valida que los momentos correspondan al tema
   */
  validateMomentosTheme(momentos: Moment[], expectedTheme: string): void {
    if (!momentos || momentos.length === 0) {
      throw new Error(`No se encontraron momentos válidos para el tema ${expectedTheme}`);
    }
  }

  /**
   * Valida contenido del tema usando theme_keywords del JSON
   */
  validateContentTheme(fileId: string, expectedTheme: string, searchResults: any[]): any[] {
    // Buscar la sesión que corresponde al fileId para obtener sus theme_keywords
    let sessionKeywords: string[] = [];
    
    for (const course of this.courseData.courses) {
      const session = course.sessions.find((s: Session) => s.file_id === fileId);
      if (session && session.theme_keywords) {
        sessionKeywords = session.theme_keywords;
        break;
      }
    }

    // Si no se encuentran keywords específicos, usar keywords genéricos basados en el tema
    if (sessionKeywords.length === 0) {
      const genericThemeKeywords = {
        'IPERC': ['iperc', 'identificación', 'peligros', 'evaluación', 'riesgos', 'control'],
        'Incendios': ['incendio', 'fuego', 'extintor', 'prevención', 'combustión', 'triángulo del fuego'],
        'Seguridad': ['seguridad', 'prevención', 'riesgo', 'protección', 'accidente'],
        'Perforación': ['perforación', 'equipo', 'componentes', 'técnicas', 'mantenimiento']
      };
      sessionKeywords = genericThemeKeywords[expectedTheme as keyof typeof genericThemeKeywords] || [];
    }

    console.log(`🔍 Validando contenido con keywords: ${sessionKeywords.join(', ')}`);

    const validResults = searchResults.filter(result => {
      const text = result.text.toLowerCase();
      const matches = sessionKeywords.filter(keyword => text.includes(keyword.toLowerCase()));
      return matches.length >= 1;
    });

    return validResults.length > 0 ? validResults : searchResults.slice(0, 3);
  }
} 