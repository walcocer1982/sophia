
export function computeForceAdvanceTargets(state: any, nextAskIdx: number): { narrationIdx?: number; askIdx: number } {
  const steps: any[] = state?.plan?.allSteps || [];
  const ask = steps[nextAskIdx];
  if (!ask) return { askIdx: nextAskIdx };
  const targetMoment = ask.momentIndex;
  // Buscar el primer paso "mostrable" en el mismo momento antes del ASK
  let narrationIdx: number | undefined = undefined;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s?.momentIndex !== targetMoment) continue;
    // Solo considerar pasos anteriores al ASK y de tipo narrativo/contenido
    if (s.stepIndex < ask.stepIndex && (s.type === 'NARRATION' || s.type === 'CONTENT')) {
      narrationIdx = i;
      break;
    }
    // Si ya pasamos el ASK, detener
    if (s.stepIndex >= ask.stepIndex) break;
  }
  return { narrationIdx, askIdx: nextAskIdx };
}



