import teachingGuide from '../data/teaching-guide.json';

export interface TeachingMoment {
  momento: string;
  titulo: string;
  descripcion: string;
  ejemplos: string[];
}

export interface TeachingGuide {
  rol_docente_ia: string;
  tipo_sesion: string;
  modalidad: string;
  momentos: TeachingMoment[];
}

// Cargar la guía de enseñanza
export function getTeachingGuide(): TeachingGuide {
  return teachingGuide as TeachingGuide;
}

// Obtener un momento específico
export function getTeachingMoment(momentoId: string): TeachingMoment | null {
  const guide = getTeachingGuide();
  return guide.momentos.find(m => m.momento === momentoId) || null;
}

// Obtener todos los momentos
export function getAllTeachingMoments(): TeachingMoment[] {
  const guide = getTeachingGuide();
  return guide.momentos;
}

// Generar prompt específico para un momento
export function generateMomentPrompt(momentoId: string, sessionContent: string): string {
  const moment = getTeachingMoment(momentoId);
  if (!moment) {
    return `¿Qué dice el ${momentoId} del contenido ${sessionContent}?`;
  }

  const randomExample = moment.ejemplos[Math.floor(Math.random() * moment.ejemplos.length)];
  
  return `Actúa como un ${getTeachingGuide().rol_docente_ia} en modalidad ${getTeachingGuide().modalidad}.

${moment.titulo}: ${moment.descripcion}

Ejemplo de interacción: "${randomExample}"

Ahora, basándote en el contenido del ${momentoId} del archivo ${sessionContent}, desarrolla este momento de la clase de manera natural y pedagógica. Incluye:
1. Una introducción al contenido específico del momento
2. Preguntas interactivas basadas en el material
3. Ejemplos prácticos relacionados
4. Verificación de comprensión

Contenido a consultar: ¿Qué dice el ${momentoId} del contenido ${sessionContent}?`;
} 