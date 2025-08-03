import { CostMetrics } from '../types';

export class CostMonitor {
  private static readonly COSTS = {
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 }
  };

  private sessionCosts = new Map<string, number>();
  private totalCost = 0;
  private totalTokens = 0;

  /**
   * Calcula métricas de costo basadas en el uso de tokens
   */
  calculateMetrics(usage: any, model: string): CostMetrics {
    const costs = CostMonitor.COSTS[model as keyof typeof CostMonitor.COSTS];
    if (!costs) {
      console.warn(`Modelo ${model} no encontrado en costos, usando gpt-3.5-turbo`);
      return this.calculateMetrics(usage, 'gpt-3.5-turbo');
    }

    const estimatedCost = (usage.prompt_tokens * costs.input + usage.completion_tokens * costs.output) / 1000;

    return {
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      estimated_cost: estimatedCost,
      model_used: model
    };
  }

  /**
   * Registra el uso de tokens y costo
   */
  logUsage(metrics: CostMetrics, sessionKey?: string): void {
    console.log(`💰 Costo estimado: $${metrics.estimated_cost.toFixed(4)}`);
    console.log(`📊 Tokens: ${metrics.prompt_tokens} + ${metrics.completion_tokens} = ${metrics.total_tokens}`);
    console.log(`🤖 Modelo: ${metrics.model_used}`);

    // Actualizar totales
    this.totalCost += metrics.estimated_cost;
    this.totalTokens += metrics.total_tokens;

    // Actualizar costo por sesión
    if (sessionKey) {
      this.addSessionCost(sessionKey, metrics.estimated_cost);
    }
  }

  /**
   * Obtiene el costo total de una sesión
   */
  getSessionCost(sessionKey: string): number {
    return this.sessionCosts.get(sessionKey) || 0;
  }

  /**
   * Agrega costo a una sesión específica
   */
  addSessionCost(sessionKey: string, cost: number): void {
    const current = this.sessionCosts.get(sessionKey) || 0;
    this.sessionCosts.set(sessionKey, current + cost);
  }

  /**
   * Obtiene estadísticas de costo
   */
  getCostStats(): { totalCost: number; totalTokens: number; sessionCosts: Map<string, number> } {
    return {
      totalCost: this.totalCost,
      totalTokens: this.totalTokens,
      sessionCosts: this.sessionCosts
    };
  }

  /**
   * Limpia los costos de una sesión
   */
  clearSessionCost(sessionKey: string): void {
    this.sessionCosts.delete(sessionKey);
  }

  /**
   * Limpia todos los costos
   */
  clearAllCosts(): void {
    this.sessionCosts.clear();
    this.totalCost = 0;
    this.totalTokens = 0;
  }

  /**
   * Obtiene el costo promedio por sesión
   */
  getAverageSessionCost(): number {
    if (this.sessionCosts.size === 0) return 0;
    const totalSessionCost = Array.from(this.sessionCosts.values()).reduce((sum, cost) => sum + cost, 0);
    return totalSessionCost / this.sessionCosts.size;
  }
} 