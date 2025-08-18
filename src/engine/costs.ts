// Configuración de costos por modelo (en centavos por 1K tokens)
const COST_CONFIG = {
  cheap: 0.5,    // gpt-4o-mini
  embed: 0.1,    // text-embedding-3-small  
  thinker: 2.5   // o3-mini
};

// Estimación de tokens por tipo de operación
const TOKEN_ESTIMATES = {
  response: 150,    // Respuesta típica
  embedding: 50,    // Embedding de texto
  escalation: 200   // Escalación con razonamiento
};

export type CostTier = 'cheap' | 'embed' | 'thinker';

export class BudgetManager {
  private budgetCentsLeft: number;
  private usageByTier: Record<CostTier, number> = {
    cheap: 0,
    embed: 0,
    thinker: 0
  };

  constructor(initialBudgetCents: number = 100) {
    this.budgetCentsLeft = initialBudgetCents;
  }

  // Verificar si se puede usar un tier específico
  canUseTier(tier: CostTier): boolean {
    const estimatedCost = this.estimateCost(tier);
    return this.budgetCentsLeft >= estimatedCost;
  }

  // Registrar uso y actualizar presupuesto
  recordUsage(tier: CostTier, actualTokens?: number): number {
    const tokens = actualTokens || TOKEN_ESTIMATES[tier === 'embed' ? 'embedding' : 'response'];
    const cost = (tokens / 1000) * COST_CONFIG[tier];
    
    this.usageByTier[tier] += tokens;
    this.budgetCentsLeft = Math.max(0, this.budgetCentsLeft - cost);
    
    return cost;
  }

  // Estimación de costo para una operación
  private estimateCost(tier: CostTier): number {
    const tokens = TOKEN_ESTIMATES[tier === 'embed' ? 'embedding' : 'response'];
    return (tokens / 1000) * COST_CONFIG[tier];
  }

  // Obtener métricas de uso
  getUsageMetrics() {
    return {
      budgetCentsLeft: this.budgetCentsLeft,
      usageByTier: { ...this.usageByTier },
      totalCost: 100 - this.budgetCentsLeft,
      canEscalate: this.canUseTier('thinker')
    };
  }

  // Verificar si se puede escalar (thinker)
  canEscalate(): boolean {
    return this.canUseTier('thinker') && this.budgetCentsLeft > 10;
  }

  // Forzar modo económico (solo cheap)
  forceCheapMode(): boolean {
    return this.budgetCentsLeft < 5;
  }
}

// Instancia global del gestor de presupuesto
let globalBudgetManager: BudgetManager | null = null;

export function getBudgetManager(): BudgetManager {
  if (!globalBudgetManager) {
    globalBudgetManager = new BudgetManager();
  }
  return globalBudgetManager;
}

export function resetBudgetManager(budgetCents: number = 100): BudgetManager {
  globalBudgetManager = new BudgetManager(budgetCents);
  return globalBudgetManager;
}

// Wrapper para pickModel que respeta el presupuesto
export function pickModelWithBudget(tier: CostTier): string {
  const budgetManager = getBudgetManager();
  
  // Si no hay presupuesto para el tier solicitado, degradar
  if (!budgetManager.canUseTier(tier)) {
    if (tier === 'thinker') return process.env.CHEAP_MODEL || 'gpt-4o-mini';
    if (tier === 'embed') return process.env.CHEAP_MODEL || 'gpt-4o-mini';
    return process.env.CHEAP_MODEL || 'gpt-4o-mini';
  }
  
  // Usar el modelo original
  if (tier === 'thinker') return process.env.THINKER_MODEL || 'o3-mini';
  if (tier === 'embed') return process.env.EMBED_MODEL || 'text-embedding-3-small';
  return process.env.CHEAP_MODEL || 'gpt-4o-mini';
}
