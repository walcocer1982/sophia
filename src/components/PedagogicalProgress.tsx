import React from 'react'

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

interface PedagogicalProgressProps {
  pedagogicalData?: PedagogicalData
}

export function PedagogicalProgress({ pedagogicalData }: PedagogicalProgressProps) {
  if (!pedagogicalData) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Progreso Pedagógico</h3>
        <p className="text-xs text-gray-500">Cargando...</p>
      </div>
    )
  }

  const progressPercentage = (pedagogicalData.progress / pedagogicalData.totalMoments) * 100
  const questionProgressPercentage = pedagogicalData.totalMoments > 0 
    ? (pedagogicalData.answeredQuestions / (pedagogicalData.answeredQuestions + pedagogicalData.pendingQuestions)) * 100
    : 0

  return (
    <div className="p-4 bg-gray-50 rounded-lg space-y-3">
      <h3 className="text-sm font-medium text-gray-700">Progreso Pedagógico</h3>
      
      {/* Progreso de momentos */}
      <div>
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Momentos</span>
          <span>{pedagogicalData.progress}/{pedagogicalData.totalMoments}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Momento actual: {pedagogicalData.currentMoment}
        </p>
      </div>

      {/* Progreso de preguntas */}
      <div>
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Preguntas</span>
          <span>{pedagogicalData.answeredQuestions}/{pedagogicalData.answeredQuestions + pedagogicalData.pendingQuestions}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${questionProgressPercentage}%` }}
          />
        </div>
      </div>

      {/* Estado de avance */}
      {pedagogicalData.shouldAdvance && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-800">
            <strong>Listo para avanzar:</strong> {pedagogicalData.advanceReason}
          </p>
          {pedagogicalData.nextMoment && (
            <p className="text-xs text-yellow-700 mt-1">
              Siguiente: {pedagogicalData.nextMoment}
            </p>
          )}
        </div>
      )}

      {/* Key points completados */}
      {pedagogicalData.completedKeyPoints.length > 0 && (
        <div>
          <p className="text-xs text-gray-600 mb-1">
            Puntos clave completados: {pedagogicalData.completedKeyPoints.length}
          </p>
          <div className="flex flex-wrap gap-1">
            {pedagogicalData.completedKeyPoints.map((kp, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
              >
                {kp}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
