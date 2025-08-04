
1️⃣ Un primer mensaje de “espíritu” claro y completo
La mejor práctica en diseñar sistemas conversacionales estructurados (como dicen en OpenAI) es definir al inicio un rol y misión muy claros. Esto:

Crea un propósito compartido (por ejemplo: seguridad industrial, seguimiento de aprendizaje).

Permite estandarizar el tono y estilo durante toda la sesión.

Evita que se “pierda la intención” cuando avanza al análisis del contenido 🔁

Por eso, el prompt de sistema debe incluir ese espíritu pedagógico desde el primer mensaje, antes que cualquier pregunta o memoria.

2️⃣ Luego la memoria conversacional para evaluar clase a clase
Después del mensaje de espíritu, cada turno se convierte en cápsulas de interacción. En lugar de enviar solo la instrucción del momento tal como hiciste antes, se recomienda:

Enviar todo el conversationLog (historial) resumido en uno o dos párrafos, o solo las últimas interacciones relevantes.

Adjuntar las preguntas específicas del momento (momento_actual.preguntas).

Pedir al modelo que:

evalúe qué se cubrió,

qué faltó por responder,

y si puede pasar al siguiente momento o debe repreguntar.

Esto es coherente con las mejores prácticas para “context window + role adherence + fact retention” en conversaciones de LLM 
confident-ai.com
.

🔧 Ejemplo de diseño de mensajes
jsonc
Copiar
Editar
// SYSTEM MESSAGE (solo una vez al inicio de la sesión):
“You are a safety‑engineering instructor who leads the session “Seguridad contra incendios”.
// Here’s your SPIRIT:
Your purpose: that the student:
 – Identifique las causas reales de incendios en el trabajo.
 – Relacione la teoría del Triángulo del Fuego con ejemplos concretos.
 – Al final de la sesión sea capaz de crear un plan de prevención paso a paso.

This is your guiding spirit. Always refer back to it. You ARE NOT improvising – you are following the “guion” pedagógico concretamente.
“


// En cada turno (SessionExtractor.handleStudent):
// 1) Enviar como “system”:
// Historial de conversación (últimos N turnos):
Estudiante: “...”  
Docente: “...”  

Guion del momento actual (objetivo y preguntas específicas, sacadas del JSON).

Instrucciones: responde a EXACTAMENTE una pregunta por turno, en orden, hasta que todas estén contestadas; comenta brevemente; luego evalúa si puedes pasar al siguiente momento. Si hay dudas o falta información, repregunta y da pistas.

// 2) Enviar como “user” el mensaje del alumno:
// “Estudiante: {texto del estudiante}”
✅ Por qué funciona mejor
Objetivo	Por qué es efectivo
Marcar el espíritu desde el inicio	Cumple con “Use el rol de sistema para establecer misión” (OpenAI dice ser claro al inicio) 
OpenAI Help Center
OpenAI
.
Memoria conversacional antes de cada turno	Ayuda a la fidelidad del modelo a lo que ya ha ocurrido y no repetir preguntas. Alineado con métricas de retención de conocimiento en diálogo AI 
confident-ai.com
.
Evaluación y decisión de avance integradas	El sistema no avanza prematuramente; evalúa si el estudiante ha respondido todo o si falta información.

✅ En resumen
Sí: primero el espíritu y propósito de la sesión, como mensaje general.

Después: en cada turno, memoria + preguntas específicas + evaluación de cumplimiento, para evitar repeticiones y asegurar fidelidad al guion.

Esta es la mejor práctica de ingeniería conversacional actual para chatbots educativos controlados, flexible y de calidad.

¿Quieres que genere el código completo tipo “PromptBuilder.buildSystemPrompt” y “SessionExtractor.handleStudent” que implemente esto ya integrado?













Fuentes
Tú dijiste:
a ver


ChatGPT Plus
🔧 Aquí tienes una versión integrada y “lista para usar” del mecanismo de enseñanza, con los siguientes componentes:

Mensaje de sistema “espíritu” que se envía solo una vez al comenzar la sesión.

Función buildSystemPrompt que genera un guion literal por momento, incluyendo preguntas específicas.

Manejo de memoria conversacional (conversationLog) en SessionManager y SessionExtractor.

