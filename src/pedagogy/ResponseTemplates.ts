export class ResponseTemplates {
  
  /**
   * 🎯 TEMPLATES VARIADOS PARA SALUDOS INICIALES
   */
  static getInitialGreetingTemplates(): string[] {
    return [
      "¡Hola! Soy Sophia, tu instructora de {specialist_role}. Me alegra tenerte aquí para aprender sobre {topic}.",
      "¡Bienvenido! Soy Sophia, tu {specialist_role}. Estoy aquí para guiarte en esta sesión sobre {topic}.",
      "¡Hola! Me llamo Sophia y seré tu {specialist_role} en esta sesión. Juntos aprenderemos sobre {topic}.",
      "¡Saludos! Soy Sophia, tu {specialist_role}. Estoy emocionada de compartir contigo esta sesión sobre {topic}.",
      "¡Hola! Me presento, soy Sophia, tu {specialist_role}. Hoy exploraremos juntos el tema de {topic}."
    ];
  }

  /**
   * 🎯 TEMPLATES PARA PRESENTAR OBJETIVOS
   */
  static getObjectiveTemplates(): string[] {
    return [
      "El objetivo de esta sesión es {objective}. Al finalizar, tendrás las herramientas necesarias para {outcome}.",
      "En esta sesión nos enfocaremos en {objective}. Mi meta es que puedas {outcome} al terminar.",
      "Nuestro propósito hoy es {objective}. Quiero que al final de esta sesión seas capaz de {outcome}.",
      "Esta sesión tiene como objetivo {objective}. Trabajaremos para que puedas {outcome}.",
      "El propósito de nuestra clase es {objective}. Mi compromiso es que logres {outcome}."
    ];
  }

  /**
   * 🎯 TEMPLATES PARA HACER PREGUNTAS
   */
  static getQuestionTemplates(): string[] {
    return [
      "Para comenzar, me gustaría saber: {question}",
      "Antes de continuar, ¿podrías decirme {question}?",
      "Me interesa conocer tu perspectiva: {question}",
      "Para personalizar esta sesión, ¿qué opinas sobre {question}?",
      "Empecemos con una reflexión: {question}"
    ];
  }

  /**
   * 🎯 TEMPLATES PARA RECONOCER RESPUESTAS
   */
  static getRecognitionTemplates(): string[] {
    return [
      "Excelente punto de vista. Tu respuesta muestra que {observation}.",
      "Muy buena observación. Es interesante que menciones {observation}.",
      "Perfecto, has identificado algo importante: {observation}.",
      "Excelente reflexión. Es valioso que notes {observation}.",
      "Muy bien pensado. Tu respuesta demuestra que {observation}."
    ];
  }

  /**
   * 🎯 TEMPLATES PARA TRANSICIONES
   */
  static getTransitionTemplates(): string[] {
    return [
      "Ahora, pasemos al siguiente tema: {next_topic}.",
      "Continuemos explorando: {next_topic}.",
      "Sigamos adelante con: {next_topic}.",
      "Ahora vamos a profundizar en: {next_topic}.",
      "Avancemos hacia: {next_topic}."
    ];
  }

  /**
   * 🎯 OBTENER TEMPLATE ALEATORIO CON ROTACIÓN
   */
  static getRandomTemplate(templates: string[], usedTemplates: string[] = []): string {
    // Filtrar templates no usados recientemente
    const availableTemplates = templates.filter(template => 
      !usedTemplates.includes(template)
    );
    
    // Si todos han sido usados, resetear
    const templatesToUse = availableTemplates.length > 0 ? availableTemplates : templates;
    
    // Seleccionar aleatoriamente
    const randomIndex = Math.floor(Math.random() * templatesToUse.length);
    return templatesToUse[randomIndex];
  }

  /**
   * 🎯 GENERAR SALUDO INICIAL VARIADO
   */
  static generateInitialGreeting(specialistRole: string, topic: string, usedTemplates: string[] = []): string {
    const templates = this.getInitialGreetingTemplates();
    const template = this.getRandomTemplate(templates, usedTemplates);
    
    return template
      .replace('{specialist_role}', specialistRole)
      .replace('{topic}', topic);
  }

  /**
   * 🎯 GENERAR PRESENTACIÓN DE OBJETIVO VARIADA
   */
  static generateObjectivePresentation(objective: string, outcome: string, usedTemplates: string[] = []): string {
    const templates = this.getObjectiveTemplates();
    const template = this.getRandomTemplate(templates, usedTemplates);
    
    // Validar que el objetivo no sea undefined o vacío
    const validObjective = objective && objective !== 'undefined' ? objective : 'aprender sobre procedimientos de seguridad';
    
    return template
      .replace('{objective}', validObjective)
      .replace('{outcome}', outcome);
  }

  /**
   * 🎯 GENERAR PREGUNTA VARIADA
   */
  static generateQuestion(question: string, usedTemplates: string[] = []): string {
    const templates = this.getQuestionTemplates();
    const template = this.getRandomTemplate(templates, usedTemplates);
    
    return template.replace('{question}', question);
  }
}
