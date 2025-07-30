
import courseData from '../data/courses-database.json';

export interface Session {
  id: string;
  name: string;
  file_id: string;
  file_name: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  sessions: Session[];
  metadata: {
    total_sessions: number;
    total_files: number;
    created_at: string;
    last_updated: string;
  };
}

export interface CourseDatabase {
  courses: Course[];
}

// Función para buscar una sesión basada en la consulta
export function findSessionByQuery(query: string): Session | null {
  const queryLower = query.toLowerCase();
  
  // Buscar en todos los cursos
  for (const course of courseData.courses) {
    for (const session of course.sessions) {
      // Buscar por ID de sesión
      if (queryLower.includes(session.id.toLowerCase())) {
        return session;
      }
      
      // Buscar por nombre de sesión
      if (queryLower.includes(session.name.toLowerCase())) {
        return session;
      }
      
      // Buscar por nombre de archivo
      if (queryLower.includes(session.file_name.toLowerCase())) {
        return session;
      }
    }
  }
  
  return null;
}

// Función para obtener todas las sesiones disponibles
export function getAllSessions(): Session[] {
  const sessions: Session[] = [];
  
  for (const course of courseData.courses) {
    sessions.push(...course.sessions);
  }
  
  return sessions;
}

// Función para obtener información de una sesión específica
export function getSessionInfo(sessionId: string): Session | null {
  for (const course of courseData.courses) {
    const session = course.sessions.find(s => s.id === sessionId);
    if (session) {
      return session;
    }
  }
  
  return null;
} 