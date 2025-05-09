import os
from typing import Dict, Any, List
import requests
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configurar DeepSeek
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

def generate_ai_response(componente_nombre: str, pdf_info: Dict[str, Any], contexto: str = None) -> Dict[str, Any]:
    """
    Genera una respuesta estructurada utilizando DeepSeek, combinando información de PDFs
    y conocimiento del modelo.
    
    Args:
        componente_nombre: Nombre del componente sobre el que se solicita información
        pdf_info: Información extraída de PDFs
        contexto: Contexto adicional proporcionado por el usuario
        
    Returns:
        Dict con la respuesta generada y fuentes utilizadas
    """
    # Preparar el contexto para la IA
    fragmentos_pdf = [f["texto"] for f in pdf_info.get("fragmentos", [])]
    fuentes = pdf_info.get("fuentes", [])
    
    # Construir el prompt para DeepSeek
    prompt = f"""
    Eres un asistente docente especializado en explicar componentes técnicos.
    
    COMPONENTE: {componente_nombre}
    
    INFORMACIÓN DE DOCUMENTACIÓN TÉCNICA:
    {_format_pdf_fragments(fragmentos_pdf)}
    
    """
    
    if contexto:
        prompt += f"\nCONTEXTO ADICIONAL: {contexto}\n"
    
    prompt += """
    Basándote en la información de la documentación técnica proporcionada y tu conocimiento,
    genera una explicación clara y estructurada sobre el componente mencionado.
    
    Tu respuesta debe:
    1. Explicar qué es el componente y su función principal
    2. Describir sus características técnicas importantes
    3. Mencionar aplicaciones o usos comunes
    4. Incluir cualquier precaución o consideración importante
    
    Formato de respuesta:
    - Usa lenguaje claro y accesible
    - Organiza la información en secciones con subtítulos
    - Incluye ejemplos si es relevante
    """
    
    try:
        # Llamar a la API de DeepSeek
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
        }
        
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "Eres un asistente docente especializado en explicar componentes técnicos de manera clara y precisa."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 1000
        }
        
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload)
        response.raise_for_status()  # Lanzar excepción si hay error HTTP
        
        # Extraer la respuesta
        response_data = response.json()
        respuesta_texto = response_data["choices"][0]["message"]["content"]
        
        return {
            "texto": respuesta_texto,
            "fuentes": fuentes
        }
    except Exception as e:
        print(f"Error al generar respuesta con DeepSeek: {str(e)}")
        return {
            "texto": f"Lo siento, ocurrió un error al generar la respuesta: {str(e)}",
            "fuentes": []
        }

def _format_pdf_fragments(fragmentos: List[str]) -> str:
    """
    Formatea los fragmentos de texto extraídos de PDFs para incluirlos en el prompt.
    
    Args:
        fragmentos: Lista de fragmentos de texto
        
    Returns:
        Texto formateado
    """
    if not fragmentos:
        return "No se encontró información específica en la documentación técnica."
    
    return "\n\n".join([f"Fragmento de documentación:\n{fragmento}" for fragmento in fragmentos]) 