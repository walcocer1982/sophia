import { DEFAULT_TEACHER_PROFILE } from './defaultProfile';

function deepmerge(a: any, b: any): any {
  if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
  if (a && typeof a === 'object' && b && typeof b === 'object') {
    const out: any = { ...a };
    for (const k of Object.keys(b)) out[k] = deepmerge(a?.[k], b[k]);
    return out;
  }
  return b === undefined ? a : b;
}

export function resolveTeacherProfile({ reqProfile, planProfile, stateProfile }:{
  reqProfile?: any; planProfile?: any; stateProfile?: any;
}) {
  return deepmerge(DEFAULT_TEACHER_PROFILE, deepmerge(planProfile || {}, deepmerge(stateProfile || {}, reqProfile || {})));
}


