import axios from 'axios'

// URL base del backend - Asegúrate de que esta URL sea accesible desde el navegador
const BASE_URL = 'http://127.0.0.1:5000'

// Crear una instancia de axios con la URL base
const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // Aumentado a 60 segundos
})

// Verificar si el servidor está en línea
const checkServerStatus = async () => {
  try {
    console.log('Verificando conexión con el servidor backend...')
    const response = await axios.get(`${BASE_URL}/`, { 
      timeout: 10000,  // Aumentado a 10 segundos
      retry: 3,        // Intentar 3 veces
      retryDelay: 1000 // Esperar 1 segundo entre intentos
    })
    console.log('Servidor backend en línea:', response.data)
    return true
  } catch (error) {
    console.error('Error al conectar con el servidor backend:', error.message)
    if (error.code === 'ERR_NETWORK') {
      console.error('Error de red. Asegúrate de que el servidor backend esté en ejecución en http://127.0.0.1:5000')
    }
    return false
  }
}

// Servicio API
const api = {
  /**
   * Verifica si el servidor backend está en línea
   * @returns {Promise<boolean>} - true si el servidor está en línea, false en caso contrario
   */
  async checkServer() {
    return await checkServerStatus()
  },

  /**
   * Obtiene información sobre un componente específico
   * @param {string} componentName - Nombre del componente
   * @param {string} [context] - Contexto adicional (opcional)
   * @returns {Promise<Object>} - Respuesta con información del componente
   */
  async getComponentInfo(componentName, context = '') {
    try {
      // Verificar primero si el servidor está en línea
      const serverOnline = await checkServerStatus()
      if (!serverOnline) {
        throw new Error('No se pudo conectar con el servidor backend')
      }

      console.log(`Solicitando información para: ${componentName}`)
      const response = await apiClient.post('/componente/info', {
        nombre: componentName,
        contexto: context,
      })
      return response.data
    } catch (error) {
      console.error('Error al obtener información del componente:', error)
      throw error
    }
  },

  /**
   * Sube un archivo PDF al servidor
   * @param {File} file - Archivo PDF a subir
   * @returns {Promise<Object>} - Respuesta del servidor
   */
  async uploadPdf(file) {
    try {
      // Verificar primero si el servidor está en línea
      const serverOnline = await checkServerStatus()
      if (!serverOnline) {
        throw new Error('No se pudo conectar con el servidor backend')
      }

      console.log('Preparando archivo para subida:', file.name, file.size, 'bytes')
      
      const formData = new FormData()
      formData.append('file', file)
      
      // Usar una instancia separada para la subida de archivos
      const response = await axios.post(`${BASE_URL}/api/pdf/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 segundos para subidas de archivos
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          console.log(`Progreso de subida: ${percentCompleted}%`)
        }
      })
      
      console.log('Subida completada:', response.data)
      return response.data
    } catch (error) {
      console.error('Error al subir PDF:', error)
      
      // Información adicional de depuración
      if (error.response) {
        console.error('Respuesta de error:', error.response.status, error.response.data)
      } else if (error.request) {
        console.error('No se recibió respuesta del servidor')
      } else {
        console.error('Error de configuración:', error.message)
      }
      
      throw error
    }
  },
}

export default api 