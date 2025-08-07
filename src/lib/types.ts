export interface Message {
  id: string
  content: string
  sender: 'ai' | 'student'
  timestamp: Date
}

export interface KeyPoint {
  id: string
  title: string
  description: string
  completed: boolean
}

export interface MediaContent {
  type: 'image' | 'video'
  url: string
  caption: string
}

export interface Course {
  code: string
  title: string
  description: string
}

export interface Lesson {
  id: string
  title: string
  subtitle: string
  learningObjective: string
  keyPoints: KeyPoint[]
  mediaContent?: MediaContent
}
