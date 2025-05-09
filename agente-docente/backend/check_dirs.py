import os
import sys

def check_and_create_directories():
    """
    Verifica y crea los directorios necesarios para el funcionamiento del sistema.
    """
    # Directorio de documentos en el frontend
    docs_dir = "../frontend/public/docs"
    
    # Verificar si el directorio existe
    if not os.path.exists(docs_dir):
        try:
            print(f"Creando directorio: {docs_dir}")
            os.makedirs(docs_dir, exist_ok=True)
        except Exception as e:
            print(f"Error al crear el directorio {docs_dir}: {str(e)}")
            return False
    else:
        print(f"El directorio {docs_dir} ya existe")
    
    # Verificar permisos de escritura
    if not os.access(docs_dir, os.W_OK):
        print(f"ADVERTENCIA: No tienes permisos de escritura en {docs_dir}")
        return False
    
    print("Todos los directorios necesarios existen y tienen permisos correctos")
    return True

if __name__ == "__main__":
    print("Verificando directorios necesarios...")
    if check_and_create_directories():
        print("Verificación completada con éxito")
        sys.exit(0)
    else:
        print("Verificación fallida. Por favor, revisa los mensajes de error")
        sys.exit(1) 