import streamlit as st
from instructor_ai_mecanico import instructor

# Configuración de la página
st.set_page_config(
    page_title="Instructor AI Mecánico",
    page_icon="🔧",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Estilos CSS personalizados
st.markdown("""
    <style>
    .stApp {
        background-color: #FFFFFF;
    }
    .main {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }
    .chat-message {
        padding: 1.5rem;
        border-radius: 10px;
        margin-bottom: 1rem;
        color: #1E1E1E;
    }
    .user-message {
        background-color: #e3f2fd;
        border: 1px solid #90caf9;
    }
    .assistant-message {
        background-color: #f5f5f5;
        border: 1px solid #e0e0e0;
    }
    .stButton>button {
        width: 100%;
        background-color: #90caf9;
        color: #1E1E1E;
    }
    </style>
""", unsafe_allow_html=True)

# Título
st.title("🔧 Instructor AI Mecánico")

# Descripción
st.markdown("""
    <div style='padding: 1rem; background-color: #f5f5f5; border-radius: 10px; margin-bottom: 2rem;'>
        <h3>Bienvenido al Instructor AI Mecánico</h3>
        <p>Soy tu asistente especializado en mecánica automotriz. Puedo ayudarte con:</p>
        <ul>
            <li>📚 Explicaciones de conceptos mecánicos</li>
            <li>🔧 Procedimientos de mantenimiento</li>
            <li>⚙️ Recomendaciones técnicas</li>
            <li>📖 Consultas sobre manuales técnicos</li>
        </ul>
    </div>
""", unsafe_allow_html=True)

# Inicializar el estado de la sesión
if 'messages' not in st.session_state:
    st.session_state.messages = []

# Área de chat
for message in st.session_state.messages:
    if message["role"] == "user":
        st.markdown(f"""
            <div class='chat-message user-message'>
                <b>👤 Tú:</b><br>{message["content"]}
            </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown(f"""
            <div class='chat-message assistant-message'>
                <b>🔧 Instructor:</b><br>{message["content"]}
            </div>
        """, unsafe_allow_html=True)

# Formulario para la entrada del usuario
with st.form(key='chat_form'):
    user_input = st.text_input("Escribe tu pregunta aquí:", key="user_input")
    submit_button = st.form_submit_button("Enviar")

    if submit_button and user_input:
        # Agregar mensaje del usuario
        st.session_state.messages.append({"role": "user", "content": user_input})
        
        try:
            # Obtener respuesta
            with st.spinner("Procesando tu pregunta..."):
                respuesta = instructor.responder_pregunta(
                    user_input, 
                    st.session_state.messages[:-1]
                )
                
                # Agregar respuesta del instructor
                st.session_state.messages.append({"role": "assistant", "content": respuesta})
                
                # Recargar para mostrar la nueva conversación
                st.rerun()
                
        except Exception as e:
            st.error(f"Error: {str(e)}")

# Botón para limpiar la conversación
if st.button("Limpiar conversación"):
    st.session_state.messages = []
    st.rerun()

# Footer
st.markdown("---")
st.markdown("""
    <div style='text-align: center'>
        <p>Desarrollado con ❤️ para estudiantes de mecánica</p>
        <p>Powered by OpenAI</p>
    </div>
""", unsafe_allow_html=True) 