import { Logger } from '../utils/Logger';

export class QuestionValidator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('QuestionValidator');
  }

  /**
   * 🚨 VALIDACIÓN INTELIGENTE Y CONTEXTUAL
   */
  validate(response: string, question: string): boolean {
    const cleanResponse = response.toLowerCase().trim();
    
    this.logger.debug(`Validando respuesta: "${cleanResponse}" para pregunta: "${question}"`);
    
    // 🚨 RECHAZAR respuestas que son claramente emocionales o personales
    const emotionalOnlyResponses = ['mal', 'triste', 'cansado', 'bien', 'regular'];
    if (emotionalOnlyResponses.includes(cleanResponse)) {
      this.logger.debug('Respuesta rechazada: solo emocional, no responde la pregunta');
      return false;
    }
    
    // 🚨 RECHAZAR respuestas que son claramente personales no relacionadas
    const personalIssues = ['mi mamá murió', 'mi papá', 'mi familia', 'estoy triste', 'tengo problemas'];
    if (personalIssues.some(issue => cleanResponse.includes(issue))) {
      this.logger.debug('Respuesta rechazada: tema personal no relacionado con la pregunta');
      return false;
    }
    
    // 🚨 RECHAZAR respuestas que son preguntas al docente
    const askingQuestions = ['qué me aconsejas', 'qué me puedes aconsejar', 'qué me recomiendas', 'puedes ayudarme'];
    if (askingQuestions.some(q => cleanResponse.includes(q))) {
      this.logger.debug('Respuesta rechazada: está preguntando, no respondiendo');
      return false;
    }
    
    // ✅ ACEPTAR respuestas honestas sobre falta de experiencia
    const honestResponses = [
      'no tengo experiencia', 
      'nunca he trabajado', 
      'no he visto',
      'es nuevo para mi',
      'no conozco',
      'es la primera vez',
      'no tengo idea',
      'no sé'
    ];
    
    if (honestResponses.some(honest => cleanResponse.includes(honest))) {
      this.logger.debug('Respuesta aceptada: respuesta honesta sobre falta de experiencia');
      return true;
    }
    
    // ✅ Validación mínima de longitud
    if (cleanResponse.length < 3) {
      this.logger.debug('Respuesta rechazada: muy corta');
      return false;
    }
    
    // ✅ Análisis contextual según tipo de pregunta
    return this.analyzeContextualRelevance(cleanResponse, question);
  }

  /**
   * 🎯 Análisis contextual de relevancia INTELIGENTE
   */
  private analyzeContextualRelevance(response: string, question: string): boolean {
    const questionLower = question.toLowerCase();
    const responseLower = response.toLowerCase();
    
    // 🚨 Para preguntas sobre conocimientos de incendios
    if (questionLower.includes('sabes') && questionLower.includes('incendios')) {
      const fireRelatedWords = ['fuego', 'incendio', 'quemar', 'llama', 'humo', 'extintor', 'evacuación'];
      const hasFireContent = fireRelatedWords.some(word => responseLower.includes(word));
      
      if (!hasFireContent && responseLower.length < 10) {
        this.logger.debug('Respuesta rechazada: no menciona contenido relacionado con incendios');
        return false;
      }
    }
    
    // 🚨 Para preguntas sobre experiencia con incendios
    if (questionLower.includes('presenciado') && questionLower.includes('incendio')) {
      const experienceWords = ['una vez', 'vi', 'vimos', 'ocurrió', 'pasó', 'sucedió', 'experiencia'];
      const hasExperienceContent = experienceWords.some(word => responseLower.includes(word));
      
      if (!hasExperienceContent && responseLower.length < 8) {
        this.logger.debug('Respuesta rechazada: no menciona experiencia específica');
        return false;
      }
    }
    
    // 🚨 Para preguntas sobre expectativas de aprendizaje
    if (questionLower.includes('esperas') || questionLower.includes('espera')) {
      const learningWords = ['aprender', 'entender', 'conocer', 'saber', 'prevenir', 'evitar'];
      const hasLearningContent = learningWords.some(word => responseLower.includes(word));
      
      if (!hasLearningContent && responseLower.length < 8) {
        this.logger.debug('Respuesta rechazada: no menciona expectativas de aprendizaje');
        return false;
      }
    }
    
    // 🚨 Para preguntas sobre causas de incendios
    if (questionLower.includes('causa') || questionLower.includes('puede causar')) {
      const causeWords = ['cortocircuito', 'fuego', 'chispa', 'calor', 'combustible', 'eléctrico'];
      const hasCauseContent = causeWords.some(word => responseLower.includes(word));
      
      if (!hasCauseContent && responseLower.length < 6) {
        this.logger.debug('Respuesta rechazada: no menciona causas específicas');
        return false;
      }
    }
    
    // ✅ Para cualquier otra pregunta, ser más estricto
    if (responseLower.length < 5) {
      this.logger.debug('Respuesta rechazada: muy corta para criterio general');
      return false;
    }
    
    this.logger.debug('Respuesta aceptada: criterio general');
    return true;
  }

  /**
   * 🚨 Detecta si la respuesta incluye palabras de futuro o aprendizaje
   */
  private includesFutureOrLearningWords(response: string): boolean {
    const futureWords = [
      'quiero', 'me gustaría', 'espero', 'quisiera', 'deseo',
      'aprender', 'entender', 'conocer', 'saber', 'como', 'cómo'
    ];
    
    return futureWords.some(word => response.includes(word));
  }

  /**
   * 📊 Obtener estadísticas de validación
   */
  getValidationStats(): {
    totalValidations: number;
    acceptedResponses: number;
    rejectedResponses: number;
  } {
    // Implementar cuando se agregue tracking de estadísticas
    return {
      totalValidations: 0,
      acceptedResponses: 0,
      rejectedResponses: 0
    };
  }
}