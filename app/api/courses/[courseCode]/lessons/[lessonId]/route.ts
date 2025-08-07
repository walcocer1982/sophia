import { NextRequest, NextResponse } from 'next/server'

// Datos de ejemplo para el desarrollo - luego se conectará al backend real
const SAMPLE_COURSE_DATA = {
  SSO001: {
    lesson01: {
      course: {
        id: "SSO001",
        name: "Seguridad y Salud Ocupacional",
        specialist_role: "Especialista en Seguridad y Salud Ocupacional"
      },
      session: {
        id: "lesson01",
        name: "Sesión 01: Fundamentos de Seguridad",
        learning_objective: "El estudiante identifica los principios básicos de seguridad y comprende los fundamentos de la prevención",
        key_points: [
          {
            id: "kp-1",
            title: "Comprende qué es la seguridad ocupacional",
            description: "Conceptos básicos y definiciones fundamentales de seguridad en el trabajo",
            completed: false
          },
          {
            id: "kp-2", 
            title: "Identifica los riesgos básicos en el trabajo",
            description: "Reconoce y clasifica los diferentes tipos de riesgos laborales",
            completed: false
          },
          {
            id: "kp-3",
            title: "Aplica principios básicos de prevención",
            description: "Implementa medidas preventivas básicas en el ambiente laboral",
            completed: false
          }
        ]
      }
    },
    lesson02: {
      course: {
        id: "SSO001",
        name: "Seguridad y Salud Ocupacional", 
        specialist_role: "Especialista en Seguridad y Salud Ocupacional"
      },
      session: {
        id: "lesson02",
        name: "Sesión 02: Procedimientos de Seguridad en el Trabajo",
        learning_objective: "El estudiante aplica procedimientos de seguridad en situaciones específicas del trabajo",
        key_points: [
          {
            id: "kp-1",
            title: "Comprende qué son los procedimientos de seguridad",
            description: "Entiende la importancia y estructura de los procedimientos de seguridad",
            completed: false
          },
          {
            id: "kp-2",
            title: "Identifica elementos básicos de un procedimiento",
            description: "Reconoce los componentes esenciales que debe tener todo procedimiento de seguridad",
            completed: false
          },
          {
            id: "kp-3",
            title: "Reconoce los Equipos de Protección Personal (EPP)",
            description: "Identifica y selecciona correctamente los EPP según la situación",
            completed: false
          },
          {
            id: "kp-4",
            title: "Aplica procedimientos en situaciones específicas",
            description: "Ejecuta procedimientos de seguridad en contextos reales de trabajo",
            completed: false
          }
        ]
      }
    }
  }
}

// Mapeo de rutas en inglés a español para el backend
const ROUTE_MAPPING = {
  'lesson01': 'sesion01',
  'lesson02': 'sesion02',
  'lesson03': 'sesion03'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseCode: string; lessonId: string }> }
) {
  try {
    const { courseCode, lessonId } = await params
    
    console.log('API Route - courseCode:', courseCode, 'lessonId:', lessonId)
    
    // Buscar datos en nuestro sample data
    const courseData = SAMPLE_COURSE_DATA[courseCode as keyof typeof SAMPLE_COURSE_DATA]
    
    if (!courseData) {
      console.log('Curso no encontrado:', courseCode)
      return NextResponse.json({ 
        error: 'Curso no encontrado',
        availableCourses: Object.keys(SAMPLE_COURSE_DATA)
      }, { status: 404 })
    }
    
    const sessionData = courseData[lessonId as keyof typeof courseData]
    
    if (!sessionData) {
      console.log('Sesión no encontrada:', lessonId)
      return NextResponse.json({ 
        error: 'Sesión no encontrada',
        availableSessions: Object.keys(courseData)
      }, { status: 404 })
    }
    
    console.log('Datos encontrados:', sessionData)
    
    return NextResponse.json(sessionData)
    
  } catch (error) {
    console.error('Error en API route:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
