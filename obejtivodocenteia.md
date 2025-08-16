1) Capa de textualización docente (LLM-orchestrator)
Explica y pregunta “como docente” a partir de cada step (NARRATION/CONTENT/ASK), con persona, tono y estilo.
El motor determinista decide el paso; el LLM solo redacta con variedad, ejemplos y analogías. ok
2) Persona y estilo por curso
Inyectar course.specialist (rol, tono, guías de estilo).
Variar frases guía: “Ahora te explico…”, “Buen intento…”, “Estamos por buen camino…”, evitando repeticiones.
3) Política de turnos por tipo de step
NARRATION/CONTENT: 2–3 frases máximas sin listas ni copiar literal; no pregunta en ese turno.
ASK: formular la pregunta exacta del JSON; validar; si no alcanza, re‑preguntar con micro-variación.
4) Guardarraíles de avance
Umbrales claros (evidencia mínima: paráfrasis, ejemplo, justificación breve).
No avanzar si faltan preguntas del momento o la evidencia no cumple.
5) Evaluación semántica con rúbrica ligera
Matching contra acceptable_answers, y respaldo con objective/expected.
Parcialidades (matched/missing), y decisión ok/hint/refocus/advance.
6) Pistas escalonadas integradas al plan
Pista 1 (≈10 palabras), Pista 2 (≈20), Pista 3 (casi explicativa), derivadas de acceptable_answers y contentBody, sin spoilers.
7) Manejo de atascos y fuera de foco
Detección de DONT_KNOW/IRRELEVANT reiterado; reconduce al objetivo o micro-contenido.
Anti‑bucle y anti‑repetición de la misma pregunta.
8) Señalización y transiciones pedagógicas
Micro‑resumen de cierre + puente al siguiente objetivo/paso.
“Te adelanto qué veremos ahora…” sin spoilear respuestas.
9) Memoria de sesión docente
Intentos por pregunta, pistas usadas, matched/missing.
Referencias a aportes previos del estudiante para personalizar.
10) Biblioteca de preguntas socráticas y reformulaciones
Micro‑preguntas de descomposición (≤8 palabras), alternativas A/B, enfoques por taxonomía (recuerdo, comprensión, aplicación…).
11) Anti‑repetición y deduplicación
Normalización y filtros para no repetir la misma pregunta o frase en turnos consecutivos.
12) Narrativa con “voz docente”
Reescritura del body en texto corrido, ejemplos laborales breves, lenguaje sencillo, evitando bullets y copia literal.
13) Cierre de momento y metacognición
Checklist de objetivos alcanzados y “qué te llevas”, mini‑reflexión o plan de acción.
14) Adaptación de dificultad
Si responde con solvencia, ir a preguntas de mayor nivel; si no, simplificar y ejemplificar.
15) Métricas y trazabilidad
contentShown/Total, asksAsked/Total, attempts/hints per ask.
Logs de decisiones (acción, razón, paso).
16) Validación y saneo del JSON
Asegurar steps completos y ordenados; sin preguntas en NARRATION.
Contenido en CONTENT.body; pregunta solo en ASK.
17) Internacionalización y normas de estilo
Longitudes máximas por bloque, tono consistente, emojis/énfasis opcionales según curso.
18) UI docente
Marcar visualmente: “Explicación”, “Pregunta”, “Pista”.
Mostrar progreso por momento y paso sin distraer.
19) Pruebas de flujo end‑to‑end
Casos típicos: correcto a la primera, parcial, “no lo sé”, offtopic, reiteración.
Tests de anti‑repetición y de avance.
20) Fallbacks robustos
Si falta ASK, generar una de verificación coherente; si falta CONTENT, sintetizar a partir de KEY_*.