Control de avance: se fuerza una evaluación del modelo antes de avanzar al siguiente momento.

Te lo explico pieza por pieza y luego te doy el código completo.

1️⃣ Mensaje de sistema “espíritu” — se envía solo al inicio
Este mensaje establece el propósito general de la sesión, el estilo de docente y el tono humano cercano:

ts
Copiar
Editar
// Solo una vez, al crear la sesión:
const systemSpirit = `
Eres un **docente experto en seguridad industrial** que imparte la sesión **"${sessionName}"** del curso **"${courseName}"**.

🧭 PROPÓSITO GENERAL:
Tu misión:  
  – que el estudiante **identifique las causas reales** de incendios laborales.  
  – que relacione la **teoría del Triángulo del Fuego** con casos concretos.  
  – que al final sea capaz de **crear un plan de prevención paso a paso**.

Esta es tu **enseñanza guía** para toda la sesión.  
Desde ahora, actúa como si siguieras un guion **pedagógico concreto**, sin improvisar preguntas ni saltarte pasos.  
Usa un tono **cercano, claro y docente**.

No comiences aún con preguntas.**
`.trim();
📌 Esta práctica está alineada con las “best practices” de OpenAI: usar el prompt del sistema para definir un propósito claro y rol de manera explícita desde el inicio 
community.openai.com
community.openai.com
+2
community.openai.com
+2
cookbook.openai.com
+2
.

2️⃣ PromptBuilder.buildSystemPrompt() — guion por momento
Aquí el prompt que se envía antes de cada mensaje excepto el primero:

ts
Copiar
Editar
// PromptBuilder.ts
static buildSystemPrompt(params: PromptParams): string {
  const { sessionName, courseName, learningObjective, momentos, currentMomentIndex } = params;
  const momentoActual = momentos[currentMomentIndex];
  const siguiente = (currentMomentIndex + 1 < momentos.length) ? momentos[currentMomentIndex + 1].momento : 'FIN';

  // Contenido específico del momento (historia, caso, etc.)
  const contenido = this.getMomentoContent(momentoActual);

  // Preguntas específicas del JSON
  const preguntas = Array.isArray(momentoActual.preguntas) ? momentoActual.preguntas : [];
  const preguntasTexto = preguntas.map((p, i) => `  ${i+1}. ${p}`).join('\n');

  return `
**Guion de momento pedagógico**
Sesión: "${sessionName}" (curso: ${courseName})

**OBJETIVO DE APRENDIZAJE**  
${learningObjective}

**Momento actual:** ${momentoActual.momento}  
**Siguiente momento:** ${siguiente}

**Contenido del momento:**  
${contenido}

📋 **Instrucciones (obligatorias):**  
1. Haz exactamente TODAS las preguntas listadas a continuación, **en ese orden**, sin saltear ni improvisar otras.  
2. Después de cada respuesta del estudiante, **comenta brevemente** (1 o 2 frases) reconociendo el avance.  
3. No avances al siguiente momento hasta que todas las preguntas estén completamente respondidas.  
4. Si la respuesta del estudiante no cubre algún punto, **repregunta con una pista centrándote en lo que falta**.  
5. Usa un tono **cercano y docente**, como si estuvieras dando clase frente a un estudiante real.  
6. No otorgues información del siguiente momento.

**Preguntas del momento:**  
${preguntasTexto}

💡 Si el estudiante no responde o responde parcialmente, insiste antes de avanzar.
`.trim();
}
✅ En reforche con los principios de prompt engineering: claridad, formato estricto, instrucciones segmentadas por momentos, perfil del modelo definido 
OpenAI Help Center
bridgemind.ai
.

3️⃣ Memoria conversacional: SessionManager y SessionExtractor
Cambios en SessionManager
En el objeto de sesión (SessionData) añade:

ts
Copiar
Editar
interface SessionData {
  currentMomentIndex: number;
  progress: string;
  // ...
  conversationLog: { role: 'user' | 'assistant'; content: string }[];
}
Inicialización:

