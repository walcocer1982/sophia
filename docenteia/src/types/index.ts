// Tipos e interfaces para DocenteIA
export interface Course {
  id: string;
  name: string;
  specialist_role: string;
  vector_store_id: string;
  sessions: Session[];
}

export interface Session {
  id: string;
  name: string;
  file_id: string;
  file_name: string;
  learning_objective: string;
  key_points: string[];
}

export interface Moment {
  momento: string;
  texto: string;
  file_id: string;
}

export interface Fragment {
  texto: string;
  score: number;
}

export interface SessionData {
  courseId: string;
  sessionId: string;
  vectorStoreId: string;
  fileId: string;
  fileName: string;
  course: Course;
  session: Session;
  expectedTheme: string;
  momentos: Moment[];
  fragmentos: Fragment[];
  currentMomentIndex: number;
  startTime: Date;
  lastActivity: Date;
}

export interface AIResponse {
  respuesta: string;
  momento_actual: string;
  progreso: number;
  total_momentos: number;
  debe_avanzar: boolean;
  razon_avance: string;
  siguiente_momento: string;
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
  fragmentos: Fragment[];
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
  vectorStoreIds?: string[];
  maxResults?: number;
}

export interface OpenAICallResult {
  response: any;
  metrics: CostMetrics;
}

export interface VectorStoreSearchParams {
  vectorStoreId: string;
  query: string;
  maxResults?: number;
}

export interface CourseSessionInfo {
  course: Course;
  session: Session;
  vectorStoreId: string;
  fileId: string;
  fileName: string;
} 