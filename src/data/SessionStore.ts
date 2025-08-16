import * as fs from 'fs';
import * as path from 'path';
import { SessionData, SessionInfo } from '../core/types';
import { Logger } from '../utils/Logger';

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

      // Mapear datos de sesión del nuevo formato JSON al formato esperado
      const mappedSession = {
        id: sessionContent.id_leccion,
        name: sessionContent.nombre_leccion,
        learning_objective: sessionContent.objetivos_especificos?.[0] || 'Aprender sobre procedimientos de seguridad',
        key_points: sessionContent.key_points_especificos?.map((kp: any, index: number) => ({
          id: kp.id || `kp-${index + 1}`,
          title: kp.titulo,
          description: kp.descripcion,
          completed: false
        })) || []
      };

      // Debug: verificar el mapeo
      console.log('DEBUG - sessionContent.objetivos_especificos:', sessionContent.objetivos_especificos);
      console.log('DEBUG - mappedSession.learning_objective:', mappedSession.learning_objective);
      console.log('DEBUG - key_points_especificos count:', sessionContent.key_points_especificos?.length || 0);
      console.log('DEBUG - mapped key_points count:', mappedSession.key_points.length);

      // Aplanar sub-momentos si existen
      const rawMoments = Array.isArray(sessionContent.momentos_pedagogicos) ? sessionContent.momentos_pedagogicos : [];
      const flattenedMoments = rawMoments.flatMap((m: any) => {
        if (Array.isArray(m.sub_momentos) && m.sub_momentos.length > 0) {
          return m.sub_momentos.map((sub: any, idx: number) => ({
            momento: `${m.momento}${sub.titulo ? ` - ${sub.titulo}` : ` - Submomento ${idx + 1}`}`,
            objetivo: sub.objetivo || m.objetivo,
            instrucciones_docenteia: sub.instrucciones_docenteia || m.instrucciones_docenteia,
            contenido_tecnico: sub.contenido_tecnico || m.contenido_tecnico || [],
            contenido_tecnico_detallado: sub.contenido_tecnico_detallado || [],
            preguntas_evaluacion: (sub.preguntas_evaluacion || []).map((q: any, qidx: number) => ({
              id_pregunta: q.id_pregunta || `${(m.momento || 'momento').toLowerCase()}-${idx + 1}-q${qidx + 1}`,
              ...q
            })),
            historia_contextual: sub.historia_contextual || undefined,
            casos_practicos: sub.casos_practicos || undefined,
            caso: sub.caso || undefined,
            contenido_clave: sub.contenido_clave || undefined,
            momento_id: sub.momento_id || `${(m.momento || 'momento').toLowerCase()}-${idx + 1}`
          }));
        }
        return [m];
      });

      // Crear sesión
      const sessionData: SessionData = {
        courseId,
        sessionId,
        course,
        session: mappedSession,
        momentos: flattenedMoments || [],
        currentMomentIndex: 0,
        preguntasPendientes: [...(flattenedMoments?.[0]?.preguntas_evaluacion?.map((p: any) => p.pregunta) || [])],
        preguntasRespondidas: [],
        startTime: new Date(),
        lastActivity: new Date(),
        // Estado pedagógico
        contenidoNarrado: [],
        momentKeywords: [],
        // Políticas configurables por sesión/curso (si vienen en el JSON de sesión)
        policies: sessionContent.policies || { noSpoilers: true, hintStyle: 'ABSTRACT' }
      };

      // Derivar palabras clave por momento (para clasificación CURRENT/FUTURE/OUT_OF_SCOPE)
      sessionData.momentKeywords = (sessionData.momentos || []).map((m: any) => {
        const keywords: string[] = [];
        const preguntas = m.preguntas_evaluacion || [];
        for (const q of preguntas) {
          if (q.respuestas_aceptables) {
            keywords.push(...q.respuestas_aceptables.map((r: string) => r.toLowerCase()));
          }
        }
        if (Array.isArray(m.contenido_tecnico)) {
          keywords.push(...m.contenido_tecnico.flatMap((t: string) => t.toLowerCase().split(/[^a-záéíóúñ0-9]+/).filter(Boolean)));
        }
        if (Array.isArray(m.contenido_tecnico_detallado)) {
          for (const d of m.contenido_tecnico_detallado) {
            if (typeof d.concepto === 'string') keywords.push(d.concepto.toLowerCase());
            if (typeof d.definicion === 'string') {
              keywords.push(...d.definicion.toLowerCase().split(/[^a-záéíóúñ0-9]+/).filter(Boolean).slice(0, 8));
            }
            if (Array.isArray(d.elementos)) keywords.push(...d.elementos.map((e: string) => e.toLowerCase()));
            if (Array.isArray(d.tipos)) keywords.push(...d.tipos.map((e: string) => e.toLowerCase()));
          }
        }
        return Array.from(new Set(keywords)).slice(0, 50);
      });

      // Inicializar métricas por momento
      sessionData.momentMetrics = (sessionData.momentos || []).map((m: any) => ({
        contentChunksTotal: Array.isArray(m.contenido_tecnico) ? m.contenido_tecnico.length : 0,
        contentChunksShown: 0,
        definitionsTotal: Array.isArray(m.contenido_tecnico_detallado) ? m.contenido_tecnico_detallado.length : 0,
        definitionsShown: 0,
        questionsTotal: Array.isArray(m.preguntas_evaluacion) ? m.preguntas_evaluacion.length : 0,
        questionsAsked: 0
      }));

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