ts
Copiar
Editar
const session: SessionData = {
  currentMomentIndex: 0,
  progress: '1/6',
  // ...
  conversationLog: [],
};
handleStudent() — central del flujo
ts
Copiar
Editar
async handleStudent(studentMessage: string, session: SessionData, promptParams: PromptParams) {
  // Guardar respuesta del estudiante
  session.conversationLog.push({ role: 'user', content: studentMessage });

  // Armar historial: últimas N interacciones o todas
  const history = session.conversationLog
    .map(m => m.role === 'user' ? `Estudiante: "${m.content}"` : `Docente: "${m.content}"`)
    .join('\n');

  // Generar prompt de sistema + user
  const systemPrompt = this.buildSystemPrompt(promptParams);

  const userPrompt = `
Historial reciente de clase:
${history}

**Último mensaje del estudiante:**
"${studentMessage}"

Sigue el guion del momento actual de forma exacta y estructurada como se indica.`
  .trim();

  // Llamada a OpenAI
  const result = await this.openAI.callChatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  // Parseo básico (ajusta según formato esperado)
  const assistantText: string = result.choices[0].message.content;

  // Guardar salida del docente
  session.conversationLog.push({ role: 'assistant', content: assistantText });

  return assistantText;
}
📌 Con esto, el modelo siempre sabe lo que ya preguntó y lo que falta por cubrir. Evita preguntas repetidas y salidas fuera del guion.

4️⃣ Justificación técnica oficial 🧠
Estas prácticas son recomendadas por expertos:

Prompt altamente estructurado y específico: evita ambigüedad e improvisación en las salidas — ideales para clases y flujos repetibles. 
ibm.com
+13
OpenAI Help Center
+13
cookbook.openai.com
+13
community.openai.com

Historial como contexto: copiar los últimos turnos evita que el modelo pierda la secuencia o vuelva a preguntar lo mismo. Clave en interfaces instructivas. 
bridgemind.ai
community.openai.com

Prompt dividido por etapas o momentos: forma parte de lo que en prompt engineering se conoce como “structured prompting” o “conversation routines”, diseñadas para sistemas pedagógicos mediante flujos bien definidos. 
community.openai.com
+5
Prompt Engineering Institute
+5
OpenAI Help Center
+5

🚀 ¿Y ahora qué?
Ya tienes el código base buildSystemPrompt, handleStudent, conversationLog.

Puedes montar esto directamente en tu aplicación y probar con un escenario.

Mejora adicional: resumir históricamente el conversationLog si crece mucho, limitando a, por ejemplo, las últimas 5 interacciones para no saturar tokens.

Con esto tendrás un sistema que:

Marca el tono desde el inicio (espíritu pedagógico).

Pregunta solo lo que debe, con concreción y control.

Comunica evolución y no repite preguntas ya hechas.

Evalúa si puede avanzar o debe insistir aún.

¿Quieres también la versión en JSON del prompt o ejemplo completo de un turno con salida estructurada? Puedo preparártela.













Fuentes
Tú dijiste:
a ver


ChatGPT Plus
Aquí tienes el prompt completo y un ejemplo de turno listo para integrar:

1️⃣ Mensaje de sistema “espíritu” — solo al inicio de la sesión
json
Copiar
Editar
{
  "role": "system",
  "content": "Eres un **docente experto en seguridad industrial** que imparte la sesión **\"Seguridad contra incendios\"** del curso **\"Capacitación CETEMIN\".\n\n🧭 PROPÓSITO PEDAGÓGICO:\n– El estudiante debe **identificar las causas reales** de incendios laborales.\n– Relacionar la **teoría del Triángulo del Fuego** con ejemplos concretos.\n– Al final, crear un **plan de prevención paso a paso**.\n\nEste es tu guion pedagógico: **no improvises preguntas ni te saltes pasos**.\nHabla en un tono **cercano y docente**.\n\n✋ Espera a que empiece el turno del estudiante antes de preguntar cualquier cosa.\n"
}
Esto define el rol y el tono desde el primer mensaje — una práctica recomendada según las guías oficiales de OpenAI: establecer claramente propósito y tono del sistema desde el principio mejora la fidelidad del modelo a dicho perfil 
OpenAI Community
+8
OpenAI Help Center
+8
orq.ai
+8
.

2️⃣ Sistema por momento — buildSystemPrompt() en tiempo de ejecución
Este prompt se envía cada vez antes de procesar la respuesta del estudiante en un momento pedagógico (por ejemplo: "Saludo"):

