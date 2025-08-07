'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Circle, ChevronLeft, ChevronRight, Target } from 'lucide-react'
import { KeyPoint } from '@/lib/types'
import { PedagogicalProgress } from './PedagogicalProgress'

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

interface KeyPointsSidebarProps {
  keyPoints: KeyPoint[]
  isOpen: boolean
  onToggle: () => void
  onToggleKeyPoint: (id: string) => void // Solo para uso interno de la IA
  completedCount: number
  totalCount: number
  pedagogicalData?: PedagogicalData
  currentMoment?: string
  progress?: number
}

export function KeyPointsSidebar({
  keyPoints,
  isOpen,
  onToggle,
  onToggleKeyPoint,
  completedCount,
  totalCount,
  pedagogicalData,
  currentMoment,
  progress
}: KeyPointsSidebarProps) {
  console.log('KeyPointsSidebar - keyPoints:', keyPoints)
  console.log('KeyPointsSidebar - isOpen:', isOpen)
  console.log('KeyPointsSidebar - completedCount:', completedCount)
  console.log('KeyPointsSidebar - totalCount:', totalCount)
  if (!isOpen) {
    return (
      <div className="relative">
        <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-10">
                  <Button
          onClick={onToggle}
          variant="outline"
          size="sm"
          className="rounded-l-lg rounded-r-none border-r-0 bg-white shadow-lg hover:bg-gray-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-green-600" />
            Puntos Clave
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {completedCount}/{totalCount} completados
          </Badge>
        </div>
      </CardHeader>
      
      <Separator />
      
      <CardContent className="flex-1 p-0">
        <div className="p-4 space-y-3">
          {/* Los puntos clave son marcados como completados por la IA, no por el estudiante */}
          {keyPoints.map((keyPoint) => (
            <div
              key={keyPoint.id}
              className={`p-3 rounded-lg border transition-all duration-200 ${
                keyPoint.completed
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {keyPoint.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-medium mb-1 ${
                    keyPoint.completed ? 'text-green-800' : 'text-gray-900'
                  }`}>
                    {keyPoint.title}
                  </h4>
                  <p className={`text-xs ${
                    keyPoint.completed ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {keyPoint.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {completedCount === totalCount && totalCount > 0 && (
          <div className="p-4 bg-green-50 border-t border-green-200">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-800">
                ¡Excelente! Has completado todos los puntos clave
              </p>
            </div>
          </div>
        )}
        
        {/* Componente de progreso pedagógico */}
        <div className="p-4 border-t border-gray-200">
          <PedagogicalProgress pedagogicalData={pedagogicalData} />
        </div>
      </CardContent>
    </Card>
  )
}
