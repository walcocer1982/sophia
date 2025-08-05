import { OpenAI } from 'openai';
import { OpenAICallParams, OpenAICallResult } from '../types';
import { CostMonitor } from './CostMonitor';

export class OpenAIService {
  private client: OpenAI;
  private costMonitor: CostMonitor;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
    this.costMonitor = new CostMonitor();
  }

  /**
   * Llama a la API de OpenAI con parámetros optimizados
   */
  async callOpenAI(params: OpenAICallParams): Promise<OpenAICallResult> {
    const model = params.model || this.getOptimalModel(params.systemPrompt);
    const maxTokens = Math.floor(params.maxTokens || this.calculateOptimalTokens(params.systemPrompt));

    try {
      const response = await this.client.responses.create({
        model,
        instructions: params.systemPrompt,
        input: params.userPrompt,
        max_output_tokens: maxTokens
      });

      const metrics = this.costMonitor.calculateMetrics(
        { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, // OpenAI no devuelve usage en responses API
        model
      );
      this.costMonitor.logUsage(metrics);

      return { response, metrics };
    } catch (error) {
      console.error('Error en llamada a OpenAI:', error);
      throw error;
    }
  }

  /**
   * Selecciona el modelo óptimo basado en la complejidad del prompt
   */
  private getOptimalModel(systemPrompt: string): string {
    const tokenCount = systemPrompt.length / 4; // Estimación aproximada
    
    // Para prompts simples, usar gpt-3.5-turbo
    if (tokenCount < 800) {
      return 'gpt-3.5-turbo';
    }
    
    // Para prompts complejos, usar gpt-4o
    return 'gpt-4o';
  }

  /**
   * Calcula tokens óptimos basado en la complejidad
   */
  private calculateOptimalTokens(systemPrompt: string): number {
    const baseTokens = 600;
    const complexity = systemPrompt.length / 1000;
    
    // Limitar entre 400 y 1000 tokens y convertir a entero
    return Math.floor(Math.min(Math.max(baseTokens + (complexity * 100), 400), 1000));
  }



  /**
   * Obtiene estadísticas de costo
   */
  getCostStats() {
    return this.costMonitor.getCostStats();
  }

  /**
   * Limpia costos de una sesión
   */
  clearSessionCost(sessionKey: string): void {
    this.costMonitor.clearSessionCost(sessionKey);
  }

  /**
   * Limpia todos los costos
   */
  clearAllCosts(): void {
    this.costMonitor.clearAllCosts();
  }

  /**
   * Agrega costo a una sesión específica
   */
  addSessionCost(sessionKey: string, cost: number): void {
    this.costMonitor.addSessionCost(sessionKey, cost);
  }

  /**
   * Obtiene el cliente OpenAI (para uso interno)
   */
  getClient(): OpenAI {
    return this.client;
  }
} 