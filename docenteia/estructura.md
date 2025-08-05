// 📁 ESTRUCTURA BÁSICA REFACTORIZADA

src/
├── 🎯 core/                          # Núcleo del sistema
│   ├── DocenteAI.ts                  # Clase principal simplificada
│   └── types.ts                      # Tipos centrales
├── 🤖 ai/                            # Servicios de IA
│   ├── ResponsesService.ts           # OpenAI Responses API
│   ├── StructuredOutputs.ts          # Esquemas Zod garantizados
│   └── PromptTemplates.ts            # Templates reutilizables
├── 📚 pedagogy/                      # Lógica pedagógica
│   ├── SessionFlow.ts                # Control de flujo de sesiones
│   ├── QuestionValidator.ts          # Validación de respuestas
│   └── MomentManager.ts              # Gestión de momentos
├── 💾 data/                          # Gestión de datos
│   ├── SessionStore.ts               # Almacenamiento de sesiones
│   ├── CourseLoader.ts               # Carga de cursos
│   └── ContentEnricher.ts            # Enriquecimiento con web search
├── 🔧 utils/                         # Utilidades
│   ├── Logger.ts                     # Logging estructurado
│   ├── CostTracker.ts                # Monitoreo de costos
│   └── ErrorHandler.ts               # Manejo de errores
└── 📄 data/                          # Archivos de configuración
    ├── courses-database.json
    └── sessions/

// =============================================================================
// 🎯 CLASE PRINCIPAL SIMPLIFICADA
// =============================================================================

// src/core/DocenteAI.ts
import { ResponsesService } from '../ai/ResponsesService';
import { SessionFlow } from '../pedagogy/SessionFlow';
import { SessionStore } from '../data/SessionStore';
import { StructuredOutputs } from '../ai/StructuredOutputs';

export class DocenteAI {
  private responses: ResponsesService;
  private sessionFlow: SessionFlow;
  private sessionStore: SessionStore;

  constructor() {
    this.responses = new ResponsesService();
    this.sessionFlow = new SessionFlow();
    this.sessionStore = new SessionStore();
  }

  // 🚀 API PRINCIPAL - Solo 3 métodos públicos
  async startSession(courseId: string, sessionId: string): Promise<{
    sessionKey: string;
    initialMessage: string;
  }> {
    // Crear sesión
    const sessionKey = await this.sessionStore.create(courseId, sessionId);
    
    // Generar mensaje inicial con Responses API
    const initialMessage = await this.responses.createInitialMessage(sessionKey);
    
    return { sessionKey, initialMessage };
  }

  async handleStudent(sessionKey: string, message: string): Promise<PedagogicalResponse> {
    // Validar y procesar respuesta
    const response = await this.sessionFlow.processStudentMessage(sessionKey, message);
    return response;
  }

  async getSessionInfo(sessionKey: string): Promise<SessionInfo> {
    return this.sessionStore.getInfo(sessionKey);
  }
}

// =============================================================================
// 🤖 SERVICIO DE RESPONSES API
// =============================================================================

// src/ai/ResponsesService.ts
import { OpenAI } from 'openai';
import { StructuredOutputs } from './StructuredOutputs';

export class ResponsesService {
  private client: OpenAI;
  private responseHistory: Map<string, string> = new Map();

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async createResponse(params: {
    sessionKey: string;
    input: string;
    instructions: string;
    schema?: any;
  }): Promise<any> {
    
    // 🚨 NUEVO: Responses API con estado automático
    const response = await this.client.responses.create({
      model: 'gpt-4o-mini', // Modelo por defecto económico
      input: params.input,
      instructions: params.instructions,
      previous_response_id: this.responseHistory.get(params.sessionKey),
      response_format: params.schema ? {
        type: "json_schema",
        json_schema: {
          name: "pedagogical_response",
          schema: params.schema,
          strict: true // 👈 JSON garantizado
        }
      } : undefined,
      store: true, // 👈 Estado gestionado por OpenAI
    });

    // Guardar ID para continuidad
    this.responseHistory.set(params.sessionKey, response.id);

    return response;
  }

  async createInitialMessage(sessionKey: string): Promise<string> {
    const session = await SessionStore.get(sessionKey);
    
    const response = await this.createResponse({
      sessionKey,
      input: "Inicia la clase con saludo pedagógico apropiado",
      instructions: `
Eres un ${session.course.specialist_role}.
Objetivo: ${session.session.learning_objective}
Inicia la clase de manera cálida y profesional.
`,
      schema: StructuredOutputs.PedagogicalResponseSchema
    });

    const parsed = JSON.parse(response.output_text);
    return parsed.respuesta;
  }
}

