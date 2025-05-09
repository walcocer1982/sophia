import React, { useState, useEffect } from 'react';
import api from './api';

export default function PdfUploader() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [serverStatus, setServerStatus] = useState(null);
  
  // Verificar el estado del servidor al cargar el componente
  useEffect(() => {
    const checkServer = async () => {
      try {
        const isOnline = await api.checkServer();
        setServerStatus(isOnline);
      } catch (error) {
        console.error('Error al verificar el estado del servidor:', error);
        setServerStatus(false);
      }
    };
    
    checkServer();
    
    // Verificar el estado del servidor cada 10 segundos
    const interval = setInterval(checkServer, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setUploadStatus(null);
    } else if (selectedFile) {
      setUploadStatus({
        success: false,
        message: 'El archivo seleccionado no es un PDF válido'
      });
    }
  };
  
  const handleUpload = async () => {
    if (!file) {
      setUploadStatus({
        success: false,
        message: 'Por favor selecciona un archivo PDF'
      });
      return;
    }
    
    // Verificar si el servidor está en línea
    if (serverStatus === false) {
      setUploadStatus({
        success: false,
        message: 'No se puede conectar con el servidor. Verifica que el backend esté en ejecución.'
      });
      return;
    }
    
    setUploading(true);
    setUploadStatus(null);
    
    try {
      console.log('Iniciando subida del archivo:', file.name);
      const response = await api.uploadPdf(file);
      console.log('Respuesta del servidor:', response);
      
      setUploadStatus({
        success: true,
        message: `PDF "${response.filename}" subido correctamente`
      });
      setFile(null);
      // Limpiar el input de archivo
      document.getElementById('pdf-file-input').value = '';
    } catch (error) {
      console.error('Error detallado:', error);
      
      let errorMessage = 'Error al subir el PDF. Inténtalo de nuevo.';
      
      // Intentar obtener un mensaje de error más específico
      if (error.response) {
        // El servidor respondió con un código de error
        console.error('Error del servidor:', error.response.data);
        errorMessage = `Error del servidor: ${error.response.status} - ${error.response.data.detail || 'Sin detalles'}`;
      } else if (error.request) {
        // La petición fue hecha pero no se recibió respuesta
        console.error('No se recibió respuesta del servidor');
        errorMessage = 'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.';
        setServerStatus(false);
      } else {
        // Error al configurar la petición
        console.error('Error de configuración:', error.message);
        errorMessage = `Error: ${error.message}`;
      }
      
      setUploadStatus({
        success: false,
        message: errorMessage
      });
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div style={{ 
      position: 'absolute', 
      bottom: 10, 
      left: 10, 
      background: 'rgba(0,0,0,0.7)', 
      color: 'white', 
      padding: '10px', 
      borderRadius: '4px',
      width: '250px'
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#3a86ff' }}>
        Subir documentación técnica
      </h3>
      
      {/* Indicador de estado del servidor */}
      {serverStatus === false && (
        <div style={{ 
          marginBottom: '10px',
          padding: '5px',
          borderRadius: '4px',
          fontSize: '12px',
          background: 'rgba(255,0,0,0.2)',
          color: '#fff'
        }}>
          ⚠️ Servidor backend no disponible
        </div>
      )}
      
      <input 
        id="pdf-file-input"
        type="file" 
        accept=".pdf" 
        onChange={handleFileChange}
        style={{ 
          display: 'block', 
          marginBottom: '8px',
          color: 'white',
          fontSize: '12px',
          width: '100%'
        }} 
      />
      
      <button 
        onClick={handleUpload}
        disabled={!file || uploading || serverStatus === false}
        style={{ 
          padding: '6px 12px', 
          background: file && serverStatus !== false ? '#3a86ff' : '#555',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          cursor: file && serverStatus !== false ? 'pointer' : 'not-allowed',
          width: '100%',
          opacity: uploading ? 0.7 : 1
        }}
      >
        {uploading ? 'Subiendo...' : 'Subir PDF'}
      </button>
      
      {uploadStatus && (
        <div style={{ 
          marginTop: '10px',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          background: uploadStatus.success ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)',
          color: uploadStatus.success ? '#fff' : '#fff'
        }}>
          {uploadStatus.message}
        </div>
      )}
      
      {file && (
        <div style={{ 
          marginTop: '8px', 
          fontSize: '12px',
          color: '#aaa',
          wordBreak: 'break-all'
        }}>
          Archivo seleccionado: {file.name}
        </div>
      )}
    </div>
  );
} 