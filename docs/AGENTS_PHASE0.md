## Fase 0 — Preparación para OpenAI Agents SDK

Objetivo: establecer métricas, umbrales, flags de despliegue y criterios de aceptación para migración agentic, manteniendo la calidad pedagógica.

### 1) Métricas y umbrales propuestos
- No‑sé encadenados tras S2: objetivo reducir ≥30%
  - Línea base: medir % actual de turnos con tercer "no sé" dentro de una misma `ASK`
  - Umbral de éxito: ≤70% del valor base después del despliegue
- Pertinencia de MICRO vs `objective`: ≥80%
  - Método: muestreo de 50 pistas por módulo (M2–M4) con checklist binaria
- Repetición textual detectada por guardrails: ~0%
  - Patrón: evitar frases genéricas (p. ej., “Los procedimientos de seguridad incluyen …”) y duplicados intra‑mensaje
- Tiempo a completar M2/M3 (turnos): mantener o reducir ≤10% sin pérdida de acierto
  - Control: comparar medianas pre/post
- Satisfacción percibida de pista (encuesta 1‑5): +0.5 puntos respecto a base

### 2) Flags de rollout y plan A/B
- Feature flags
  - `agents.enabled`: activa el agente y loop con tools
  - `agents.guardrails.output`: valida formato (MICRO/PISTA/PUENTE, longitudes, anti‑repetición)
  - `agents.handoffs.enabled`: delegación a sub‑agentes (fase 3)
  - `agents.realtime.enabled`: voz (opcional)
- Gradual rollout
  - 10% → 30% → 60% → 100% de sesiones nuevas por `sessionKey` hash
  - Rollback rápido desactivando flags
- A/B tests sugeridos
  - S1 con analogías vs sin analogías
  - Límite de palabras de `PISTA` (16/24/32)
  - Threshold de `force_advance` (3 vs 4)

### 3) Alineación con objetivos, policies y aptitudes
- Objetivos
  - Cada `ASK` usa `objective` del plan; no derivar desde “expectativas” cuando exista objetivo específico
- Policies del curso
  - `hints.wordLimits`, `allowForcedOn`, `forceNoSeThreshold`, `allowQuestions`
- Aptitudes del docente (0..1)
  - `claridad` (longitud/resumen), `socratismo` (re‑ask vs hint), `calidez` (tono), `rigor` (umbrales), `ritmo` (avance)
- Criterios de aceptación por acción
  - hint: exactamente 2 líneas `MICRO:` (≤8 palabras) + `PISTA:` (sin ?), ambas alineadas al `objective`
  - feedback: 1–3 frases, sin preguntas si `allowQuestions=false`, sin re‑narrar
  - advance: `PUENTE:` y no mezclar pasos
  - ask_options (S2): 2 opciones cortas, derivadas de `expected/missing`, alineadas al `objective`

### 4) Riesgos y mitigaciones
- Desalineación con el `LessonPlan`
  - Mitigación: Guardrail “no avanzar” fuera del paso actual; lectura del plan en caliente en `reset`
- Repetición del modelo
  - Mitigación: anti‑patrones y deduplicación intra‑mensaje + historial reciente
- Latencia por loop agentic
  - Mitigación: límites de turnos; cache en Plan/Policy; streaming opcional
- Sesiones obsoletas tras modificar JSON
  - Mitigación: `reset` de sesión al detectar hash de plan distinto

### 5) Instrumentación y trazabilidad
- Tracing por turno: acción, severidad, uso de tools, guardrails disparados
- Dashboards: tasa de “no sé”, repetición, tiempos, satisfacción, completitud por momento
- Registro de muestras de salida para auditoría pedagógica
