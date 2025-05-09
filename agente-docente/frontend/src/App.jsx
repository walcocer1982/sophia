import { useState } from 'react'
import ModelViewer from './ModelViewer'
import ResponsePanel from './ResponsePanel'
import api from './api'

function App() {
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleComponentSelect = async (componentName) => {
    setSelectedComponent(componentName)
    
    if (!componentName) return
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await api.getComponentInfo(componentName)
      setResponse(result)
    } catch (err) {
      console.error('Error al obtener información del componente:', err)
      setError('Error al obtener información. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Agente Docente - Visualizador 3D</h1>
      </header>
      
      <main className="main-content">
        <div className="model-container">
          <ModelViewer onSelectComponent={handleComponentSelect} />
        </div>
        
        <ResponsePanel 
          selectedComponent={selectedComponent}
          response={response}
          loading={loading}
          error={error}
        />
      </main>
    </div>
  )
}

export default App 