export function shouldAdvanceOnPartial({ cls, teacherProfile, stepData }: any) {
  const tp = teacherProfile || {};
  const thr = (stepData && (stepData as any).partial_thresholds) || tp?.advance?.partial?.thresholds || {};
  const minMatched = Number((thr as any).minMatched ?? 2);
  const maxMissing = Number((thr as any).maxMissing ?? 1);
  const minSem = Number((thr as any).minSem ?? 0.55);
  const matched = Array.isArray(cls?.matched) ? cls.matched.length : Number(cls?.matched || 0);
  const missing = Array.isArray(cls?.missing) ? cls.missing.length : Number(cls?.missing || 0);
  // Permitir que cls.sem sea un número o un objeto { cos }
  const sem = typeof cls?.sem === 'number' ? Number(cls.sem) : Number(cls?.sem?.cos || 0);
  return tp?.advance?.partial?.enabled === true &&
    ((matched >= minMatched && missing <= maxMissing) || (sem >= minSem));
}

export function shouldForceAdvance({ attempts, teacherProfile }: any) {
  const tp = teacherProfile || {};
  const enabled = tp?.advance?.force?.enabled === true;
  const after = Number(tp?.advance?.force?.afterAttempts ?? 3);
  return Boolean(enabled && attempts >= after);
}


