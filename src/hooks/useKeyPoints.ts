import { useState, useEffect, useMemo } from 'react'
import { KeyPoint } from '@/lib/types'

export function useKeyPoints(initialKeyPoints: KeyPoint[]) {
  console.log('useKeyPoints - initialKeyPoints:', initialKeyPoints)
  console.log('useKeyPoints - initialKeyPoints length:', initialKeyPoints?.length)
  
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>(initialKeyPoints || [])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Actualizar keyPoints cuando cambien los initialKeyPoints
  useEffect(() => {
    console.log('useKeyPoints - useEffect triggered with:', initialKeyPoints)
    if (initialKeyPoints && initialKeyPoints.length > 0) {
      setKeyPoints(initialKeyPoints)
    }
  }, [initialKeyPoints])

  console.log('useKeyPoints - keyPoints state:', keyPoints)
  console.log('useKeyPoints - keyPoints state length:', keyPoints?.length)

  // Solo la IA puede marcar puntos como completados
  const markKeyPointAsCompleted = (id: string) => {
    setKeyPoints(prev => 
      prev.map(kp => 
        kp.id === id ? { ...kp, completed: true } : kp
      )
    )
  }

  const resetKeyPoints = () => {
    setKeyPoints(prev => 
      prev.map(kp => ({ ...kp, completed: false }))
    )
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const completedCount = keyPoints.filter(kp => kp.completed).length
  const totalCount = keyPoints.length

  console.log('useKeyPoints - returning keyPoints:', keyPoints)
  console.log('useKeyPoints - returning completedCount:', completedCount)
  console.log('useKeyPoints - returning totalCount:', totalCount)

  return {
    keyPoints,
    isSidebarOpen,
    markKeyPointAsCompleted,
    resetKeyPoints,
    toggleSidebar,
    completedCount,
    totalCount
  }
}
