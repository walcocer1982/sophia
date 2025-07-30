# DocenteIA - Sistema Estable con Next.js y TypeScript

Un sistema robusto y estable construido con Next.js 14, TypeScript estricto y Tailwind CSS.

## 🎯 Propósito

DocenteIA es un asistente de enseñanza inteligente que utiliza OpenAI para crear experiencias de aprendizaje personalizadas y conversacionales. El sistema permite a los docentes crear sesiones interactivas con contenido específico y guías de enseñanza estructuradas.

## 🚀 Características

- **Next.js 14**: Versión estable con App Router
- **TypeScript Estricto**: Configuración robusta con verificaciones exhaustivas
- **Tailwind CSS 3**: Estilos modernos y optimizados
- **OpenAI Integration**: Chat conversacional inteligente
- **Teaching Guide System**: Estructura de momentos pedagógicos
- **Course Database**: Gestión de cursos y sesiones
- **ESLint Configurado**: Reglas estrictas para código limpio
- **Componentes Reutilizables**: Sistema de componentes con TypeScript
- **Utilidades Optimizadas**: Funciones helper para desarrollo eficiente
- **OpenAI Integrado**: Chat inteligente con GPT-3.5-turbo
- **API Routes Seguras**: Endpoints protegidos para comunicación con IA

## 📦 Instalación

```bash
# Clonar el repositorio
git clone <tu-repositorio>
cd docenteia

# Instalar dependencias
npm install

# Configurar variables de entorno
cp env.example .env.local
# Editar .env.local y agregar tu OPENAI_API_KEY

# Ejecutar en desarrollo
npm run dev
```

## 🛠️ Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Construcción para producción
npm run start        # Servidor de producción
npm run lint         # Verificación de código con ESLint
npm run chat         # Chat terminal con IA y vector store
```

## 🏗️ Estructura del Proyecto

```
src/
├── app/                 # App Router de Next.js
│   ├── layout.tsx      # Layout principal
│   ├── page.tsx        # Página principal
│   └── globals.css     # Estilos globales
├── components/          # Componentes reutilizables
│   └── ui/             # Componentes de UI
│       └── Button.tsx  # Componente Button
├── lib/                # Utilidades y helpers
│   ├── utils.ts        # Funciones utilitarias
│   ├── openai.ts       # Configuración de OpenAI
│   ├── vector-store.ts # Configuración de vector store
│   ├── constants.ts    # Constantes del sistema
│   └── config.ts       # Configuración centralizada
├── components/         # Componentes reutilizables
│   ├── ui/            # Componentes de UI
│   └── ChatInterface.tsx # Chat con IA
└── types/              # Tipos TypeScript
    └── global.d.ts     # Tipos globales
```

## ⚙️ Configuraciones

### TypeScript
- Target: ES2022
- Strict mode habilitado
- Verificaciones estrictas de tipos
- No unused locals/parameters

### ESLint
- Reglas estrictas para TypeScript
- Prevención de código no utilizado
- Advertencias para `any` types

### Next.js
- React Strict Mode
- SWC Minify
- Optimización de imports
- Soporte para imágenes modernas

## 🎨 Componentes

### Button Component
Componente reutilizable con múltiples variantes:

```tsx
import { Button } from "@/components/ui/Button";

<Button variant="default" size="lg">
  Comenzar
</Button>
```

### ChatInterface Component
Chat inteligente con OpenAI:

```tsx
import { ChatInterface } from "@/components/ChatInterface";

<ChatInterface />
```

## 💻 Chat Terminal

```bash
npm run chat
```

**Comandos disponibles:**
- `/help` - Mostrar ayuda
- `/history` - Mostrar historial
- `/clear` - Limpiar historial
- `/vector <consulta>` - Consultar vector store
- `/search <consulta>` - Buscar documentos en vector store
- `/exit` - Salir del chat

**⚠️ Importante:** Para usar el vector store, necesitas tener el servidor corriendo:
```bash
# Terminal 1: Iniciar servidor
npm run dev

# Terminal 2: Ejecutar chat
npm run chat
```

## 📝 Utilidades

### Funciones Helper
```tsx
import { cn, formatDate, generateId } from "@/lib/utils";

// Combinar clases CSS
cn("class1", "class2")

// Formatear fechas
formatDate(new Date())

// Generar IDs únicos
generateId()
```

### Funciones de OpenAI
```tsx
import { sendChatMessage, generateText, analyzeSentiment } from "@/lib/openai";

// Enviar mensaje a ChatGPT
const response = await sendChatMessage(messages, 'gpt-3.5-turbo');

// Generar texto
const text = await generateText("Escribe un poema sobre la tecnología");

// Analizar sentimiento
const sentiment = await analyzeSentiment("Me encanta este producto!");
```

## 🔧 Desarrollo

### Agregar Nuevos Componentes
1. Crear en `src/components/ui/`
2. Usar TypeScript estricto
3. Implementar variantes con `class-variance-authority`
4. Exportar tipos de props

### Agregar Utilidades
1. Crear en `src/lib/`
2. Documentar con JSDoc
3. Exportar tipos TypeScript

## 🚀 Despliegue

El proyecto está optimizado para despliegue en Vercel:

```bash
npm run build
```

## 📄 Licencia

MIT License - ver archivo LICENSE para detalles.

## 🤝 Contribuir

1. Fork el proyecto
2. Crear una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit los cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📞 Soporte

Para soporte técnico, contacta al equipo de desarrollo.
