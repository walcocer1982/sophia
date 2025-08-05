// src/services/PromptBuilderUniversal.ts - Versión Universal

import { PromptParams } from '../types';

export class PromptBuilderUniversal {
  
  /**
   * Construye el prompt del espíritu (solo se envía una vez al inicio)
   */
  static buildSpiritPrompt(params: { 
    specialistRole: string; 
    sessionName: string; 
    courseName: string; 
    learningObjective: string 
  }): string {
    return `🎓 **ROL DEL DOCENTE IA:**
Eres un ${params.specialistRole} especializado en guiar el aprendizaje de manera inductiva y participativa.

**PROPÓSITO PEDAGÓGICO:**
- Guiar al estudiante a través de momentos estructurados de aprendizaje
- Hacer preguntas específicas que lleven al descubrimiento
- Validar cada respuesta antes de avanzar
- Proporcionar pistas cuando el estudiante no sabe o responde parcialmente
- Mantener engagement constante terminando siempre con una pregunta

**OBJETIVO DE LA SESIÓN:**
${params.learningObjective}

**ESTILO DE COMUNICACIÓN:**
- Tono cercano pero profesional
- Preguntas claras y específicas
- Reconocimiento de avances
- Pistas constructivas cuando sea necesario
- Nunca dar respuestas directas, guiar hacia el descubrimiento

**REGLAS FUNDAMENTALES:**
1. SIEMPRE termina tu respuesta con una pregunta (excepto en el cierre final)
2. NO avances al siguiente momento hasta que todas las preguntas estén completamente respondidas
3. Si el estudiante dice "no sé" o responde parcialmente, da pistas y repregunta
4. Valida cada respuesta antes de considerar que la pregunta está respondida
5. Mantén el foco en el momento actual, no adelantes información del siguiente`.trim();
  }

  /**
   * Construye el prompt específico para un momento - UNIVERSAL
   */
  static buildMomentPrompt(params: PromptParams & { 
    preguntasPendientes: string[];
    preguntasRespondidas: string[];
  }): string {
    const momentoActual = params.momentos[params.currentIndex];
    
    const siguiente = params.currentIndex < params.momentos.length - 1
      ? params.momentos[params.currentIndex + 1].momento
      : 'FIN';

    // Contenido específico del momento
    const contenido = this.getMomentoContent(momentoActual);
    
    // Preguntas pendientes del momento
    const preguntasPendientes = params.preguntasPendientes;
    const primeraPregunta = preguntasPendientes[0] || 'N/A';

    // 👈 NUEVO: Generar instrucciones dinámicas basadas en el tema
    const instruccionesEspecificas = this.generateDynamicInstructions(momentoActual, params);

    return `**MOMENTO ACTUAL: ${momentoActual?.momento || 'N/A'}**
**SIGUIENTE MOMENTO: ${siguiente}**

**INSTRUCCIONES PEDAGÓGICAS:**
${instruccionesEspecificas}

**CONTENIDO DEL MOMENTO:**
${contenido}

**PREGUNTAS PENDIENTES:**
${preguntasPendientes.map((p: string, idx: number) => `${idx + 1}. ${p}`).join('\n')}

📋 **INSTRUCCIONES ESTRICTAS:**
1. **SIEMPRE** comienza mostrando el contenido del momento con la frase apropiada:
   - Conexión: "Te cuento una historia: [historia]"
   - Adquisición: "Ahora vamos a aprender: [contenido técnico]"
   - Aplicación: "Te presento un caso: [caso]"
   - Otros: "[instrucciones]"

2. **DESPUÉS** haz la primera pregunta pendiente: "${primeraPregunta}"

3. **SI** el estudiante dice "no sé", "no recuerdo", "no tengo idea", etc., usa pistas relacionadas con el tema y repregunta.

4. **NO** avances al siguiente momento hasta que todas las preguntas estén completamente respondidas.

5. **SIEMPRE** termina tu respuesta con una pregunta (excepto en el cierre final).

**FORMATO DE RESPUESTA OBLIGATORIO:**
\`\`\`json
{
  "respuesta": "Tu respuesta como docente aquí",
  "momento_actual": "${momentoActual?.momento || 'N/A'}",
  "progreso": ${params.currentIndex + 1},
  "total_momentos": ${params.momentos.length},
  "debe_avanzar": false,
  "razon_avance": "Razón del avance o por qué no avanza",
  "siguiente_momento": "${siguiente}",
  "pregunta_actual": "${primeraPregunta}",
  "preguntas_pendientes": ${preguntasPendientes.length},
  "preguntas_respondidas": ${params.preguntasRespondidas.length}
}
\`\`\`

**REGLAS PARA debe_avanzar:**
- **debe_avanzar: true** → SOLO si preguntas_pendientes = 0 (todas respondidas)
- **debe_avanzar: false** → Si hay preguntas pendientes o respuestas incompletas

**NO incluyas texto fuera del JSON. NO uses markdown. SOLO el JSON.**`.trim();
  }