// =============================================================================
// 📝 ESQUEMAS ESTRUCTURADOS GARANTIZADOS
// =============================================================================

// src/ai/StructuredOutputs.ts
export class StructuredOutputs {
  
  // 🚨 ESQUEMA PRINCIPAL - JSON garantizado por OpenAI
  static PedagogicalResponseSchema = {
    type: "object",
    properties: {
      respuesta: { 
        type: "string", 
        minLength: 10,
        description: "Respuesta del docente al estudiante"
      },
      momento_actual: { 
        type: "string",
        description: "Nombre del momento pedagógico actual"
      },
      progreso: { 
        type: "integer", 
        minimum: 1,
        description: "Número del momento actual"
      },
      total_momentos: { 
        type: "integer", 
        minimum: 1 
      },
      debe_avanzar: { 
        type: "boolean",
        description: "Si se debe avanzar al siguiente momento"
      },
      razon_avance: { 
        type: "string", 
        minLength: 5,
        description: "Razón de por qué se avanza o no"
      },
      siguiente_momento: { 
        type: "string",
        description: "Nombre del siguiente momento"
      },
      preguntas_pendientes: { 
        type: "integer", 
        minimum: 0,
        description: "Número de preguntas sin responder"
      },
      preguntas_respondidas: { 
        type: "integer", 
        minimum: 0 
      }
    },
    required: [
      "respuesta", "momento_actual", "progreso", "total_momentos", 
      "debe_avanzar", "razon_avance", "siguiente_momento", 
      "preguntas_pendientes", "preguntas_respondidas"
    ],
    additionalProperties: false
  };

  // 🎯 TEMPLATES DE PROMPTS REUTILIZABLES
  static buildSystemPrompt(session: any, momento: any): string {
    return `
Eres un ${session.course.specialist_role} especializado en metodología inductiva.

OBJETIVO: ${session.session.learning_objective}
MOMENTO ACTUAL: ${momento.momento}

REGLAS ESTRICTAS:
1. SOLO avanza si preguntas_pendientes = 0
2. SIEMPRE termina con pregunta (excepto si debe_avanzar = true)
3. Responde EXACTAMENTE en formato JSON especificado
4. NUNCA incluyas texto fuera del JSON

PREGUNTAS PENDIENTES:
${session.preguntasPendientes.map((p: string, i: number) => `${i+1}. ${p}`).join('\n')}

CONTENIDO DEL MOMENTO:
${this.getMomentoContent(momento)}
`;
  }

  private static getMomentoContent(momento: any): string {
    if (momento.historia) return `HISTORIA: ${momento.historia}`;
    if (momento.caso) return `CASO: ${momento.caso}`;
    if (momento.contenido_tecnico) return `CONTENIDO: ${momento.contenido_tecnico.join('\n')}`;
    return momento.instrucciones_docenteia || 'N/A';
  }
}

// =============================================================================
// 📚 FLUJO DE SESIÓN SIMPLIFICADO
// =============================================================================

// src/pedagogy/SessionFlow.ts
import { ResponsesService } from '../ai/ResponsesService';
import { QuestionValidator } from './QuestionValidator';
import { SessionStore } from '../data/SessionStore';
import { StructuredOutputs } from '../ai/StructuredOutputs';

export class SessionFlow {
  private responses: ResponsesService;
  private validator: QuestionValidator;

  constructor() {
    this.responses = new ResponsesService();
    this.validator = new QuestionValidator();
  }

  async processStudentMessage(sessionKey: string, message: string): Promise<any> {
    const session = await SessionStore.get(sessionKey);
    const momento = session.momentos[session.currentMomentIndex];

    // 🎯 LÓGICA CENTRAL SIMPLIFICADA
    const isValidResponse = this.validator.validate(message, session.preguntasPendientes[0]);
    
    if (isValidResponse) {
      // Mover pregunta de pendiente a respondida
      session.preguntasPendientes.shift();
      session.preguntasRespondidas.push(session.preguntasPendientes[0]);
    }

    // 🚨 LLAMADA A RESPONSES API CON STRUCTURED OUTPUT
    const response = await this.responses.createResponse({
      sessionKey,
      input: message,
      instructions: StructuredOutputs.buildSystemPrompt(session, momento),
      schema: StructuredOutputs.PedagogicalResponseSchema
    });

    // 🎯 PARSING GARANTIZADO (no más try/catch)
    const parsed = JSON.parse(response.output_text);

    // 🔄 CONTROL DE AVANCE AUTOMÁTICO
    if (parsed.debe_avanzar && session.preguntasPendientes.length === 0) {
      await this.advanceToNextMoment(sessionKey);
    }

    await SessionStore.update(sessionKey, session);
    return parsed;
  }

