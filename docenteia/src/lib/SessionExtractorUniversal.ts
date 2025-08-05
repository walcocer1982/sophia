// src/lib/SessionExtractorUniversal.ts - Versión Corregida

import { AIResponse } from '../types';
import { OpenAIService } from '../services/OpenAIService';
import { SessionManager } from '../services/SessionManager';
import { PromptBuilderUniversal } from '../services/PromptBuilderUniversal';

export class SessionExtractorUniversal {
  private openAIService: OpenAIService;
  private sessionManager: SessionManager;
  private intentosEvasion: Map<string, number> = new Map();
  private processingSession: Map<string, boolean> = new Map(); // 👈 NUEVO: Control de concurrencia

  constructor() {
    this.openAIService = new OpenAIService(process.env.OPENAI_API_KEY!);
    this.sessionManager = new SessionManager();
  }

  /**
   * Inicia una sesión y GENERA EL PRIMER MENSAJE DEL DOCENTE
   */
  async startSession(courseId: string, sessionId: string): Promise<{
    sessionKey: string;
    momentos: number;
    currentMoment: string;
    initialMessage: string; // 👈 NUEVO: mensaje inicial del docente
  }> {
    try {
      const sessionKey = await this.sessionManager.startSession(courseId, sessionId);
      const session = this.sessionManager.getSession(sessionKey);
      
      if (!session) {
        throw new Error('Error iniciando sesión');
      }

      console.log(`🚀 Iniciando sesión: ${session.course.name} - ${session.session.name}`);

      // 👈 NUEVO: Generar mensaje inicial del docente
      const initialMessage = await this.generateInitialMessage(sessionKey);

      return {
        sessionKey,
        momentos: session.momentos.length,
        currentMoment: session.momentos[0]?.momento || 'N/A',
        initialMessage // 👈 Incluir mensaje inicial
      };

    } catch (error) {
      console.error('Error iniciando sesión:', error);
      throw error;
    }
  }

  /**
   * 👈 NUEVO: Genera el mensaje inicial del docente
   */
  private async generateInitialMessage(sessionKey: string): Promise<string> {
    const session = this.sessionManager.getSession(sessionKey);
    if (!session) return "Error cargando sesión";
    
    // Construir prompt inicial
    const spiritPrompt = PromptBuilderUniversal.buildSpiritPrompt({
      specialistRole: session.course.specialist_role,
      sessionName: session.session.name,
      courseName: session.course.name,
      learningObjective: session.session.learning_objective
    });

    const momentPrompt = PromptBuilderUniversal.buildMomentPrompt({
      specialistRole: session.course.specialist_role,
      sessionName: session.session.name,
      courseName: session.course.name,
      learningObjective: session.session.learning_objective,
      keyPoints: session.session.key_points,
      momentos: session.momentos,
      currentIndex: 0,
      preguntasPendientes: session.preguntasPendientes,
      preguntasRespondidas: session.preguntasRespondidas
    });

    const systemPrompt = `${spiritPrompt}\n\n${momentPrompt}`;
    
    const { response } = await this.openAIService.callOpenAI({
      systemPrompt,
      userPrompt: "Inicia la clase con el saludo pedagógico apropiado",
      model: 'gpt-3.5-turbo'
    });

    const parsedResponse = this.parseAIResponse(response.output_text);
    
    // Marcar que ya no es el primer turno
    this.sessionManager.updateSession(sessionKey, { isFirstTurn: false });

    // Guardar mensaje inicial en conversationLog
    session.conversationLog.push({
      role: 'assistant',
      content: parsedResponse?.respuesta || response.output_text,
      timestamp: new Date()
    });

    return parsedResponse?.respuesta || response.output_text;
  }