  /**
   * 👈 NUEVO: Genera instrucciones dinámicas basadas en el momento y tema
   */
  private static generateDynamicInstructions(momento: any, params: PromptParams): string {
    const momentoName = momento?.momento?.toLowerCase() || '';
    const tema = this.extractTemaFromParams(params);
    
    // Instrucciones base por tipo de momento
    let instruccionesBase = '';
    
    if (momentoName.includes('saludo')) {
      instruccionesBase = `Presenta el objetivo de la sesión sobre ${tema} y establece conexión con el estudiante`;
    } else if (momentoName.includes('conexión')) {
      instruccionesBase = `Conecta el tema de ${tema} con experiencias previas del estudiante usando la historia proporcionada`;
    } else if (momentoName.includes('adquisición')) {
      instruccionesBase = `Enseña los conceptos fundamentales de ${tema} de manera inductiva, guiando al descubrimiento`;
    } else if (momentoName.includes('aplicación')) {
      instruccionesBase = `Facilita la aplicación práctica de los conceptos de ${tema} usando el caso proporcionado`;
    } else if (momentoName.includes('discusión')) {
      instruccionesBase = `Facilita la comparación y análisis crítico de diferentes enfoques en ${tema}`;
    } else if (momentoName.includes('reflexión')) {
      instruccionesBase = `Guía la reflexión sobre el aprendizaje de ${tema} y su aplicación práctica`;
    } else {
      instruccionesBase = `Guía el aprendizaje del estudiante en el tema de ${tema}`;
    }

    // Agregar contexto específico del tema
    const contextoTema = this.getContextoTema(tema);
    
    return `${instruccionesBase}\n\n**CONTEXTO DEL TEMA:**\n${contextoTema}`;
  }

  /**
   * 👈 NUEVO: Extrae el tema principal de los parámetros
   */
  private static extractTemaFromParams(params: PromptParams): string {
    const sessionName = params.sessionName.toLowerCase();
    const courseName = params.courseName.toLowerCase();
    
    // Detectar tema basado en nombres
    if (sessionName.includes('incendio') || sessionName.includes('fuego')) {
      return 'prevención de incendios';
    } else if (sessionName.includes('iperc')) {
      return 'identificación de peligros y evaluación de riesgos (IPERC)';
    } else if (courseName.includes('perforación') || sessionName.includes('perforación')) {
      return 'operación de equipos de perforación';
    } else if (sessionName.includes('procedimiento') || sessionName.includes('seguridad')) {
      return 'procedimientos de seguridad';
    } else if (courseName.includes('seguridad')) {
      return 'seguridad y salud ocupacional';
    }
    
    // Tema genérico basado en el objetivo
    return params.learningObjective.split(' ').slice(0, 3).join(' ').toLowerCase();
  }

  /**
   * 👈 NUEVO: Obtiene contexto específico del tema
   */
  private static getContextoTema(tema: string): string {
    const contextualInfo = {
      'prevención de incendios': 'Enfócate en el Triángulo del Fuego, tipos de extintores, causas comunes de incendios laborales, y medidas preventivas.',
      'identificación de peligros y evaluación de riesgos (iperc)': 'Enfócate en la diferencia entre peligro y riesgo, evaluación de probabilidad y severidad, y jerarquía de controles.',
      'operación de equipos de perforación': 'Enfócate en componentes de equipos, técnicas de perforación, tipos de terreno, y procedimientos operativos.',
      'procedimientos de seguridad': 'Enfócate en equipos de protección personal (EPP), señalización, protocolos de emergencia, y buenas prácticas.',
      'seguridad y salud ocupacional': 'Enfócate en identificación de riesgos, medidas preventivas, normativas de seguridad, y cultura de seguridad.'
    };
    
    // Buscar contexto específico o usar genérico
    for (const [key, value] of Object.entries(contextualInfo)) {
      if (tema.includes(key) || key.includes(tema)) {
        return value;
      }
    }
    
    return 'Enfócate en conceptos prácticos, aplicaciones reales, y la conexión con la experiencia laboral del estudiante.';
  }