  private async advanceToNextMoment(sessionKey: string): Promise<void> {
    const session = await SessionStore.get(sessionKey);
    const nextIndex = session.currentMomentIndex + 1;
    
    if (nextIndex < session.momentos.length) {
      session.currentMomentIndex = nextIndex;
      session.preguntasPendientes = session.momentos[nextIndex].preguntas || [];
      session.preguntasRespondidas = [];
      
      console.log(`✅ Avanzando al momento: ${session.momentos[nextIndex].momento}`);
    }
  }
}

// =============================================================================
// 🎯 VALIDADOR SIMPLIFICADO
// =============================================================================

// src/pedagogy/QuestionValidator.ts
export class QuestionValidator {
  
  validate(response: string, question: string): boolean {
    const cleanResponse = response.toLowerCase().trim();
    
    // 🚨 VALIDACIÓN SIMPLE Y EFECTIVA
    
    // Rechazar respuestas obviamente evasivas
    const evasions = ['no sé', 'ok', 'sí', 'ajá', 'eh'];
    if (evasions.includes(cleanResponse) && cleanResponse.length < 6) {
      return false;
    }
    
    // Aceptar respuestas honestas sobre falta de experiencia
    const honestResponses = ['no tengo experiencia', 'nunca he trabajado', 'no he visto'];
    if (honestResponses.some(honest => cleanResponse.includes(honest))) {
      return true;
    }
    
    // Validación mínima de longitud
    return cleanResponse.length >= 4;
  }
}

// =============================================================================
// 💾 ALMACENAMIENTO SIMPLIFICADO
// =============================================================================

// src/data/SessionStore.ts
export class SessionStore {
  private static sessions: Map<string, any> = new Map();

  static async create(courseId: string, sessionId: string): Promise<string> {
    const sessionKey = `${courseId}-${sessionId}`;
    
    // Cargar datos del curso y sesión
    const courseData = await this.loadCourseData(courseId);
    const sessionContent = await this.loadSessionContent(courseId, sessionId);
    
    const session = {
      courseId,
      sessionId,
      course: courseData.courses.find((c: any) => c.id === courseId),
      momentos: sessionContent.momentos,
      currentMomentIndex: 0,
      preguntasPendientes: sessionContent.momentos[0]?.preguntas || [],
      preguntasRespondidas: [],
      startTime: new Date()
    };

    this.sessions.set(sessionKey, session);
    return sessionKey;
  }

  static async get(sessionKey: string): Promise<any> {
    return this.sessions.get(sessionKey);
  }

  static async update(sessionKey: string, session: any): Promise<void> {
    this.sessions.set(sessionKey, session);
  }

  static getInfo(sessionKey: string): any {
    const session = this.sessions.get(sessionKey);
    if (!session) return null;

    return {
      sessionKey,
      progress: `${session.currentMomentIndex + 1}/${session.momentos.length}`,
      currentMoment: session.momentos[session.currentMomentIndex]?.momento,
      pendingQuestions: session.preguntasPendientes.length
    };
  }

  private static async loadCourseData(courseId: string): Promise<any> {
    // Tu lógica existente de carga de cursos
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(__dirname, '../data/courses-database.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }

  private static async loadSessionContent(courseId: string, sessionId: string): Promise<any> {
    // Tu lógica existente de carga de sesiones
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(__dirname, `../data/sessions/${courseId}_${sessionId}.json`);
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }
}

// =============================================================================
// 🎯 TIPOS CENTRALES
// =============================================================================

// src/core/types.ts
export interface PedagogicalResponse {
  respuesta: string;
  momento_actual: string;
  progreso: number;
  total_momentos: number;
  debe_avanzar: boolean;
  razon_avance: string;
  siguiente_momento: string;
  preguntas_pendientes: number;
  preguntas_respondidas: number;
}

export interface SessionInfo {
  sessionKey: string;
  progress: string;
  currentMoment: string;
  pendingQuestions: number;
}

// =============================================================================
// 🚀 USO SIMPLIFICADO
// =============================================================================

// Ejemplo de uso en tu aplicación:
const docente = new DocenteAI();

// Iniciar sesión
const { sessionKey, initialMessage } = await docente.startSession('SSO001', 'sesion03');
console.log(initialMessage);

// Procesar respuesta del estudiante
const response = await docente.handleStudent(sessionKey, 'que se inicia con un amago de fuego');
console.log(response.respuesta);

// Obtener información de sesión
const info = await docente.getSessionInfo(sessionKey);
console.log(`Progreso: ${info.progress}`);