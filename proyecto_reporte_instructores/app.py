from flask import Flask, request, render_template, redirect, url_for, flash, session
import pandas as pd
import logging

app = Flask(__name__)
app.secret_key = 'supersecretkey'  # Necesario para usar flash messages

# Configurar el registro
logging.basicConfig(level=logging.DEBUG)

def calculate_nps(df):
    required_columns = [
        'INSTRUCTOR', 
        'SEDE', 
        'CARRERA', 
        'ADMISIÓN',
        'En una escala del 1 al 10, donde 1 significa \'muy insatisfecho\' y 10 \'muy satisfecho\', ¿qué tanto recomendarías al/la instructor/a para las clases teórico-prácticas (virtuales o presenciales)? Considera su apoyo constante, trato respetuoso con los estudia', 
        '¿Cuál es la principal razón por la cual marcaste este valor? ¿Qué sugerencia otorgas?',
        'En una escala del 1 al 10, donde 1 significa \'muy insatisfecho\' y 10 \'muy satisfecho\', ¿qué tanto recomendarías los materiales y recursos tecnológicos utilizados durante las clases teórico-prácticas (virtuales o presenciales)?',
        '¿Cuál es la principal razón por la cual marcaste este valor? ¿Qué sugerencia otorgas?2'
    ]
    if not all(column in df.columns for column in required_columns):
        missing_columns = [column for column in required_columns if column not in df.columns]
        raise ValueError(f"Faltan las siguientes columnas en el archivo de Excel: {', '.join(missing_columns)}")
    
    df = df.rename(columns={
        'INSTRUCTOR': 'Instructor',
        'SEDE': 'Sede',
        'CARRERA': 'Carrera',
        'ADMISIÓN': 'Admisión',
        'En una escala del 1 al 10, donde 1 significa \'muy insatisfecho\' y 10 \'muy satisfecho\', ¿qué tanto recomendarías al/la instructor/a para las clases teórico-prácticas (virtuales o presenciales)? Considera su apoyo constante, trato respetuoso con los estudia': 'Puntuación_Instructor',
        '¿Cuál es la principal razón por la cual marcaste este valor? ¿Qué sugerencia otorgas?': 'Comentario_Instructor',
        'En una escala del 1 al 10, donde 1 significa \'muy insatisfecho\' y 10 \'muy satisfecho\', ¿qué tanto recomendarías los materiales y recursos tecnológicos utilizados durante las clases teórico-prácticas (virtuales o presenciales)?': 'Puntuación_Servicio',
        '¿Cuál es la principal razón por la cual marcaste este valor? ¿Qué sugerencia otorgas?2': 'Comentario_Servicio'
    })
    
    # Convertir las columnas de puntuación a tipo numérico
    df['Puntuación_Instructor'] = pd.to_numeric(df['Puntuación_Instructor'], errors='coerce')
    df['Puntuación_Servicio'] = pd.to_numeric(df['Puntuación_Servicio'], errors='coerce')
    
    nps_instructor = df.groupby('Instructor').apply(lambda x: {
        'NPS': ((x['Puntuación_Instructor'] >= 9).sum() - (x['Puntuación_Instructor'] <= 6).sum()) / len(x) * 100,
        'Promotores': x[x['Puntuación_Instructor'] >= 9]['Comentario_Instructor'].tolist(),
        'Detractores': x[x['Puntuación_Instructor'] <= 6]['Comentario_Instructor'].tolist(),
        'Neutrales': x[(x['Puntuación_Instructor'] >= 7) & (x['Puntuación_Instructor'] <= 8)]['Comentario_Instructor'].tolist(),
        'Sede': x['Sede'].iloc[0],
        'Carrera': x['Carrera'].iloc[0],
        'Admisión': x['Admisión'].iloc[0]
    }).reset_index()

    nps_servicio = df.groupby('Instructor').apply(lambda x: {
        'NPS': ((x['Puntuación_Servicio'] >= 9).sum() - (x['Puntuación_Servicio'] <= 6).sum()) / len(x) * 100,
        'Promotores': x[x['Puntuación_Servicio'] >= 9]['Comentario_Servicio'].tolist(),
        'Detractores': x[x['Puntuación_Servicio'] <= 6]['Comentario_Servicio'].tolist(),
        'Neutrales': x[(x['Puntuación_Servicio'] >= 7) & (x['Puntuación_Servicio'] <= 8)]['Comentario_Servicio'].tolist(),
        'Sede': x['Sede'].iloc[0],
        'Carrera': x['Carrera'].iloc[0],
        'Admisión': x['Admisión'].iloc[0]
    }).reset_index()

    return nps_instructor, nps_servicio

@app.route('/')
def index():
    return render_template('index.html', show_buttons=False)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        flash('No se ha seleccionado ningún archivo.')
        return redirect(url_for('index'))
    file = request.files['file']
    if file.filename == '':
        flash('No se ha seleccionado ningún archivo.')
        return redirect(url_for('index'))
    if file:
        try:
            df = pd.read_excel(file)
            logging.debug(f"DataFrame cargado: {df.head()}")
            nps_instructor, nps_servicio = calculate_nps(df)
            session['nps_instructor'] = nps_instructor.to_dict()
            session['nps_servicio'] = nps_servicio.to_dict()
            return render_template('index.html', show_buttons=True)
        except ValueError as e:
            flash(str(e))
            return redirect(url_for('index'))
        except Exception as e:
            logging.error(f"Error al procesar el archivo: {e}")
            flash('Ocurrió un error al procesar el archivo.')
            return redirect(url_for('index'))
    return redirect(url_for('index'))

@app.route('/report_instructor')
def report_instructor():
    nps_instructor = pd.DataFrame(session.get('nps_instructor'))
    return render_template('report_instructor.html', tables_instructor=[nps_instructor.to_html(classes='data')], titles_instructor=nps_instructor.columns.values)

@app.route('/report_servicio')
def report_servicio():
    nps_servicio = pd.DataFrame(session.get('nps_servicio'))
    return render_template('report_servicio.html', tables_servicio=[nps_servicio.to_html(classes='data')], titles_servicio=nps_servicio.columns.values)

if __name__ == '__main__':
    app.run(debug=True)