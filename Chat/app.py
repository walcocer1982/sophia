import streamlit as st
import os
from dotenv import load_dotenv
import json
from datetime import datetime
from openai import OpenAI, OpenAIError
from typing import Dict, List

# Cargar variables de entorno
load_dotenv()

# Verificar API key
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    st.error("No se encontró la API key de OpenAI. Por favor, verifica tu archivo .env")
    st.info("Puedes obtener tu API key en: https://platform.openai.com/account/api-keys")
    st.stop()

# Inicializar el cliente de OpenAI
try:
    client = OpenAI(
        api_key=api_key,
        timeout=60.0,
        max_retries=2
    )
    # Verificar que la API key es válida
    client.models.list()
except OpenAIError as e:
    st.error(f"Error al inicializar OpenAI: {str(e)}")
    st.info("Por favor, verifica que tu API key sea correcta y tenga los permisos necesarios.")
    st.stop()

# Archivo para almacenar el historial de conversaciones
HISTORY_FILE = "chat_history.json"

def load_chat_history():
    """Cargar historial de chat"""
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    except json.JSONDecodeError:
        return []
    except Exception as e:
        st.error(f"Error al cargar el historial: {str(e)}")
        return []

def save_chat_history(history):
    """Guardar historial de chat"""
    try:
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
    except Exception as e:
        st.error(f"Error al guardar el historial: {str(e)}")

def get_assistant_response(prompt: str) -> str:
    """Obtener respuesta del asistente"""
    try:
        messages = [
            {"role": "system", "content": "Eres un asistente especializado en el Manual de Operación DL421-C. Responde siempre en español de manera clara y concisa."},
            {"role": "user", "content": prompt}
        ]
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            temperature=0.7
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        st.error(f"Error al obtener respuesta: {str(e)}")
        return "Lo siento, hubo un error al procesar tu pregunta. Por favor, intenta de nuevo."

def main():
    st.title("Asistente del Manual de Operación DL421-C")
    
    # Inicializar estado de la sesión
    if 'chat_history' not in st.session_state:
        st.session_state.chat_history = load_chat_history()
    
    # Interfaz de usuario
    user_input = st.text_input("Escribe tu pregunta aquí:")
    
    if user_input:
        # Obtener respuesta
        response = get_assistant_response(user_input)
        
        # Actualizar historial
        new_interaction = {
            'timestamp': datetime.now().isoformat(),
            'prompt': user_input,
            'response': response
        }
        st.session_state.chat_history.append(new_interaction)
        save_chat_history(st.session_state.chat_history)
        
        # Mostrar la respuesta
        st.write("Respuesta:", response)
    
    # Mostrar historial
    if st.session_state.chat_history:
        st.subheader("Historial de Conversación")
        for interaction in reversed(st.session_state.chat_history[-5:]):
            prompt = interaction.get('prompt', 'Sin pregunta')
            st.text(f"Usuario: {prompt}")
            st.text(f"Asistente: {interaction.get('response', 'Sin respuesta')}")
            st.markdown("---")

if __name__ == "__main__":
    main() 