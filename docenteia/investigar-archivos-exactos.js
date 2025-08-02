const { OpenAI } = require('openai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

async function investigarArchivosExactos() {
  try {
    console.log('🔍 INVESTIGACIÓN: ARCHIVOS EXACTOS EN VECTOR STORE\n');
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('❌ Error: OPENAI_API_KEY no encontrada');
      return;
    }
    
    const openai = new OpenAI({ apiKey: apiKey });
    const vectorStoreId = 'vs_68823f69d9f08191889fed8f8edd891c';
    
    console.log('📁 Vector Store ID:', vectorStoreId);
    console.log('🎯 Objetivo: Encontrar archivo exacto contenido_sso_sesion02_MSEII.json\n');
    
    // PASO 1: Listar TODOS los archivos en el Vector Store
    console.log('📋 PASO 1: Listando todos los archivos en el Vector Store...');
    try {
      const files = await openai.vectorStores.files.list(vectorStoreId);
      console.log('✅ Archivos encontrados:', files.data.length);
      
      files.data.forEach((file, index) => {
        console.log(`\n--- ARCHIVO ${index + 1} ---`);
        console.log('ID:', file.id);
        console.log('Nombre:', file.filename);
        console.log('Estado:', file.status);
        console.log('Tipo:', file.purpose);
        console.log('Tamaño:', file.bytes, 'bytes');
        console.log('Creado:', file.created_at);
        
        // Buscar específicamente el archivo que queremos
        if (file.filename && file.filename.includes('sesion02')) {
          console.log('🎯 ¡ENCONTRADO! Este es el archivo de sesión 2');
        }
      });
      
    } catch (error) {
      console.log('❌ Error listando archivos:', error.message);
    }
    
    // PASO 2: Buscar específicamente el archivo sesion02
    console.log('\n📋 PASO 2: Búsqueda específica de sesion02...');
    try {
      const searchResults = await openai.vectorStores.search(vectorStoreId, {
        query: "contenido_sso_sesion02_MSEII.json archivo completo"
      });
      
      console.log('✅ Resultados específicos de sesion02:');
      console.log('Total de resultados:', searchResults.data.length);
      
      // Mostrar solo resultados que contengan "sesion02"
      const sesion02Results = searchResults.data.filter(result => {
        if (result.content && typeof result.content === 'string') {
          return result.content.toLowerCase().includes('sesion02');
        }
        return false;
      });
      
      console.log('🎯 Resultados que contienen "sesion02":', sesion02Results.length);
      
      sesion02Results.forEach((result, index) => {
        console.log(`\n--- SESIÓN 02 - RESULTADO ${index + 1} ---`);
        console.log('Score:', result.score);
        console.log('Contenido COMPLETO:');
        console.log(result.content);
      });
      
    } catch (error) {
      console.log('❌ Error en búsqueda específica:', error.message);
    }
    
    // PASO 3: Intentar obtener contenido completo usando Responses API
    console.log('\n📋 PASO 3: Intentando obtener contenido completo...');
    try {
      const response = await openai.responses.create({
        model: 'gpt-4o',
        instructions: `Eres un especialista que extrae información EXACTA de archivos.
        INSTRUCCIONES:
        - Busca específicamente el archivo contenido_sso_sesion02_MSEII.json
        - Extrae TODO el contenido del archivo, no solo fragmentos
        - Muestra la estructura completa del JSON
        - Incluye TODOS los momentos y sus detalles completos`,
        input: `Necesito el contenido COMPLETO del archivo contenido_sso_sesion02_MSEII.json.
        Por favor extrae:
        1. La estructura completa del JSON
        2. Todos los momentos (MOMENTO_0, MOMENTO_1, MOMENTO_2, etc.)
        3. El contenido exacto de cada momento
        4. No omitas ninguna información
        5. Muestra el archivo tal como está almacenado`,
        tools: [{
          type: 'file_search',
          vector_store_ids: [vectorStoreId]
        }],
        temperature: 0.1
      });
      
      console.log('✅ Respuesta de la API:');
      console.log(response.content[0].text);
      
    } catch (error) {
      console.log('❌ Error con Responses API:', error.message);
    }
    
    console.log('\n🎉 INVESTIGACIÓN COMPLETADA');
    
  } catch (error) {
    console.error('❌ Error durante la investigación:', error.message);
  }
}

// Ejecutar la investigación
investigarArchivosExactos(); 