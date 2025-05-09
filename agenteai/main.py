import os
import asyncio
from dotenv import load_dotenv
from agents import Agent, FileSearchTool, Runner  # Importar herramientas de OpenAI

# Cargar variables de entorno
load_dotenv()

# Obtener la API Key y el Vector Store ID desde el .env
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
VECTOR_STORE_ID = os.getenv("VECTOR_STORE_ID")

# Validar que las variables estén definidas
if not OPENAI_API_KEY or not VECTOR_STORE_ID:
    print("Error: Asegúrate de definir OPENAI_API_KEY y VECTOR_STORE_ID en el archivo .env")
    exit(1)

# Configurar FileSearchTool con el vector store
file_search_tool = FileSearchTool(
    max_num_results=3,  # Número máximo de resultados relevantes
    vector_store_ids=[VECTOR_STORE_ID],  # Usar el vector store configurado
)

# Crear el agente con FileSearchTool
agent = Agent(
    name="ManualReader",
    tools=[file_search_tool],
)

async def ask_manual(query):
    """Consulta el manual en el vector store usando FileSearchTool"""
    try:
        result = await Runner.run(agent, query)
        return result.final_output
    except Exception as e:
        print(f"❌ Error al consultar el manual: {str(e)}")
        return None

async def main():
    print("📖 Bienvenido al Sistema de Consulta del Manual 📖")
    print("------------------------------------------------")

    while True:
        query = input("\n❓ Pregunta sobre el manual (o escribe 'salir'): ")
        if query.lower() == "salir":
            break
        result = await ask_manual(query)  # ✅ Aquí se usa `await`
        if result:
            print("\n📌 Respuesta del manual:\n", result, "\n")

if __name__ == "__main__":
    asyncio.run(main())  # ✅ Se usa `asyncio.run()` para manejar la ejecución asíncrona
