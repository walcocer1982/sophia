## Plan de implementación: Migración a OpenAI Agents SDK (TypeScript)

### Objetivo
Transitar desde un orquestador manual a un flujo agentic con herramientas (tools), handoffs, guardrails y trazabilidad (tracing) nativos, preservando la pedagogía actual (flujo "no sé" S1/S2/S3, MICRO/PISTA, PUENTE, anti‑repetición, objetivos dinámicos por pregunta).

### Beneficios clave
- Agent loop con decisiones iterativas y uso de tools
- Handoffs entre sub‑agentes especializados (Hint/Feedback/Ask/Advance/Options)
- Guardrails de entrada y salida para formato, seguridad y calidad pedagógica
- Tracing integrado para depurar, evaluar y mejorar
- Realtime Agents (opcional) para voz y conversación natural con interrupciones

### Arquitectura propuesta (alto nivel)
- Agente principal: "DocenteIA" (instrucciones + aptitudes)
- Sub‑agentes por acción (handoffs): HintAgent, FeedbackAgent, AdvanceAgent, AskAgent, OptionsAgent
- Tools: PlanTool, SessionTool, PolicyTool, SemvecTool, OptionsTool, HistoryTool
- Guardrails: InputGuardrail (no‑sé, severidad), OutputGuardrail (MICRO/PISTA/PUENTE, longitud, anti‑repetición)
- Tracing: trazas por turno, evaluación de calidad, A/B pedagógico

---

## Fases de implementación

### Fase 0 — Preparación
- Definir métricas de calidad (reducción de "no sé" tras S2, precisión de MICRO/PISTA, cero repeticiones)
- Mapear flags de rollout y riesgos
- Alinear objetivos de curso y políticas con aptitudes del docente

### Fase 1 — MVP Agentic (agente único + guardrails de salida)
- Crear agente único "DocenteIA"
- Implementar OutputGuardrail para acciones clave:
  - hint: exactamente 2 líneas, `MICRO:` (≤8 palabras) y `PISTA:` (sin ?), alineadas al objetivo
  - advance: incluir `PUENTE:`
  - feedback: 1–3 frases (o 2–3 según políticas), sin preguntas si `allowQuestions=false`
  - deduplicación intra‑mensaje y anti‑patrones (p. ej. frases genéricas)
- Mantener lógica no‑sé S1/S2/S3 dentro del loop del agente

Entregable: agente "DocenteIA" + validación de formato de salida + integración con orquestador actual

### Fase 2 — Tools y severidad
- Añadir tools tipadas:
  - PlanTool: lectura del LessonPlan actual, resolución de `objective`, `expected`, `moment` y siguiente paso
  - SessionTool: lectura/actualización de `attempts`, `noSeCountByAskCode`, `hintsByAskCode`, `reset`
  - PolicyTool: wordLimits, allowForcedOn, thresholds
  - SemvecTool: soporte de pistas con contenido y similitud semántica
  - OptionsTool: derivación de opciones desde `expected/missing` (S2)
  - HistoryTool: últimas interacciones para anti‑repetición contextual
- InputGuardrail: detectar "no sé" y vacío; ajustar severidad y cortar loops improductivos

Entregable: ejecución con tools; severidad dinámica y pistas más precisas

### Fase 3 — Handoffs (sub‑agentes por acción)
- Separar responsabilidades en sub‑agentes:
  - HintAgent: S1 (analogía si natural), S2 (opciones), S3 (refuerzo y preparación de puente)
  - FeedbackAgent: ACCEPT/PARTIAL/HINT/REFOCUS con `allowQuestions` y límites por política
  - AdvanceAgent: genera `PUENTE` coherente, no re‑narra
  - AskAgent: re‑ask guiado por objetivo
  - OptionsAgent: opciones concisas alineadas al objetivo
- Orquestación: DocenteIA decide handoff según estado y políticas

Entregable: coordinación por handoffs con control fino de calidad por acción

### Fase 4 — Tracing, evaluación y A/B
- Activar tracing integrado y paneles de métricas
- Experimentos A/B: longitud de pista, uso de analogías S1, severidad adaptativa por intentos
- Evaluaciones: tasa de “no sé”, utilidad percibida de pistas, repeticiones, tiempo a objetivo

Entregable: observabilidad completa y bucle de mejora continua

### Fase 5 — Realtime (opcional)
- Integrar Realtime Agents para `VoiceRecorder`
- Interrupciones, barge‑in, handoffs controlados por voz
- Guardrails de transcripción y moderación

Entregable: experiencia de voz con calidad pedagógica preservada

### Fase 6 — Consolidación y limpieza
- Deprecación de lógicas duplicadas en `orchestrator` (uso de sub‑agentes)
- Documentación de contratos de Tools y guardrails (ver `docs/AGENTS_CONTRACTS.md`)
- Ajustes finales de políticas y aptitudes (perfil docente extendible)

---

## Métricas de éxito sugeridas
- Reducción >30% de “no sé” encadenados después de S2
- ≥80% de pistas con MICRO pertinente al `objective`
- Casi cero repeticiones detectadas por guardrails
- Menor tiempo a completar bloques M2/M3 sin pérdida de acierto

## Riesgos y mitigaciones
- Desalineación con `LessonPlan`: OutputGuardrail “no avanzar” fuera del paso actual
- Repetición: deduplicación + variación por historial (HistoryTool)
- Latencia: límites de turnos, caching en PlanTool/PolicyTool, streaming opcional
