import type { DocentePromptContext } from './types';

const pushIf = (arr: string[], cond: any, s: string) => { if (cond) arr.push(s.trim()); };
const hasAny = (...vals: Array<string | string[] | undefined | null>) =>
  vals.some(v => Array.isArray(v) ? v.filter(Boolean).length > 0 : !!v);

export function renderExplain(ctx: DocentePromptContext, lines: string[], contentItems: string[]) {
  if (!hasAny(ctx.narrationText, contentItems, ctx.caseText)) {
    lines.push('Faltan insumos para explicar (narración, contenido o caso).');
  }
  const payload = [
    ctx.narrationText ? `Narración: ${ctx.narrationText}` : '',
    contentItems.length ? `Contenido: ${contentItems.join(' | ')}` : '',
    ctx.caseText ? `Caso: ${ctx.caseText}` : ''
  ].filter(Boolean).join('\n');
  pushIf(lines, payload, payload);
  lines.push('Tarea: explica con TUS PALABRAS el contenido en 2–3 frases, sin listas ni preguntas.');
  lines.push('Reglas: si ya se usó este ejemplo, varíalo o adáptalo; no avances si el criterio de cierre no se cumple.');
}

export function renderAsk(ctx: DocentePromptContext, lines: string[]) {
  if (!ctx.questionText) lines.push('Falta la pregunta.');
  pushIf(lines, ctx.questionText, `Pregunta: ${ctx.questionText}`);
  lines.push('Tarea: enmarca brevemente y cierra con la PREGUNTA EXACTA tal cual. No añadas contenido nuevo.');
  lines.push('Reglas: si el estudiante ya respondió esta pregunta en el turno previo, no la repitas; produce una transición breve y continúa dentro del paso sin avanzar al siguiente hasta cumplir el criterio de cierre. No re-narres el caso ni repitas la historia.');
}

export function renderHint(ctx: DocentePromptContext, lines: string[], contentItems: string[], matched: string[], missing: string[]) {
  if (!ctx.questionText) lines.push('Falta la pregunta para la pista.');
  pushIf(lines, ctx.questionText, `Pregunta: ${ctx.questionText}`);
  pushIf(lines, ctx.objective, `Objetivo: ${ctx.objective}`);
  pushIf(lines, contentItems.length, `Pistas de contenido: ${contentItems.join(' | ')}`);
  pushIf(lines, String(ctx.userAnswer || '').trim(), `Respuesta del estudiante: ${String(ctx.userAnswer || '').trim().slice(0, 300)}`);
  pushIf(lines, matched.length, `Aciertos: ${matched.join(', ')}`);
  pushIf(lines, missing.length, `Faltantes: ${missing.join(', ')}`);
  const limit = ctx.hintWordLimit || 18;
  const hu = Number(ctx.hintsUsed || 0);
  const sev = hu <= 0 ? 'S1' : (hu === 1 ? 'S2' : 'S3');
  lines.push(
    `Tarea: primero escribe UNA sola micro‑pregunta (≤8 palabras) que ayude al estudiante a responder según el OBJETIVO específico, y en una línea aparte. ` +
    `Luego, escribe UNA pista (${limit} palabras aprox., sin signos de interrogación) orientada al OBJETIVO (concreta, sin definiciones generales). Nunca devuelvas solo preguntas.`
  );
  lines.push('Formato de salida: EXACTAMENTE 2 líneas; usa etiquetas (solo UNA micro‑pregunta total):');
  lines.push('MICRO: <tu micro‑pregunta (≤8 palabras, solo 1) que ayude al estudiante a responder según el OBJETIVO>');
  lines.push('PISTA: <conéctala explícitamente con el OBJETIVO (sin listas ni definiciones) >');
  lines.push('IMPORTANTE: La micro‑pregunta debe estar DIRECTAMENTE relacionada con el OBJETIVO');
  lines.push('Alinea ambas líneas con los principios: gradualidad cognitiva, andamiaje progresivo, conexión experiencial, diagnóstico continuo, construcción semántica, economía pedagógica y preservación del desafío.');
  lines.push('Evita frases meta o didascálicas (p. ej., "voy a darte una pista" o "esta es una micro‑pregunta"): produce directamente el contenido solicitado.');
  lines.push('MICRO debe apuntar exclusivamente al OBJETIVO (diagnóstico), referenciar si procede algo del Historial reciente o del contexto del estudiante (conexión experiencial) y mantener el desafío (≤8 palabras, sin dar contenido nuevo).');
  lines.push(`PISTA debe ofrecer el apoyo mínimo necesario (andamiaje) conectado al OBJETIVO (economía), sin revelar la respuesta (preservar desafío) y pudiendo introducir gradualmente 1 término clave de la disciplina si aporta (construcción semántica). Límite ≈ ${limit} palabras.`);
  lines.push('No incluyas prefijos como "PISTA:" o "Te doy una pista:" dentro del contenido; usa solo la etiqueta en la línea.');
  if (sev === 'S1') {
    lines.push('Severidad S1: mantén la ayuda breve y concreta, orientada explícitamente al Objetivo. Prefiere micro‑pregunta directa (≤8 palabras). No ofrecer opciones todavía.');
  } else if (sev === 'S2') {
    lines.push('Severidad S2: facilita con opciones; si la acción fuera ask_options se mostrarán 2 alternativas enfocadas al Objetivo. Mantén la micro‑pregunta ≤8 palabras cuando aplique.');
  } else {
    lines.push('Severidad S3: solicita formato "Elemento → función" en UNA frase. Después, prepara transición breve si persiste la duda.');
  }
  lines.push('Reglas: mantén tono cercano; evita definiciones generales y no re‑narrar el caso. No repitas literalmente frases del contenido (por ejemplo, evita repetir "Los procedimientos de seguridad incluyen …"). Evita repetir la misma micro‑pregunta usada en el turno previo (usa Historial reciente). No dupliques frases dentro del mismo mensaje. No añadas líneas extra ni encabezados.');
}

