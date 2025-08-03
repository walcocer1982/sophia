import { OpenAI } from 'openai';
import { OpenAICallParams, OpenAICallResult, CostMetrics } from '../types';
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
    const maxTokens = params.maxTokens || this.calculateOptimalTokens(params.systemPrompt);

    try {
      const response = await this.client.responses.create({
        model,
        instructions: params.systemPrompt,
        input: params.userPrompt,
        max_tokens: maxTokens,
        text: { format: "json_object" },
        tools: params.vectorStoreIds ? [{
          type: "file_search",
          vector_store_ids: params.vectorStoreIds,
          max_num_results: params.maxResults || 3
        }] : undefined
      });

      const metrics = this.costMonitor.calculateMetrics(response.usage, model);
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
    if (tokenCount < 1500) {
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
    
    // Limitar entre 400 y 1000 tokens
    return Math.min(Math.max(baseTokens + (complexity * 100), 400), 1000);
  }

  /**
   * Busca en el vector store
   */
  async searchVectorStore(vectorStoreId: string, query: string, maxResults: number = 3): Promise<any[]> {
    try {
      const results = await this.client.vectorStores.search({
        vector_store_id: vectorStoreId,
        query,
        max_num_results: maxResults
      });

      return results.data || [];
    } catch (error) {
      console.error('Error buscando en vector store:', error);
      return [];
    }
  }

  /**
   * Valida que un archivo existe en el vector store
   */
  async validateFileExists(vectorStoreId: string, fileId: string): Promise<boolean> {
    try {
      const files = await this.client.vectorStores.files.list(vectorStoreId);
      const fileExists = files.data.some(file => file.id === fileId);
      
      if (!fileExists) {
        throw new Error(`Archivo ${fileId} no encontrado en vector store ${vectorStoreId}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error validando archivo:', error);
      throw error;
    }
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
   * Obtiene el cliente OpenAI (para uso interno)
   */
  getClient(): OpenAI {
    return this.client;
  }
} 