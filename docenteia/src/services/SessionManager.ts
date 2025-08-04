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
   * Inicia una sesión cargando JSON directamente
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
    const { course, session } = this.getCourseSessionInfo(courseId, sessionId);
    
    // Cargar contenido de la sesión desde JSON
    const sessionContent = this.loadSessionContent(courseId, sessionId);
    
    // Extraer tema esperado
    const expectedTheme = this.extractThemeFromSession(session.name);
    
    // Crear datos de sesión iniciales
    const sessionData: SessionData = {
      courseId,
      sessionId,
      sessionFile: `${courseId}_${sessionId}.json`,
      course,
      session,
      expectedTheme,
      momentos: sessionContent.momentos || [],
      currentMomentIndex: 0,
      startTime: new Date(),
      lastActivity: new Date(),
      sessionContent, // Agregar contenido completo de la sesión
      conversationLog: [], // Inicializar memoria conversacional vacía
      isFirstTurn: true // Marcar como primer turno para enviar el "espíritu"
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
      session
    };
  }

  /**
   * Carga el contenido de la sesión desde JSON
   */
  private loadSessionContent(courseId: string, sessionId: string): any {
    try {
      const fileName = `${courseId}_${sessionId}.json`;
      
      // Intentar múltiples rutas posibles
      const possiblePaths = [
        path.join(__dirname, '../data/sessions', fileName),
        path.join(__dirname, '../../data/sessions', fileName),
        path.join(__dirname, '../../../data/sessions', fileName)
      ];
      
      let filePath: string | null = null;
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          filePath = testPath;
          break;
        }
      }
      
      if (!filePath) {
        console.log(`⚠️ Archivo no encontrado en rutas: ${possiblePaths.join(', ')}`);
        console.log(`📁 Usando contenido básico para: ${fileName}`);
        return this.createBasicSessionContent();
      }
      
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`✅ Contenido cargado desde: ${filePath}`);
      return content;
    } catch (error) {
      console.error(`❌ Error cargando contenido de sesión: ${error}`);
      return this.createBasicSessionContent();
    }
  }

  /**
   * Crea contenido básico de sesión si no existe el archivo
   */
  private createBasicSessionContent(): any {
    return {
      momentos: [
        {
          momento: "Saludo (exposición del aprendizaje esperado y los puntos clave)",
          instrucciones_docenteia: "Presentar el objetivo de la sesión y los puntos clave a desarrollar",
          preguntas: ["¿Qué sabes sobre este tema?", "¿Qué esperas aprender hoy?"]
        },
        {
          momento: "Conexión",
          instrucciones_docenteia: "Narrar una historia o situación para conectar con experiencias previas",
          preguntas: ["¿Qué observas en esta situación?", "¿Cómo se relaciona con tu experiencia?"]
        },
        {
          momento: "Adquisición",
          instrucciones_docenteia: "Explicar los conceptos técnicos principales",
          preguntas: ["¿Qué conceptos nuevos identificas?", "¿Cómo se conectan con lo que ya sabías?"]
        },
        {
          momento: "Aplicación",
          instrucciones_docenteia: "Presentar un caso práctico para aplicar los conocimientos",
          preguntas: ["¿Cómo aplicarías estos conceptos?", "¿Qué pasos seguirías?"]
        },
        {
          momento: "Discusión",
          instrucciones_docenteia: "Facilitar la comparación y discusión de diferentes enfoques",
          preguntas: ["¿Qué opinas sobre este enfoque?", "¿Hay otras alternativas?"]
        },
        {
          momento: "Reflexión",
          instrucciones_docenteia: "Guiar la reflexión sobre lo aprendido y su aplicación práctica",
          preguntas: ["¿Qué aprendiste hoy?", "¿Cómo aplicarás estos conocimientos?"]
        }
      ]
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
} 