  /**
   * CORREGIDO: Control de avance más estricto en handleStudent
   */
  async handleStudent(sessionKey: string, studentMessage: string): Promise<AIResponse> {
    // Control de concurrencia
    if (this.processingSession.get(sessionKey)) {
      throw new Error('Sesión siendo procesada');
    }
    this.processingSession.set(sessionKey, true);

    try {
      const session = this.sessionManager.getSession(sessionKey);
      if (!session) {
        throw new Error(`Sesión ${sessionKey} no encontrada`);
      }

      // Actualizar actividad
      this.sessionManager.updateSession(sessionKey, { lastActivity: new Date() });

      // Guardar mensaje del estudiante
      session.conversationLog.push({
        role: 'user',
        content: studentMessage,
        timestamp: new Date()
      });

      // 🚨 VERIFICACIÓN CRÍTICA: Estado actual del momento
      const momentoActual = session.momentos[session.currentMomentIndex];
      const preguntasPendientes = session.preguntasPendientes.length;
      
      console.log(`📊 Estado actual - Momento: "${momentoActual?.momento}" | Preguntas pendientes: ${preguntasPendientes}`);

      // Construir prompt del momento
      const momentPrompt = PromptBuilderUniversal.buildMomentPrompt({
        specialistRole: session.course.specialist_role,
        sessionName: session.session.name,
        courseName: session.course.name,
        learningObjective: session.session.learning_objective,
        keyPoints: session.session.key_points,
        momentos: session.momentos,
        currentIndex: session.currentMomentIndex,
        preguntasPendientes: session.preguntasPendientes,
        preguntasRespondidas: session.preguntasRespondidas
      });

      // Agregar contexto de historial
      const historialRecortado = session.conversationLog
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'Estudiante' : 'Docente'}: "${m.content}"`)
        .join('\n');

      let finalSystemPrompt = '';
      if (historialRecortado.trim()) {
        finalSystemPrompt += `HISTORIAL RECIENTE:\n${historialRecortado}\n\n`;
      }
      finalSystemPrompt += momentPrompt;

      // Llamar a OpenAI
      const { response, metrics } = await this.openAIService.callOpenAI({
        systemPrompt: finalSystemPrompt,
        userPrompt: studentMessage,
        model: 'gpt-3.5-turbo'
      });

      // Actualizar costos
      this.openAIService.addSessionCost(sessionKey, metrics.estimated_cost);

      // Parsear respuesta
      let parsedResponse = this.parseAIResponse(response.output_text);
      
      if (!parsedResponse || typeof parsedResponse !== 'object') {
        const siguienteMomento = session.momentos[session.currentMomentIndex + 1];
        parsedResponse = {
          respuesta: response.output_text,
          momento_actual: momentoActual ? momentoActual.momento : 'N/A',
          progreso: session.currentMomentIndex + 1,
          total_momentos: session.momentos.length,
          debe_avanzar: false,
          razon_avance: "Respuesta no estructurada",
          siguiente_momento: siguienteMomento ? siguienteMomento.momento : 'FIN',
          pregunta_actual: session.preguntasPendientes[0] || 'N/A',
          preguntas_pendientes: session.preguntasPendientes.length,
          preguntas_respondidas: session.preguntasRespondidas.length
        };
      }

      // 🚨 PROCESO CRÍTICO: Analizar respuesta del estudiante
      this.processStudentResponseImproved(sessionKey, studentMessage, parsedResponse);

      // 🚨 CONTROL FINAL: Solo avanzar si realmente no hay preguntas pendientes
      const sessionUpdated = this.sessionManager.getSession(sessionKey);
      const quedanPreguntas = sessionUpdated?.preguntasPendientes.length || 0;
      
      if (quedanPreguntas > 0) {
        // 🚨 FORZAR: No avanzar si quedan preguntas
        parsedResponse.debe_avanzar = false;
        parsedResponse.razon_avance = `Bloqueado: ${quedanPreguntas} pregunta(s) pendiente(s) en el momento actual`;
        console.log(`🚫 AVANCE BLOQUEADO: ${quedanPreguntas} preguntas pendientes`);
      }

      // Asegurar que termina con pregunta (excepto en cierre final)
      const esUltimoMomento = session.currentMomentIndex >= session.momentos.length - 1;
      if (!esUltimoMomento && !parsedResponse.respuesta.trim().endsWith("?")) {
        const nextQuestion = sessionUpdated?.preguntasPendientes[0] || "¿Puedes elaborar más tu respuesta?";
        parsedResponse.respuesta = `${parsedResponse.respuesta.trim()} ${nextQuestion}`;
      }

      // Guardar respuesta del docente
      session.conversationLog.push({
        role: 'assistant',
        content: parsedResponse.respuesta,
        timestamp: new Date()
      });

      // Avanzar solo si debe avanzar Y no hay preguntas pendientes
      if (parsedResponse.debe_avanzar && quedanPreguntas === 0 && !esUltimoMomento) {
        return await this.advanceToNextMoment(sessionKey);
      }

      return {
        ...parsedResponse,
        momentos: session.momentos,
        sessionKey
      };

    } catch (error) {
      console.error('Error en respuesta del docente:', error);
      return {
        respuesta: "Lo siento, tuve un problema generando la respuesta. ¿Podrías reformular tu pregunta?",
        momento_actual: 'ERROR',
        progreso: 0,
        total_momentos: 0,
        debe_avanzar: false,
        razon_avance: "Error en el sistema",
        siguiente_momento: 'ERROR',
        momentos: [],
        sessionKey
      };
    } finally {
      // 👈 NUEVO: Liberar el bloqueo al final
      this.processingSession.set(sessionKey, false);
    }
  }

  /**
   * CORREGIDO: Procesa la respuesta del estudiante con control estricto de secuencia
   */
  private processStudentResponseImproved(sessionKey: string, studentMessage: string, aiResponse: any): void {
    const session = this.sessionManager.getSession(sessionKey);
    if (!session) return;

    // 🚨 CAMBIO CRÍTICO: Solo procesar si hay una pregunta actual específica
    const preguntaActual = session.preguntasPendientes[0];
    if (!preguntaActual) {
      console.log(`⚠️ No hay pregunta específica pendiente - momento ya completado`);
      return;
    }

    console.log(`🎯 Procesando respuesta para pregunta específica: "${preguntaActual}"`);

    // 🚨 CAMBIO: Verificar si la respuesta es válida para LA PREGUNTA ACTUAL
    const isValidResponse = this.isValidResponseForQuestion(studentMessage, preguntaActual);
    
    if (isValidResponse) {
      // ✅ Respuesta válida - mover exactamente esta pregunta de pendiente a respondida
      const nuevasPendientes = session.preguntasPendientes.slice(1);
      const nuevasRespondidas = [...session.preguntasRespondidas, preguntaActual];
      
      this.sessionManager.updateSession(sessionKey, {
        preguntasPendientes: nuevasPendientes,
        preguntasRespondidas: nuevasRespondidas
      });
      
      console.log(`✅ Pregunta respondida: "${preguntaActual}"`);
      console.log(`📋 Preguntas pendientes restantes: ${nuevasPendientes.length}`);
      
      // Solo marcar para avanzar si NO hay más preguntas en este momento
      if (nuevasPendientes.length === 0) {
        console.log(`🎯 ¡Momento completado! Todas las preguntas respondidas.`);
        aiResponse.debe_avanzar = true;
        aiResponse.razon_avance = "Momento completado: todas las preguntas han sido respondidas satisfactoriamente.";
      } else {
        console.log(`🔄 Aún quedan ${nuevasPendientes.length} preguntas por responder en este momento`);
        aiResponse.debe_avanzar = false;
        aiResponse.razon_avance = `Continuando con el momento. Quedan ${nuevasPendientes.length} preguntas pendientes.`;
      }
    } else {
      // ❌ Respuesta que necesita ayuda - NO cambiar estado de preguntas
      console.log(`⚠️ Respuesta necesita orientación: "${studentMessage}"`);
      
      const momentoActual = session.momentos[session.currentMomentIndex];
      const momentoKey = momentoActual?.momento || '';
      const intentosActuales = this.intentosEvasion.get(momentoKey) || 0;
      this.intentosEvasion.set(momentoKey, intentosActuales + 1);
      
      // Generar respuesta de ayuda específica para la pregunta actual
      const ayudaRespuesta = this.buildHelpfulResponseForQuestion(studentMessage, preguntaActual);
      
      aiResponse.respuesta = ayudaRespuesta;
      aiResponse.debe_avanzar = false;
      aiResponse.razon_avance = "Proporcionando ayuda para responder la pregunta actual";
      
      console.log(`🔄 Ayudando con pregunta actual (intento ${intentosActuales + 1})`);
    }
  }

  /**
   * 🚨 CORREGIDO: Función de validación menos estricta
   */
  private isValidResponseForQuestion(response: string, pregunta: string): boolean {
    const cleanResponse = response.toLowerCase().trim();
    
    // 🚨 CAMBIO: Solo rechazar respuestas OBVIAMENTE evasivas
    const evasivasObvias = [
      'no sé', 'no se', 'ok', 'sí', 'si', 'ajá', 'mmm', 'eh', 'bueno', 'hola', 'hi'
    ];
    
    // Solo rechazar si es evasión EXACTA y muy corta
    if (evasivasObvias.includes(cleanResponse) && cleanResponse.length <= 6) {
      return false;
    }
    
    // 🚨 CAMBIO: Aceptar respuestas honestas sobre falta de experiencia
    const respuestasHonestas = [
      'no tengo experiencia', 'es nuevo para mi', 'nunca he trabajado',
      'no he visto', 'no conozco', 'es la primera vez', 'no he estado',
      'no recuerdo', 'no tengo idea' // 👈 AGREGADO: Estas también pueden ser honestas
    ];
    
    const esRespuestaHonesta = respuestasHonestas.some(honesta => cleanResponse.includes(honesta));
    if (esRespuestaHonesta) {
      return true; // 👈 Siempre aceptar respuestas honestas
    }
    
    // 🚨 CAMBIO: Ser mucho más permisivo con la longitud
    if (cleanResponse.length < 4) { // 👈 Reducido de 8 a 4
      return false;
    }
    
    // 🚨 CAMBIO: Análisis específico más permisivo
    return this.analyzeResponseRelevancePermissive(cleanResponse, pregunta);
  }

  /**
   * 🚨 MEJORADO: Análisis más inteligente de relevancia contextual
   */
  private analyzeResponseRelevancePermissive(response: string, pregunta: string): boolean {
    const preguntaLower = pregunta.toLowerCase();
    const responseLower = response.toLowerCase();
    
    // Para preguntas sobre conocimientos
    if (preguntaLower.includes('sabes') || preguntaLower.includes('conoces')) {
      return response.length > 4;
    }
    
    // Para preguntas sobre experiencia
    if (preguntaLower.includes('presenciado') || preguntaLower.includes('experiencia') || preguntaLower.includes('visto')) {
      return response.length > 4;
    }
    
    // 🚨 CRÍTICO: Para preguntas sobre expectativas - validación más estricta
    if (preguntaLower.includes('esperas') || preguntaLower.includes('espera')) {
      // Rechazar respuestas que claramente hablan de experiencias pasadas en lugar de expectativas
      const esExperienciaPasada = responseLower.includes('una vez') || 
                                 responseLower.includes('hubo') || 
                                 responseLower.includes('paso') || 
                                 responseLower.includes('pasó') ||
                                 responseLower.includes('ocurrió') ||
                                 responseLower.includes('vi') ||
                                 responseLower.includes('vimos') ||
                                 responseLower.includes('hace') ||
                                 responseLower.includes('antes');
      
      if (esExperienciaPasada && !this.includesFutureOrLearningWords(responseLower)) {
        return false; // 👈 Rechazar experiencias pasadas para preguntas de expectativas
      }
      
      // Aceptar respuestas que indican aprendizaje futuro
      const mencionaAprendizaje = responseLower.includes('aprender') || 
                                 responseLower.includes('entender') || 
                                 responseLower.includes('conocer') || 
                                 responseLower.includes('saber') ||
                                 responseLower.includes('como') || 
                                 responseLower.includes('cómo') ||
                                 responseLower.includes('prevenir') || 
                                 responseLower.includes('evitar') ||
                                 responseLower.includes('apagar') || 
                                 responseLower.includes('controlar') ||
                                 responseLower.includes('quiero') || 
                                 responseLower.includes('me gustaría') ||
                                 responseLower.includes('espero') ||
                                 responseLower.includes('básico') || 
                                 responseLower.includes('elemental');
      
      return mencionaAprendizaje || (response.length > 4 && !esExperienciaPasada);
    }
    
    // Para cualquier otra pregunta, ser permisivo
    return response.length > 4;
  }

  /**
   * 🚨 NUEVO: Detecta si la respuesta incluye palabras de futuro o aprendizaje
   */
  private includesFutureOrLearningWords(response: string): boolean {
    const futureWords = [
      'quiero', 'me gustaría', 'espero', 'quisiera', 'deseo',
      'aprender', 'entender', 'conocer', 'saber', 'como', 'cómo'
    ];
    
    return futureWords.some(word => response.includes(word));
  }

  /**
   * 🚨 MEJORADO: Respuesta de ayuda más específica para el contexto
   */
  private buildHelpfulResponseForQuestion(studentMessage: string, preguntaActual: string): string {
    const cleanMessage = studentMessage.toLowerCase();
    const preguntaLower = preguntaActual.toLowerCase();
    
    // Para preguntas sobre expectativas con respuestas de experiencia pasada
    if (preguntaLower.includes('esperas') || preguntaLower.includes('expectativa')) {
      if (cleanMessage.includes('una vez') || cleanMessage.includes('hubo') || cleanMessage.includes('se quemo')) {
        return `Entiendo que has tenido esa experiencia. Ahora me gustaría saber específicamente: ${preguntaActual} Por ejemplo: ¿te gustaría aprender sobre prevención, cómo usar extintores, o procedimientos de evacuación?`;
      }
      
      if (cleanMessage.length < 4 || cleanMessage === 'no sé') {
        return `Te ayudo a pensar en esto. ${preguntaActual} Por ejemplo: ¿te gustaría aprender sobre prevención, extinción, o procedimientos de seguridad?`;
      }
    }
    
    if (preguntaLower.includes('sabes') || preguntaLower.includes('conoces')) {
      if (cleanMessage.includes('no sé') || cleanMessage.includes('poco') || cleanMessage.length < 4) {
        return `No hay problema, empezaremos desde lo básico. ${preguntaActual} Puedes responder con cualquier idea que tengas, aunque sea simple.`;
      }
    }
    
    if (preguntaLower.includes('presenciado') || preguntaLower.includes('experiencia')) {
      if (cleanMessage.length < 4) {
        return `${preguntaActual} Puedes contarme si has visto algo similar, aunque sea en casa o que hayas escuchado.`;
      }
    }
    
    return `${preguntaActual} Te ayudo a pensar en una respuesta específica para esta pregunta.`;
  }

  /**
   * 👈 NUEVO: Construye respuesta de ayuda universal para cualquier curso/tema
   */
  private buildUniversalHelpResponse(preguntaActual: string, momentoName: string): string {
    const session = this.sessionManager.getSession(Array.from(this.sessionManager['sessions'].keys())[0]);
    if (!session) return `Te ayudo a pensar: ${preguntaActual}`;
    
    const intentos = this.intentosEvasion.get(momentoName) || 0;
    const tema = this.extractTemaFromSession(session);
    
    // Generar pistas dinámicas basadas en el tema del curso
    const pistasGenericas = this.generateDynamicHints(preguntaActual, tema, momentoName, intentos);
    
    return pistasGenericas;
  }

  /**
   * 👈 NUEVO: Extrae el tema principal del curso dinámicamente
   */
  private extractTemaFromSession(session: any): string {
    // Extraer tema de keywords de la sesión
    const keywords = session.session.theme_keywords || [];
    const temaFromKeywords = keywords.join(' ').toLowerCase();
    
    // Extraer tema del nombre del curso y sesión
    const courseName = session.course.name.toLowerCase();
    const sessionName = session.session.name.toLowerCase();
    
    // Determinar tema principal
    if (temaFromKeywords.includes('incendio') || sessionName.includes('incendio')) {
      return 'incendios';
    } else if (temaFromKeywords.includes('iperc') || sessionName.includes('iperc')) {
      return 'iperc';
    } else if (temaFromKeywords.includes('perforación') || courseName.includes('perforación')) {
      return 'perforación';
    } else if (courseName.includes('seguridad')) {
      return 'seguridad';
    } else if (temaFromKeywords.includes('procedimiento') || sessionName.includes('procedimiento')) {
      return 'procedimientos';
    }
    
    return 'general'; // Tema por defecto
  }

  /**
   * 👈 NUEVO: Genera pistas dinámicas basadas en el tema y momento
   */
  private generateDynamicHints(pregunta: string, tema: string, momentoName: string, intentos: number): string {
    const momentoLower = momentoName.toLowerCase();
    
    // Pistas específicas por tema
    const temaHints = this.getHintsByTema();
    
    // Pistas específicas por momento
    const momentoHints = this.getHintsByMomento(momentoLower, tema);
    
    // Combinar y rotar pistas
    const allHints = [...temaHints, ...momentoHints];
    const hintIndex = intentos % allHints.length;
    
    return allHints[hintIndex] || `Te ayudo a pensar: ${pregunta}`;
  }

  /**
   * 👈 NUEVO: Obtiene pistas específicas por tema del curso
   */
  private getHintsByTema(): string[] {
    // Hints universales que funcionan para cualquier curso o tema
    const universalHints = [
      "Piensa en tu experiencia personal relacionada con este tema...",
      "Considera situaciones similares que hayas visto o escuchado...",
      "Reflexiona sobre lo que sabes del tema aunque sea básico...",
      "Recuerda ejemplos prácticos de tu vida cotidiana o trabajo...",
      "Piensa en casos o situaciones que hayas observado...",
      "Considera qué has aprendido anteriormente sobre este tema...",
      "Reflexiona sobre aplicaciones prácticas de este conocimiento...",
      "Recuerda situaciones donde este tema ha sido relevante..."
    ];
    
        return universalHints;
  }

  /**
   * 👈 NUEVO: Obtiene pistas específicas por momento pedagógico
   */
  private getHintsByMomento(momento: string, tema: string): string[] {
    if (momento.includes('saludo')) {
      return [
        `No te preocupes si no sabes mucho sobre ${tema}, empezaremos desde lo básico.`,
        `Es normal no tener experiencia previa. ¿Has escuchado algo sobre ${tema}?`,
        `Vamos a explorar juntos este tema. ¿Qué te viene a la mente cuando escuchas ${tema}?`
      ];
    } else if (momento.includes('conexión')) {
      return [
        "Piensa en situaciones de tu vida diaria que podrían relacionarse...",
        "¿Has estado en lugares donde esto podría ser relevante?",
        "Considera experiencias de familiares, amigos o conocidos..."
      ];
    } else if (momento.includes('adquisición')) {
      return [
        "Te ayudo con los conceptos básicos. ¿Qué crees que significa...?",
        "Vamos a descubrir esto paso a paso. ¿Puedes imaginar qué elementos están involucrados?",
        "Piensa en los componentes principales que podrían estar relacionados..."
      ];
    } else if (momento.includes('aplicación')) {
      return [
        "Usando lo que acabamos de aprender, ¿qué harías en esta situación?",
        "Apliquemos los conceptos al caso. ¿Qué pasos seguirías?",
        "¿Cómo utilizarías lo que aprendimos para resolver esto?"
      ];
    } else if (momento.includes('discusión')) {
      return [
        "¿Qué ventajas y desventajas ves en cada opción?",
        "¿En qué situaciones preferirías un enfoque sobre otro?",
        "¿Qué factores consideras más importantes para decidir?"
      ];
    } else if (momento.includes('reflexión')) {
      return [
        "¿Qué fue lo que más te llamó la atención de lo que vimos?",
        "¿Qué concepto te quedó más claro?",
        "¿Cómo crees que podrías aplicar esto en tu contexto?"
      ];
    }

    return [
      "Te ayudo a pensar sobre esto de manera más específica...",
      "¿Puedes contarme más sobre tu perspectiva?",
      "Vamos a explorar esto juntos paso a paso..."
    ];
  }

  /**
   * Parsea la respuesta de la IA para extraer JSON
   */
  private parseAIResponse(responseText: string): any {
    try {
      const cleanedText = responseText.trim();
      const jsonMatch = cleanedText.match(/```(?:json|js)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }
      const jsonObjectMatch = cleanedText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
      if (jsonObjectMatch) {
        return JSON.parse(jsonObjectMatch[0]);
      }
      return JSON.parse(cleanedText);
    } catch (error) {
      console.error('Error parseando JSON:', error);
      return null;
    }
  }

  /**
   * 🚨 NUEVO: Método específico para avanzar al siguiente momento
   */
  private async advanceToNextMoment(sessionKey: string): Promise<AIResponse> {
    const session = this.sessionManager.getSession(sessionKey);
    if (!session) throw new Error('Sesión no encontrada');

    const nuevoIndice = session.currentMomentIndex + 1;
    const nuevoMomento = session.momentos[nuevoIndice];
    
    if (!nuevoMomento) {
      // Clase completada
      return {
        respuesta: "🎉 ¡Felicidades! Has completado exitosamente toda la sesión. Has demostrado comprensión de todos los conceptos y estás listo para aplicar lo aprendido en tu trabajo.",
        momento_actual: 'COMPLETADO',
        progreso: session.momentos.length,
        total_momentos: session.momentos.length,
        debe_avanzar: false,
        razon_avance: "Sesión completada exitosamente",
        siguiente_momento: 'FIN',
        momentos: session.momentos,
        sessionKey
      };
    }

    // Actualizar sesión con nuevo momento
    this.sessionManager.updateSession(sessionKey, {
      currentMomentIndex: nuevoIndice,
      preguntasPendientes: nuevoMomento.preguntas || [],
      preguntasRespondidas: []
    });
    
    console.log(`✅ Avanzando al momento ${nuevoIndice + 1}: ${nuevoMomento.momento}`);
    console.log(`📋 Nuevas preguntas pendientes: ${nuevoMomento.preguntas?.length || 0}`);

    // Generar respuesta de transición
    return await this.generateNewMomentResponse(sessionKey, nuevoIndice);
  }

  /**
   * Genera respuesta para el nuevo momento cuando se avanza
   */
  private async generateNewMomentResponse(sessionKey: string, nuevoIndice: number): Promise<AIResponse> {
    const session = this.sessionManager.getSession(sessionKey);
    if (!session) {
      throw new Error('Sesión no encontrada');
    }

    const nuevoMomento = session.momentos[nuevoIndice];
    const momentoAnterior = session.momentos[nuevoIndice - 1];

    // 👈 NUEVO: Prompt contextualizado para transición
    const transitionPrompt = `
**TRANSICIÓN PEDAGÓGICA**
Has completado exitosamente el momento "${momentoAnterior?.momento}".

Ahora vamos al siguiente paso: "${nuevoMomento?.momento}"

**INSTRUCCIONES DE TRANSICIÓN:**
1. RECONOCE brevemente el progreso del estudiante
2. INTRODUCE el nuevo momento explicando por qué es el siguiente paso lógico
3. PRESENTA el contenido del nuevo momento
4. HAZ la primera pregunta específica del momento

**CONTEXTO DE CONTINUIDAD:**
El estudiante acaba de completar satisfactoriamente todas las preguntas del momento anterior.
Ahora debe avanzar naturalmente al siguiente momento pedagógico.
`;

    const momentPrompt = PromptBuilderUniversal.buildMomentPrompt({
      specialistRole: session.course.specialist_role,
      sessionName: session.session.name,
      courseName: session.course.name,
      learningObjective: session.session.learning_objective,
      keyPoints: session.session.key_points,
      momentos: session.momentos,
      currentIndex: nuevoIndice,
      preguntasPendientes: session.preguntasPendientes,
      preguntasRespondidas: session.preguntasRespondidas
    });

    const fullPrompt = `${transitionPrompt}\n\n${momentPrompt}`;

    const { response } = await this.openAIService.callOpenAI({
      systemPrompt: fullPrompt,
      userPrompt: `Continúa con la transición natural al momento "${nuevoMomento?.momento}"`,
      model: 'gpt-3.5-turbo'
    });

    const nuevaRespuesta = this.parseAIResponse(response.output_text);
    
    // 👈 NUEVO: Asegurar que el bloqueo se libere después de la transición
    this.processingSession.set(sessionKey, false);
    
    return {
      ...nuevaRespuesta,
      momentos: session.momentos,
      sessionKey
    };
  }

  // MÉTODOS DE GESTIÓN DE SESIONES (delegados al SessionManager)
  getSessionInfo(sessionKey: string) {
    return this.sessionManager.getSession(sessionKey);
  }

  listActiveSessions() {
    return this.sessionManager.listActiveSessions();
  }

  clearSession(sessionKey: string) {
    return this.sessionManager.clearSession(sessionKey);
  }

  clearAllSessions() {
    this.sessionManager.clearAllSessions();
  }

  getCacheStats() {
    return this.sessionManager.getCacheStats();
  }

  clearCache() {
    this.sessionManager.clearCache();
  }
} 