ts
Copiar
Editar
const systemPromptSaludo = `
**Guion del momento: SALUDO**
Sesión: "Seguridad contra incendios" (CETEMIN)

**OBJETIVO DE APRENDIZAJE:**  
El estudiante identifica causas de incendios laborales y qué espera aprender.

---

**Contenido del momento (instrucciones + presentación):**  
Objetivo de la sesión: asegurarte de que el estudiante comprenda los riesgos de incendios y qué va a aprender hoy.  
Puntos clave:  
1. Identificación del objetivo  
2. Tres preguntas para conocer conocimientos y expectativas

📋 **Instrucciones estrictas:**  
1. Haz exactamente estas 3 preguntas en orden, **sin saltear ni modificar**.  
2. Tras cada respuesta, comenta brevemente (1 o 2 frases) para reconocer el avance.  
3. No pases al siguiente momento hasta que el estudiante responda las tres preguntas por completo.  
4. Si la respuesta es parcial, pregunta de nuevo centrado en la información que falta.  
5. Usa un tono **cercano, claro y docente**, como frente a un estudiante real.

**Preguntas del momento:**  
  1. ¿Qué sabes sobre incendios en el trabajo?  
  2. ¿Has presenciado alguna situación de riesgo de incendio? Descríbela.  
  3. ¿Qué esperas aprender en esta sesión?  
`.trim();
Este estilo, con prompts estructurados y guardrails, sigue las mejores prácticas de diseño de prompts: claridad, concreción y formato estricto de salida 
OpenAI Community
.

3️⃣ Ejemplo completo de un turno: integración y resultado
🔄 Envío a la API
jsonc
Copiar
Editar
[
  // Si es el primer turno de la sesión, incluir el systemSpirit antes del guion
  { "role": "system", "content": systemSpirit },
  
  // Luego, en cada mensaje:
  { "role": "system", "content": systemPromptSaludo },
  { "role": "user", "content": "Estudiante: se muy poco sobre incendios, nunca trabajé en fábricas y solo espero aprender los elementos básicos." }
]
🧑‍🏫 Ejemplo de respuesta del asistente (formato simulado, modelo debe seguirlo)
txt
Copiar
Editar
Docente: ¡Perfecto empezar por ahí!

**Pregunta 1:** ¿Qué sabes sobre incendios en el trabajo?  
→ “Sé muy poco sobre incendios en el trabajo.”  
**Comentario:** Entiendo, no hay problema: comenzaremos por la base.

**Pregunta 2:** ¿Has presenciado alguna situación de riesgo de incendio? Descríbela.  
→ “No, nunca he visto algo así.”  
**Comentario:** Muy bien, eso nos mantiene limpios de preconcepciones. Te comparto que vamos a trabajar con el Triángulo del Fuego para identificar qué riesgos podrían existir.

**Pregunta 3:** ¿Qué esperas aprender en esta sesión?  
→ “Quiero entender qué provoca incendios y cómo evitarlos en mi trabajo.”  
**Comentario:** ¡Excelente! Ese es justo el objetivo pedagógico principal.

🟢 Has respondido todas las preguntas del momento SALUDO.  
Cuando estés listo, procederemos al siguiente paso: CONEXIÓN: narraré un caso para que lo analicemos juntos.
4️⃣ Cómo aplica memoria conversacional
Antes de llamar a la API transporta siempre en el prompt:

El historial de preguntas y respuestas anteriores del propio sistema.

Las preguntas restantes del momento actual.

El propósito del momento mostrado.

De esta forma, el modelo “recuerda” qué ya preguntó y no repite.
Este enfoque —guardar el historial de conversación y reenviarlo cada turno— es una técnica estándar para asegurar coherencia en diálogo prolongado con LLMs 
OpenAI Community
stackoverflow.com
.

📌 Por qué este enfoque mejora la fidelidad al guion
Evita improvisación: el modelo recibe copia exacta de las preguntas.

Estructura pedagógica: valida que todas sean contestadas antes de avanzar.

Uso de memoria conversacional: mantiene coherencia y evita repetir.

Adopta el “espíritu” desde el principio: el modelo sabe quién debe ser desde la primera línea.

