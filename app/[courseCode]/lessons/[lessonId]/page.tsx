'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import { Header } from '@/components/Header'
import ImprovedChatLayout from '@/components/ImprovedChatLayout'
import { useKeyPoints } from '@/hooks/useKeyPoints'
import { useChat } from '@/hooks/useChat'

interface CourseData {
  course: {
    id: string
    name: string
    specialist_role: string
  }
  session: {
    id: string
    name: string
    learning_objective: string
    key_points: Array<{
      id: string
      title: string
      description: string
      completed: boolean
    }>
  }
}

interface LessonPageProps {
  params: Promise<{
    courseCode: string
    lessonId: string
  }>
}

export default function LessonPage({ params }: LessonPageProps) {
  // Usar React.use() para await params
  const { courseCode, lessonId } = use(params)
  
  const [courseData, setCourseData] = useState<CourseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar datos del curso desde el backend
  useEffect(() => {
    const loadCourseData = async () => {
      try {
        setLoading(true)
        // Usar la ruta de API correcta
        const response = await fetch(`/api/courses/${courseCode}/lessons/${lessonId}`)

        if (!response.ok) {
          throw new Error('No se pudo cargar los datos del curso')
        }

        const data = await response.json()
        setCourseData(data)
        console.log('COURSE DATA COMPLETE:', data)
        console.log('SESSION DATA:', data?.session)
        console.log('KEY POINTS:', data?.session?.key_points)
        console.log('KEY POINTS LENGTH:', data?.session?.key_points?.length)
        console.log('KEY POINTS TYPE:', typeof data?.session?.key_points)
      } catch (error) {
        console.error('Error cargando datos del curso:', error)
        setError('Error cargando datos del curso')
      } finally {
        setLoading(false)
      }
    }

    loadCourseData()
  }, [courseCode, lessonId])
  console.log('page.tsx - about to call useKeyPoints with:', courseData?.session.key_points)
  
  // 🆕 Usar datos del curso para key points
  const {
    keyPoints,
    isSidebarOpen,
    markKeyPointAsCompleted,
    toggleSidebar,
    completedCount,
    totalCount
  } = useKeyPoints(courseData?.session.key_points || [])

  // 🆕 Obtener datos del chat con parámetros
  const chatHook = useChat(courseCode, lessonId)

  console.log('page.tsx - useKeyPoints returned keyPoints:', keyPoints)
  // Mostrar loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando curso...</p>
        </div>
      </div>
    )
  }

  // Mostrar error
  if (error || !courseData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error || 'No se pudieron cargar los datos'}</p>
          <p className="text-gray-600">Verifica que el curso y la sesión existan</p>
        </div>
      </div>
    )
  }

  // Preparar datos para el nuevo layout
  const sessionMoments = [
    { id: 1, title: 'Saludo y Bienvenida', description: 'Presentación del tema y objetivos' },
    { id: 2, title: 'Introducción a Procedimientos', description: 'Conceptos fundamentales' },
    { id: 3, title: 'Elementos de un Procedimiento', description: 'Componentes esenciales' },
    { id: 4, title: 'Equipos de Protección Personal', description: 'Identificación y uso' },
    { id: 5, title: 'Aplicación Práctica', description: 'Casos de uso reales' },
    { id: 6, title: 'Evaluación y Cierre', description: 'Resumen y próximos pasos' }
  ];

  return (
    <ImprovedChatLayout
      messages={chatHook.messages}
      isLoading={chatHook.isLoading}
      sendMessage={chatHook.sendMessage}
      messagesEndRef={chatHook.messagesEndRef}
      keyPoints={keyPoints}
      currentMoment={parseInt(chatHook.currentMoment) || 1}
      sessionMoments={sessionMoments}
      courseName={courseData.course.name}
      courseCode={courseCode}
      lessonName={courseData.session.name}
    />
  )
}
