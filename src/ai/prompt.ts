export type DocenteAction = 'explain' | 'ask' | 'hint' | 'ok' | 'advance' | 'end' | 'ask_simple' | 'ask_options' | 'feedback';

export type DocentePromptContext = {
  language?: string;
  course?: { role?: string; tone?: string; style_guidelines?: string };
  action: DocenteAction;
  stepType: string;
  momentTitle?: string;
  objective?: string;
  contentBody?: string[];
  narrationText?: string;
  caseText?: string;
  questionText?: string;
  acceptable?: string[];
  userAnswer?: string;
  matched?: string[];
  missing?: string[];
  recentHistory?: string[];
  hintWordLimit?: number;
  simpleOptions?: string[];
  optionItems?: string[];
  kind?: 'ACCEPT' | 'PARTIAL' | 'HINT' | 'REFOCUS';
  closureCriteria?: string;
  allowQuestions?: boolean;
};

export function buildSystemPrompt(ctx: DocentePromptContext): string {
  const lang = ctx.language || 'es';
  const role = ctx.course?.role ? `Actúa como ${ctx.course.role}.` : '';
  const tone = ctx.course?.tone ? `Tono: ${ctx.course.tone}.` : '';
  const style = ctx.course?.style_guidelines ? `Guía de estilo: ${ctx.course.style_guidelines}.` : '';
  const rules = [
    `Eres un Docente IA uno-a-uno. Responde en ${lang}.`,
    role,
    tone,
    style,
    'Sigue estrictamente el paso actual del plan. No avances ni mezcles pasos.',
    'Nunca copies literal el JSON; reescribe con tus palabras. Evita viñetas/listas y parágrafos largos.',
    'Preferentemente 2–3 frases por bloque; usar hasta 4–5 cuando el objetivo requiera retroalimentación concreta. Lenguaje claro. No spoilers.',
    'Si el estudiante responde "no sé" repetidamente, reduce dificultad según la acción solicitada.',
    'Normaliza el error y la duda: valida el esfuerzo y anima a continuar antes de orientar.',
    'Al interpretar la respuesta del estudiante, considera equivalencias semánticas razonables (términos extremos/coloquiales ≈ categorías profesionales) y reencuadra con lenguaje técnico sin añadir conceptos fuera del objetivo/contenido.',
    'Mantén continuidad con el último turno: si ya respondió, no repitas la misma pregunta; continúa dentro del paso según el plan.',
    'Evita repetir el mismo ejemplo en turnos consecutivos; varíalo o adáptalo al contexto de la respuesta.',
    'No repitas exactamente la misma idea en dos turnos seguidos; añade un matiz o detalle nuevo.',
    'Solo avanza cuando se cumpla el criterio de cierre del paso actual (si aplica).',
    'En acciones ask, hint, feedback, ask_simple y ask_options no re-narres el caso ni describas la situación inicial; si fuera imprescindible, referencia en UNA sola frase sin repetir detalles. Reserva la narración extensa solo para explain.'
  ].filter(Boolean).join(' ');
  return rules;
}

