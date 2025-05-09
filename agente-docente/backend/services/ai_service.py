import os
from mistralai.client import MistralClient
from dotenv import load_dotenv
from services.pdf_service import extract_info_from_pdf
import logging

load_dotenv()

class AIService:
    def __init__(self):
        self.client = MistralClient(api_key=os.getenv("MISTRAL_API_KEY"))
        self.model = "mistral-medium"

    def _format_pdf_fragments(self, fragments):
        return "\n".join(fragments) if fragments else "No se encontró información en el PDF."

    async def get_response(self, prompt: str, context: str = "") -> str:
        try:
            # Extraer información del PDF
            pdf_info = extract_info_from_pdf(prompt)
            
            # Preparar el contexto para Mistral AI
            fragmentos_pdf = [f["texto"] for f in pdf_info.get("fragmentos", [])]
            
            messages = [
                {
                    "role": "system", 
                    "content": """Eres un asistente docente especializado en explicar componentes técnicos.
                    Tu tarea es analizar la documentación técnica proporcionada y generar explicaciones claras y estructuradas."""
                },
                {
                    "role": "user", 
                    "content": f"""
                    COMPONENTE: {prompt}
                    
                    INFORMACIÓN DE DOCUMENTACIÓN TÉCNICA:
                    {self._format_pdf_fragments(fragmentos_pdf)}
                    
                    {f'CONTEXTO ADICIONAL: {context}' if context else ''}
                    
                    Por favor, genera una explicación clara y estructurada sobre el componente mencionado.
                    
                    Tu respuesta debe incluir:
                    1. Qué es el componente y su función principal
                    2. Características técnicas importantes
                    3. Aplicaciones o usos comunes
                    4. Precauciones o consideraciones importantes
                    
                    Usa lenguaje claro y organiza la información en secciones."""
                }
            ]
            
            chat_response = self.client.chat(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            
            return chat_response.choices[0].message.content
            
        except Exception as e:
            logging.error(f"Error al obtener respuesta de Mistral AI: {str(e)}")
            return f"Lo siento, hubo un error al procesar la información del PDF. Por favor, asegúrate de que el PDF contiene información relevante sobre el componente {prompt}." 