import procesar_datos

if __name__ == "__main__":
    # Ruta del directorio donde están los archivos CSV
    directorio = r"C:\Users\LEGION\projects\dev\waltheralcocer\Procesamiento de notas\archivos"
    
    # Ejecutar el procesamiento
    procesar_datos.procesar_csv(directorio)
