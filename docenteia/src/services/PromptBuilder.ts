import { PromptParams, UserPromptContext, Moment } from '../types';

export class PromptBuilder {
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
   * Construye el prompt del sistema optimizado
   */
  static buildSystemPrompt(params: PromptParams): string {
    const momentosContext = params.momentos.map((m, idx) => {
      const estado = idx < params.currentIndex ? 'COMPLETADO' : 
                    (idx === params.currentIndex ? 'ACTUAL' : 'PENDIENTE');
      return `${idx + 1}. ${m.momento} (${estado})`;
    }).join('\n');

    const fragmentosContext = params.fragmentos
      .map((frag, idx) => `Fragmento ${idx + 1}: ${frag.texto.substring(0, 150)}...`)
      .join('\n');

    return `${this.BASE_PROMPT}

Eres un ${params.specialistRole} enseñando "${params.sessionName}" del curso "${params.courseName}".
OBJETIVO: ${params.learningObjective}

PUNTOS CLAVE:
${params.keyPoints.map(p => `- ${p}`).join('\n')}

ESTRUCTURA:
${momentosContext}

MOMENTO ACTUAL: ${params.momentos[params.currentIndex].momento}
CONTENIDO: ${params.momentos[params.currentIndex].texto}

FRAGMENTOS:
${fragmentosContext}`.trim();
  }

  /**
   * Construye el prompt del usuario optimizado
   */
  static buildUserPrompt(studentMessage: string, context: UserPromptContext): string {
    return `Estudiante dice: "${studentMessage}"

MOMENTO ACTUAL: ${context.currentMoment}
PROGRESO: ${context.progress}

IMPORTANTE: Responde ÚNICAMENTE en formato JSON válido:
{
  "respuesta": "Respuesta del docente",
  "momento_actual": "${context.currentMoment}",
  "debe_avanzar": true/false,
  "razon_avance": "Razón del avance"
}`;
  }

  /**
   * Construye prompt para extracción de momentos
   */
  static buildMomentosExtractionPrompt(courseName: string, sessionName: string, fileId: string): string {
    return `IMPORTANTE: Responde ÚNICAMENTE con un JSON válido, sin texto adicional.

Revisa el documento adjunto del curso "${courseName}" - sesión "${sessionName}" y extrae exactamente 6 momentos clave según la estructura pedagógica estándar.

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

Extrae el contenido real del documento para cada momento. No inventes contenido.`;
  }
} 