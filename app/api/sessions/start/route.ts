import { NextRequest, NextResponse } from 'next/server'
import { DocenteAI } from '../../../../src/core/DocenteAI'

export async function POST(request: NextRequest) {
  try {
    const { courseId, sessionId } = await request.json()
    
    console.log('Iniciando sesión:', { courseId, sessionId })
    
    const docente = new DocenteAI()
    const result = await docente.startSession(courseId, sessionId)
    
    console.log('Sesión iniciada:', result)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error iniciando sesión:', error)
    return NextResponse.json({ 
      error: 'Error iniciando sesión',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
