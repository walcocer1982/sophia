import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Configurar cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Función para cargar la base de datos de cursos
function loadCoursesDatabase() {
  try {
    const filePath = path.join(process.cwd(), 'src', 'data', 'courses-database.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data).courses;
  } catch (error) {
    console.error('Error al cargar la base de datos de cursos:', error);
    return [];
  }
}

// Función para obtener información completa del curso
function getCourseInfo(courseId: string) {
  const courses = loadCoursesDatabase();
  const course = courses.find((c: any) => c.id === courseId);
  return course;
}

// Función para obtener información completa de la sesión con datos del curso
function getSessionInfoWithCourse(sessionId: string, courseId?: string) {
  const courses = loadCoursesDatabase();
  let course;
  
  if (courseId) {
    course = getCourseInfo(courseId);
  } else {
    // Buscar en todos los cursos
    course = courses.find((c: any) => 
      c.sessions.some((s: any) => s.id === sessionId)
    );
  }
  
  if (!course) return null;
  
  const session = course.sessions.find((s: any) => s.id === sessionId);
  if (!session) return null;
  
  return {
    ...session,
    course: {
      id: course.id,
      name: course.name,
      specialist_role: course.specialist_role
    }
  };
}

// Función para consultar el vector store de OpenAI usando el SDK oficial
export async function queryOpenAIVectorStore(
  query: string,
  sessionId?: string,
  courseId?: string
): Promise<string> {
  try {
    // Obtener información completa de la sesión
    const sessionInfo = getSessionInfoWithCourse(sessionId || '', courseId);
    
    if (!sessionInfo) {
      return 'No se encontró la sesión especificada.';
    }

    // Construir prompt dinámico con información del curso
    const systemPrompt = `Eres un ${sessionInfo.course.specialist_role}.

CURSO: ${sessionInfo.course.name}
SESIÓN: ${sessionInfo.name}
OBJETIVO DE APRENDIZAJE: ${sessionInfo.learning_objective}

PUNTOS CLAVE DE LA SESIÓN:
${sessionInfo.key_points.map((point: string, index: number) => `${index + 1}. ${point}`).join('\n')}

ARCHIVO: ${sessionInfo.file_name}

INSTRUCCIONES:
- Si la consulta pide "¿Qué dice el MOMENTO_X...?" responde SOLO con el contenido específico de ese momento.
- Si la consulta pide generar preguntas, actúa como docente conversacional y empático.
- Basarte ÚNICAMENTE en el contenido específico del archivo.
- Orientar las preguntas hacia los puntos clave de la sesión.
- No inventes información que no esté en el archivo.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: query
        }
      ],
      max_tokens: 1500,
      temperature: 0.3
    });

    return completion.choices[0]?.message?.content || 'No se pudo generar una respuesta.';
  } catch (error) {
    console.error('Error al consultar vector store de OpenAI:', error);
    return `Error al consultar el vector store de OpenAI: ${error instanceof Error ? error.message : 'Error desconocido'}`;
  }
} 