import { Logger } from './Logger';

interface CostEntry {
  sessionKey: string;
  timestamp: Date;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  currency: string;
}

export class CostTracker {
  private costs: Map<string, CostEntry[]> = new Map();
  private logger: Logger;
  private maxCostPerSession: number;
  private currency: string;

  constructor() {
    this.logger = new Logger('CostTracker');
    this.maxCostPerSession = parseFloat(process.env.MAX_COST_PER_SESSION || '0.50');
    this.currency = process.env.CURRENCY || 'USD';
  }

  /**
   * 📊 Trackear respuesta de OpenAI
   */
  trackResponse(sessionKey: string, response: any): void {
    try {
      const costEntry: CostEntry = {
        sessionKey,
        timestamp: new Date(),
        model: response.model || 'unknown',
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        estimatedCost: this.calculateEstimatedCost(response),
        currency: this.currency
      };

      // Agregar a la sesión
      if (!this.costs.has(sessionKey)) {
        this.costs.set(sessionKey, []);
      }
      this.costs.get(sessionKey)!.push(costEntry);

      // Verificar límite de costo
      this.checkCostLimit(sessionKey);

      this.logger.debug(`Costo trackeado para sesión ${sessionKey}: $${costEntry.estimatedCost.toFixed(4)}`);

    } catch (error) {
      this.logger.error(`Error trackeando costo: ${error}`);
    }
  }

  /**
   * 💰 Calcular costo estimado
   */
  private calculateEstimatedCost(response: any): number {
    const model = response.model || 'gpt-4o-mini';
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;

    // Precios por 1K tokens (aproximados)
    const prices: { [key: string]: { input: number; output: number } } = {
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
    };

    const price = prices[model] || prices['gpt-4o-mini'];
    
    const inputCost = (inputTokens / 1000) * price.input;
    const outputCost = (outputTokens / 1000) * price.output;
    
    return inputCost + outputCost;
  }

  /**
   * ⚠️ Verificar límite de costo
   */
  private checkCostLimit(sessionKey: string): void {
    const sessionCosts = this.costs.get(sessionKey) || [];
    const totalCost = sessionCosts.reduce((sum, entry) => sum + entry.estimatedCost, 0);

    if (totalCost > this.maxCostPerSession) {
      this.logger.warn(`Sesión ${sessionKey} ha excedido el límite de costo: $${totalCost.toFixed(4)} > $${this.maxCostPerSession}`);
    }
  }

  /**
   * 📊 Obtener estadísticas de costo por sesión
   */
  getSessionCosts(sessionKey: string): {
    totalCost: number;
    totalTokens: number;
    responseCount: number;
    averageCost: number;
  } {
    const sessionCosts = this.costs.get(sessionKey) || [];
    
    const totalCost = sessionCosts.reduce((sum, entry) => sum + entry.estimatedCost, 0);
    const totalTokens = sessionCosts.reduce((sum, entry) => sum + entry.inputTokens + entry.outputTokens, 0);
    const responseCount = sessionCosts.length;
    const averageCost = responseCount > 0 ? totalCost / responseCount : 0;

    return {
      totalCost,
      totalTokens,
      responseCount,
      averageCost
    };
  }

  /**
   * 📈 Obtener estadísticas globales
   */
  getGlobalStats(): {
    totalSessions: number;
    totalCost: number;
    totalTokens: number;
    averageCostPerSession: number;
  } {
    let totalCost = 0;
    let totalTokens = 0;
    let totalResponses = 0;

    for (const sessionCosts of this.costs.values()) {
      for (const entry of sessionCosts) {
        totalCost += entry.estimatedCost;
        totalTokens += entry.inputTokens + entry.outputTokens;
        totalResponses++;
      }
    }

    const totalSessions = this.costs.size;
    const averageCostPerSession = totalSessions > 0 ? totalCost / totalSessions : 0;

    return {
      totalSessions,
      totalCost,
      totalTokens,
      averageCostPerSession
    };
  }

  /**
   * 🧹 Limpiar costos de sesión
   */
  clearSessionCosts(sessionKey: string): void {
    this.costs.delete(sessionKey);
    this.logger.info(`Costos limpiados para sesión: ${sessionKey}`);
  }

  /**
   * 📋 Obtener reporte de costos
   */
  getCostReport(): string {
    const stats = this.getGlobalStats();
    
    return `
📊 REPORTE DE COSTOS
===================
Sesiones activas: ${stats.totalSessions}
Costo total: $${stats.totalCost.toFixed(4)} ${this.currency}
Tokens totales: ${stats.totalTokens.toLocaleString()}
Costo promedio por sesión: $${stats.averageCostPerSession.toFixed(4)} ${this.currency}
Límite por sesión: $${this.maxCostPerSession} ${this.currency}
    `.trim();
  }

  /**
   * 🔄 Resetear todos los costos
   */
  reset(): void {
    this.costs.clear();
    this.logger.info('Todos los costos han sido reseteados');
  }
} 