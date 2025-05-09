import pdfplumber
import os
from typing import Dict, List

def extract_info_from_pdf(pdf_path: str) -> Dict:
    """
    Extrae información de un archivo PDF.
    
    Args:
        pdf_path (str): Ruta al archivo PDF
        
    Returns:
        Dict: Diccionario con la información extraída
    """
    try:
        if not os.path.exists(pdf_path):
            return {
                "error": "El archivo PDF no existe",
                "fragmentos": []
            }
            
        with pdfplumber.open(pdf_path) as pdf:
            # Extraer texto de cada página
            fragmentos = []
            for page in pdf.pages:
                texto = page.extract_text()
                if texto:
                    fragmentos.append({
                        "texto": texto,
                        "pagina": page.page_number
                    })
                    
            return {
                "fragmentos": fragmentos,
                "num_paginas": len(pdf.pages)
            }
            
    except Exception as e:
        print(f"Error al procesar el PDF: {str(e)}")
        return {
            "error": f"Error al procesar el PDF: {str(e)}",
            "fragmentos": []
        } 