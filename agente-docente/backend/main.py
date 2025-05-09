from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from dotenv import load_dotenv
import os
from pydantic import BaseModel
from typing import Optional, List
import shutil
from services.ai_service import AIService
import asyncio
from pdf_service import extract_info_from_pdf

# Cargar variables de entorno
load_dotenv()

# Crear la aplicación FastAPI
app = FastAPI(
    title="Agente Docente API",
    description="API para el sistema Agente Docente que integra modelos 3D, PDFs y Mistral AI",
    version="1.0.0"
)

# Configurar CORS - Permitir todas las conexiones durante el desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todas las conexiones durante el desarrollo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Aumentar timeout para operaciones largas
TIMEOUT = 60  # 60 segundos

# Modelos de datos
class ComponenteRequest(BaseModel):
    nombre: str
    contexto: Optional[str] = None

class RespuestaAI(BaseModel):
    componente: str
    respuesta: str
    fuentes_pdf: List[str] = []

# Rutas API
@app.get("/")
async def root():
    return {"status": "online", "message": "Servidor backend funcionando correctamente"}

@app.post("/api/componente/info", response_model=RespuestaAI)
async def obtener_info_componente(componente: ComponenteRequest):
    try:
        # Obtener información del PDF
        pdf_info = extract_info_from_pdf(componente.nombre)
        
        # Obtener respuesta de Mistral AI
        ai_service = AIService()
        response = await asyncio.wait_for(
            ai_service.get_response(
                prompt=componente.nombre,
                context=componente.contexto
            ),
            timeout=TIMEOUT
        )
        
        return RespuestaAI(
            componente=componente.nombre,
            respuesta=response,
            fuentes_pdf=pdf_info.get("fuentes", [])
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Tiempo de espera agotado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pdf/upload")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        # Verificar que el archivo es un PDF
        if not file.filename.endswith('.pdf'):
            return JSONResponse(
                status_code=400,
                content={"detail": "El archivo debe ser un PDF"}
            )
        
        # Crear el directorio de documentos si no existe
        docs_dir = "../frontend/public/docs"
        os.makedirs(docs_dir, exist_ok=True)
        
        # Guardar el PDF en la carpeta de documentos
        file_location = os.path.join(docs_dir, file.filename)
        
        # Guardar el archivo
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Cerrar el archivo
        file.file.close()
        
        return {
            "filename": file.filename, 
            "status": "PDF subido correctamente",
            "path": file_location
        }
    except Exception as e:
        print(f"Error al subir PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al subir el archivo: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True) 