#!/bin/bash

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "Node.js no está instalado. Por favor, instala Node.js 14 o superior."
    exit 1
fi

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    echo "npm no está instalado. Por favor, instala npm."
    exit 1
fi

# Instalar dependencias si node_modules no existe
if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias..."
    npm install
fi

# Crear directorios para modelos y documentos si no existen
mkdir -p public/models
mkdir -p public/docs

# Verificar si hay un modelo OBJ en la carpeta models
if [ ! -f "public/models/DD421.obj" ]; then
    echo "ADVERTENCIA: No se encontró el archivo DD421.obj en public/models/"
    echo "Por favor, asegúrate de colocar tu modelo OBJ en esa ubicación."
fi

# Iniciar el servidor de desarrollo
echo "Iniciando el servidor de desarrollo..."
npm run dev 