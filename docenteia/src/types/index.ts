// Tipos e interfaces para DocenteIA
export interface Course {
  id: string;
  name: string;
  specialist_role: string;
  sessions: Session[];
}

export interface Session {
  id: string;
  name: string;
  session_file?: string; // Archivo JSON de la sesión (opcional)
  learning_objective: string;
  key_points: string[];
  theme_keywords: string[];
}

export interface Moment {
  momento: string;
  instrucciones_docenteia?: string;
  contenido_tecnico?: string[];
  historia?: string;
  caso?: string;
  preguntas?: string[];
}

export interface SessionData {
  courseId: string;
  sessionId: string;
  sessionFile: string;
  course: Course;
  session: Session;
  expectedTheme: string;
  momentos: Moment[];
  currentMomentIndex: number;
  startTime: Date;
  lastActivity: Date;
  sessionContent?: any; // Contenido completo de la sesión desde JSON
  conversationLog: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>; // Memoria conversacional
  isFirstTurn: boolean; // Para enviar el mensaje de "espíritu" solo una vez
  preguntasPendientes: string[]; // Preguntas pendientes del momento actual
  preguntasRespondidas: string[]; // Preguntas ya respondidas del momento actual
}

export interface AIResponse {
  respuesta: string;
  momento_actual: string;
  progreso: number;
  total_momentos: number;
  debe_avanzar: boolean;
  razon_avance: string;
  siguiente_momento: string;
  momentos?: Moment[];
  sessionKey?: string;
  pregunta_actual?: string;
  preguntas_pendientes?: number;
  preguntas_respondidas?: number;
}

export interface CostMetrics {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  model_used: string;
}

export interface SessionInfo {
  sessionKey: string;
  course: string;
  session: string;
  currentMoment: string;
  progress: string;
  startTime: Date;
  lastActivity: Date;
}

export interface CacheStats {
  cacheSize: number;
  sessionsSize: number;
  activeSessions: number;
}

export interface PromptParams {
  specialistRole: string;
  sessionName: string;
  courseName: string;
  learningObjective: string;
  keyPoints: string[];
  momentos: Moment[];
  currentIndex: number;
}

export interface UserPromptContext {
  currentMoment: string;
  progress: string;
}

export interface OpenAICallParams {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
}

export interface OpenAICallResult {
  response: any;
  metrics: CostMetrics;
}

 