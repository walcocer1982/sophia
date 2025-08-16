export type TransitionAction = 'ask' | 'hint' | 'ask_simple' | 'ask_options' | 'explain' | 'ok';

export type EscalationConfig = {
  noSeToHint?: number;
  hintToAskSimple?: number;
  askSimpleToOptions?: number;
  hardStopToExplain?: number;
};

export function decideNextAction(params: {
  lastAction?: TransitionAction;
  classKind?: 'ACCEPT' | 'PARTIAL' | 'HINT' | 'REFOCUS';
  attempts: number;
  noSeCount: number;
  cfg?: EscalationConfig;
}): { nextAction: TransitionAction; resetNoSe?: boolean } {
  const { lastAction, classKind, attempts, noSeCount, cfg } = params;

  // Acierto explícito del clasificador
  if (classKind === 'ACCEPT') {
    return { nextAction: 'ok', resetNoSe: true };
  }

  // Si hay configuración explícita, respétala
  if (cfg) {
    const toHint = cfg.noSeToHint ?? Number.POSITIVE_INFINITY;
    const toSimple = cfg.hintToAskSimple ?? Number.POSITIVE_INFINITY;
    const toOptions = cfg.askSimpleToOptions ?? Number.POSITIVE_INFINITY;
    const toExplain = cfg.hardStopToExplain ?? Number.POSITIVE_INFINITY;

    if (lastAction === 'ask') {
      if (noSeCount >= toHint) return { nextAction: 'hint' };
      return { nextAction: 'ask' };
    }
    if (lastAction === 'hint') {
      if (noSeCount >= toSimple) return { nextAction: 'ask_simple' };
      return { nextAction: 'hint' };
    }
    if (lastAction === 'ask_simple') {
      if (noSeCount >= toOptions) return { nextAction: 'ask_options' };
      return { nextAction: 'ask_simple' };
    }
    if (lastAction === 'ask_options') {
      if (noSeCount >= toExplain) return { nextAction: 'explain' };
      return { nextAction: 'ask_options' };
    }
    // Fallback config-driven: empezar por ask
    return { nextAction: 'ask' };
  }

  // Sin configuración: preferir feedback primero cuando hay señales parciales
  if (classKind === 'PARTIAL') {
    if (lastAction === 'ask') return { nextAction: 'hint' };
    if (lastAction === 'hint') return { nextAction: 'ask_simple' };
    if (lastAction === 'ask_simple') return { nextAction: 'ask_options' };
    if (lastAction === 'ask_options') return { nextAction: 'explain' };
  } else {
    if (lastAction === 'ask') return { nextAction: 'hint' };
    if (lastAction === 'hint') return { nextAction: 'ask_simple' };
    if (lastAction === 'ask_simple') return { nextAction: 'ask_options' };
    if (lastAction === 'ask_options') return { nextAction: 'explain' };
  }
  return { nextAction: 'ask' };
}


