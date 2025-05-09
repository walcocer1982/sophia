# Instructor AI Mecánico 🔧

Un agente de IA especializado en instrucción mecánica que utiliza manuales técnicos para proporcionar respuestas detalladas y estructuradas a estudiantes de mecánica.

## Características

- 🔍 Búsqueda inteligente en manuales técnicos
- 📚 Respuestas estructuradas y detalladas
- 🎯 Formato optimizado para estudiantes
- 💬 Interfaz web intuitiva
- 🔄 Historial de conversación persistente

## Requisitos

- Python 3.8+
- OpenAI API Key
- Dependencias listadas en `requirements.txt`

## Instalación

1. Clonar el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd instructor-ia-mecanico
```

2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

3. Configurar variables de entorno:
Crear un archivo `.env` con:
```
OPENAI_API_KEY=tu_api_key_aquí
```

## Uso

1. Iniciar la aplicación:
```bash
streamlit run app.py
```

2. Abrir el navegador en `http://localhost:8501`

3. Comenzar a interactuar con el instructor

## Estructura del Proyecto

```
instructor-ia-mecanico/
├── app.py                 # Interfaz web Streamlit
├── instructor_ai_mecanico.py  # Lógica del agente
├── requirements.txt       # Dependencias
├── vector_store/         # Almacén de vectores para manuales
└── .env                  # Variables de entorno
```

## Formato de Respuestas

El instructor proporciona respuestas estructuradas con:

- 📖 Definición y Contexto
- 🔧 Procedimiento Paso a Paso
- ⚙️ Recomendaciones Técnicas
- 🏗️ Ejemplo de Aplicación

## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue primero para discutir los cambios que te gustaría hacer.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles. 