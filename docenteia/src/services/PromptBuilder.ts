import { PromptParams, UserPromptContext } from '../types';

export class PromptBuilder {
  /**
   * Mensaje de "espíritu" que se envía solo al inicio de la sesión
   */
  static buildSpiritPrompt(params: { specialistRole: string; sessionName: string; courseName: string; learningObjective: string }): string {
    return `Eres un **${params.specialistRole}** que imparte la sesión **"${params.sessionName}"** del curso **"${params.courseName}"**.

🧭 PROPÓSITO PEDAGÓGICO:
Tu misión es que el estudiante:
- **Comprenda y aplique** los conceptos clave de esta sesión
- **Relacione la teoría** con ejemplos concretos y casos prácticos
- **Desarrolle habilidades** que pueda aplicar en situaciones reales
- **Al final de la sesión** sea capaz de demostrar lo aprendido

OBJETIVO DE APRENDIZAJE:
${params.learningObjective}

📋 TU ROL COMO DOCENTE:
- Actúas como si siguieras un **guion pedagógico estricto**
- **NO improvises** preguntas ni te saltes pasos
- Usa un tono **cercano, claro y docente**
- Construye conocimiento **inductivamente**
- Valida y corrige respuestas **constructivamente**
- **NO des definiciones directas** - guía al descubrimiento

✋ Espera a que empiece el turno del estudiante antes de preguntar cualquier cosa.`.trim();
  }

  private static readonly BASE_PROMPT = `Eres un especialista docente que usa metodología "Teach Like a Champion".

PERSONALIDAD PEDAGÓGICA:
- Construye sobre respuestas parciales del estudiante
- Usa "Right is Right" y "Stretch It"
- NUNCA dar definiciones directas
- Construir conocimiento inductivamente
- Validar y corregir respuestas constructivamente

TU TAREA COMO DOCENTE:
1. Mantener al estudiante enfocado en el momento actual
2. Usar el contenido del momento actual y fragmentos para responder
3. Guiar al estudiante hacia el siguiente momento cuando esté listo
4. Evaluar si el estudiante está preparado para avanzar
5. Proporcionar retroalimentación constructiva`;

  /**
   * Obtiene el contenido apropiado del momento según su tipo
   */
    private static getMomentoContent(momento: any): string {
    if (!momento) return 'N/A';

    const momentoName = momento.momento?.toLowerCase() || '';

    // Para Conexión, mostrar la historia
    if (momentoName.includes('conexión') && momento.historia) {
      return `HISTORIA: ${momento.historia}`;
    }

    // Para Adquisición, mostrar el contenido técnico
    if (momentoName.includes('adquisición') && momento.contenido_tecnico) {
      const contenido = Array.isArray(momento.contenido_tecnico)
        ? momento.contenido_tecnico.join('\n')
        : momento.contenido_tecnico;
      return `CONTENIDO TÉCNICO:\n${contenido}`;
    }

    // Para Aplicación, mostrar el caso
    if (momentoName.includes('aplicación') && momento.caso) {
      return `CASO PRÁCTICO: ${momento.caso}`;
    }

    // Para otros momentos, mostrar las instrucciones
    // Algunos archivos usan clave con espacio, otros con guion bajo
    const instruccionesDocente = (momento as any)["instrucciones docenteia"] 
      ?? momento.instrucciones_docenteia;
    
    if (typeof instruccionesDocente === 'string' && instruccionesDocente.trim().length > 0) {
      return `INSTRUCCIONES: ${instruccionesDocente}`;
    }

    return 'N/A';
  }

