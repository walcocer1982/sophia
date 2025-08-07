'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface HeaderProps {
  courseTitle: string
  sessionSubtitle: string
  learningObjective: string
}

export function Header({ courseTitle, sessionSubtitle, learningObjective }: HeaderProps) {
  return (
    <header className="w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-start">
          {/* Lado izquierdo */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {courseTitle}
            </h1>
            <p className="text-lg text-gray-600">
              {sessionSubtitle}
            </p>
          </div>

          {/* Lado derecho */}
          <div className="flex-1 text-right">
            <Badge variant="outline" className="mb-2 bg-blue-50 text-blue-700 border-blue-200">
              Aprendizaje esperado
            </Badge>
            <p className="text-sm text-gray-700 leading-relaxed max-w-md ml-auto">
              {learningObjective}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}

