const { OpenAI } = require('openai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

class VectorStoreExtractor {
  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.courseData = require('../data/courses-database.json');
    this.cache = new Map(); // Cache para respuestas similares
    this.sessions = new Map(); // Gestión de sesiones optimizada
  }

  /**
   * Obtiene información del curso y sesión
   * @param {string} courseId - ID del curso (ej: "SSO001")
   * @param {string} sessionId - ID de la sesión (ej: "sesion01")
   * @returns {Object} Información del curso, sesión y Vector Store
   */
  getCourseSessionInfo(courseId, sessionId) {
    const course = this.courseData.courses.find(c => c.id === courseId);
    if (!course) {
      throw new Error(`Curso ${courseId} no encontrado`);
    }

    const session = course.sessions.find(s => s.id === sessionId);
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
   * Inicia una sesión optimizada con fragmentos pre-calculados
   * @param {string} courseId - ID del curso
   * @param {string} sessionId - ID de la sesión
   * @returns {Promise<Object>} Información de la sesión iniciada
   */
  async startSession(courseId, sessionId) {
    try {
      const { vectorStoreId, fileId, fileName, course, session } = this.getCourseSessionInfo(courseId, sessionId);
      
      console.log(`🚀 Iniciando sesión optimizada: ${course.name} - ${session.name}`);
      console.log(`📁 Vector Store: ${vectorStoreId}`);
      console.log(`📁 Archivo: ${fileName} (${fileId})`);

      // Verificar si el archivo existe en el vector store
      await this.validateFileExists(vectorStoreId, fileId);
      console.log(`✅ Archivo ${fileId} validado en vector store`);

      // Extraer tema esperado para validación
      const expectedTheme = this.extractThemeFromSession(session.name);
      console.log(`🎯 Tema esperado: ${expectedTheme}`);

      // Extraer momentos con precisión
      const momentos = await this.extractMomentosWithPrecision(vectorStoreId, fileId, fileName, course, session, expectedTheme);
      
      // Validar que los momentos correspondan al tema
      this.validateMomentosTheme(momentos, expectedTheme);
      console.log(`✅ Momentos validados para tema ${expectedTheme}`);

      // Pre-calcular fragmentos para cada momento (OPTIMIZACIÓN FASE 1)
      console.log(`⚡ Pre-calculando fragmentos para ${momentos.length} momentos...`);
      const fragmentos = await this.preCalculateFragmentos(vectorStoreId, momentos, expectedTheme);
      console.log(`✅ ${fragmentos.length} fragmentos pre-calculados`);

      // Crear sesión optimizada
      const sessionKey = `${courseId}-${sessionId}`;
      const sessionData = {
        courseId,
        sessionId,
        vectorStoreId,
        fileId,
        fileName,
        course,
        session,
        expectedTheme,
        momentos,
        fragmentos,
        currentMomentIndex: 0,
        startTime: new Date(),
        lastActivity: new Date()
      };

      this.sessions.set(sessionKey, sessionData);
      console.log(`✅ Sesión iniciada: ${momentos.length} momentos, ${fragmentos.length} fragmentos`);
      console.log(`💾 Estado guardado con clave: ${sessionKey}`);

      return {
        sessionKey,
        momentos: momentos.length,
        fragmentos: fragmentos.length,
        currentMoment: momentos[0]?.momento || 'N/A'
      };

    } catch (error) {
      console.error('Error iniciando sesión optimizada:', error.message);
      throw error;
    }
  }

  /**
   * Extrae momentos usando gpt-4o y responses.create (método original optimizado)
   * @param {string} vectorStoreId - ID del vector store
   * @param {string} fileId - ID del archivo
   * @param {string} fileName - Nombre del archivo
   * @param {Object} course - Información del curso
   * @param {Object} session - Información de la sesión
   * @param {string} expectedTheme - Tema esperado
   * @returns {Promise<Array>} Array de momentos extraídos
   */
  async extractMomentosWithPrecision(vectorStoreId, fileId, fileName, course, session, expectedTheme) {
    try {
      const userPrompt = `
IMPORTANTE: Responde ÚNICAMENTE con un JSON válido, sin texto adicional.

Revisa el documento adjunto del curso "${course.name}" - sesión "${session.name}" y extrae exactamente 6 momentos clave según la estructura pedagógica estándar.

RESPUESTA OBLIGATORIA EN JSON:
[
  { "momento": "MOMENTO_0", "texto": "Contenido del saludo y conexión inicial", "file_id": "${fileId}"},
  { "momento": "MOMENTO_1", "texto": "Contenido de activación con historia o caso", "file_id": "${fileId}"},
  { "momento": "MOMENTO_2", "texto": "Contenido de adquisición de conocimientos", "file_id": "${fileId}"},
  { "momento": "MOMENTO_3", "texto": "Contenido de aplicación práctica", "file_id": "${fileId}"},
  { "momento": "MOMENTO_4", "texto": "Contenido de discusión y contraste", "file_id": "${fileId}"},
  { "momento": "MOMENTO_5", "texto": "Contenido de reflexión final y cierre", "file_id": "${fileId}"}
]

Estructura de momentos:
- MOMENTO_0: Saludo y Conexión Inicial
- MOMENTO_1: Activación con Historia o Caso  
- MOMENTO_2: Adquisición de Conocimientos
- MOMENTO_3: Aplicación Práctica
- MOMENTO_4: Discusión y Contraste
- MOMENTO_5: Reflexión Final y Cierre

Extrae el contenido real del documento para cada momento. No inventes contenido.
`;

      const response = await this.client.responses.create({
        model: "gpt-4o",
        instructions: `Eres un sistema que identifica secciones pedagógicas clave en documentos del curso ${course.name}. IMPORTANTE: Debes responder ÚNICAMENTE en formato JSON válido, sin texto adicional.`,
        input: userPrompt,
        tools: [
          {
            type: "file_search",
            vector_store_ids: [vectorStoreId],
            max_num_results: 10
          }
        ],
      });

      const momentos = this.parseJSONResponse(response.output_text);
      
      // Validar que los momentos correspondan al tema
      this.validateMomentosTheme(momentos, expectedTheme);
      
      return momentos;
    } catch (error) {
      console.error('Error extrayendo momentos con precisión:', error.message);
      throw error;
    }
  }

  /**
   * Pre-calcula fragmentos para cada momento (OPTIMIZACIÓN FASE 1)
   * @param {string} vectorStoreId - ID del vector store
   * @param {Array} momentos - Array de momentos
   * @param {string} expectedTheme - Tema esperado
   * @returns {Promise<Array>} Array de fragmentos pre-calculados
   */
  async preCalculateFragmentos(vectorStoreId, momentos, expectedTheme) {
    const fragmentos = [];
    
    for (const momento of momentos) {
      try {
        // Buscar fragmentos relevantes para este momento
        const searchResults = await this.client.vectorStores.search({
          vector_store_id: vectorStoreId,
          query: `${momento.momento} ${expectedTheme}`,
          max_num_results: 3
        });

        // Obtener los resultados correctamente
        const results = searchResults.data || searchResults.results || [];
        
        // Validar que los resultados correspondan al tema
        const validResults = this.validateContentTheme(momento.file_id, expectedTheme, results);
        
        if (validResults.length > 0) {
          fragmentos.push({
            momento: momento.momento,
            fragmentos: validResults.map(result => ({
              texto: result.text || result.content || '',
              score: result.score || 0
            }))
          });
        }
      } catch (error) {
        console.error(`Error pre-calculando fragmentos para ${momento.momento}:`, error.message);
        // Continuar con el siguiente momento en lugar de fallar completamente
      }
    }
    
    return fragmentos;
  }

  /**
   * Maneja la interacción del estudiante usando fragmentos pre-calculados
   * @param {string} sessionKey - Clave de la sesión
   * @param {string} studentMessage - Mensaje del estudiante
   * @returns {Promise<Object>} Respuesta del docente con información del progreso
   */
  async handleStudent(sessionKey, studentMessage) {
    try {
      const session = this.sessions.get(sessionKey);
      if (!session) {
        throw new Error(`Sesión ${sessionKey} no encontrada`);
      }

      // Actualizar última actividad
      session.lastActivity = new Date();

      console.log(`🎓 ${session.course.specialist_role} respondiendo en ${session.session.name}`);
      console.log(`📊 Progreso: Momento ${session.currentMomentIndex + 1}/${session.momentos.length}`);

      // Obtener el momento actual y fragmentos pre-calculados
      const momentoActual = session.momentos[session.currentMomentIndex] || null;
      const fragmentosActuales = session.fragmentos.find(f => f.momento === momentoActual?.momento) || { fragmentos: [] };
      const siguienteMomento = session.momentos[session.currentMomentIndex + 1] || null;

      // Construir el contexto de los momentos para el modelo
      const momentosContext = session.momentos.map((momento, index) => {
        const status = index === session.currentMomentIndex ? 'ACTUAL' : 
                      index < session.currentMomentIndex ? 'COMPLETADO' : 'PENDIENTE';
        return `${index + 1}. ${momento.momento} (${status})`;
      }).join('\n');

      // Construir contexto de fragmentos pre-calculados
      const fragmentosContext = fragmentosActuales.fragmentos.map((frag, index) => 
        `Fragmento ${index + 1}: ${frag.texto.substring(0, 200)}...`
      ).join('\n');

      const systemPrompt = `Eres un ${session.course.specialist_role} que está enseñando la sesión "${session.session.name}" del curso "${session.course.name}".

OBJETIVO DE APRENDIZAJE: ${session.session.learning_objective}

PUNTOS CLAVE:
${session.session.key_points.map(point => `- ${point}`).join('\n')}

ESTRUCTURA DE MOMENTOS DE LA SESIÓN:
${momentosContext}

MOMENTO ACTUAL: ${momentoActual ? momentoActual.momento : 'N/A'}
${momentoActual ? `CONTENIDO DEL MOMENTO ACTUAL: ${momentoActual.texto}` : ''}

FRAGMENTOS PRE-CALCULADOS PARA EL MOMENTO ACTUAL:
${fragmentosContext}

PERSONALIDAD PEDAGÓGICA:
- Usa metodología "Teach Like a Champion"
- Construye sobre respuestas parciales del estudiante
- Usa "Right is Right" y "Stretch It"
- NUNCA dar definiciones directas
- Construir conocimiento inductivamente
- Validar y corregir respuestas constructivamente

TU TAREA COMO DOCENTE:
1. Mantener al estudiante enfocado en el momento actual
2. Usar el contenido del momento actual y fragmentos pre-calculados para responder
3. Guiar al estudiante hacia el siguiente momento cuando esté listo
4. Evaluar si el estudiante está preparado para avanzar
5. Proporcionar retroalimentación constructiva

CONTEXTO: El contenido se extrae del archivo ${session.fileName} en el Vector Store ${session.vectorStoreId}.

El modelo debe hacer todo el razonamiento sobre:
- En qué momento está el estudiante
- Si está listo para avanzar al siguiente momento
- Cómo responder pedagógicamente
- Cómo guiar la conversación`;

      const response = await this.client.responses.create({
        model: "gpt-4o",
        instructions: systemPrompt,
        input: `Estudiante dice: "${studentMessage}"

MOMENTO ACTUAL: ${momentoActual ? momentoActual.momento : 'N/A'}
PROGRESO: ${session.currentMomentIndex + 1}/${session.momentos.length}

IMPORTANTE: Debes responder ÚNICAMENTE en formato JSON válido, sin texto adicional.

Responde como ${session.course.specialist_role} siguiendo la metodología y personalidad especificadas. 
El modelo debe decidir:
1. Cómo responder pedagógicamente
2. Si el estudiante está listo para avanzar al siguiente momento
3. Cómo guiar la conversación

RESPUESTA OBLIGATORIA EN JSON:
{
  "respuesta": "Respuesta del docente",
  "momento_actual": "${momentoActual ? momentoActual.momento : 'N/A'}",
  "progreso": ${session.currentMomentIndex + 1},
  "total_momentos": ${session.momentos.length},
  "debe_avanzar": true/false,
  "razon_avance": "Razón por la que debe o no avanzar",
  "siguiente_momento": "${siguienteMomento ? siguienteMomento.momento : 'FIN'}"
}`,
        tools: [
          {
            type: "file_search",
            vector_store_ids: [session.vectorStoreId],
            max_num_results: 5
          }
        ],
      });

      // Parsear respuesta JSON del modelo
      let parsedResponse = this.parseJSONResponse(response.output_text);
      
      // Si no es un array, intentar parsear como objeto único
      if (!Array.isArray(parsedResponse)) {
        try {
          parsedResponse = JSON.parse(response.output_text);
        } catch {
          // Si no es JSON válido, crear respuesta por defecto
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
      }

      // Si es un array, tomar el primer elemento
      if (Array.isArray(parsedResponse)) {
        parsedResponse = parsedResponse[0] || parsedResponse;
      }

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
        session.currentMomentIndex++;
        console.log(`💾 Avanzando al momento ${session.currentMomentIndex + 1}: ${session.momentos[session.currentMomentIndex]?.momento}`);
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
      console.error('Error en respuesta del docente especializado:', error.message);
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
   * @param {string} courseId - ID del curso
   * @param {string} sessionId - ID de la sesión
   * @returns {Promise<Array>} Array de momentos con su contenido
   */
  async getMomentosDelArchivo(courseId, sessionId) {
    try {
      // Iniciar sesión optimizada
      const sessionInfo = await this.startSession(courseId, sessionId);
      
      // Obtener la sesión para devolver los momentos
      const sessionKey = sessionInfo.sessionKey;
      const session = this.sessions.get(sessionKey);
      
      return session ? session.momentos : [];
    } catch (error) {
      console.error('Error recogiendo momentos del archivo:', error.message);
      return [];
    }
  }

  /**
   * El modelo actúa como docente especializado siguiendo los momentos (MÉTODO LEGACY - mantiene compatibilidad)
   * @param {string} courseId - ID del curso
   * @param {string} sessionId - ID de la sesión
   * @param {string} userMessage - Mensaje del estudiante
   * @param {Array} momentos - Momentos extraídos del archivo
   * @param {number} momentoActual - Índice del momento actual (0-based)
   * @returns {Promise<Object>} Respuesta del docente con información del progreso
   */
  async docenteEspecializadoResponde(courseId, sessionId, userMessage, momentos, momentoActual) {
    try {
      // Buscar sesión activa
      const sessionKey = `${courseId}-${sessionId}`;
      const session = this.sessions.get(sessionKey);
      
      if (!session) {
        // Si no hay sesión activa, iniciar una nueva
        await this.startSession(courseId, sessionId);
      }
      
      // Usar el método optimizado
      return await this.handleStudent(sessionKey, userMessage);
    } catch (error) {
      console.error('Error en respuesta del docente especializado:', error.message);
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

  // MÉTODOS DE VALIDACIÓN (mantenidos del original)
  validateContentTheme(fileId, expectedTheme, searchResults) {
    const themeKeywords = {
      'IPERC': ['iperc', 'identificación', 'peligros', 'evaluación', 'riesgos', 'control'],
      'Incendios': ['incendio', 'fuego', 'extintor', 'prevención', 'combustión', 'triángulo del fuego'],
      'Seguridad': ['seguridad', 'prevención', 'riesgo', 'protección', 'accidente']
    };

    const keywords = themeKeywords[expectedTheme] || [];
    const validResults = searchResults.filter(result => {
      const text = result.text.toLowerCase();
      const matches = keywords.filter(keyword => text.includes(keyword.toLowerCase()));
      return matches.length >= 1; // Al menos 1 palabra clave
    });

    return validResults.length > 0 ? validResults : searchResults.slice(0, 3);
  }

  async validateFileExists(vectorStoreId, fileId) {
    try {
      const files = await this.client.vectorStores.files.list(vectorStoreId);
      const fileExists = files.data.some(file => file.id === fileId);
      if (!fileExists) {
        throw new Error(`Archivo ${fileId} no encontrado en vector store ${vectorStoreId}`);
      }
    } catch (error) {
      console.error('Error validando archivo:', error.message);
      throw error;
    }
  }

  extractThemeFromSession(sessionName) {
    const sessionNameLower = sessionName.toLowerCase();
    if (sessionNameLower.includes('iperc')) return 'IPERC';
    if (sessionNameLower.includes('incendio')) return 'Incendios';
    return 'Seguridad';
  }

  validateMomentosTheme(momentos, expectedTheme) {
    if (!momentos || momentos.length === 0) {
      throw new Error(`No se encontraron momentos válidos para el tema ${expectedTheme}`);
    }
  }

    parseJSONResponse(responseText) {
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
      console.error('Error parseando JSON:', error.message);
      return [];
    }
  }

  // MÉTODOS DE GESTIÓN DE SESIONES (NUEVOS)
  getSessionInfo(sessionKey) {
    return this.sessions.get(sessionKey);
  }

  listActiveSessions() {
    return Array.from(this.sessions.keys()).map(key => {
      const session = this.sessions.get(key);
      return {
        sessionKey: key,
        course: session.course.name,
        session: session.session.name,
        currentMoment: session.momentos[session.currentMomentIndex]?.momento || 'N/A',
        progress: `${session.currentMomentIndex + 1}/${session.momentos.length}`,
        startTime: session.startTime,
        lastActivity: session.lastActivity
      };
    });
  }

  clearSession(sessionKey) {
    return this.sessions.delete(sessionKey);
  }

  clearAllSessions() {
    this.sessions.clear();
  }

  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      sessionsSize: this.sessions.size,
      activeSessions: this.sessions.size
    };
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = VectorStoreExtractor; 