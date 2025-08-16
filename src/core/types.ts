import { z } from 'zod';

// 🚀 ESQUEMAS ZOD PARA VALIDACIÓN GARANTIZADA

export const PedagogicalResponseSchema = z.object({
  respuesta: z.string().min(10, "La respuesta debe tener al menos 10 caracteres"),
  momento_actual: z.string().min(1, "Debe especificar el momento actual"),
  progreso: z.number().int().min(1, "El progreso debe ser un número entero positivo"),
  total_momentos: z.number().int().min(1, "El total de momentos debe ser positivo"),
  debe_avanzar: z.boolean(),
  razon_avance: z.string().min(5, "La razón debe tener al menos 5 caracteres"),
  siguiente_momento: z.string(),
  preguntas_pendientes: z.number().int().min(0, "Las preguntas pendientes no pueden ser negativas"),
  preguntas_respondidas: z.number().int().min(0, "Las preguntas respondidas no pueden ser negativas"),
  // ✨ NUEVOS CAMPOS PARA FEEDBACK Y VALIDACIÓN
  feedback_tipo: z.enum(['POSITIVO', 'CONSTRUCTIVO', 'CORRECTIVO']).optional(),
  respuesta_valida: z.boolean().optional(),
  criterios_cumplidos: z.array(z.string()).optional(),
  nueva_pregunta: z.string().nullable().optional(),
  pistas_graduales: z.array(z.string()).nullable().optional(),
  intentos_restantes: z.number().int().min(0).nullable().optional()
});

export const SessionInfoSchema = z.object({
  sessionKey: z.string().min(1),
  progress: z.string(),
  currentMoment: z.string(),
  pendingQuestions: z.number().int().min(0)
});

// 🎯 TIPOS INFERIDOS DE LOS ESQUEMAS

export type PedagogicalResponse = z.infer<typeof PedagogicalResponseSchema>;
export type SessionInfo = z.infer<typeof SessionInfoSchema>;

// 📚 TIPOS ADICIONALES

export interface Course {
  id: string;
  name: string;
  specialist_role: string;
  description: string;
}

export interface Session {
  id: string;
  name: string;
  learning_objective: string;
  key_points: string[];
}

export interface Momento {
  momento: string;
  preguntas?: string[];
  preguntas_evaluacion?: Array<{
    id_pregunta?: string;
    pregunta: string;
    tipo: string;
    objetivo: string;
    respuestas_aceptables: string[];
  }>;
  contenido_tecnico?: string[];
  historia?: string;
  caso?: string;
  instrucciones_docenteia?: string;
  objetivo?: string;
  contenido_clave?: string[];
  contenido_tecnico_detallado?: any[];
}

export interface SessionData {
  courseId: string;
  sessionId: string;
  course: Course;
  session: Session;
  momentos: Momento[];
  currentMomentIndex: number;
  preguntasPendientes: string[];
  preguntasRespondidas: string[];
  startTime: Date;
  lastActivity: Date;
  // 🆕 Estado pedagógico
  contenidoNarrado?: string[];
  // 🆕 Palabras clave derivadas por momento para clasificación temática
  momentKeywords?: string[][];
  // 🆕 Métricas por momento
  momentMetrics?: Array<{
    contentChunksTotal: number;
    contentChunksShown: number;
    definitionsTotal: number;
    definitionsShown: number;
    questionsTotal: number;
    questionsAsked: number;
  }>;
  // 🆕 Políticas de sesión (configurables por instancia)
  policies?: {
    noSpoilers?: boolean;
    hintStyle?: 'ABSTRACT' | 'KEYWORD';
    vaguePhrases?: string[];
    ackPhrases?: string[];
    forbiddenPhrases?: string[];
  };
}

// 🔧 TIPOS DE CONFIGURACIÓN

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CostTrackingConfig {
  enabled: boolean;
  maxCostPerSession: number;
  currency: string;
}

// 🧠 INTERFACES PARA ANÁLISIS PEDAGÓGICO
export interface ResponseAnalysis {
  contentScore: number;
  relevanceScore: number;
  completenessScore: number;
  pedagogicalValue: number;
  feedback: string;
  extractedConcepts: string[];
  extractedInsights: string[];
  type: 'CORRECT' | 'PARTIALLY_CORRECT' | 'ATTEMPTED' | 'EVADED';
  confidence: number;
  // Motivo opcional de clasificación (para trazabilidad: vaga, incoherente, etc.)
  reasonCode?: 'VAGUE' | 'INCOHERENT' | 'OFF_TOPIC' | 'THRESHOLD';
}