export function renderFeedback(ctx: DocentePromptContext, lines: string[], contentItems: string[], matched: string[], missing: string[]) {
  const limit = ctx.hintWordLimit || 3;
  const allowQ = ctx.allowQuestions !== false;

  // Conversación libre: responder cualquier consulta de forma natural
  if (ctx.conversationMode) {
    lines.push('Modo conversación: responde de forma natural y breve (1–3 frases).');
    lines.push('Si la consulta es personal (tu nombre o identidad), responde: "Puedes llamarme Sophia Fuentes." Si te preguntan por tu sexo (hombre o mujer), responde que no tienes porque eres una IA.');
    lines.push('Si la consulta está fuera de tema, contesta en 1 frase y pivota con una pregunta hacia el objetivo. Replanteado la pregunta si es necesario. ya no vuelva a repetir la pregunta anterior');
    lines.push('Evita re‑narrar casos; no repitas ideas; puedes hacer 1 pregunta breve si ayuda.');
  }

  lines.push(`Momento: ${ctx.momentTitle || ''}`);
  pushIf(lines, ctx.objective, `Objetivo: ${ctx.objective}`);
  pushIf(lines, ctx.questionText, `Pregunta: ${ctx.questionText}`);
  pushIf(lines, String(ctx.userAnswer || '').trim(), `Respuesta del estudiante: ${String(ctx.userAnswer || '').trim().slice(0, 300)}`);
  pushIf(lines, matched.length, `Aciertos: ${matched.join(', ')}`);
  pushIf(lines, missing.length, `Faltantes: ${missing.join(', ')}`);
  pushIf(lines, contentItems.length, `Pistas de contenido: ${contentItems.join(' | ')}`);
  const kind = (ctx.kind || 'HINT').toUpperCase();
  if (kind === 'ACCEPT') {
    lines.push(
      `Tarea (feedback: ACCEPT): escribe hasta ${limit} frases: ` +
      `1) empieza con una frase de refuerzo específica citando 1–2 aciertos (usa Aciertos); ` +
      `2) si procede, orienta brevemente el siguiente foco` + (allowQ ? '' : `, sin preguntas`) + `, sin revelar respuestas. No re‑narrar el caso.`
    );
  } else if (kind === 'PARTIAL') {
    lines.push(
      `Tarea (feedback: PARTIAL): escribe ${limit} frases: ` +
      `1) valida el esfuerzo y nombra lo correcto (usa Aciertos) sin repetir fórmulas de ánimo ya usadas; ` +
      `2) si el término del estudiante es extremo/coloquial (p. ej., "se muere"), infiere su categoría semántica próxima (p. ej., lesión grave por caída) y reencuadra con lenguaje profesional; ` +
      `orienta 1 faltante con una pista concreta alineada al objetivo/contenido (usa Faltantes y Pistas de contenido). ` +
      (allowQ ? '' : `No incluyas preguntas. `) + `Evita definiciones generales y no reveles soluciones completas.`
    );
  } else if (kind === 'REFOCUS') {
    lines.push(
      `Tarea (feedback: REFOCUS): escribe hasta ${limit} frases: ` +
      `1) ofrece ánimo (sin repetirlo si ya fue expresado) y señala con amabilidad el desvío; ` +
      `2) redirige al criterio/objetivo central en forma concreta` + (allowQ ? '' : `, sin preguntas`) + `. No re‑narrar el caso.`
    );
  } else {
    lines.push(
      `Tarea (feedback: HINT): escribe ${limit} frases: ` +
      `1) empieza con “Vamos a …” (tono cercano) y normaliza la duda sin repetir empatía del turno previo; ` +
      `2) da una pista concreta alineada al objetivo (usa Pistas de contenido o el primer Faltante); si el término es extremo/coloquial, reencuadra con lenguaje profesional. No re‑narrar el caso ni repetir frases literales. No dupliques frases.` + (allowQ ? '' : ` No incluyas preguntas.`)
    );
  }
}


