from typing import List, Optional
from openai import OpenAI
import os
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

# Verificar que la API Key esté configurada correctamente
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("¡Error! No se encontró la API Key de OpenAI. Configúrala en el archivo .env")

class InstructorAIMecanico:
    def __init__(self):
        self.client = OpenAI(api_key=api_key)
        
        # Verificar la conexión
        self._verify_connection()

    def _verify_connection(self):
        """Verifica la conexión con OpenAI."""
        try:
            # Intenta listar los modelos para verificar la autenticación
            self.client.models.list()
        except Exception as e:
            print(f"Error al verificar la conexión: {str(e)}")
            raise

    def responder_pregunta(self, pregunta: str, chat_history: Optional[List[dict]] = None) -> str:
        """Procesa una pregunta y genera una respuesta estructurada."""
        try:
            # Preparar los mensajes
            messages = [{
                "role": "system",
                "content": """Eres un instructor experto en mantenimiento mecánico. Tu objetivo es:
                1. Proporcionar explicaciones claras y detalladas sobre conceptos mecánicos.
                2. Guiar a los estudiantes en procedimientos de mantenimiento.
                3. Ofrecer recomendaciones técnicas basadas en manuales oficiales.
                4. Mantener un tono profesional pero accesible.

                Formato de respuesta:
                📖 **Definición y Contexto**
                [Explicación clara del concepto o procedimiento]

                🔧 **Procedimiento Paso a Paso** (si aplica)
                1. [Paso 1]
                2. [Paso 2]
                ...

                ⚙️ **Recomendaciones Técnicas**
                - [Recomendación 1]
                - [Recomendación 2]
                ...

                🏗️ **Ejemplo de Aplicación**
                [Ejemplo práctico o caso de uso]"""
            }]

            # Agregar el historial de chat si existe
            if chat_history:
                for msg in chat_history:
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })

            # Agregar la pregunta actual
            messages.append({
                "role": "user",
                "content": pregunta
            })

            # Realizar la llamada a la API
            response = self.client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )

            # Extraer y devolver la respuesta
            if response.choices and response.choices[0].message:
                return response.choices[0].message.content
            return "Lo siento, no pude generar una respuesta."

        except Exception as e:
            return f"Error al procesar la pregunta: {str(e)}"

# Crear una instancia global del instructor
instructor = InstructorAIMecanico()

