# Agente Docente

Plataforma educativa que combina visualización 3D, procesamiento de PDFs y GPT-4o para proporcionar información detallada sobre componentes técnicos.

## Características

- 🔍 **Visualización 3D interactiva** - Permite seleccionar componentes de un modelo 3D
- 📚 **Extracción de información de PDFs** - Busca información relevante en documentación técnica
- 🤖 **Respuestas con IA** - Utiliza GPT-4o para generar explicaciones estructuradas
- 📱 **Interfaz responsiva** - Funciona en dispositivos móviles y de escritorio

## Estructura del Proyecto

El proyecto está dividido en dos partes principales:

### Backend (Python + FastAPI)

- Procesamiento de PDFs y extracción de información
- Integración con GPT-4o para generar respuestas
- API RESTful para comunicación con el frontend

### Frontend (React + Three.js)

- Visualización de modelos 3D con Three.js
- Interfaz de usuario para mostrar respuestas
- Funcionalidad para subir documentación técnica

## Requisitos

### Backend
- Python 3.8+
- FastAPI
- PyPDF2
- OpenAI API Key

### Frontend
- Node.js 14+
- React
- Three.js
- @react-three/fiber
- @react-three/drei

## Instalación

### Backend

```bash
cd backend
pip install -r requirements.txt
# Configura tu API key de OpenAI en el archivo .env
python main.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Uso

1. Inicia el backend y el frontend
2. Abre tu navegador en `http://localhost:3000`
3. Sube documentación técnica en formato PDF
4. Interactúa con el modelo 3D seleccionando componentes
5. Visualiza las respuestas generadas por la IA

## Licencia

MIT 