  /**
   * Construye el prompt del sistema optimizado con guion específico por momento
   */
  static buildSystemPrompt(params: PromptParams): string {
    const momentoActual = params.momentos[params.currentIndex];
    const siguiente = params.currentIndex < params.momentos.length - 1
      ? params.momentos[params.currentIndex + 1].momento
      : 'FIN';

    // Solo incluir puntos clave más esenciales (máximo 3)
    const keyPointsList = params.keyPoints
      .slice(0, 3)
      .map((point, idx) => `${idx + 1}. ${point}`)
      .join('\n');

    // Obtener preguntas específicas del momento actual
    const preguntas = momentoActual?.preguntas || [];
    const preguntasTexto = preguntas
      .map((p, idx) => `  ${idx + 1}. ${p}`)
      .join('\n');

    // Contenido específico del momento (historia, contenido técnico, caso, etc.)
    const contenido = this.getMomentoContent(momentoActual);

    return `**GUION DEL MOMENTO: ${momentoActual?.momento || 'N/A'}**
Sesión: "${params.sessionName}" (Curso: ${params.courseName})

**OBJETIVO DE APRENDIZAJE:**
${params.learningObjective}

**PUNTOS CLAVE:**
${keyPointsList}

**MOMENTO ACTUAL:** ${momentoActual?.momento || 'N/A'}
**SIGUIENTE MOMENTO:** ${siguiente}

**CONTENIDO DEL MOMENTO:**
${contenido}

📋 **INSTRUCCIONES ESTRICTAS:**
1. Haz exactamente TODAS las preguntas listadas a continuación, **en ese orden**, sin saltear ni improvisar otras.
2. Después de cada respuesta del estudiante, **comenta brevemente** (1 o 2 frases) reconociendo el avance.
3. No avances al siguiente momento hasta que todas las preguntas estén completamente respondidas.
4. Si la respuesta del estudiante no cubre algún punto, **repregunta con una pista** centrándote en lo que falta.
5. Usa un tono **cercano y docente**, como si estuvieras dando clase frente a un estudiante real.
6. No otorgues información del siguiente momento.

**PREGUNTAS DEL MOMENTO:**
${preguntasTexto}

💡 **IMPORTANTE:** Si el estudiante no responde o responde parcialmente, insiste antes de avanzar.`.trim();
  }

  /**
   * Construye el prompt del usuario optimizado
   */
  static buildUserPrompt(studentMessage: string, context: UserPromptContext): string {
    const [progresoActual, totalMomentos] = context.progress.split('/');
    
    return `Estudiante: "${studentMessage}"

Responde en JSON:
{
  "respuesta": "Respuesta del docente",
  "momento_actual": "${context.currentMoment}",
  "progreso": ${progresoActual},
  "total_momentos": ${totalMomentos},
  "debe_avanzar": false,
  "razon_avance": "Razón del avance",
  "siguiente_momento": "MOMENTO_X"
}`;
  }

  /**
   * Carga el archivo de sesión según el curso y sesión
   */
  static async loadSessionFile(courseId: string, sessionId: string): Promise<any> {
    try {
      const sessionFileName = `${courseId}_${sessionId}.json`;
      
      // Intentar múltiples rutas posibles para import dinámico
      const possiblePaths = [
        `../data/sessions/${sessionFileName}`,
        `../../data/sessions/${sessionFileName}`,
        `../../../data/sessions/${sessionFileName}`
      ];
      
      let sessionData: any = null;
      let lastError: any = null;
      
      for (const sessionPath of possiblePaths) {
        try {
          sessionData = await import(sessionPath);
          console.log(`✅ Sesión cargada desde: ${sessionPath}`);
          break;
        } catch (error) {
          lastError = error;
          continue;
        }
      }
      
      if (!sessionData) {
        throw lastError || new Error(`No se pudo cargar la sesión ${courseId}_${sessionId}`);
      }
      
      return sessionData.default || sessionData;
    } catch (error) {
      console.error(`Error cargando sesión ${courseId}_${sessionId}:`, error);
      throw new Error(`No se pudo cargar la sesión ${courseId}_${sessionId}`);
    }
  }

  /**
   * Obtiene la información de la sesión desde el archivo JSON
   */
  static async getSessionData(courseId: string, sessionId: string): Promise<{
    curso: string;
    sesion: string;
    nombre: string;
    objetivo: string;
    momentos: any[];
  }> {
    const sessionData = await this.loadSessionFile(courseId, sessionId);
    
    return {
      curso: sessionData.curso,
      sesion: sessionData.sesion,
      nombre: sessionData.nombre,
      objetivo: sessionData.objetivo,
      momentos: sessionData.momentos || []
    };
  }
} 