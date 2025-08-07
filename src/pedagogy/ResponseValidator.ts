import { Logger } from '../utils/Logger';

export class ResponseValidator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('ResponseValidator');
  }

  /**
   * 🎯 VALIDAR RESPUESTA - LÓGICA SIMPLE
   */
  isValidResponse(message: string): boolean {
    const cleaned = message.toLowerCase().trim();
    
    // Respuestas evasivas
    if (this.isEvasive(cleaned)) return false;
    
    // Muy corta
    if (cleaned.length < 5) return false;
    
    // Respuestas honestas (válidas)
    if (this.isHonestResponse(cleaned)) return true;
    
    // Longitud mínima aceptable
    return cleaned.length >= 8;
  }

  /**
   * 🔧 MÉTODOS AUXILIARES
   */
  private isEvasive(text: string): boolean {
    const evasive = ['no sé', 'ok', 'sí', 'no', 'eh', 'ajá'];
    return evasive.some(pattern => text === pattern);
  }

  private isHonestResponse(text: string): boolean {
    const honest = ['no tengo experiencia', 'nunca he trabajado', 'soy nuevo'];
    return honest.some(pattern => text.includes(pattern));
  }

  getHelpMessage(message: string): string {
    const cleaned = message.toLowerCase().trim();
    
    if (this.isEvasive(cleaned)) {
      return 'No te preocupes si no sabes la respuesta exacta. Usa tu experiencia o sentido común.';
    }
    
    return 'Intenta dar un poco más de detalle sobre tu respuesta.';
  }
}
