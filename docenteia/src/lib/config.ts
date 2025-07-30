export const config = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || "DocenteIA",
    version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    description: "Sistema estable con Next.js y TypeScript",
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
    timeout: 10000,
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET,
    url: process.env.NEXTAUTH_URL || "http://localhost:3000",
  },
  features: {
    analytics: process.env.NEXT_PUBLIC_GA_ID,
    darkMode: true,
    pwa: false,
  },
} as const;

export type Config = typeof config; 