export function buildUserPrompt(ctx: DocentePromptContext): string {
  const lines: string[] = [];

  // Helpers
  const pushIf = (cond: any, s: string) => { if (cond) lines.push(s.trim()); };
  const hasAny = (...vals: Array<string | string[] | undefined | null>) =>
    vals.some(v => Array.isArray(v) ? v.filter(Boolean).length > 0 : !!v);

  // Header
  pushIf(true, `Momento: ${ctx.momentTitle || ''}`); // permite vacío pero mantiene etiqueta
  pushIf(ctx.objective, `Objetivo: ${ctx.objective}`);

  // Normalizaciones
  const contentItems = Array.from(new Set((ctx.contentBody || [])
    .filter(Boolean)
    .map(s => String(s).trim())))
    .slice(0, 20);
  const safeAnswer = String(ctx.userAnswer || '').trim().slice(0, 300);
  const matched = Array.from(new Set(ctx.matched || [])).filter(Boolean).slice(0, 8);
  const missing = Array.from(new Set(ctx.missing || [])).filter(Boolean).slice(0, 8);
  const recent = (ctx.recentHistory || []).slice(-3).join(' | ');
  pushIf(recent, `Historial reciente: ${recent}`);
  pushIf(ctx.closureCriteria, `Criterio de cierre: ${ctx.closureCriteria}`);

  switch (ctx.action) {
    case 'explain': {
      if (!hasAny(ctx.narrationText, contentItems, ctx.caseText)) {
        lines.push('Faltan insumos para explicar (narración, contenido o caso).');
      }
      const payload = [
        ctx.narrationText ? `Narración: ${ctx.narrationText}` : '',
        contentItems.length ? `Contenido: ${contentItems.join(' | ')}` : '',
        ctx.caseText ? `Caso: ${ctx.caseText}` : ''
      ].filter(Boolean).join('\n');
      pushIf(payload, payload);
      lines.push('Tarea: explica con TUS PALABRAS el contenido en 2–3 frases, sin listas ni preguntas.');
      lines.push('Reglas: si ya se usó este ejemplo, varíalo o adáptalo; no avances si el criterio de cierre no se cumple.');
      break;
    }

    case 'ask': {
      if (!ctx.questionText) lines.push('Falta la pregunta.');
      pushIf(ctx.questionText, `Pregunta: ${ctx.questionText}`);
      lines.push('Tarea: enmarca brevemente y cierra con la PREGUNTA EXACTA tal cual. No añadas contenido nuevo.');
      lines.push('Reglas: si el estudiante ya respondió esta pregunta en el turno previo, no la repitas; produce una transición breve y continúa dentro del paso sin avanzar al siguiente hasta cumplir el criterio de cierre. No re-narres el caso ni repitas la historia.');
      break;
    }

    case 'hint': {
      if (!ctx.questionText) lines.push('Falta la pregunta para la pista.');
      pushIf(ctx.questionText, `Pregunta: ${ctx.questionText}`);
      pushIf(ctx.objective, `Objetivo: ${ctx.objective}`);
      pushIf(contentItems.length, `Pistas de contenido: ${contentItems.join(' | ')}`);
      pushIf(safeAnswer, `Respuesta del estudiante: ${safeAnswer}`);
      pushIf(matched.length, `Aciertos: ${matched.join(', ')}`);
      pushIf(missing.length, `Faltantes: ${missing.join(', ')}`);
      const limit = ctx.hintWordLimit || 18;
      lines.push(
        `Tarea: primero escribe UNA pista (${limit} palabras aprox., sin signos de interrogación) orientada al OBJETIVO (no listar soluciones ni definiciones generales). ` +
        `Si la respuesta del estudiante es "no sé", "no lo sé", "ninguna" o equivalente, empieza con UNA frase breve de empatía/normalización; ` +
        `luego la pista. A continuación, en una línea aparte, UNA sola micro‑pregunta (≤8 palabras) centrada en el objetivo o el primer faltante. Nunca devuelvas solo preguntas.`
      );
      lines.push('Reglas: evita repetir la misma micro‑pregunta usada en el turno previo (usa Historial reciente). No re‑narrar el caso.');
      break;
    }

    case 'ask_simple': {
      if (!ctx.questionText) lines.push('Falta la pregunta.');
      pushIf(ctx.questionText, `Pregunta: ${ctx.questionText}`);
      const opts = Array.from(new Set(ctx.simpleOptions || [])).filter(Boolean).slice(0, 5);
      if (opts.length) {
        lines.push(`Opciones (elige una): ${opts.join(' / ')}`);
      }
      lines.push('Tarea: formula la elección de forma clara y breve. No re‑narrar el caso.');
      break;
    }

    case 'ask_options': {
      if (!ctx.questionText) lines.push('Falta la pregunta.');
      pushIf(ctx.questionText, `Pregunta: ${ctx.questionText}`);
      const items = Array.from(new Set(ctx.optionItems || [])).filter(Boolean).slice(0, 5);
      if (items.length) {
        const labeled = items.map((s, i) => `${String.fromCharCode(65 + i)}) ${s}`);
        lines.push(`Opciones: ${labeled.join(' | ')}`);
      }
      lines.push('Tarea: pide que elija una opción (A, B, C, …) y espera su selección. No re‑narrar el caso.');
      break;
    }

    case 'ok': {
      if (!ctx.questionText) lines.push('Falta la pregunta que se está validando.');
      pushIf(ctx.questionText, `Pregunta: ${ctx.questionText}`);
      pushIf(matched.length, `Aciertos: ${matched.join(', ')}`);
      pushIf(missing.length, `Faltantes: ${missing.join(', ')}`);
      lines.push('Tarea: en 1–2 frases, reconoce lo correcto citando los aciertos y, si aplica, orienta brevemente lo que falta, sin preguntas. No introduzcas contenido nuevo.');
      break;
    }

    case 'advance': {
      lines.push('Tarea: micro‑resumen de cierre (1–2 frases) y puente corto al siguiente foco.');
      break;
    }

    case 'end': {
      lines.push('Tarea: cierre final breve.');
      break;
    }

    case 'feedback': {
      const limit = ctx.hintWordLimit || 3; // número de frases esperado, controlable por policies.feedback.maxSentences via caller
      const allowQ = ctx.allowQuestions !== false; // default: true
      pushIf(true, `Momento: ${ctx.momentTitle || ''}`);
      pushIf(ctx.objective, `Objetivo: ${ctx.objective}`);
      pushIf(ctx.questionText, `Pregunta: ${ctx.questionText}`);
      pushIf(ctx.userAnswer, `Respuesta del estudiante: ${safeAnswer}`);
      pushIf(matched.length, `Aciertos: ${matched.join(', ')}`);
      pushIf(missing.length, `Faltantes: ${missing.join(', ')}`);
      pushIf(contentItems.length, `Pistas de contenido: ${contentItems.join(' | ')}`);
      // Semántica para reencuadre sin hardcodeos
      const sem = [
        Array.isArray(ctx.acceptable) && ctx.acceptable.length ? `Aceptables: ${ctx.acceptable.join(' | ')}` : '',
        matched.length ? `Señales presentes: ${matched.join(' | ')}` : '',
        missing.length ? `Señales faltantes: ${missing.join(' | ')}` : ''
      ].filter(Boolean).join('\n');
      pushIf(sem, sem);
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
        // HINT o evasiva
        lines.push(
          `Tarea (feedback: HINT): escribe ${limit} frases: ` +
          `1) normaliza la duda y anima a continuar (evita repetir empatía si ya fue usada en el turno previo); ` +
          `2) da una pista concreta alineada al objetivo (usa Pistas de contenido o el primer Faltante); si el término es extremo/coloquial, reencuadra con lenguaje profesional. No re‑narrar el caso. ` +
          (allowQ ? `Cierra con UNA micro‑pregunta (≤8 palabras) centrada en el objetivo.` : `No incluyas preguntas.`)
        );
      }
      break;
    }

    default: {
      lines.push(`Acción desconocida: ${String((ctx as any).action)}`);
      break;
    }
  }

  // Limpieza final: sin líneas vacías y con espacios normalizados
  return lines
    .map(s => s.trim())
    .filter(Boolean)
    .join('\n');
}


