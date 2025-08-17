# Reporte: Ajuste de Umbrales - Sistema Más Permisivo

## 🎯 **Objetivo**

Bajar la exigencia del sistema para que sea más permisivo con las respuestas de los estudiantes, especialmente con errores tipográficos y respuestas parciales.

## 📊 **Cambios Implementados**

### **1. Umbrales de Embeddings por Tipo de Pregunta**

#### **Antes (Estrictos):**

```typescript
case 'diagnóstica': return { semThresh: 0.68, semBestThresh: 0.60 };
case 'conceptual': return { semThresh: 0.74, semBestThresh: 0.65 };
case 'aplicación': return { semThresh: 0.72, semBestThresh: 0.63 };
case 'listado': return { semThresh: 0.70, semBestThresh: 0.62 };
default: return { semThresh: 0.78, semBestThresh: 0.65 };
```

#### **Después (Permisivos):**

```typescript
case 'diagnóstica': return { semThresh: 0.55, semBestThresh: 0.45 };
case 'conceptual': return { semThresh: 0.60, semBestThresh: 0.50 };
case 'aplicación': return { semThresh: 0.58, semBestThresh: 0.48 };
case 'listado': return { semThresh: 0.56, semBestThresh: 0.46 };
default: return { semThresh: 0.62, semBestThresh: 0.52 };
```

**Reducción promedio:** -0.13 puntos en semThresh, -0.13 puntos en semBestThresh

### **2. Umbrales Globales de Evaluación**

#### **Antes:**

```typescript
{ fuzzy: { maxEditDistance: 1, similarityMin: 0.35 }, semThresh: 0.78, semBestThresh: 0.65 }
```

#### **Después:**

```typescript
{ fuzzy: { maxEditDistance: 1, similarityMin: 0.30 }, semThresh: 0.62, semBestThresh: 0.52 }
```

**Cambios:**

- `similarityMin`: 0.35 → 0.30 (-0.05)
- `semThresh`: 0.78 → 0.62 (-0.16)
- `semBestThresh`: 0.65 → 0.52 (-0.13)

### **3. Detección de "Eco" (Repeticiones)**

#### **Antes:**

```typescript
if (overlap >= 0.7) return { kind: "HINT", reason: "ECHO" };
```

#### **Después:**

```typescript
if (overlap >= 0.8) return { kind: "HINT", reason: "ECHO" };
```

**Cambio:** 0.7 → 0.8 (+0.1) - Más permisivo con similitudes

### **4. Gate de Vaguedad**

#### **Antes:**

```typescript
{ minUsefulTokens: 3, echoOverlap: 0.7 }
```

#### **Después:**

```typescript
{ minUsefulTokens: 2, echoOverlap: 0.8 }
```

**Cambios:**

- `minUsefulTokens`: 3 → 2 (-1 token mínimo)
- `echoOverlap`: 0.7 → 0.8 (+0.1)

### **5. Detección de "No Sé"**

#### **Antes:**

```typescript
const patterns = [
  /* ... */
];
return words.length <= 2;
```

#### **Después:**

```typescript
const patterns = [, /* ... */ /^mmm$/, /^mm$/];
return words.length <= 1; // MÁS PERMISIVO: solo 1 palabra
```

**Cambios:**

- Agregados patrones: `mmm`, `mm`
- Longitud mínima: 2 → 1 palabra

### **6. Detección de Evasivas en Route**

#### **Antes:**

```typescript
const isNo =
  /^\s*(no\s*se|no\s*lo\s*se|no\s*sé|no\s*lo\s*sé|ns|n\/a|no|mmm|mm|no\s*est[oó]\s*seguro)\s*$/i.test(
    pendingInput
  );
```

#### **Después:**

```typescript
const isNo =
  /^\s*(no\s*se|no\s*lo\s*se|no\s*sé|no\s*lo\s*sé|ns|n\/a|no|mmm|mm|ok|si|no\s*est[oó]\s*seguro)\s*$/i.test(
    pendingInput
  );
```

**Cambio:** Agregados `ok` y `si` como evasivas

## 🧪 **Casos de Prueba Afectados**

### **Caso 1: "las pate del procedmient"**

**Antes:** cos: 0.61 < 0.78 → HINT
**Después:** cos: 0.61 > 0.55 → ACCEPT (diagnóstica)

### **Caso 2: "arnes"**

**Antes:** cos: 0.46 < 0.78 → HINT  
**Después:** cos: 0.46 > 0.45 → PARTIAL (diagnóstica)

### **Caso 3: "objetive"**

**Antes:** cos: ~0.65 < 0.78 → HINT
**Después:** cos: ~0.65 > 0.60 → ACCEPT (conceptual)

### **Caso 4: "no sé" → "mmm"**

**Antes:** "mmm" = 1 palabra → HINT
**Después:** "mmm" = evasiva → HINT (pero más claro)

## 📈 **Impacto Esperado**

### **Positivo:**

- ✅ **Más respuestas aceptadas** con errores tipográficos
- ✅ **Menos hints innecesarios** por similitud semántica
- ✅ **Mejor experiencia** para estudiantes con dificultades
- ✅ **Más tolerante** con respuestas parciales

### **Riesgos Controlados:**

- ⚠️ **Posibles falsos positivos** (aceptar respuestas incorrectas)
- ⚠️ **Menos rigor** en evaluaciones conceptuales
- ✅ **Mitigado por:** política de reintentos y feedback específico

## 🔧 **Configuraciones Técnicas Finales**

### **Umbrales por Tipo de Pregunta:**

- **Diagnóstica:** 0.55 (muy permisiva)
- **Conceptual:** 0.60 (permisiva)
- **Aplicación:** 0.58 (permisiva)
- **Listado:** 0.56 (permisiva)

### **Umbrales Globales:**

- **Fuzzy similarity:** 0.30
- **Semántico general:** 0.62
- **Mejor match:** 0.52
- **Eco:** 0.8 (más permisivo)

### **Detección de Vaguedad:**

- **Tokens mínimos:** 2
- **Overlap máximo:** 0.8
- **Palabras "no sé":** ≤1

## 🎯 **Estado Final**

**✅ SISTEMA MÁS PERMISIVO IMPLEMENTADO**

El sistema ahora es significativamente más tolerante con:

- Errores tipográficos ("arnes" → "arnés")
- Respuestas parciales ("las pate" → "las partes")
- Variaciones semánticas ("objetive" → "objetivo")
- Respuestas cortas pero válidas

**Próximo paso:** Probar con casos reales para validar el balance entre permisividad y precisión.
