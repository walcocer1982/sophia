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
  preguntas_respondidas: z.number().int().min(0, "Las preguntas respondidas no pueden ser negativas")
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
  momentos: Momento[];
}

export interface Momento {
  momento: string;
  preguntas: string[];
  contenido_tecnico?: string[];
  historia?: string;
  caso?: string;
  instrucciones_docenteia?: string;
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
  // 🆕 Sistema de memoria para evitar repeticiones
  respuestasAnteriores?: string[];
  contenidoNarrado?: string[];
  contadorInteracciones?: number;
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