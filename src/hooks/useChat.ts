import { useState, useRef, useEffect } from 'react'
import { Message } from '@/lib/types'
import { generateId } from '@/lib/utils'

interface PedagogicalData {
  currentMoment: string
  progress: number
  totalMoments: number
  shouldAdvance: boolean
  advanceReason: string
  nextMoment: string
  pendingQuestions: number
  answeredQuestions: number
  completedKeyPoints: string[]
}

// Mapeo de rutas en inglés a español para el backend
const ROUTE_MAPPING = {
  'lesson01': 'sesion01',
  'lesson02': 'sesion02',
  'lesson03': 'sesion03'
}

export function useChat(courseCode: string, lessonId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pedagogicalData, setPedagogicalData] = useState<PedagogicalData | null>(null)
  const [currentMoment, setCurrentMoment] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Inicializar sesión cuando se carga el componente
  useEffect(() => {
    if (!isInitialized && courseCode && lessonId) {
      initializeSession()
    }
  }, [courseCode, lessonId, isInitialized])

  const initializeSession = async () => {
    try {
      setIsLoading(true)
      
      // Mapear lessonId a sessionId para el backend
      const sessionId = ROUTE_MAPPING[lessonId as keyof typeof ROUTE_MAPPING] || lessonId
      
      const response = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: courseCode,
          sessionId: sessionId
        })
      })

      if (!response.ok) {
        throw new Error('Error iniciando sesión')
      }

      const data = await response.json()
      setSessionKey(data.sessionKey)
      
      // Agregar mensaje inicial de la IA
      addMessage(data.initialMessage, 'ai')
      
      setIsInitialized(true)
      
    } catch (error) {
      console.error('Error inicializando sesión:', error)
      addMessage('Error iniciando la sesión. Inténtalo de nuevo.', 'ai')
    } finally {
      setIsLoading(false)
    }
  }

  const addMessage = (content: string, sender: 'ai' | 'student') => {
    const newMessage: Message = {
      id: generateId(),
      content,
      sender,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || !sessionKey) return

    // Agregar mensaje del estudiante
    addMessage(content, 'student')

    // Configurar petición al backend
    setIsLoading(true)
    
    try {
      // Usar el backend real con sesiones
      const response = await fetch(`/api/sessions/${sessionKey}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content
        })
      })

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor')
      }

      const data = await response.json()
      
      // Agregar respuesta de la IA
      addMessage(data.respuesta || 'Respuesta de la IA', 'ai')
      
      // Actualizar datos pedagógicos si están disponibles
      if (data.momento_actual) {
        setCurrentMoment(data.momento_actual)
        setProgress(data.progreso || 0)
        
        setPedagogicalData({
          currentMoment: data.momento_actual,
          progress: data.progreso || 0,
          totalMoments: data.total_momentos || 6,
          shouldAdvance: data.debe_avanzar || false,
          advanceReason: data.razon_avance || '',
          nextMoment: data.siguiente_momento || '',
          pendingQuestions: data.preguntas_pendientes || 0,
          answeredQuestions: data.preguntas_respondidas || 0,
          completedKeyPoints: []
        })
      }
      
    } catch (error) {
      console.error('Error enviando mensaje:', error)
      addMessage('Lo siento, hubo un error al procesar tu mensaje. Inténtalo de nuevo.', 'ai')
    } finally {
      setIsLoading(false)
    }
  }

  const clearMessages = () => {
    setMessages([])
  }

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    messagesEndRef,
    pedagogicalData,
    currentMoment,
    progress,
    sessionKey,
    isInitialized
  }
}
