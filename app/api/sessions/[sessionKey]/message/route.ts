import { NextRequest, NextResponse } from 'next/server'
import { DocenteAI } from '../../../../../src/core/DocenteAI'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionKey: string }> }
) {
  try {
    const { sessionKey } = await params
    const { message } = await request.json()
    
    console.log('Procesando mensaje:', { sessionKey, message })
    
    const docente = new DocenteAI()
    const result = await docente.handleStudent(sessionKey, message)
    
    console.log('Respuesta generada:', result)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error procesando mensaje:', error)
    return NextResponse.json({ 
      error: 'Error procesando mensaje',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
