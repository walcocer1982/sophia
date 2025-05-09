import React, { useState, useEffect } from 'react';
import api from './api';

export default function ResponsePanel({ selectedComponent }) {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedComponent) {
      setLoading(true);
      setError(null);
      
      api.getComponentInfo(selectedComponent)
        .then(data => {
          setResponse(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error al obtener información:", err);
          setError("No se pudo obtener información sobre este componente");
          setLoading(false);
        });
    } else {
      // Limpiar la respuesta si no hay componente seleccionado
      setResponse(null);
    }
  }, [selectedComponent]);

  return (
    <div className="response-panel" style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      width: '350px',
      maxHeight: 'calc(100% - 100px)',
      overflowY: 'auto',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
      zIndex: 1000
    }}>
      <h2 style={{ margin: '0 0 15px 0', color: '#3a86ff' }}>Información del Componente</h2>
      
      {!selectedComponent && !loading && (
        <p>Selecciona un componente del modelo para ver información</p>
      )}
      
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ 
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid #3a86ff',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 15px auto'
          }}></div>
          <p>Consultando información...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      
      {error && !loading && (
        <div style={{ 
          background: 'rgba(255,0,0,0.2)', 
          padding: '10px', 
          borderRadius: '5px',
          marginTop: '10px'
        }}>
          <p>{error}</p>
        </div>
      )}
      
      {response && !loading && (
        <div style={{ marginTop: '10px' }}>
          <h3 style={{ color: '#ff006e', marginBottom: '10px' }}>{response.componente}</h3>
          <div 
            style={{ lineHeight: '1.6', fontSize: '14px' }}
            dangerouslySetInnerHTML={{ __html: response.respuesta.replace(/\n/g, '<br>') }} 
          />
          
          {response.fuentes_pdf && response.fuentes_pdf.length > 0 && (
            <div style={{ 
              marginTop: '20px', 
              paddingTop: '10px', 
              borderTop: '1px solid rgba(255,255,255,0.2)',
              fontSize: '12px'
            }}>
              <h4 style={{ color: '#aaa' }}>Fuentes:</h4>
              <ul style={{ paddingLeft: '20px' }}>
                {response.fuentes_pdf.map((fuente, index) => (
                  <li key={index} style={{ marginBottom: '5px' }}>{fuente}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Botón para cerrar el panel */}
      {response && (
        <button 
          onClick={() => setResponse(null)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          ×
        </button>
      )}
    </div>
  );
} 