import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import DOMPurify from 'dompurify'
import { z } from 'zod'
import { Course, Lesson, Message } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html)
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Validación de URLs para multimedia
export const urlSchema = z.string().url()

export function isValidUrl(url: string): boolean {
  try {
    urlSchema.parse(url)
    return true
  } catch {
    return false
  }
}

// Datos de ejemplo para la aplicación
export const sampleCourse: Course = {
  code: 'SSO001',
  title: 'Seguridad y Salud Ocupacional',
  description: 'Curso fundamental sobre seguridad en el trabajo'
}

export const sampleLesson: Lesson = {
  id: 'lesson02',
  title: 'Seguridad y Salud Ocupacional',
  subtitle: 'Sesión 2: Procedimientos de Seguridad en el Trabajo',
  learningObjective: 'El estudiante aplica procedimientos de seguridad en situaciones específicas del trabajo',
  keyPoints: [
    {
      id: 'kp-1',
      title: 'Comprende qué son los procedimientos de seguridad',
      description: 'Entiende la importancia y estructura de los procedimientos de seguridad',
      completed: false
    },
    {
      id: 'kp-2',
      title: 'Identifica elementos básicos de un procedimiento',
      description: 'Reconoce los componentes esenciales que debe tener todo procedimiento de seguridad',
      completed: false
    },
    {
      id: 'kp-3',
      title: 'Reconoce los Equipos de Protección Personal (EPP)',
      description: 'Identifica y selecciona correctamente los EPP según la situación',
      completed: false
    },
    {
      id: 'kp-4',
      title: 'Aplica procedimientos en situaciones específicas',
      description: 'Ejecuta procedimientos de seguridad en contextos reales de trabajo',
      completed: false
    }
  ],
  mediaContent: {
    type: 'image',
    url: '/api/placeholder/800/600',
    caption: 'Imagen explicativa del tema actual'
  }
}

// Mensajes de ejemplo para el chat
export const sampleMessages: Message[] = [
  {
    id: '1',
    content: '¡Hola! Soy Sophia, tu instructora de seguridad industrial. En esta sesión vamos a aprender sobre actos y condiciones subestándar. ¿Qué sabes sobre este tema?',
    sender: 'ai',
    timestamp: new Date(Date.now() - 300000)
  },
  {
    id: '2',
    content: 'Hola Sophia, no sé mucho sobre el tema, pero me interesa aprender.',
    sender: 'student',
    timestamp: new Date(Date.now() - 240000)
  },
  {
    id: '3',
    content: '¡Perfecto! Vamos a empezar desde lo básico. Un acto subestándar es cualquier acción o comportamiento que se desvía de los procedimientos seguros establecidos. Por ejemplo, no usar el equipo de protección personal.',
    sender: 'ai',
    timestamp: new Date(Date.now() - 180000)
  },
  {
    id: '4',
    content: 'Entiendo, ¿y qué es una condición subestándar?',
    sender: 'student',
    timestamp: new Date(Date.now() - 120000)
  },
  {
    id: '5',
    content: 'Excelente pregunta. Una condición subestándar es cualquier situación en el ambiente de trabajo que no cumple con los estándares de seguridad. Por ejemplo, tener cables eléctricos expuestos o pasillos obstruidos.',
    sender: 'ai',
    timestamp: new Date(Date.now() - 60000)
  }
]
