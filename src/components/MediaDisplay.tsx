'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, Play, Pause } from 'lucide-react'
import { MediaContent } from '@/lib/types'

interface MediaDisplayProps {
  mediaContent?: MediaContent
}

export function MediaDisplay({ mediaContent }: MediaDisplayProps) {
  const [isZoomed, setIsZoomed] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  if (!mediaContent) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Contenido Multimedia</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p>No hay contenido multimedia disponible</p>
            <p className="text-sm">El contenido se cargará cuando esté disponible</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleZoomToggle = () => {
    setIsZoomed(!isZoomed)
  }

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Contenido Multimedia</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className={`relative flex-1 ${isZoomed ? 'scale-110' : ''} transition-transform duration-300`}>
          {mediaContent.type === 'image' ? (
            <div className="relative h-full">
              <img
                src={mediaContent.url}
                alt={mediaContent.caption}
                className="w-full h-full object-contain rounded-lg border border-gray-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDgwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW4gZXhwbGljYXRpdmE8L3RleHQ+Cjx0ZXh0IHg9IjQwMCIgeT0iMzMwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5kZWwgdGVtYSBhY3R1YWw8L3RleHQ+Cjwvc3ZnPgo='
                }}
              />
              <div className="absolute top-2 right-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleZoomToggle}
                  className="bg-white/80 hover:bg-white"
                >
                  {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative h-full">
              <video
                src={mediaContent.url}
                className="w-full h-full object-contain rounded-lg border border-gray-200"
                controls
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={(e) => {
                  const target = e.target as HTMLVideoElement
                  target.style.display = 'none'
                  const errorDiv = document.createElement('div')
                  errorDiv.className = 'flex items-center justify-center h-full text-gray-500'
                  errorDiv.innerHTML = '<p>Error al cargar el video</p>'
                  target.parentNode?.appendChild(errorDiv)
                }}
              />
              <div className="absolute top-2 right-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleZoomToggle}
                  className="bg-white/80 hover:bg-white"
                >
                  {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 font-medium">
            {mediaContent.caption}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
