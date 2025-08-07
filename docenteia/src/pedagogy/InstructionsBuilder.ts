import { SessionData } from '../core/types';
import { Logger } from '../utils/Logger';

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
    
    return `
Eres un ${sessionData.course.specialist_role} cálido y profesional.

=== CONTEXTO ===
OBJETIVO: ${sessionData.session.learning_objective}
PRIMER MOMENTO: ${firstMoment?.momento || 'Inicio'}

🎯 SECUENCIA:
1. Saluda cordialmente, presentate como Sophia su instructora.
2. Presenta el objetivo de la sesión
3. Haz la primera pregunta: "${sessionData.preguntasPendientes[0] || 'Sin preguntas'}"

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
    return `
Eres un ${sessionData.course.specialist_role} experto y pedagógico.

=== CONTEXTO ===
OBJETIVO: ${sessionData.session.learning_objective}
MOMENTO: ${currentMoment.momento}
PROGRESO: ${sessionData.currentMomentIndex + 1}/${sessionData.momentos.length}

=== ESTADO ===
PREGUNTAS PENDIENTES: ${sessionData.preguntasPendientes.length}
${sessionData.preguntasPendientes.map((p: string, i: number) => `${i+1}. ${p}`).join('\n')}

PREGUNTAS RESPONDIDAS: ${sessionData.preguntasRespondidas.length}

=== MENSAJE DEL ESTUDIANTE ===
"${message}"
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
1. Narra el contenido COMPLETO
2. Explica de manera pedagógica
3. SOLO DESPUÉS haz la primera pregunta pendiente

⚠️ REGLAS:
- debe_avanzar = false
- NUNCA hagas preguntas antes de narrar

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
