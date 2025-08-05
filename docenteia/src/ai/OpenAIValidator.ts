import { OpenAI } from 'openai';
import { Logger } from '../utils/Logger';

export class OpenAIValidator {
  private static logger = new Logger('OpenAIValidator');

  /**
   * 🔍 Validar API Key y conexión
   */
  static async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = new OpenAI({ apiKey });
      
      // Test simple con minimal cost
      await client.models.list();
      
      this.logger.info('✅ OpenAI API Key validada correctamente');
      return true;
      
    } catch (error: any) {
      if (error.status === 401) {
        this.logger.error('❌ OpenAI API Key inválida');
        throw new Error('OpenAI API Key inválida. Verifica tu configuración.');
      }
      
      this.logger.error(`❌ Error validando OpenAI API: ${error.message}`);
      throw new Error(`Error de conexión con OpenAI: ${error.message}`);
    }
  }

  /**
   * 🎯 Verificar modelo disponible
   */
  static async checkModelAvailability(apiKey: string, model: string = 'gpt-4o-mini'): Promise<boolean> {
    try {
      const client = new OpenAI({ apiKey });
      const models = await client.models.list();
      
      const isAvailable = models.data.some(m => m.id === model);
      
      if (!isAvailable) {
        this.logger.warn(`⚠️ Modelo ${model} no disponible. Usando gpt-3.5-turbo como fallback.`);
        return false;
      }
      
      this.logger.info(`✅ Modelo ${model} disponible`);
      return true;
      
    } catch (error) {
      this.logger.error(`Error verificando modelo: ${error}`);
      return false;
    }
  }
} 