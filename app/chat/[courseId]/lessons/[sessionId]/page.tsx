'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function ChatPage() {
  const params = useParams()
  const courseId = params.courseId as string
  const sessionId = params.sessionId as string
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">
          Chat: {courseId} - {sessionId}
        </h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p>Chat funcional aquí...</p>
        </div>
      </div>
    </div>
  )
}
