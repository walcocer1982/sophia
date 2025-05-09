import os
from flask import Flask, request, jsonify
from notion_client import Client
from dotenv import load_dotenv

# Cargar las variables de entorno desde el archivo .env
load_dotenv()

# Definir las variables de entorno para el token de Notion y el ID de la base de datos
notion_token = os.environ.get("NOTION_TOKEN")
notion_database_id = os.environ.get("NOTION_DATABASE_ID")

# Verificar que las variables estén configuradas correctamente
if not notion_token or not notion_database_id:
    raise ValueError("NOTION_TOKEN o NOTION_DATABASE_ID no están configurados en el archivo .env")

# Inicializar el cliente de Notion
notion = Client(auth=notion_token)

# Inicializar la aplicación Flask
app = Flask(__name__)

# Ruta para crear una nueva página en Notion
@app.route('/crear_pagina', methods=['POST'])
def crear_pagina():
    try:
        # Obtener el cuerpo de la solicitud
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Se necesita un cuerpo JSON en la solicitud.'}), 400

        # Obtener el nombre de la página desde los datos
        nombre_pagina = data.get('nombre')
        if not nombre_pagina:
            return jsonify({'error': 'El campo "nombre" es obligatorio.'}), 400

        # Crear una nueva página en Notion
        nueva_pagina = notion.pages.create(
            parent={'database_id': notion_database_id},
            properties={
                'Name': {  # Asegúrate de que este nombre coincide con la propiedad en tu base de datos de Notion
                    'title': [
                        {
                            'text': {
                                'content': nombre_pagina
                            }
                        }
                    ]
                }
            }
        )

        return jsonify({
            'message': 'Página creada exitosamente.',
            'page_id': nueva_pagina['id']
        }), 201

    except Exception as e:
        return jsonify({'error': f'Error al crear la página: {str(e)}'}), 500

# Ruta para verificar la conexión con Notion y listar bases de datos
@app.route('/verificar', methods=['GET'])
def verificar():
    try:
        # Listar las bases de datos accesibles para esta integración
        databases = notion.databases.list()
        return jsonify({'message': 'Conexión con Notion exitosa.', 'databases': databases}), 200
    except Exception as e:
        return jsonify({'error': f'Error al conectar con Notion: {str(e)}'}), 500

# Ruta para probar que el servidor está funcionando
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'Servidor en ejecución'}), 200

# Iniciar la aplicación Flask
if __name__ == '__main__':
    app.run(debug=True)
