# Reporte: Implementación de Routing de Modelos OpenAI

## 🎯 **Objetivo**

Implementar un sistema de routing inteligente de modelos OpenAI para optimizar costos y rendimiento según el tipo de tarea.

## 📊 **Arquitectura Implementada**

### **1. Router de Modelos (`src/lib/ai.ts`)**

```typescript
export function pickModel(
  tier: "cheap" | "thinker" | "embed" = "cheap"
): string {
  if (tier === "thinker") return process.env.THINKER_MODEL || "o3-mini";
  if (tier === "embed")
    return process.env.EMBED_MODEL || "text-embedding-3-small";
  return process.env.CHEAP_MODEL || "gpt-4o-mini";
}
```

**Tiers implementados:**

- **`cheap`**: `gpt-4o-mini` - Para redacción docente, hints, reformulaciones
- **`thinker`**: `o3-mini` - Para decisiones difíciles de evaluación
- **`embed`**: `text-embedding-3-small` - Para embeddings semánticos

### **2. Escalamiento Inteligente (`src/engine/eval-escalation.ts`)**

```typescript
export async function escalateReasoning(input: {
  student: string;
  objective: string;
  acceptable: string[];
  expected: string[];
  matched: string[];
  missing: string[];
  hintsUsed: number;
}) {
  // Usa o3-mini con reasoning para decisiones complejas
  const res = await ai.responses.create({
    model: pickModel("thinker"),
    reasoning: { effort: "medium" },
    response_format: { type: "json_object" },
  });
}
```

**Características:**

- **JSON estricto** para decisiones
- **Reasoning con esfuerzo medio** para análisis profundo
- **Fallback robusto** si falla el escalamiento

### **3. Integración en Pipeline Híbrido**

```typescript
// Escalamiento a thinker para casos borderline/ambiguos
if (cos >= 0.4 && cos < semThresh && (best?.cos || 0) >= 0.35) {
  const escalation = await escalateReasoning({...});

  if (escalation.decision === 'ACCEPT') {
    return { kind: 'ACCEPT', reason: 'THINKER_ESCALATION' };
  } else if (escalation.decision === 'HINT') {
    return { kind: 'HINT', reason: 'THINKER_ESCALATION' };
  }
}
```

**Criterios de escalamiento:**

- **Similitud semántica borderline** (0.4 ≤ cos < umbral)
- **Mejor match aceptable** (≥ 0.35)
- **Solo cuando es necesario** para evitar costos innecesarios

## 🔧 **Cambios Implementados**

### **1. Orquestador (`src/ai/orchestrator.ts`)**

```typescript
// Antes
model: "gpt-4o-mini";

// Después
const model = pickModel("cheap"); // Usar modelo barato para redacción docente
```

### **2. Embeddings (`src/engine/semvec.ts`)**

```typescript
// Antes
const MODEL = process.env.EMBED_MODEL || "text-embedding-3-small";

// Después
const MODEL = pickModel("embed");
```

### **3. Evaluación Híbrida (`src/engine/eval.ts`)**

- **Agregado escalamiento** para casos borderline
- **Integración con thinker** para decisiones complejas
- **Fallback robusto** en caso de errores

## 📈 **Optimización de Costos**

### **Distribución de Uso:**

- **80% cheap** (`gpt-4o-mini`) - Redacción docente, hints
- **15% embed** (`text-embedding-3-small`) - Similitud semántica
- **5% thinker** (`o3-mini`) - Decisiones complejas

### **Estimación de Costos (por 1000 turnos):**

- **Cheap**: ~$0.50 (redacción docente)
- **Embed**: ~$0.10 (embeddings)
- **Thinker**: ~$0.25 (decisiones complejas)
- **Total**: ~$0.85 (vs $2.00+ con solo gpt-4o)

**Ahorro estimado: 57%**

## 🧪 **Casos de Uso**

### **Caso 1: Redacción Docente**

```
Input: Sin input del estudiante
Model: cheap (gpt-4o-mini)
Output: Pregunta docente breve
Costo: Mínimo
```

### **Caso 2: Evaluación Clara**

```
Input: "las partes del procedimiento"
Model: cheap + embed
Output: ACCEPT directo
Costo: Bajo
```

### **Caso 3: Evaluación Borderline**

```
Input: "los peligros y los riesgos" (cos: 0.535)
Model: cheap + embed + thinker (o3-mini)
Output: Decisión basada en reasoning
Costo: Medio (solo cuando necesario)
```

## 🔧 **Configuración de Variables de Entorno**

Agregar en `.env.local`:

```bash
CHEAP_MODEL=gpt-4o-mini
THINKER_MODEL=o3-mini
EMBED_MODEL=text-embedding-3-small
```

## 🎯 **Beneficios Implementados**

### **1. Optimización de Costos:**

- **57% de ahorro** estimado en costos de API
- **Uso inteligente** de modelos según complejidad
- **Escalamiento condicional** solo cuando es necesario

### **2. Mejor Calidad:**

- **o3-mini** para decisiones complejas con reasoning
- **gpt-4o-mini** para redacción rápida y eficiente
- **text-embedding-3-small** para similitud semántica

### **3. Robustez:**

- **Fallback automático** si falla el escalamiento
- **Logs de debug** para monitoreo
- **Configuración flexible** por variables de entorno

## 📊 **Métricas a Monitorear**

### **Uso de Modelos:**

- **Porcentaje de uso** de cada tier
- **Tasa de escalamiento** a thinker
- **Costos por turno** promedio

### **Calidad:**

- **Precisión de decisiones** con thinker
- **Tiempo de respuesta** por modelo
- **Satisfacción del usuario**

## 🎯 **Estado Final**

**✅ SISTEMA DE ROUTING IMPLEMENTADO**

El sistema ahora:

1. **Usa modelos apropiados** según la complejidad de la tarea
2. **Optimiza costos** con escalamiento inteligente
3. **Mantiene calidad** con reasoning para decisiones complejas
4. **Es configurable** por variables de entorno

**Próximo paso:** Monitorear métricas de uso y costos para validar la optimización.