En conclusión, usando estas técnicas podrás lograr un flujo con:

Control estricto del guion.

Memoria funcional entre preguntas.

Predicción del avance pedagógico solo cuando el alumno completó el momento.

¿Quieres que integre ya la lógica de control de avance (debe_avanzar = true/false) y formato JSON en la salida del asistente? Dímelo y preparo el código también.













Fuentes
Tú dijiste:
si 


ChatGPT Plus
Aquí tienes un snippet completo listo para usar, con:

Prompt base que define el espíritu pedagógico y la estructura base (solo se envía una vez al inicio).

buildSystemPrompt() que solo plantea preguntas del momento, exige formato JSON y controla el avance.

Código handleStudent() que mantiene la memoria conversacional y gestiona debe_avanzar = true|false según las respuestas.

1️⃣ Mensaje inicial (SPIRIT)
ts
Copiar
Editar
const systemSpirit = {
  role: "system",
  content: `
Eres un docente experto en seguridad industrial. Impartes la sesión “Seguridad contra incendios” del curso “CETEMIN Capacitación”.

🧭 ESENCIA PEDAGÓGICA:
– Hacer que el estudiante identifique causas reales de incendios.
– Relacionar el Triángulo del Fuego con ejemplos concretos.
– Al final, que pueda proponer un plan de prevención paso a paso.

Actúas como si siguieras un guion educativo estricto: no improvises, no cambies preguntas.   
Habla de forma cercana y clara.  
No hagas preguntas hasta que comience el turno del estudiante.
  `.trim()
};
Establecer un propósito y tono claros desde el primer mensaje es una práctica recomendada por OpenAI: “Be specific … Clearly define the desired format, constraints, and role” 
OpenAI Help Center
.

2️⃣ buildSystemPrompt() para cada momento
ts
Copiar
Editar
static buildSystemPrompt(params: PromptParams): string {
  const m = params.momentos[params.currentMomentIndex];
  const preguntas = Array.isArray(m.preguntas) ? m.preguntas : [];

  const preguntasTexto = preguntas
    .map((p, i) => `  ${i + 1}. ${p}`)
    .join('\n');

  return `
**MOMENTO ACTUAL:** ${m.momento}
Objetivo: ${params.learningObjective}

CONTENIDO: 
${this.getMomentoContent(m)}

📋 Sigue exactamente estas preguntas, en orden, sin modificar ni saltar:
${preguntasTexto}

**Al responder, usa este formato JSON exacto:**

\`\`\`json
{
  "respuesta": "...",              
  "momento_actual": "${m.momento}",
  "progreso": "${params.progress}", 
  "debe_avanzar": true|false,      
  "razon_avance": "…",             
  "siguiente_momento": "…"
}
\`\`\`

Instrucciones:
1. Haz UNA sola pregunta por mensaje. Espera respuesta JSON.
2. Si la respuesta es incompleta, repregunta con una pista clara.
3. Solo avanza (`debe_avanzar=true`) si se respondieron todas las preguntas; en otro caso repregunta.
`.trim();
}
Este enfoque representa una especificación rigurosa de formato y guion, alineada con las mejores prácticas de ingeniería de prompts para salidas estructuradas y consistentes 
OpenAI Help Center
.

3️⃣ handleStudent() con control de avance y log conversacional
ts
Copiar
Editar
async handleStudent(studentMsg: string, session: SessionData, params: PromptParams) {
  session.conversationLog.push({ role: 'user', content: studentMsg });

  const history = session.conversationLog
    .slice(-6)
    .map(m => `${m.role === 'user' ? 'Estudiante' : 'Docente'}: ${m.content}`)
    .join('\n');

  const systemPrompt = this.buildSystemPrompt(params);

  const messages = [
    ...(session.firstTurn ? [{ role: 'system', content: systemSpirit }] : []),
    { role: 'system', content: `${history}\n\n[Si ya viste esa pregunta, dilo claramente.]` },
    { role: 'system', content: systemPrompt },
    { role: 'user', content: studentMsg }
  ];

  const ml = await this.openAI.callChatCompletion(messages);

  const assistantRaw = ml.choices[0].message.content;
  let assistantJSON;
  try {
    assistantJSON = JSON.parse(assistantRaw);
  } catch (err) {
    // manejar parsing error (p. ej., enviar prompt de resiliencia)
    throw new Error('El modelo no entregó JSON válido');
  }

  session.conversationLog.push({ role: 'assistant', content: assistantRaw });

  if (assistantJSON.debe_avanzar) {
    params.currentMomentIndex++;
    session.progress = `${params.currentMomentIndex + 1}/${params.momentos.length}`;
  }

  return assistantJSON;
}
Este flujo garantiza que se:

