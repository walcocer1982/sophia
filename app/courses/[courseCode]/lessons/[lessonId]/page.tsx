'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import { Header } from '@/components/Header'
import { ChatComponent } from '@/components/ChatComponent'
import { MediaDisplay } from '@/components/MediaDisplay'
import { KeyPointsSidebar } from '@/components/KeyPointsSidebar'
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
        console.log('KEY POINTS:', data?.session?.key_points)
        console.log('KEY POINTS LENGTH:', data?.session?.key_points?.length)
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        courseTitle={courseData.course.name}
        sessionSubtitle={courseData.session.name}
        learningObjective={courseData.session.learning_objective}
      />

      {/* Layout principal */}
      <main className="container mx-auto px-6 py-6">
        <div className={`grid gap-6 ${
          isSidebarOpen 
            ? 'grid-cols-[40%_1fr_30%]' 
            : 'grid-cols-[40%_1fr_0%]'
        } transition-all duration-300`}>
          
          {/* Columna Izquierda - Chat */}
          <div className="h-[calc(100vh-200px)] overflow-hidden">
            <ChatComponent 
              messages={chatHook.messages}
              isLoading={chatHook.isLoading}
              sendMessage={chatHook.sendMessage}
              clearMessages={chatHook.clearMessages}
              messagesEndRef={chatHook.messagesEndRef}
            />
          </div>

          {/* Columna Central - Multimedia */}
          <div className="h-[calc(100vh-200px)]">
            <MediaDisplay mediaContent={{
              type: 'image',
              url: '/api/placeholder/800/600',
              caption: 'Contenido multimedia de la sesión'
            }} />
          </div>

          {/* Columna Derecha - Puntos Clave */}
          <div className="min-h-[calc(100vh-200px)]">
            <KeyPointsSidebar
              keyPoints={keyPoints}
              isOpen={isSidebarOpen}
              onToggle={toggleSidebar}
              onToggleKeyPoint={markKeyPointAsCompleted}
              completedCount={completedCount}
              totalCount={totalCount}
              // 🆕 Props para el progreso pedagógico
              pedagogicalData={chatHook.pedagogicalData || undefined}
              currentMoment={chatHook.currentMoment}
              progress={chatHook.progress}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
