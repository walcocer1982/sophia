import { z } from 'zod';

// 🎯 SCHEMA UNIFICADO PARA SESIONES
export const SessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  learning_objective: z.string(),
  key_points: z.array(z.string()),
  momentos: z.array(z.object({
    momento: z.string(),
    preguntas: z.array(z.string()),
    contenido_tecnico: z.array(z.string()).optional(),
    historia: z.string().optional(),
    caso: z.string().optional(),
    instrucciones_docenteia: z.string().optional()
  }))
});

export type SessionData = z.infer<typeof SessionSchema>;

// 🔄 ADAPTER PARA MANTENER COMPATIBILIDAD
export class SessionAdapter {
  static normalize(sessionData: any): SessionData {
    // Manejar formato antiguo (sesion02, sesion03)
    if (sessionData.curso && sessionData.sesion) {
      return {
        id: sessionData.sesion,
        name: sessionData.nombre,
        learning_objective: sessionData.objetivo,
        key_points: sessionData.key_points || [], // Preservar key_points si existen
        momentos: sessionData.momentos
      };
    }
    
    // Formato nuevo ya es compatible
    return SessionSchema.parse(sessionData);
  }
} 