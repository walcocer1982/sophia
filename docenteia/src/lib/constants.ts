export const APP_CONFIG = {
  name: "DocenteIA",
  version: "1.0.0",
  description: "Sistema estable con Next.js y TypeScript",
  author: "Tu Nombre",
  repository: "https://github.com/tu-usuario/docenteia",
} as const;

export const API_ENDPOINTS = {
  base: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
  auth: "/auth",
  users: "/users",
  courses: "/courses",
} as const;

export const ROUTES = {
  home: "/",
  about: "/about",
  contact: "/contact",
  dashboard: "/dashboard",
} as const;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const; 