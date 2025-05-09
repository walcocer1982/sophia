import os
import PyPDF2
from typing import Dict, List, Any
import re

# Directorio donde se almacenan los PDFs
PDF_DIR = "../frontend/public/docs"

def extract_info_from_pdf(componente_nombre: str) -> Dict[str, Any]:
    """
    Extrae información relevante sobre un componente específico de los PDFs disponibles.
    
    Args:
        componente_nombre: Nombre del componente a buscar en los PDFs
        
    Returns:
        Dict con información extraída y referencias a los PDFs
    """
    resultados = {
        "fragmentos": [],
        "fuentes": []
    }
    
    # Verificar que el directorio existe
    if not os.path.exists(PDF_DIR):
        os.makedirs(PDF_DIR, exist_ok=True)
        return resultados
    
    # Buscar en todos los PDFs del directorio
    for filename in os.listdir(PDF_DIR):
        if filename.endswith('.pdf'):
            pdf_path = os.path.join(PDF_DIR, filename)
            try:
                # Extraer texto del PDF
                texto_pdf, paginas_relevantes = _extract_text_from_pdf(pdf_path, componente_nombre)
                
                if texto_pdf:
                    resultados["fragmentos"].append({
                        "texto": texto_pdf,
                        "fuente": filename,
                        "paginas": paginas_relevantes
                    })
                    resultados["fuentes"].append(f"{filename} (páginas: {', '.join(map(str, paginas_relevantes))})")
            except Exception as e:
                print(f"Error al procesar {filename}: {str(e)}")
    
    return resultados

def _extract_text_from_pdf(pdf_path: str, keyword: str) -> tuple:
    """
    Extrae texto de un PDF que contiene la palabra clave especificada.
    
    Args:
        pdf_path: Ruta al archivo PDF
        keyword: Palabra clave a buscar
        
    Returns:
        Tuple con (texto_extraído, lista_de_páginas_relevantes)
    """
    texto_relevante = []
    paginas_relevantes = []
    
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        
        for page_num, page in enumerate(reader.pages):
            texto = page.extract_text()
            
            # Buscar la palabra clave (insensible a mayúsculas/minúsculas)
            if re.search(keyword, texto, re.IGNORECASE):
                # Extraer párrafos relevantes (contexto alrededor de la palabra clave)
                parrafos = texto.split('\n\n')
                for parrafo in parrafos:
                    if re.search(keyword, parrafo, re.IGNORECASE):
                        texto_relevante.append(parrafo.strip())
                
                paginas_relevantes.append(page_num + 1)  # +1 porque PyPDF2 indexa desde 0
    
    return '\n\n'.join(texto_relevante), paginas_relevantes 