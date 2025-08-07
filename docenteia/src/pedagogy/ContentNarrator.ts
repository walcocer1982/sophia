import { Logger } from '../utils/Logger';

export class ContentNarrator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('ContentNarrator');
  }

  /**
   * 🎯 ¿NECESITA NARRACIÓN?
   */
  needsNarration(moment: any, sessionData: any): boolean {
    // ¿Hay contenido para narrar?
    const hasContent = !!(moment.historia || moment.caso || moment.contenido_tecnico);
    if (!hasContent) return false;
    
    // ¿Ya se narró? (Si hay preguntas respondidas, ya se narró)
    const alreadyNarrated = sessionData.preguntasRespondidas.length > 0;
    
    return hasContent && !alreadyNarrated;
  }

  /**
   * 🎯 OBTENER DESCRIPCIÓN DEL CONTENIDO
   */
  getContentDescription(moment: any): string {
    if (moment.historia) {
      return `📖 HISTORIA: "${moment.historia}"`;
    }
    if (moment.caso) {
      return `📋 CASO: "${moment.caso}"`;
    }
    if (moment.contenido_tecnico) {
      return `🔧 CONTENIDO TÉCNICO:\n${moment.contenido_tecnico.map((item: string, i: number) => `${i+1}. ${item}`).join('\n')}`;
    }
    return 'Sin contenido especial';
  }
}
