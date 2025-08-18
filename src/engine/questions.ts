export function isStudentAskingQuestion(input: string): boolean {
  const normalized = (input || '').toLowerCase().trim();

  // signos de pregunta
  if (/\?\s*$/.test(input || '')) return true;

  // intención de "pedir permiso para preguntar"
  const askIntent = [
    'te puedo hacer una pregunta', 'puedo hacer una pregunta', 'tengo una pregunta',
    'tengo una duda', 'una consulta', 'puedo consultar', 'quiero preguntar'
  ];
  if (askIntent.some(p => normalized.includes(p))) return true;

  // aclaraciones explícitas
  const clarification = [
    'no entiendo', 'no comprendo', 'puedes aclarar', '¿puedes aclarar',
    'puedes explicar', 'qué significa', 'cómo es que', 'por qué', 'cuál es',
    'dónde está', 'cuándo', 'quién', 'qué es'
  ];
  return clarification.some(p => normalized.includes(p));
}

export function isAffirmativeToResume(input: string): boolean {
  const n = (input || '').toLowerCase().trim();
  return ['sí','si','ok','listo','entendido','claro','ya'].includes(n) || /^si[,\.!\s]?/i.test(input||'');
}