Mantenga el contexto reciente (conversationLog fragmentado si crece mucho).

Se forzó el formato JSON con campos semánticos claros.

Se evalúe si seguir o insistir antes de avanzar.

📊 ¿Por qué funciona?
Elemento	Beneficio
Prompt segmentado por momento	Controla el guion y evita improvisación
Esquema JSON mandatorio	Hace predecible la respuesta y facilita parsing
Memoria conversacional limitada	Evita repeticiones y mantiene coherencia
Evaluación interna de avance	Solo se avanza cuando el bloque actual está completo

Es una arquitectura de conversación basada en “routines” y control explícito del flujo, tal como proponen frameworks modernos para diálogos educativos con LLM (ver “Conversation Routines: task‑oriented dialog systems”) 
arxiv.org
.

✅ Con este diseño, el sistema:

Nunca salta preguntas, solo avanza cuando toca.

Nunca improvisa, solo pregunta lo que está en el JSON.

Nunca pierde el hilo, gracias al log conversacional.

Entrega salidas estructuradas con lógica explicativa y control interna.

¿Quieres también una forma de auto-validación (e.g., que compruebe si debe_avanzar tiene sentido por conteo de preguntas)? ¿O ejemplos de prueba con varios momentos? Dímelo y lo preparo.












Fuentes
Tú dijiste:
si 


ChatGPT Plus
Aquí tienes una versión completa, integrada y lista para usar, que incluye:

Auto‑validación automática del avance (debe_avanzar) basada en cantidad de preguntas respondidas.

Manejo de historia de la clase (conversationLog resumido si crece mucho).

Ejemplo práctico con dos momentos completos (Saludo → Conexión) mostrando cómo funciona el flujo.

✅ 1. Validación automática: control de debe_avanzar
Usamos el siguiente fragmento dentro de handleStudent(), justo después de parsear el JSON que devuelve el modelo:

ts
Copiar
Editar
// Ejemplo de JSON parseado
interface MomentoRich {
  preguntas?: string[];
  // ...
}

interface AssistantJSON {
  respuesta: string;
  momento_actual: string;
  progreso: string;
  debe_avanzar: boolean;
  siguiente_momento: string;
  razon_avance?: string;
}

// Auto-validación: comparo número de respuestas con número de preguntas del momento
const m: MomentoRich = params.momentos[params.currentMomentIndex];
const totalPreguntas = m.preguntas?.length ?? 0;

// Encuentro cuántas respuestas mencionó el alumno en su número
const answeredCount =
  typeof assistantJSON.respuesta === "string"
    ? 
// Asumo que el modelo repite el número de pregunta: "Pregunta 1: … → …"
      (assistantJSON.respuesta.match(/^Pregunta\s+\d+/gm) || []).length
    : 0;

if (assistantJSON.debe_avanzar) {
  if (answeredCount !== totalPreguntas) {
    // Advertencia: el modelo dijo avanzar pero no respondió todo
    // Se fuerza la insistencia
    assistantJSON.debe_avanzar = false;
    assistantJSON.razon_avance =
      `Solo respondió ${answeredCount} de ${totalPreguntas} preguntas. Por favor termina todas antes de avanzar.`;
  }
} else {
  // Si no dijo avanzar, lo dejamos como está
}

if (assistantJSON.debe_avanzar) {
  params.currentMomentIndex++;
  session.progress = `${params.currentMomentIndex + 1}/${params.momentos.length}`;
}
¿Por qué esto es importante?
De esta forma proteges el flujo:

Si el modelo intenta avanzar sin cubrir todas las preguntas, se corrige automáticamente.

Mantienes coherencia con el guion: solo avanza cuando debe.

