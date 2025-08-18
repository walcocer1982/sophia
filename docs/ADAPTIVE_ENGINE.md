# Motor Adaptativo con Control de Presupuesto

## Resumen

Este documento describe la implementación del modelo-planificador acotado que permite adaptación en tiempo real dentro de límites estrictos, manteniendo el JSON de la lección como fuente de verdad.

## Arquitectura

### Componentes Principales

1. **Planificador Acotado** (`src/engine/planner.ts`)

   - Define comandos de adaptación con Zod
   - Opera solo dentro del ciclo actual
   - Detecta desvíos de tema
   - Valida comandos antes de ejecutar

2. **Gestor de Presupuesto** (`src/engine/costs.ts`)

   - Controla uso de modelos por tiers
   - Limita escalaciones por sesión
   - Degrada automáticamente cuando se agota presupuesto

3. **Evaluación Híbrida** (`src/engine/eval-escalation.ts`)

   - Validación estricta con Zod
   - Escalación inteligente solo cuando es necesaria
   - Fallback seguro en caso de errores

4. **Logger de Telemetría** (`src/engine/logger.ts`)
   - Registra todas las decisiones del motor
   - Exporta en formato JSONL para auditoría
   - Métricas de uso por tier

## Comandos de Adaptación

### AdaptCommand Schema

```typescript
{
  op: 'reask' | 'hint' | 'goto' | 'repeat' | 'insert_micro',
  targetAskCode?: string,
  note?: string,
  reason?: 'SEM_LOW' | 'THINKER_ESCALATION' | 'OFF_TOPIC' | 'BUDGET_LIMIT'
}
```

### Operaciones Permitidas

- **reask**: Solicitar reformulación de respuesta vaga
- **hint**: Proporcionar pista determinista
- **goto**: Saltar a ASK específica del catálogo
- **repeat**: Repetir paso actual sin avanzar
- **insert_micro**: Insertar micro-paso temporal (limitado)

## Control de Presupuesto

### Tiers de Modelos

| Tier    | Modelo                 | Costo/1K tokens | Uso                   |
| ------- | ---------------------- | --------------- | --------------------- |
| cheap   | gpt-4o-mini            | $0.005          | Docencia/redacción    |
| embed   | text-embedding-3-small | $0.001          | Similitud semántica   |
| thinker | o3-mini                | $0.025          | Razonamiento complejo |

### Límites por Sesión

- **Presupuesto inicial**: $1.00 (100 centavos)
- **Escalaciones máximas**: 5 por sesión
- **Umbral de degradación**: 10 centavos restantes
- **Modo económico**: < 5 centavos restantes

### Política de Uso

- **80% cheap**: Operaciones normales
- **15% embed**: Evaluación semántica
- **5% thinker**: Escalación solo cuando es necesaria

## Detección de Desvíos

### Algoritmo de Clasificación

```typescript
function detectTopicDeviation(
  response: string,
  step: any,
  objective: string
): TopicDeviation {
  const objectiveWords = objective
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const objectiveMatches = objectiveWords.filter((word) =>
    response.includes(word)
  );
  const matchRatio =
    objectiveMatches.length / Math.max(1, objectiveWords.length);

  if (matchRatio >= 0.3) return "ON_TOPIC";
  if (matchRatio >= 0.1) return "VAGUE";
  return "OFF_TOPIC";
}
```

### Respuestas Automáticas

- **ON_TOPIC**: Evaluación normal
- **VAGUE**: REASK con solicitud de reformulación
- **OFF_TOPIC**: GOTO a siguiente ASK del ciclo

## Integración con el Frontend

### Toggle de Modo

```typescript
<select
  value={adaptiveMode ? "adaptive" : "deterministic"}
  onChange={(e) => setAdaptiveMode(e.target.value === "adaptive")}
>
  <option value="deterministic">Determinista</option>
  <option value="adaptive">Adaptativo</option>
</select>
```

### Barra de Presupuesto

```typescript
<div className="w-32 bg-gray-200 rounded-full h-2">
  <div
    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
    style={{ width: `${(budgetMetrics.budgetCentsLeft / 100) * 100}%` }}
  ></div>
</div>
```

## Variables de Entorno

```bash
# Modelos por tier
CHEAP_MODEL=gpt-4o-mini
THINKER_MODEL=o3-mini
EMBED_MODEL=text-embedding-3-small

# Debug
ENGINE_DEBUG=false
NEXT_PUBLIC_ENGINE_DEBUG=false

# Presupuesto
SESSION_BUDGET_CENTS=100
MAX_ESCALATIONS_PER_SESSION=5
ESCALATION_THRESHOLD_CENTS=10
```

## Telemetría

### Eventos Registrados

- `engine.turn.start`: Inicio de turno
- `evaluation.result`: Resultado de evaluación
- `escalation.triggered`: Escalación iniciada
- `adaptation.planned`: Adaptación planificada
- `budget.usage`: Uso de presupuesto
- `advancement.accept/reject`: Avance del plan

### Formato JSONL

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "info",
  "event": "evaluation.result",
  "sessionId": "plan-123",
  "data": { "askCode": "ASK_001", "result": "ACCEPT", "reason": "SEM_LOW" }
}
```

## Riesgos y Mitigaciones

### Deriva del Tema

- **Riesgo**: El planificador inventa pasos persistentes
- **Mitigación**: Solo opera dentro del ciclo actual con goto a ASK conocidas

### Costos Desbordados

- **Riesgo**: Presupuesto excedido
- **Mitigación**: Hard cap con degradación automática a modo determinista

### JSON Frágil

- **Riesgo**: Respuestas malformadas del LLM
- **Mitigación**: Validación estricta con Zod antes de actuar

## Pruebas

### Ejecutar Tests

```bash
npm test src/engine/planner.test.ts
```

### Cobertura de Pruebas

- Detección de desvíos de tema
- Validación de comandos de adaptación
- Aplicación segura de comandos
- Control de presupuesto

## Uso en Producción

### Activación

1. Configurar variables de entorno
2. Activar modo adaptativo en el frontend
3. Monitorear métricas de presupuesto
4. Revisar logs de telemetría

### Monitoreo

- **Métricas clave**: Uso por tier, tasa de escalación, costo por sesión
- **Alertas**: Presupuesto < 20%, escalaciones > 3 por sesión
- **Logs**: Revisar JSONL para auditoría de decisiones

## Roadmap

### Próximas Mejoras

1. **Historial corto**: Implementar contexto de conversación reciente
2. **Micro-pasos**: Permitir inserción temporal de contenido
3. **Políticas por curso**: Configuración específica de adaptación
4. **Panel de métricas**: Dashboard para monitoreo en tiempo real

### Optimizaciones

1. **Cache de embeddings**: Reutilizar embeddings calculados
2. **Batch processing**: Procesar múltiples evaluaciones juntas
3. **Predictive scaling**: Anticipar necesidad de escalación
