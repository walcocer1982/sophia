from flask import Flask, request, render_template, jsonify, make_response
import pandas as pd
import os
from flask_cors import CORS

# Inicializa la aplicación Flask
app = Flask(__name__)
CORS(app)  # Habilita CORS para permitir solicitudes de dominios externos

# Carpeta para guardar los archivos subidos
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Agregar encabezados de seguridad a las respuestas HTTP
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'  # Evita que los navegadores infieran el tipo de contenido
    response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'  # Control de caché
    return response

# Ruta principal que devuelve la página de inicio
@app.route('/')
def index():
    return render_template('index.html')  # Renderiza el archivo HTML "index.html"

# Función para calcular NPS y clasificar comentarios
def procesar_nps_y_comentarios(df, nps_column, comentarios_col):
    # Clasificar respuestas
    promotores = df[df[nps_column] >= 9]
    neutros = df[(df[nps_column] >= 7) & (df[nps_column] <= 8)]
    detractores = df[df[nps_column] <= 6]

    total_respuestas = len(df)
    porcentaje_promotores = (len(promotores) / total_respuestas) * 100
    porcentaje_detractores = (len(detractores) / total_respuestas) * 100

    # Calcular NPS
    nps = porcentaje_promotores - porcentaje_detractores

    # Extraer comentarios
    comentarios = {
        'promotores': promotores[comentarios_col].dropna().tolist(),
        'neutros': neutros[comentarios_col].dropna().tolist(),
        'detractores': detractores[comentarios_col].dropna().tolist()
    }

    return nps, comentarios, len(promotores), len(neutros), len(detractores)

# Ruta para cargar y procesar un archivo Excel
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:  # Verifica si no se incluye un archivo en la solicitud
        return jsonify({'error': 'No file part'})

    file = request.files['file']
    if file.filename == '':  # Verifica si no se seleccionó ningún archivo
        return jsonify({'error': 'No selected file'})

    if file:
        try:
            # Guarda el archivo en la carpeta especificada
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
            file.save(filepath)

            # Carga el archivo Excel en un DataFrame de pandas
            df = pd.read_excel(filepath)
            df.columns = df.columns.str.strip()  # Limpia los encabezados de columnas

            # Identificar columnas necesarias
            nps_column = [col for col in df.columns if "qué tanto recomendarías" in col][0]
            comentarios_col = [col for col in df.columns if "¿Cuál es la principal razón por la cual marcaste este valor?" in col][0]

            # Agrupar datos por las columnas especificadas
            cursos = df.groupby(['ADMISIÓN', 'SEDE', 'CARRERA', 'INSTRUCTOR', 'CURSO'])

            resultados = []  # Almacena los resultados por curso
            comments = {}  # Diccionario para almacenar los comentarios

            for (admisión, sede, carrera, instructor, curso), grupo in cursos:
                nps, comentarios, total_promotores, total_neutros, total_detractores = procesar_nps_y_comentarios(
                    grupo, nps_column, comentarios_col
                )

                # Guardar resultados por curso
                resultados.append({
                    'ADMISIÓN': admisión,
                    'SEDE': sede,
                    'CARRERA': carrera,
                    'INSTRUCTOR': instructor,
                    'CURSO': curso,
                    'NPS': nps,
                    'Total Encuestas': len(grupo),
                    'Total Promotores': total_promotores,
                    'Total Neutros': total_neutros,
                    'Total Detractores': total_detractores
                })

                # Guardar comentarios clasificados
                if instructor not in comments:
                    comments[instructor] = {}
                comments[instructor][curso] = comentarios

            # Convertir resultados a DataFrame y luego a HTML
            resultados_df = pd.DataFrame(resultados)
            html_resultados = resultados_df.to_html(index=False, classes='table table-striped')

            return jsonify({'html': html_resultados, 'comments': comments})
        except Exception as e:
            return jsonify({'error': str(e)})

# Ruta para generar un informe desde un archivo Excel específico
@app.route('/report')
def report():
    try:
        # Carga el archivo Excel con las encuestas
        df = pd.read_excel(r'D:\CETEMIN\DIRECCIÓN\2024\Indicadores\NPS\encuestas.xlsx')
        df.columns = df.columns.str.strip()  # Limpia los encabezados de columnas

        # Identificar columnas necesarias
        nps_column = [col for col in df.columns if "qué tanto recomendarías" in col][0]
        comentarios_col = [col for col in df.columns if "¿Cuál es la principal razón por la cual marcaste este valor?" in col][0]

        # Agrupa los datos por las columnas especificadas
        cursos = df.groupby(['ADMISIÓN', 'SEDE', 'CARRERA', 'INSTRUCTOR', 'CURSO'])

        resultados = []  # Almacena los resultados por curso

        for (admisión, sede, carrera, instructor, curso), grupo in cursos:
            nps, comentarios, total_promotores, total_neutros, total_detractores = procesar_nps_y_comentarios(
                grupo, nps_column, comentarios_col
            )

            # Guardar resultados por curso
            resultados.append({
                'ADMISIÓN': admisión,
                'SEDE': sede,
                'CARRERA': carrera,
                'INSTRUCTOR': instructor,
                'CURSO': curso,
                'NPS': nps,
                'Total Encuestas': len(grupo),
                'Total Promotores': total_promotores,
                'Total Neutros': total_neutros,
                'Total Detractores': total_detractores
            })

        # Convertir resultados a DataFrame y luego a HTML
        resultados_df = pd.DataFrame(resultados)
        html_resultados = resultados_df.to_html(index=False, classes='table table-striped')

        return render_template('report.html', resultados_html=html_resultados)
    except Exception as e:
        return jsonify({'error': str(e)})

# Inicia la aplicación
if __name__ == '__main__':
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)  # Crea la carpeta de subida si no existe
    app.run(debug=True)  # Inicia el servidor en modo depuración