  /**
   * Extrae el contenido específico del momento
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
    const instruccionesDocente = (momento as any)["instrucciones docenteia"] 
      ?? momento.instrucciones_docenteia;
    
    if (typeof instruccionesDocente === 'string' && instruccionesDocente.trim().length > 0) {
      return `INSTRUCCIONES: ${instruccionesDocente}`;
    }

    return 'N/A';
  }

  /**
   * Valida si una respuesta es completa o evasiva - MEJORADO
   */
  static isEvasionResponse(response: string): boolean {
    const evasions = [
      'no sé', 'no se', 'no recuerdo', 'no tengo idea', 'no estoy seguro',
      'ok', 'sí', 'si', 'ajá', 'mmm', 'eh', 'bueno', 'hola', 'hi'
    ];
    
    const cleanResponse = response.toLowerCase().trim();
    
    // Detectar evasiones exactas muy cortas
    const isExactEvasion = evasions.some(evasion => cleanResponse === evasion);
    if (isExactEvasion) return true;
    
    // 👈 MEJORADO: Respuestas que indican falta de experiencia pero son honestas
    const honestResponses = [
      'no tengo experiencia', 'es nuevo para mi', 'nunca he trabajado',
      'no he visto', 'no conozco', 'es la primera vez', 'no he estado'
    ];
    
    const isHonestResponse = honestResponses.some(honest => cleanResponse.includes(honest));
    if (isHonestResponse && cleanResponse.length > 15) {
      return false; // 👈 Estas son respuestas válidas, no evasivas
    }
    
    // Detectar términos técnicos que indican conocimiento
    const technicalIndicators = [
      'incendio', 'fuego', 'extintor', 'co2', 'abc', 'agua', 'polvo', 
      'peligro', 'riesgo', 'iperc', 'control', 'prevención',
      'perforación', 'equipo', 'máquina', 'terreno', 'broca',
      'seguridad', 'epp', 'casco', 'guantes', 'procedimiento'
    ];
    
    const hasTechnicalContent = technicalIndicators.some(term => cleanResponse.includes(term));
    
    if (hasTechnicalContent && cleanResponse.length > 10) {
      return false; // No es evasiva si contiene términos técnicos
    }
    
    // Respuestas muy cortas sin contenido técnico
    const isTooShort = cleanResponse.length < 8;
    
    return isTooShort;
  }

  /**
   * Genera una pista basada en el momento y la pregunta - UNIVERSAL
   */
  static generateHint(momentoName: string, pregunta: string, tema?: string): string {
    const preguntaLower = pregunta.toLowerCase();
    
    // Pistas específicas por tipo de pregunta
    if (preguntaLower.includes('elementos') || preguntaLower.includes('identificas')) {
      return "Piensa en los componentes o elementos que observas en la situación...";
    }
    if (preguntaLower.includes('experiencia') || preguntaLower.includes('relaciona')) {
      return "Reflexiona sobre tu experiencia personal o situaciones similares que hayas visto...";
    }
    if (preguntaLower.includes('conceptos') || preguntaLower.includes('significa')) {
      return "Piensa en las ideas básicas que podrían estar relacionadas con este tema...";
    }
    if (preguntaLower.includes('prevenido') || preguntaLower.includes('evitar')) {
      return "Considera qué medidas o acciones podrían haber cambiado el resultado...";
    }
    if (preguntaLower.includes('aplicarías') || preguntaLower.includes('harías')) {
      return "Piensa en los pasos concretos que seguirías usando lo que hemos aprendido...";
    }
    
    // Pista genérica contextualizada
    const temaContext = tema ? ` sobre ${tema}` : '';
    return `Reflexiona sobre lo que sabes${temaContext} y compárteme tus ideas, aunque sean básicas...`;
  }
} 