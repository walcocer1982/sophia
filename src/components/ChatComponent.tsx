'use client'

import { useState, KeyboardEvent, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Send, Bot, User } from 'lucide-react'
import { formatTimestamp } from '@/lib/utils'
import { Message } from '@/lib/types'

interface ChatComponentProps {
  messages: Message[]
  isLoading: boolean
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
}

export function ChatComponent({ 
  messages, 
  isLoading, 
  sendMessage, 
  messagesEndRef 
}: ChatComponentProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue)
      setInputValue('')
      
      // Mantener el foco en el input después de enviar usando requestAnimationFrame
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Mantener el foco cuando isLoading cambia a false
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus()
    }
  }, [isLoading])

  return (
    <Card className="h-full flex flex-col overflow-hidden max-h-full">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="h-5 w-5 text-blue-600" />
          Chat con tu profesor IA
        </CardTitle>
      </CardHeader>
      
      <Separator className="flex-shrink-0" />
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
        {/* Área de mensajes con altura fija y scroll */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="space-y-4 pb-4 px-4 pt-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.sender === 'student' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.sender === 'ai' && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src="/api/placeholder/32/32" alt="Sophia" />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                      SF
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message.sender === 'ai'
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {message.sender === 'ai' ? 'Sophia Fuentes' : 'Tú'}
                    </span>
                    <span className="text-xs opacity-70">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>

                {message.sender === 'student' && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src="/api/placeholder/32/32" alt="Estudiante" />
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src="/api/placeholder/32/32" alt="Sophia" />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                    SF
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gray-100 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">Sophia Fuentes</span>
                    <span className="text-xs opacity-70">escribiendo...</span>
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef as React.RefObject<HTMLDivElement>} />
          </div>
        </div>

        <Separator className="flex-shrink-0" />
        
        {/* Área de input fija en la parte inferior */}
        <div className="p-4 flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu pregunta..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
              ref={inputRef}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="sm"
              className="px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
