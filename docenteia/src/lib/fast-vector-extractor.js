const { OpenAI } = require('openai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

class FastVectorExtractor {
  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.courseData = require('../data/courses-database.json');
    this.cache = new Map();
    // NUEVO: Gestión de sesiones tipo Redis
    this.sessions = new Map();
  }

  /**
   * Obtiene información del curso y sesión con validación
   * @param {string} courseId - ID del curso
   * @param {string} sessionId - ID de la sesión
   * @returns {Object} Información validada del curso y sesión
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
   * NUEVO: Inicia una sesión con fragmentos pre-calculados para máxima velocidad
   * @param {string} courseId - ID del curso
   * @param {string} sessionId - ID de la sesión
   * @returns {Promise<Object>} Información de la sesión iniciada
   */
  async startSession(courseId, sessionId) {
    try {
      const { vectorStoreId, fileId, fileName, course, session } = this.getCourseSessionInfo(courseId, sessionId);
      
      console.log(`🚀 Iniciando sesión optimizada: ${course.name} - ${session.name}`);
      console.log(`📁 Vector Store: ${vectorStoreId}`);
      console.log(`📄 Archivo: ${fileName} (${fileId})`);

      // Verificar que el archivo existe
      await this.validateFileExists(vectorStoreId, fileId);

      // Extraer tema esperado
      const expectedTheme = this.extractThemeFromSession(session.name);
      console.log(`🎯 Tema esperado: ${expectedTheme}`);

      // Extraer momentos una sola vez con gpt-4o para máxima precisión
      const momentos = await this.extractMomentosWithPrecision(vectorStoreId, fileId, fileName, course, session, expectedTheme);
      
      // Pre-calcular fragmentos para cada momento (optimización de velocidad)
      const fragmentos = await this.preCalculateFragmentos(vectorStoreId, momentos, expectedTheme);
      
      // Crear ID único de sesión
      const sessionKey = `${courseId}-${sessionId}`;
      
      // Almacenar estado de sesión
      const sessionState = {
        courseId,
        sessionId,
        vectorStoreId,
        fileId,
        fileName,
        course,
        session,
        momentos,
        fragmentos,
        index: 0, // Momento actual
        expectedTheme,
        createdAt: new Date()
      };
      
      this.sessions.set(sessionKey, sessionState);
      
      console.log(`✅ Sesión iniciada: ${momentos.length} momentos, ${fragmentos.length} fragmentos`);
      console.log(`💾 Estado guardado con clave: ${sessionKey}`);
      
      return {
        sessionKey,
        momentos: momentos.length,
        fragmentos: fragmentos.length,
        currentMoment: momentos[0]?.momento || 'N/A'
      };

    } catch (error) {
      console.error('Error iniciando sesión:', error.message);
      throw error;
    }
  }

  /**
   * NUEVO: Extrae momentos con máxima precisión usando gpt-4o
   */
  async extractMomentosWithPrecision(vectorStoreId, fileId, fileName, course, session, expectedTheme) {
    const userPrompt = `
Por favor, revisa el documento específico del curso "${course.name}" - sesión "${session.name}" (file_id: ${fileId}).
Extrae los **momentos clave** según los cuales el docente organiza su exposición.
Devuelve un JSON con el siguiente formato:

[
  { "momento": "INTRODUCCIÓN", "texto": "…", "file_id": "${fileId}"},
  { "momento": "CONCEPTOS CLAVE", "texto": "…", "file_id": "${fileId}"},
  ...
]

IMPORTANTE: Usa SOLO información del archivo ${fileName}. No incluyas contenido externo.
`;

    const response = await this.client.responses.create({
      model: "gpt-4o",
      instructions: `Eres un sistema que identifica secciones pedagógicas clave en documentos específicos. Usa SOLO la información del archivo con file_id="${fileId}".`,
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
    this.validateMomentosTheme(momentos, expectedTheme);
    
    return momentos;
  }

  /**
   * NUEVO: Pre-calcula fragmentos para cada momento (optimización de velocidad)
   */
  async preCalculateFragmentos(vectorStoreId, momentos, expectedTheme) {
    console.log(`⚡ Pre-calculando fragmentos para ${momentos.length} momentos...`);
    
    const fragmentos = await Promise.all(momentos.map(async (momento, index) => {
      try {
        // Búsqueda semántica para el momento específico
        const searchResults = await this.client.vectorStores.search(vectorStoreId, {
          query: `${momento.momento} ${momento.texto?.substring(0, 100) || ''}`
        });

        // Filtrar por relevancia temática
        const validResults = searchResults.data.filter(result => {
          const content = result.text || '';
          const themeKeywords = {
            'IPERC': ['peligro', 'riesgo', 'control', 'identificación'],
            'Incendios': ['incendio', 'fuego', 'prevención', 'extintor'],
            'Perforación': ['perforación', 'equipo', 'mantenimiento']
          };
          
          const keywords = themeKeywords[expectedTheme] || [];
          const matches = keywords.filter(keyword => 
            content.toLowerCase().includes(keyword.toLowerCase())
          );
          
          return matches.length >= 1;
        });

        const bestResult = validResults[0] || searchResults.data[0];
        
        return {
          momento: momento.momento,
          fragmento: bestResult?.text || momento.texto || '',
          score: bestResult?.score || 0,
          index
        };
      } catch (error) {
        console.warn(`⚠️ Error pre-calculando fragmento para momento ${index}:`, error.message);
        return {
          momento: momento.momento,
          fragmento: momento.texto || '',
          score: 0,
          index
        };
      }
    }));

    console.log(`✅ ${fragmentos.length} fragmentos pre-calculados`);
    return fragmentos;
  }

  /**
   * NUEVO: Maneja la interacción del estudiante con estado de sesión
   * @param {string} sessionKey - Clave de la sesión
   * @param {string} studentMsg - Mensaje del estudiante
   * @returns {Promise<Object>} Respuesta del docente
   */
  async handleStudent(sessionKey, studentMsg) {
    try {
      const session = this.sessions.get(sessionKey);
      if (!session) {
        throw new Error(`Sesión ${sessionKey} no encontrada`);
      }

      const { course, session: sessionInfo, momentos, fragmentos, index, expectedTheme } = session;
      
      console.log(`🎓 ${course.specialist_role} respondiendo en ${sessionInfo.name}`);
      console.log(`📊 Progreso: Momento ${index + 1}/${momentos.length}`);

      // Obtener momento y fragmento actual
      const momentoActual = momentos[index];
      const fragmentoActual = fragmentos[index];
      const siguienteMomento = momentos[index + 1];

      if (!momentoActual) {
        throw new Error('Momento actual no encontrado');
      }

      // Construir contexto de momentos
      const momentosContext = momentos.map((momento, i) => {
        const status = i === index ? 'ACTUAL' : 
                      i < index ? 'COMPLETADO' : 'PENDIENTE';
        return `${i + 1}. ${momento.momento} (${status})`;
      }).join('\n');

      // System prompt optimizado
      const systemPrompt = `Eres un ${course.specialist_role} que está enseñando la sesión "${sessionInfo.name}" del curso "${course.name}".

OBJETIVO DE APRENDIZAJE: ${sessionInfo.learning_objective}

PUNTOS CLAVE:
${sessionInfo.key_points.map(point => `- ${point}`).join('\n')}

ESTRUCTURA DE MOMENTOS:
${momentosContext}

MOMENTO ACTUAL: ${momentoActual.momento}
INFORMACIÓN REAL DEL ARCHIVO: "${fragmentoActual.fragmento}"

PERSONALIDAD PEDAGÓGICA:
- Usa metodología "Teach Like a Champion"
- Construye sobre respuestas parciales del estudiante
- Usa "Right is Right" y "Stretch It"
- NUNCA dar definiciones directas
- Construir conocimiento inductivamente

IMPORTANTE: Usa SOLO la información proporcionada. No agregues teoría externa.`;

      // Respuesta rápida con gpt-3.5-turbo
      const completion = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Estudiante dice: "${studentMsg}"

MOMENTO ACTUAL: ${momentoActual.momento}
PROGRESO: ${index + 1}/${momentos.length}

Responde como ${course.specialist_role} siguiendo la metodología especificada.
Usa SOLO la información del fragmento proporcionado.

Responde en formato JSON:
{
  "respuesta": "Respuesta del docente",
  "momento_actual": "${momentoActual.momento}",
  "progreso": ${index + 1},
  "total_momentos": ${momentos.length},
  "debe_avanzar": true/false,
  "razon_avance": "Razón por la que debe o no avanzar",
  "siguiente_momento": "${siguienteMomento ? siguienteMomento.momento : 'FIN'}"
}`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      // Parsear respuesta
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(completion.choices[0].message.content);
      } catch {
        parsedResponse = {
          respuesta: completion.choices[0].message.content,
          momento_actual: momentoActual.momento,
          progreso: index + 1,
          total_momentos: momentos.length,
          debe_avanzar: false,
          razon_avance: "Respuesta no estructurada",
          siguiente_momento: siguienteMomento ? siguienteMomento.momento : 'FIN'
        };
      }

      // Avanzar automáticamente si debe avanzar
      if (parsedResponse.debe_avanzar && index < momentos.length - 1) {
        session.index = index + 1;
        console.log(`🔄 Avanzando al momento ${session.index + 1}: ${momentos[session.index]?.momento}`);
      }
      
      return {
        ...parsedResponse,
        sessionKey,
        momentoActual: index,
        momentos: momentos.length,
        fragmentoScore: fragmentoActual.score
      };

    } catch (error) {
      console.error('Error manejando estudiante:', error.message);
      return {
        respuesta: "Lo siento, tuve un problema. ¿Podrías reformular tu pregunta?",
        momento_actual: 'ERROR',
        progreso: 0,
        total_momentos: 0,
        debe_avanzar: false,
        razon_avance: "Error en el sistema",
        siguiente_momento: 'ERROR',
        sessionKey,
        momentoActual: 0,
        momentos: 0
      };
    }
  }

  /**
   * MÉTODOS LEGACY: Mantener compatibilidad
   */
  async getMomentosDelArchivo(courseId, sessionId) {
    const sessionKey = `${courseId}-${sessionId}`;
    const session = this.sessions.get(sessionKey);
    
    if (session) {
      return session.momentos;
    }
    
    // Si no existe sesión, iniciar una nueva
    await this.startSession(courseId, sessionId);
    return this.sessions.get(sessionKey).momentos;
  }

  async docenteEspecializadoResponde(courseId, sessionId, userMessage, momentos, momentoActual) {
    const sessionKey = `${courseId}-${sessionId}`;
    const session = this.sessions.get(sessionKey);
    
    if (!session) {
      // Iniciar sesión si no existe
      await this.startSession(courseId, sessionId);
    }
    
    // Actualizar índice si es diferente
    if (session && session.index !== momentoActual) {
      session.index = momentoActual;
    }
    
    return this.handleStudent(sessionKey, userMessage);
  }

  /**
   * NUEVO: Obtener información de sesión
   */
  getSessionInfo(sessionKey) {
    const session = this.sessions.get(sessionKey);
    if (!session) return null;
    
    return {
      courseId: session.courseId,
      sessionId: session.sessionId,
      courseName: session.course.name,
      sessionName: session.session.name,
      currentMoment: session.momentos[session.index]?.momento,
      progress: session.index + 1,
      totalMoments: session.momentos.length,
      createdAt: session.createdAt
    };
  }

  /**
   * NUEVO: Listar todas las sesiones activas
   */
  listActiveSessions() {
    const activeSessions = [];
    for (const [sessionKey, session] of this.sessions) {
      activeSessions.push({
        sessionKey,
        ...this.getSessionInfo(sessionKey)
      });
    }
    return activeSessions;
  }

  /**
   * NUEVO: Limpiar sesión específica
   */
  clearSession(sessionKey) {
    const deleted = this.sessions.delete(sessionKey);
    if (deleted) {
      console.log(`✅ Sesión ${sessionKey} eliminada`);
    }
    return deleted;
  }

  /**
   * NUEVO: Limpiar todas las sesiones
   */
  clearAllSessions() {
    const count = this.sessions.size;
    this.sessions.clear();
    console.log(`✅ ${count} sesiones eliminadas`);
    return count;
  }

  // MÉTODOS DE VALIDACIÓN (mantener los existentes)
  validateContentTheme(fileId, expectedTheme, searchResults) {
    if (!searchResults || searchResults.length === 0) {
      console.log(`⚠️ No se encontraron resultados para validar tema`);
      return false;
    }

    const themeKeywords = {
      'IPERC': ['peligro', 'riesgo', 'control', 'identificación', 'evaluación'],
      'Incendios': ['incendio', 'fuego', 'prevención', 'extintor', 'evacuación'],
      'Perforación': ['perforación', 'equipo', 'mantenimiento', 'técnica', 'fundamento']
    };

    const keywords = themeKeywords[expectedTheme] || [];
    const content = searchResults.map(r => r.text || '').join(' ').toLowerCase();
    
    const keywordMatches = keywords.filter(keyword => 
      content.includes(keyword.toLowerCase())
    );

    const matchPercentage = (keywordMatches.length / keywords.length) * 100;
    const isValid = matchPercentage >= 60;

    console.log(`🔍 Validación de tema: ${expectedTheme}`);
    console.log(`📊 Coincidencias: ${keywordMatches.length}/${keywords.length} (${matchPercentage.toFixed(1)}%)`);
    console.log(`✅ Contenido válido: ${isValid}`);

    return isValid;
  }

  async validateFileExists(vectorStoreId, fileId) {
    try {
      const files = await this.client.vectorStores.files.list(vectorStoreId);
      const fileExists = files.data.some(file => file.id === fileId);
      
      if (!fileExists) {
        throw new Error(`Archivo ${fileId} no encontrado en el vector store ${vectorStoreId}`);
      }
      
      console.log(`✅ Archivo ${fileId} validado en vector store`);
    } catch (error) {
      console.error('Error validando archivo:', error.message);
      throw error;
    }
  }

  extractThemeFromSession(sessionName) {
    if (sessionName.includes('IPERC')) return 'IPERC';
    if (sessionName.includes('Incendios')) return 'Incendios';
    if (sessionName.includes('Perforación')) return 'Perforación';
    return 'General';
  }

  validateMomentosTheme(momentos, expectedTheme) {
    const themeKeywords = {
      'IPERC': ['peligro', 'riesgo', 'control'],
      'Incendios': ['incendio', 'fuego', 'prevención'],
      'Perforación': ['perforación', 'equipo', 'mantenimiento']
    };

    const keywords = themeKeywords[expectedTheme] || [];
    const momentosText = momentos.map(m => m.texto || '').join(' ').toLowerCase();
    
    const keywordMatches = keywords.filter(keyword => 
      momentosText.includes(keyword.toLowerCase())
    );

    if (keywordMatches.length === 0) {
      console.warn(`⚠️ Los momentos extraídos no contienen palabras clave del tema ${expectedTheme}`);
    } else {
      console.log(`✅ Momentos validados para tema ${expectedTheme}`);
    }
  }

  parseJSONResponse(responseText) {
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error parseando JSON:', error.message);
      return [];
    }
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      sessions: this.sessions.size
    };
  }

  clearCache() {
    this.cache.clear();
    console.log('✅ Cache limpiado');
  }
}

module.exports = FastVectorExtractor; 