import { NextRequest, NextResponse } from 'next/server'

// Respuestas de ejemplo para desarrollo
const SAMPLE_RESPONSES = [
  "¡Excelente pregunta! En seguridad ocupacional, es fundamental entender que cada procedimiento tiene un propósito específico.",
  "Los procedimientos de seguridad son secuencias de pasos diseñadas para realizar tareas de forma segura.",
  "Los EPP (Equipos de Protección Personal) deben seleccionarse según el riesgo específico de cada tarea.",
  "La señalización es crucial para advertir sobre peligros y guiar comportamientos seguros.",
  "Los protocolos de emergencia deben ser conocidos por todos los trabajadores antes de comenzar cualquier tarea."
]

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()
    
    console.log('Chat API - Mensaje recibido:', message)
    
    // Simular procesamiento de IA
    const randomResponse = SAMPLE_RESPONSES[Math.floor(Math.random() * SAMPLE_RESPONSES.length)]
    
    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const response = {
      respuesta: randomResponse,
      pedagogicalData: {
        currentMoment: "Aplicación",
        progress: 60,
        totalMoments: 6,
        shouldAdvance: false,
        advanceReason: "",
        nextMoment: "Discusión",
        pendingQuestions: 2,
        answeredQuestions: 3,
        completedKeyPoints: ["kp-1", "kp-2"]
      }
    }
    
    console.log('Chat API - Respuesta enviada:', response)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error en Chat API:', error)
    return NextResponse.json({ 
      error: 'Error procesando mensaje',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
