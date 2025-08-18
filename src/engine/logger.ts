import type { SessionState } from '@/session/state';
import type { EscalationResponse } from './eval-escalation';
import type { AdaptCommand } from './planner';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogEvent = {
  timestamp: string;
  level: LogLevel;
  event: string;
  sessionId?: string;
  data: Record<string, any>;
};

class EngineLogger {
  private logs: LogEvent[] = [];
  private debugMode: boolean;

  constructor() {
    this.debugMode = process.env.ENGINE_DEBUG === 'true' || 
                    process.env.NEXT_PUBLIC_ENGINE_DEBUG === 'true';
  }

  private log(level: LogLevel, event: string, data: Record<string, any> = {}, sessionId?: string) {
    const logEvent: LogEvent = {
      timestamp: new Date().toISOString(),
      level,
      event,
      sessionId,
      data
    };

    this.logs.push(logEvent);

    // Log a consola si está en modo debug
    if (this.debugMode) {
      console.log(`[${level.toUpperCase()}] ${event}:`, data);
    }
  }

  // Eventos del motor
  engineTurnStart(sessionId: string, stepIdx: number, stepType: string) {
    this.log('info', 'engine.turn.start', { stepIdx, stepType }, sessionId);
  }

  engineTurnEnd(sessionId: string, stepIdx: number, action: string) {
    this.log('info', 'engine.turn.end', { stepIdx, action }, sessionId);
  }

  // Eventos de evaluación
  evaluationStart(sessionId: string, askCode: string, studentResponse: string) {
    this.log('info', 'evaluation.start', { askCode, responseLength: studentResponse.length }, sessionId);
  }

  evaluationResult(sessionId: string, askCode: string, result: 'ACCEPT' | 'HINT' | 'REASK', reason?: string) {
    this.log('info', 'evaluation.result', { askCode, result, reason }, sessionId);
  }

  escalationTriggered(sessionId: string, askCode: string, reason: string) {
    this.log('info', 'escalation.triggered', { askCode, reason }, sessionId);
  }

  escalationResult(sessionId: string, askCode: string, result: EscalationResponse) {
    this.log('info', 'escalation.result', { askCode, decision: result.decision, reason: result.reason }, sessionId);
  }

  // Eventos de planificación adaptativa
  adaptationPlanned(sessionId: string, command: AdaptCommand) {
    this.log('info', 'adaptation.planned', { 
      op: command.op, 
      targetAskCode: command.targetAskCode,
      reason: command.reason 
    }, sessionId);
  }

  adaptationApplied(sessionId: string, command: AdaptCommand, success: boolean) {
    this.log('info', 'adaptation.applied', { 
      op: command.op, 
      success,
      reason: command.reason 
    }, sessionId);
  }

  // Eventos de presupuesto
  budgetCheck(sessionId: string, tier: string, allowed: boolean, budgetLeft: number) {
    this.log('info', 'budget.check', { tier, allowed, budgetLeft }, sessionId);
  }

  budgetUsage(sessionId: string, tier: string, cost: number, tokens: number) {
    this.log('info', 'budget.usage', { tier, cost, tokens }, sessionId);
  }

  budgetLimit(sessionId: string, tier: string) {
    this.log('warn', 'budget.limit', { tier }, sessionId);
  }

  // Eventos de avance
  advancementAccept(sessionId: string, stepIdx: number, askCode: string) {
    this.log('info', 'advancement.accept', { stepIdx, askCode }, sessionId);
  }

  advancementReject(sessionId: string, stepIdx: number, askCode: string, reason: string) {
    this.log('info', 'advancement.reject', { stepIdx, askCode, reason }, sessionId);
  }

  // Eventos de error
  error(sessionId: string, error: string, context?: Record<string, any>) {
    this.log('error', 'engine.error', { error, context }, sessionId);
  }

  // Métricas de sesión
  sessionMetrics(sessionId: string, state: SessionState, budgetMetrics: any) {
    this.log('info', 'session.metrics', {
      stepIdx: state.stepIdx,
      momentIdx: state.momentIdx,
      attemptsByAskCode: state.attemptsByAskCode,
      escalationsUsed: state.escalationsUsed,
      budgetCentsLeft: state.budgetCentsLeft,
      adaptiveMode: state.adaptiveMode,
      budgetMetrics
    }, sessionId);
  }

  // Obtener logs para auditoría
  getLogs(): LogEvent[] {
    return [...this.logs];
  }

  // Exportar logs en formato JSONL
  exportJSONL(): string {
    return this.logs.map(log => JSON.stringify(log)).join('\n');
  }

  // Limpiar logs (útil para sesiones largas)
  clear() {
    this.logs = [];
  }
}

// Instancia global del logger
export const engineLogger = new EngineLogger();

// Funciones de conveniencia para uso directo
export const log = {
  turnStart: (sessionId: string, stepIdx: number, stepType: string) => 
    engineLogger.engineTurnStart(sessionId, stepIdx, stepType),
  
  turnEnd: (sessionId: string, stepIdx: number, action: string) => 
    engineLogger.engineTurnEnd(sessionId, stepIdx, action),
  
  evalStart: (sessionId: string, askCode: string, response: string) => 
    engineLogger.evaluationStart(sessionId, askCode, response),
  
  evalResult: (sessionId: string, askCode: string, result: 'ACCEPT' | 'HINT' | 'REASK', reason?: string) => 
    engineLogger.evaluationResult(sessionId, askCode, result, reason),
  
  escalation: (sessionId: string, askCode: string, result: EscalationResponse) => 
    engineLogger.escalationResult(sessionId, askCode, result),
  
  adaptation: (sessionId: string, command: AdaptCommand) => 
    engineLogger.adaptationPlanned(sessionId, command),
  
  budget: (sessionId: string, tier: string, cost: number, tokens: number) => 
    engineLogger.budgetUsage(sessionId, tier, cost, tokens),
  
  error: (sessionId: string, error: string, context?: Record<string, any>) => 
    engineLogger.error(sessionId, error, context),
  
  metrics: (sessionId: string, state: SessionState, budgetMetrics: any) => 
    engineLogger.sessionMetrics(sessionId, state, budgetMetrics)
};
