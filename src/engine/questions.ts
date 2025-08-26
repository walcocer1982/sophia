export function isStudentAskingQuestion(input: string, teacherProfile?: any): boolean {
  const normalized = (input || '').toLowerCase().trim();

  // signos de pregunta
  if (/\?\s*$/.test(input || '')) return true;

  // intención de "pedir permiso para preguntar"
  const askIntent = Array.isArray(teacherProfile?.questions?.studentAskPhrases)
    ? teacherProfile.questions.studentAskPhrases
    : [
      'te puedo hacer una pregunta', 'puedo hacer una pregunta', 'tengo una pregunta',
      'tengo una duda', 'una consulta', 'puedo consultar', 'quiero preguntar'
    ];
  if (askIntent.some((p: string) => normalized.includes(p))) return true;

  // aclaraciones explícitas
  const clarification = [
    'no entiendo', 'no comprendo', 'puedes aclarar', '¿puedes aclarar',
    'puedes explicar', 'qué significa', 'cómo es que', 'por qué', 'cuál es',
    'dónde está', 'cuándo', 'quién', 'qué es'
  ];
  return clarification.some((p: string) => normalized.includes(p));
}

export function isAffirmativeToResume(input: string, teacherProfile?: any): boolean {
  const n = (input || '').toLowerCase().trim();
  const ok = Array.isArray(teacherProfile?.questions?.resumeAffirmatives)
    ? teacherProfile.questions.resumeAffirmatives
    : ['sí','si','ok','listo','entendido','claro','ya'];
  if (ok.includes(n) || /^si[,\.!?\s]?/i.test(input||'')) return true;
  const synonyms = ['continuar','seguir','sigamos','seguimos','retomar','reanudar','proseguir','volver'];
  return synonyms.some(s => n.includes(s));
}

export function isGreetingInput(input: string): boolean {
  const n = (input || '').toLowerCase().trim();
  if (!n) return false;
  const greetings = ['hola','buenas','buen día','buen dia','buenas tardes','buenas noches','hey','qué tal','que tal','saludos'];
  return greetings.some(g => n === g || n.startsWith(g));
}

export function isPersonalInfoQuery(input: string): boolean {
  const n = (input || '').toLowerCase();
  if (!n) return false;
  const patterns = [
    /tu\s+nombre/,
    /c[oó]mo\s+te\s+llamas?/,
    /qui[eé]n\s+eres/,
    /eres\s+humano/,
    /qu[eé]\s+modelo/,
    /qui[eé]n\s+te\s+(cre[oó]|program[oó])/,
  ];
  return patterns.some(rx => rx.test(n));
}

// Detección por embeddings (centro de intención de pregunta). Mantiene la versión síncrona como atajo.
import { buildAskIndex, semanticScore } from '@/engine/semvec';

export async function isStudentAskingQuestionSem(input: string, teacherProfile?: any): Promise<boolean> {
  const text = String(input || '').trim();
  if (!text) return false;
  // Si trae signo de pregunta, ya es una pregunta
  if (/\?\s*$/.test(text)) return true;
  const corpus: string[] = Array.isArray(teacherProfile?.questions?.intentCorpus) && teacherProfile.questions.intentCorpus.length
    ? teacherProfile.questions.intentCorpus
    : [
        'tengo una pregunta','tengo una duda','puedo preguntar','quisiera preguntar',
        'puedes aclarar','me puedes explicar','no entiendo esto','necesito aclaración'
      ];
  const tau: number = typeof teacherProfile?.questions?.intentTau === 'number' ? teacherProfile.questions.intentTau : 0.55;
  try {
    const idx = await buildAskIndex(corpus, []);
    const { cos } = await semanticScore(text, idx);
    return cos >= tau;
  } catch {
    return false;
  }
}