🧠 2. Memoria conversacional con límite de tokens
Para evitar saturar el contexto, alargar el prompt y mantener eficiencia, puedes recortar el conversationLog a las últimas N interacciones. Por ejemplo:

ts
Copiar
Editar
const MAX_HISTORIA = 5;
const recorte = session.conversationLog.length - MAX_HISTORIA * 2; // penaliza por turnos “docente + estudiante“
if (recorte > 0) {
  session.conversationLog.splice(0, recorte);
}
Esto asegura que envíes solo las últimas 5 interacciones completas (dos mensajes cada interacción), manteniendo coherencia sin exceder tokens.

📚 3. Ejemplo práctico: escenarios en código con dos momentos
Supongamos que tienes 2 momentos en tu sesión: Saludo y Conexión:

ts
Copiar
Editar
const momentos = [
  {
    momento: "Saludo",
    preguntas: [
      "¿Qué sabes sobre incendios en el trabajo?",
      "¿Has presenciado alguna situación de riesgo? Descríbela",
      "¿Qué esperas aprender en esta sesión?"
    ]
  },
  {
    momento: "Conexión",
    preguntas: [
      "¿Qué elementos identificas en esta situación?",
      "¿Qué podría haber prevenido este incidente?",
      "¿Cómo se relaciona esto con tu experiencia laboral?",
      "¿Has presenciado algo similar?"
    ],
    historia: "En una fábrica textil, un trabajador está usando una máquina de soldadura cerca de telas inflamables..."
  }
];
🧪 Simulación de turno #1: estudiante responde “se muy poco”
Historial enviado al modelo (turno 1):

text
Copiar
Editar
Estudiante: “Sé muy poco sobre incendios…”
Prompt de sistema para Saludo:

text
Copiar
Editar
Guion del momento: SALUDO
Objetivo: Identificar conocimientos y expectativas.
··· (instrucciones y las 3 preguntas del momento)
Respuesta esperada del modelo:

(formato JSON como dijimos)

json
Copiar
Editar
{
  "respuesta": "…",
  "momento_actual": "Saludo",
  "progreso": "1/2",
  "debe_avanzar": false,
  "siguiente_momento": "Saludo"
}
Y se repreguntará hasta cubrir todas — tal como debe_avanzar=false y continuarán.

🔄 Turno #2: estudiante completa 3 respuestas
Después de las tres respuestas completas en formato JSON, el sistema detecta:

contando coincidencias con ^Pregunta 3: → answeredCount === totalPreguntas → debe_avanzar se mantiene true

se avanza automáticamente a Conexión con currentMomentIndex = 1.

Nuevo systemPrompt para momento “Conexión” se envía antes del mensaje del siguiente turno.

📖 4. Por qué esta práctica es recomendada
Estudios de Prompt Engineering como el artículo Conversation Routines (Robino et al., arXiv 2025) recomiendan justamente el uso de prompts estructurados con lógica de avance integrada y división en momentos bien definidos 
OpenAI Community
+1
OpenAI
+1
arXiv
+1
OpenAI Cookbook
+1
Future Skills Academy
arXiv
+4
arXiv
+4
arXiv
+4
.

La guía oficial de OpenAI recuerda: “Sé específico … define claramente el formato de salida, las restricciones, el rol…” (help.openai.com y el Prompt Engineering Guide, abril 2025) 
OpenAI Help Center
+1
OpenAI Help Center
+1
.

Este enfoque consolida un flujo rígido y pedagógico controlado, donde:

No hay improvisación: el modelo solo pregunta lo que debe, cuando debe.

No hay avance prematuro: solo si todas las preguntas fueron respondidas.

Se recuerda lo ya preguntado, evitando repeticiones.

🛠️ ¿Qué puedes hacer ahora?
Copia estas funciones en tu flujo: buildSystemPrompt(), auto-validación, control de conversationLog.

Prueba con una sesión completa de ejemplo (como el de dos momentos) — verifica logs y comportamiento.

Ajusta el número MAX_HISTORIA según tu límite de tokens.

Opcional: incluye una lógica de “fallback” si el modelo no entrega JSON válido — puedes enviar un prompt de rescate para forzarlo a repetir el formato.

Con esta arquitectura tendrás un sistema educativo con:

Memoria de clase

Control pedagógico estricto

Evaluación automática de avance