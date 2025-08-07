import { SessionData } from '../core/types';
import { Logger } from '../utils/Logger';
import { ResponseTemplates } from './ResponseTemplates';

export class InstructionsBuilder {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('InstructionsBuilder');
  }

  /**
   * 🎯 CONSTRUIR INSTRUCCIONES INICIALES
   */
  buildInitialInstructions(sessionData: SessionData): string {
    const firstMoment = sessionData.momentos[0];
    
    // 🆕 Usar templates variados para evitar repeticiones
    const usedTemplates = sessionData.respuestasAnteriores || [];
    
    // Debug: verificar el objetivo
    console.log('DEBUG - learning_objective:', sessionData.session.learning_objective);
    console.log('DEBUG - session data:', sessionData.session);
    
    const greeting = ResponseTemplates.generateInitialGreeting(
      sessionData.course.specialist_role,
      this.extractTopic(sessionData.session.learning_objective),
      usedTemplates
    );
    
    const objective = ResponseTemplates.generateObjectivePresentation(
      sessionData.session.learning_objective || "aprender sobre procedimientos de seguridad",
      "aplicar estos conocimientos en situaciones reales",
      usedTemplates
    );
    
    const question = ResponseTemplates.generateQuestion(
      sessionData.preguntasPendientes[0] || 'Sin preguntas',
      usedTemplates
    );
    
    return `
Eres un ${sessionData.course.specialist_role} cálido y profesional.

=== CONTEXTO ===
OBJETIVO: ${sessionData.session.learning_objective}
PRIMER MOMENTO: ${firstMoment?.momento || 'Inicio'}

🎯 SECUENCIA OBLIGATORIA:
1. Saludo: "${greeting}"
2. Objetivo: "${objective}"
3. Pregunta: "${question}"

🚨 REGLAS CRÍTICAS:
- USA EXACTAMENTE los templates proporcionados
- NO modifiques las frases de saludo, objetivo o pregunta
- Mantén la estructura pero varía el contenido
- EVITA repetir frases exactas de respuestas anteriores
- IMPORTANTE: El objetivo debe ser claro y completo, no "undefined"

${this.buildResponseFormat(sessionData, firstMoment)}
`;
  }

  /**
   * 🎯 CONSTRUIR INSTRUCCIONES SEGÚN ACCIÓN
   */
  buildInstructions(sessionData: SessionData, action: string, message: string): string {
    const currentMoment = sessionData.momentos[sessionData.currentMomentIndex];
    
    const baseInstructions = this.buildBaseInstructions(sessionData, currentMoment, message);
    const actionInstructions = this.buildActionInstructions(action, sessionData, currentMoment);
    const responseFormat = this.buildResponseFormat(sessionData, currentMoment);
    
    return `${baseInstructions}\n\n${actionInstructions}\n\n${responseFormat}`;
  }

  /**
   * 🔧 INSTRUCCIONES BASE
   */
  private buildBaseInstructions(sessionData: SessionData, currentMoment: any, message: string): string {
    const interactionCount = sessionData.contadorInteracciones || 0;
    const previousResponses = sessionData.respuestasAnteriores || [];
    
    return `
Eres un ${sessionData.course.specialist_role} experto y pedagógico.

=== CONTEXTO ===
OBJETIVO: ${sessionData.session.learning_objective}
MOMENTO: ${currentMoment.momento}
PROGRESO: ${sessionData.currentMomentIndex + 1}/${sessionData.momentos.length}
INTERACCIONES: ${interactionCount}

=== ESTADO ===
PREGUNTAS PENDIENTES: ${sessionData.preguntasPendientes.length}
${sessionData.preguntasPendientes.map((p: string, i: number) => `${i+1}. ${p}`).join('\n')}

PREGUNTAS RESPONDIDAS: ${sessionData.preguntasRespondidas.length}

=== MENSAJE DEL ESTUDIANTE ===
"${message}"

🚨 RESTRICCIONES CRÍTICAS PARA EVITAR REPETICIONES:
- NUNCA menciones deportes, entretenimiento o temas personales
- SIEMPRE mantén el foco en el tema educativo de la sesión
- Si el estudiante menciona temas no relacionados, redirige educadamente al tema de la sesión
- EVITA repetir frases exactas de respuestas anteriores
- VARÍA tu vocabulario y estructura de oraciones
- Usa diferentes ejemplos y analogías en cada respuesta
- Cambia el tono y estilo según el número de interacciones
- NO uses las mismas palabras de apertura o cierre repetidamente
- Adapta tu respuesta al contexto específico del momento actual

💡 ESTRATEGIAS DE VARIACIÓN:
- Interacción ${interactionCount}: ${this.getVariationStrategy(interactionCount)}
- Usa sinónimos y diferentes formas de expresar la misma idea
- Varía la longitud y complejidad de tus respuestas
- Incluye diferentes tipos de ejemplos (prácticos, teóricos, casos reales)
`;
  }

  /**
   * 🔧 INSTRUCCIONES POR ACCIÓN
   */
  private buildActionInstructions(action: string, sessionData: SessionData, currentMoment: any): string {
    switch (action) {
      case 'NARRATE_CONTENT':
        return this.buildNarrationInstructions(currentMoment);
        
      case 'HELP_STUDENT':
        return this.buildHelpInstructions(sessionData);
        
      case 'CONTINUE_QUESTIONS':
        return this.buildContinueInstructions(sessionData);
        
      case 'ADVANCE_MOMENT':
        return this.buildAdvanceInstructions(sessionData);
        
      default:
        return this.buildGenericInstructions();
    }
  }

  private buildNarrationInstructions(currentMoment: any): string {
    const content = this.getContentToNarrate(currentMoment);
    
    return `
🚨 NARRAR CONTENIDO OBLIGATORIO:

${content}

🎯 SECUENCIA:
1. Narra el contenido COMPLETO de manera única y variada
2. Explica de manera pedagógica usando diferentes enfoques
3. SOLO DESPUÉS haz la primera pregunta pendiente

⚠️ REGLAS:
- debe_avanzar = false
- NUNCA hagas preguntas antes de narrar
- EVITA repetir ejemplos o información ya mencionada
- Usa diferentes perspectivas y enfoques en cada narración
- Mantén el interés con variedad en el lenguaje y ejemplos

`;
  }

  private buildHelpInstructions(sessionData: SessionData): string {
    const currentQuestion = sessionData.preguntasPendientes[0] || 'Sin pregunta';
    
    return `
🎯 AYUDAR AL ESTUDIANTE:

PREGUNTA ACTUAL: "${currentQuestion}"

💡 ESTRATEGIAS:
- Sé empático y motivador
- Usa analogías simples
- Proporciona ejemplos
- Divide la pregunta en partes más simples

⚠️ REGLAS:
- debe_avanzar = false
- NUNCA critiques
- Termina repitiendo la pregunta de forma más simple
`;
  }

  private buildContinueInstructions(sessionData: SessionData): string {
    const nextQuestion = sessionData.preguntasPendientes[0] || 'Sin más preguntas';
    
    return `
🎯 CONTINUAR CON PREGUNTAS:

- Reconoce positivamente la respuesta del estudiante
- Haz la siguiente pregunta: "${nextQuestion}"

⚠️ REGLAS:
- debe_avanzar = false (aún hay preguntas)
- NO inventes preguntas nuevas
`;
  }

  private buildAdvanceInstructions(sessionData: SessionData): string {
    const nextMoment = sessionData.momentos[sessionData.currentMomentIndex + 1];
    
    return `
🎯 AVANZAR AL SIGUIENTE MOMENTO:

- Felicita al estudiante
- Resume lo aprendido brevemente
- ${nextMoment ? `Introduce: "${nextMoment.momento}"` : 'Sesión completada'}

⚠️ REGLAS:
- debe_avanzar = true (OBLIGATORIO)
- preguntas_pendientes = 0
`;
  }

  private buildGenericInstructions(): string {
    return `
🎯 CONTINUAR CON LA PEDAGOGÍA:

- Evalúa la respuesta del estudiante
- Proporciona feedback constructivo
- Guía hacia el aprendizaje

⚠️ REGLAS:
- Sé empático y constructivo
- Adapta tu respuesta al contexto
`;
  }

  /**
   * 🔧 MÉTODOS AUXILIARES
   */
  private extractTopic(learningObjective: string | undefined): string {
    // Extraer el tema principal del objetivo de aprendizaje
    const topics = [
      'procedimientos de seguridad',
      'seguridad industrial',
      'prevención de riesgos',
      'equipos de protección',
      'normativas de seguridad',
      'primeros auxilios',
      'evacuación de emergencias',
      'operación de equipos'
    ];
    
    // Validar que learningObjective no sea undefined
    if (!learningObjective) {
      return 'seguridad y salud ocupacional';
    }
    
    const lowerObjective = learningObjective.toLowerCase();
    for (const topic of topics) {
      if (lowerObjective.includes(topic)) {
        return topic;
      }
    }
    
    return 'seguridad y salud ocupacional';
  }

  private getVariationStrategy(interactionCount: number): string {
    const strategies = [
      'Usa un tono más directo y técnico',
      'Incluye más ejemplos prácticos',
      'Sé más conversacional y amigable',
      'Enfócate en la aplicación práctica',
      'Usa analogías y comparaciones',
      'Sé más detallado y específico',
      'Incluye preguntas reflexivas',
      'Usa un enfoque más estructurado',
      'Sé más motivacional y alentador',
      'Enfócate en los beneficios y resultados'
    ];
    
    return strategies[interactionCount % strategies.length] || 'Mantén un tono profesional y pedagógico';
  }

  private getContentToNarrate(moment: any): string {
    if (moment.historia) {
      return `📖 HISTORIA: "${moment.historia}"`;
    }
    if (moment.caso) {
      return `📋 CASO: "${moment.caso}"`;
    }
    if (moment.contenido_tecnico) {
      return `🔧 CONTENIDO TÉCNICO:\n${moment.contenido_tecnico.map((item: string, i: number) => `${i+1}. ${item}`).join('\n')}`;
    }
    return 'Sin contenido especial';
  }

  private buildResponseFormat(sessionData: SessionData, currentMoment: any): string {
    const nextMoment = sessionData.momentos[sessionData.currentMomentIndex + 1];
    
    return `
=== FORMATO DE RESPUESTA JSON ===
{
  "respuesta": "Tu respuesta pedagógica aquí",
  "momento_actual": "${currentMoment?.momento || 'N/A'}",
  "progreso": ${sessionData.currentMomentIndex + 1},
  "total_momentos": ${sessionData.momentos.length},
  "debe_avanzar": false, // Cambiar según corresponda
  "razon_avance": "Explicar por qué avanza o no",
  "siguiente_momento": "${nextMoment?.momento || 'Sesión completada'}",
  "preguntas_pendientes": ${sessionData.preguntasPendientes.length},
  "preguntas_respondidas": ${sessionData.preguntasRespondidas.length}
}

🚨 RESPONDE SOLO EN FORMATO JSON VÁLIDO
`;
  }
}
