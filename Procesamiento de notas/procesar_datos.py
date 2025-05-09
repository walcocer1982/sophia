
import pandas as pd
import os

def procesar_csv(directorio, output_file="resultado_estructurado.xlsx"):
    # Lista para almacenar los datos estructurados
    datos_estructurados = []
    
    # Obtener la lista de archivos CSV en el directorio
    archivos = [os.path.join(directorio, archivo) for archivo in os.listdir(directorio) if archivo.endswith(".csv")]
    
    # Procesar cada archivo CSV
    for archivo in archivos:
        print(f"Procesando archivo: {archivo}")
        
        # Leer CSV con la codificación correcta
        df = pd.read_csv(archivo, sep=";", encoding="latin1", skiprows=5)
        
        # Extraer información de admisión, especialidad y sección de manera flexible
        df_meta = pd.read_csv(archivo, sep=";", encoding="latin1", nrows=1)
        columnas_meta = df_meta.columns.tolist()
        
        admision_col = next((col for col in columnas_meta if "Admisión" in col), None)
        especialidad_col = next((col for col in columnas_meta if "Especialidad" in col), None)
        seccion_col = next((col for col in columnas_meta if "Sección" in col), None)
        
        admision = df_meta[admision_col].iloc[0] if admision_col else "Desconocido"
        especialidad = df_meta[especialidad_col].iloc[0] if especialidad_col else "Desconocido"
        seccion = df_meta[seccion_col].iloc[0] if seccion_col else "Desconocido"
        
        print(f"Admisión: {admision}, Especialidad: {especialidad}, Sección: {seccion}")
        
        # Renombrar columnas para facilitar el manejo
        df.columns = ["Nº", "DNI", "APELLIDOS Y NOMBRES", "CONDICIÓN"] + list(df.columns[4:])
        
        # Extraer nombres de cursos y fechas desde filas 1 y 2
        cursos = df.iloc[0, 4:].dropna()
        fechas = df.iloc[1, 4:].dropna().astype(str)
        
        # Procesar cada estudiante desde la fila 2 en adelante
        for _, fila in df.iloc[2:].iterrows():
            dni = fila["DNI"]
            condicion = fila["CONDICIÓN"]
            
            # Iterar sobre los cursos y sus notas
            for col in cursos.index:
                col_idx = df.columns.get_loc(col)  # Obtener el índice numérico de la columna
                if col in fechas.index:
                    curso = cursos[col]
                    fecha = fechas[col] if pd.notna(fechas[col]) else "Sin fecha"
                    fecha = str(fecha)  # Asegurar que la fecha es string
                    
                    conocimiento = fila.iloc[col_idx] if col_idx < len(fila) and pd.notna(fila.iloc[col_idx]) else None
                    competencia = fila.iloc[col_idx + 1] if col_idx + 1 < len(fila) and pd.notna(fila.iloc[col_idx + 1]) else None
                    promedio = fila.iloc[col_idx + 2] if col_idx + 2 < len(fila) and pd.notna(fila.iloc[col_idx + 2]) else None
                    
                    datos_estructurados.append({
                        "DNI": dni,
                        "Admisión": admision,
                        "Condición": condicion,
                        "Especialidad": especialidad,
                        "Sección": seccion,
                        "Curso": curso,
                        "Fecha de inicio": fecha.split(" - ")[0] if " - " in fecha else fecha,
                        "Fecha de fin": fecha.split(" - ")[1] if " - " in fecha else "Sin fecha",
                        "Conocimiento": conocimiento,
                        "Competencia": competencia,
                        "Promedio": promedio
                    })
    
    # Convertir a DataFrame y guardar en un archivo Excel
    df_final = pd.DataFrame(datos_estructurados)
    df_final.to_excel(output_file, index=False)
    print(f"Archivo guardado: {output_file}")
    return df_final

if __name__ == "__main__":
    directorio = r"C:\Users\LEGION\projects\dev\waltheralcocer\Procesamiento de notas\archivos"
    procesar_csv(directorio)