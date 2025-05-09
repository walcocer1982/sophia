import { Suspense, useState, useEffect, useRef } from 'react'
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, Html, Grid } from '@react-three/drei'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import * as THREE from 'three'
import { Easing, Tween, update as updateTween } from '@tweenjs/tween.js'
import ResponsePanel from './ResponsePanel'
import PdfUploader from './PdfUploader'

// Componente para el modelo 3D con controles de transformación
function Model({ onSelectComponent, modelPath, isMoving, selectedPart, setSelectedPart, position, setPosition }) {
  // Referencias y estados
  const modelRef = useRef()
  const [model, setModel] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [meshes, setMeshes] = useState({})
  const { camera, gl, scene } = useThree()
  
  // Efecto para crear y gestionar los controles de transformación
  useEffect(() => {
    if (!model || !scene || !camera) return;
    
    // Si estamos en modo movimiento, crear los controles de transformación
    if (isMoving) {
      // Crear un nuevo TransformControls
      const transformControls = new TransformControls(camera, gl.domElement);
      transformControls.size = 1;
      transformControls.setMode('translate');
      transformControls.attach(model);
      scene.add(transformControls);
      
      // Desactivar OrbitControls cuando se está usando TransformControls
      const onDraggingChange = (event) => {
        const orbitControls = gl.domElement.parentElement.querySelector('.orbit-controls');
        if (orbitControls) {
          orbitControls.enabled = !event.value;
        }
      };
      
      // Actualizar la posición en el estado cuando se mueve el objeto
      const onObjectChange = () => {
        if (model) {
          setPosition({
            x: parseFloat(model.position.x.toFixed(2)),
            y: parseFloat(model.position.y.toFixed(2)),
            z: parseFloat(model.position.z.toFixed(2))
          });
        }
      };
      
      transformControls.addEventListener('dragging-changed', onDraggingChange);
      transformControls.addEventListener('objectChange', onObjectChange);
      
      // Limpiar al desmontar o cambiar de modo
      return () => {
        transformControls.removeEventListener('dragging-changed', onDraggingChange);
        transformControls.removeEventListener('objectChange', onObjectChange);
        transformControls.detach();
        scene.remove(transformControls);
      };
    }
  }, [isMoving, model, camera, gl, scene, setPosition]);
  
  // Actualizar la posición del modelo cuando cambian los valores de entrada
  useEffect(() => {
    if (model && isMoving) {
      model.position.set(position.x, position.y, position.z);
    }
  }, [position, model, isMoving]);
  
  // Cargar el modelo OBJ usando OBJLoader directamente
  useEffect(() => {
    const loader = new OBJLoader()
    loader.load(
      modelPath,
      (obj) => {
        console.log("Modelo cargado:", obj);
        
        // Objeto para almacenar referencias a los meshes
        const meshesMap = {}
        
        // Aplicar materiales por defecto para mejor visualización
        obj.traverse((node) => {
          if (node.isMesh) {
            // Crear un material MeshStandardMaterial para mejor visualización
            const defaultMaterial = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0x888888),
              roughness: 0.5,
              metalness: 0.5,
              flatShading: false,
              side: THREE.DoubleSide, // Renderizar ambos lados de las caras
            });
            
            // Guardar el material original si existe
            node.userData.originalMaterial = node.material;
            
            // Aplicar el nuevo material
            node.material = defaultMaterial;
            
            // Asegurarse de que la geometría tiene normales para el sombreado
            if (!node.geometry.attributes.normal) {
              node.geometry.computeVertexNormals();
            }
            
            // Si el mesh no tiene nombre, asignarle uno
            if (!node.name) {
              node.name = 'Parte_' + Math.floor(Math.random() * 1000);
            }
            
            // Guardar referencia al mesh
            meshesMap[node.name] = node;
            
            console.log("Mesh encontrado:", node.name);
          }
        });
        
        // Guardar el mapa de meshes
        setMeshes(meshesMap);
        
        // Centrar el modelo en el origen
        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Calcular la escala para que el modelo tenga un tamaño razonable
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 5 / maxDim;
        
        obj.position.x = -center.x;
        obj.position.y = -center.y;
        obj.position.z = -center.z;
        obj.scale.set(scale, scale, scale);
        
        // Asegurarse de que el modelo no afecte a otros elementos de la escena
        obj.matrixAutoUpdate = true;
        
        // Inicializar la posición en el estado
        setPosition({
          x: parseFloat(obj.position.x.toFixed(2)),
          y: parseFloat(obj.position.y.toFixed(2)),
          z: parseFloat(obj.position.z.toFixed(2))
        });
        
        setModel(obj);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% cargado');
      },
      (error) => {
        console.error('Error al cargar el modelo:', error);
      }
    );
    
    return () => {
      // Limpieza al desmontar
      if (model) {
        model.traverse((node) => {
          if (node.isMesh) {
            node.geometry.dispose();
            if (node.material.dispose) {
              node.material.dispose();
            }
          }
        });
      }
    };
  }, [modelPath, setPosition]);
  
  // Manejar la selección de un componente
  const handleClick = (e) => {
    // Solo procesar clics si no estamos en modo movimiento
    if (!isMoving) {
      e.stopPropagation();
      const componentName = e.object.name;
      setSelectedPart(componentName);
      onSelectComponent(componentName);
    }
  };
  
  // Manejar el hover sobre un componente
  const handlePointerOver = (e) => {
    // Solo procesar hover si no estamos en modo movimiento
    if (!isMoving) {
      e.stopPropagation();
      setHovered(e.object.name);
      document.body.style.cursor = 'pointer';
    }
  };
  
  // Manejar cuando el cursor sale del componente
  const handlePointerOut = () => {
    if (!isMoving) {
      setHovered(null);
      document.body.style.cursor = 'auto';
    }
  };
  
  // Agregar eventos a cada mesh
  useEffect(() => {
    if (model) {
      model.traverse((node) => {
        if (node.isMesh) {
          if (!isMoving) {
            // Agregar eventos solo si no estamos en modo movimiento
            node.onClick = handleClick;
            node.onPointerOver = handlePointerOver;
            node.onPointerOut = handlePointerOut;
          } else {
            // Eliminar eventos si estamos en modo movimiento
            node.onClick = undefined;
            node.onPointerOver = undefined;
            node.onPointerOut = undefined;
          }
        }
      });
    }
  }, [model, isMoving]);
  
  // Actualizar materiales basados en hover y selección
  useEffect(() => {
    if (model) {
      model.traverse((node) => {
        if (node.isMesh) {
          if (node.name === selectedPart && !isMoving) {
            // Componente seleccionado - color azul
            node.material.color.set(0x3a86ff);
            node.material.emissive.set(0x3a86ff);
            node.material.emissiveIntensity = 0.3;
          } else if (node.name === hovered && !isMoving) {
            // Componente con hover - color rosa
            node.material.color.set(0xff006e);
            node.material.emissive.set(0xff006e);
            node.material.emissiveIntensity = 0.2;
          } else {
            // Componente normal - color gris
            node.material.color.set(0x888888);
            node.material.emissive.set(0x000000);
            node.material.emissiveIntensity = 0;
          }
        }
      });
    }
  }, [hovered, selectedPart, model, isMoving]);
  
  // Limpiar la selección cuando se activa el modo movimiento
  useEffect(() => {
    if (isMoving) {
      setSelectedPart(null);
      setHovered(null);
    }
  }, [isMoving]);
  
  if (!model) {
    return null;
  }
  
  return <primitive ref={modelRef} object={model} />;
}

// Componente para el selector de objetos con raycast
function ObjectSelector({ setSelectedPart, isMoving }) {
  const { scene, camera, raycaster, gl } = useThree();
  
  useEffect(() => {
    // Solo activar el selector si no estamos en modo movimiento
    if (isMoving) return;
    
    const handleClick = (event) => {
      // Calcular la posición del mouse en coordenadas normalizadas (-1 a +1)
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Actualizar el raycaster
      raycaster.setFromCamera({ x, y }, camera);
      
      // Encontrar intersecciones con objetos en la escena
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      if (intersects.length > 0) {
        // Encontrar el primer objeto que sea un mesh
        const mesh = intersects.find(intersect => intersect.object.isMesh);
        if (mesh) {
          setSelectedPart(mesh.object.name);
        }
      }
    };
    
    // Agregar el event listener
    gl.domElement.addEventListener('click', handleClick);
    
    // Limpiar al desmontar
    return () => {
      gl.domElement.removeEventListener('click', handleClick);
    };
  }, [scene, camera, raycaster, gl, setSelectedPart, isMoving]);
  
  return null;
}

// Componente para la rejilla (grid) que no se mueve con el modelo
function StaticGrid() {
  const { scene } = useThree();
  const gridRef = useRef();
  
  useEffect(() => {
    if (gridRef.current) {
      // Asegurar que la rejilla no se mueva con el modelo
      gridRef.current.matrixAutoUpdate = false;
      gridRef.current.updateMatrix();
      
      // Añadir directamente a la escena para mayor independencia
      if (scene && !scene.children.includes(gridRef.current)) {
        scene.add(gridRef.current);
      }
    }
    
    return () => {
      if (gridRef.current && scene) {
        scene.remove(gridRef.current);
      }
    };
  }, [scene]);
  
  return (
    <Grid 
      ref={gridRef}
      infiniteGrid 
      cellSize={1}
      cellThickness={0.5}
      cellColor="#6f6f6f"
      sectionSize={3}
      sectionThickness={1}
      sectionColor="#9d4b4b"
      fadeDistance={30}
      fadeStrength={1.5}
      followCamera={false}
      position={[0, -0.01, 0]}
    />
  );
}

// Componente para controlar la cámara
function CameraController() {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  
  // Animación de frame para actualizar tweens
  useFrame(() => {
    updateTween();
  });
  
  useEffect(() => {
    if (controlsRef.current) {
      // Configurar los controles de la cámara
      const controls = controlsRef.current;
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = false;
      
      // Guardar la posición inicial de la cámara
      const initialPosition = camera.position.clone();
      const initialTarget = controls.target.clone();
      
      // Función para resetear la cámara con animación
      const resetCamera = () => {
        // Animación para la posición de la cámara
        new Tween(camera.position)
          .to({ 
            x: initialPosition.x, 
            y: initialPosition.y, 
            z: initialPosition.z 
          }, 1000)
          .easing(Easing.Quadratic.Out)
          .start();
        
        // Animación para el punto de mira
        new Tween(controls.target)
          .to({ 
            x: initialTarget.x, 
            y: initialTarget.y, 
            z: initialTarget.z 
          }, 1000)
          .easing(Easing.Quadratic.Out)
          .onUpdate(() => {
            controls.update();
          })
          .start();
      };
      
      // Agregar event listener para resetear la cámara con una tecla
      const handleKeyDown = (event) => {
        if (event.key === 'r' || event.key === 'R') {
          resetCamera();
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [camera]);
  
  return (
    <OrbitControls 
      ref={controlsRef}
      className="orbit-controls"
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={2}
      maxDistance={50}
      // Configuración adicional para evitar que la cámara se mueva con el objeto
      makeDefault={true}
      camera={camera}
    />
  );
}

// Componente para los controles numéricos de posición
function PositionControls({ position, setPosition, isMoving }) {
  // Manejar cambios en los inputs
  const handlePositionChange = (axis, value) => {
    setPosition(prev => ({
      ...prev,
      [axis]: parseFloat(value)
    }));
  };
  
  // Estilo para los inputs
  const inputStyle = {
    width: '60px',
    padding: '5px',
    margin: '0 5px',
    background: '#333',
    color: 'white',
    border: '1px solid #555',
    borderRadius: '3px'
  };
  
  // Estilo para las etiquetas
  const labelStyle = {
    display: 'inline-block',
    width: '20px',
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center'
  };
  
  // Estilo para los contenedores de cada control
  const controlStyle = {
    margin: '5px 0',
    display: 'flex',
    alignItems: 'center'
  };
  
  return (
    <div style={{ 
      display: isMoving ? 'block' : 'none',
      marginTop: '10px'
    }}>
      <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Posición exacta:</p>
      
      <div style={controlStyle}>
        <span style={{...labelStyle, color: '#ff4444'}}>X:</span>
        <input 
          type="number" 
          value={position.x} 
          onChange={(e) => handlePositionChange('x', e.target.value)}
          step="0.1"
          style={inputStyle}
        />
      </div>
      
      <div style={controlStyle}>
        <span style={{...labelStyle, color: '#44ff44'}}>Y:</span>
        <input 
          type="number" 
          value={position.y} 
          onChange={(e) => handlePositionChange('y', e.target.value)}
          step="0.1"
          style={inputStyle}
        />
      </div>
      
      <div style={controlStyle}>
        <span style={{...labelStyle, color: '#4444ff'}}>Z:</span>
        <input 
          type="number" 
          value={position.z} 
          onChange={(e) => handlePositionChange('z', e.target.value)}
          step="0.1"
          style={inputStyle}
        />
      </div>
    </div>
  );
}

// Componente principal del visor 3D
export default function ModelViewer({ onSelectComponent }) {
  // Ruta al modelo OBJ - Usando el archivo DD421.obj que ya está en la carpeta
  const modelPath = '/models/DD421.obj';
  
  // Estado para el modo de movimiento y parte seleccionada
  const [isMoving, setIsMoving] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  
  // Función para activar/desactivar el modo de movimiento
  const toggleMovingMode = () => {
    setIsMoving(!isMoving);
    // Limpiar la selección al cambiar de modo
    if (!isMoving) {
      setSelectedPart(null);
    }
  };
  
  // Manejar la selección de componentes
  const handleSelectComponent = (componentName) => {
    if (!isMoving) {
      setSelectedPart(componentName);
      onSelectComponent(componentName);
    }
  };
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [10, 10, 10], fov: 45 }}>
        <Suspense fallback={<Html center><div className="loading"><div className="loading-spinner"></div></div></Html>}>
          {/* Iluminación mejorada */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} />
          <spotLight position={[5, 10, 5]} angle={0.3} penumbra={1} intensity={0.8} castShadow />
          
          {/* Rejilla estática separada del modelo */}
          <StaticGrid />
          
          <Model 
            onSelectComponent={handleSelectComponent} 
            modelPath={modelPath}
            isMoving={isMoving}
            selectedPart={selectedPart}
            setSelectedPart={setSelectedPart}
            position={position}
            setPosition={setPosition}
          />
          
          {/* Selector de objetos con raycast - solo activo cuando no estamos en modo movimiento */}
          {!isMoving && (
            <ObjectSelector 
              setSelectedPart={setSelectedPart} 
              isMoving={isMoving}
            />
          )}
          
          <Environment preset="sunset" />
          
          {/* Controlador de cámara mejorado */}
          <CameraController />
          
          {/* Ayudas visuales */}
          <axesHelper args={[5]} />
        </Suspense>
      </Canvas>
      
      {/* Panel de respuesta de GPT */}
      <ResponsePanel selectedComponent={selectedPart} />
      
      {/* Panel de control con botón de mover y controles numéricos */}
      <div style={{ 
        position: 'absolute', 
        bottom: 10, 
        right: 10, 
        background: 'rgba(0,0,0,0.7)', 
        color: 'white', 
        padding: '10px', 
        borderRadius: '4px'
      }}>
        <button 
          onClick={toggleMovingMode}
          style={{ 
            padding: '8px 16px', 
            background: isMoving ? '#ff006e' : '#3a86ff',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            width: '100%'
          }}
        >
          {isMoving ? 'Desactivar movimiento' : 'Activar movimiento'}
        </button>
        
        {/* Controles numéricos de posición */}
        <PositionControls 
          position={position} 
          setPosition={setPosition}
          isMoving={isMoving}
        />
      </div>
      
      {/* Panel de modo movimiento - visible solo cuando estamos en modo movimiento */}
      {isMoving && (
        <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(255,0,110,0.7)', color: 'white', padding: '5px 10px', borderRadius: '4px' }}>
          <p><strong>MODO MOVIMIENTO ACTIVADO</strong> - La selección de componentes está desactivada</p>
        </div>
      )}
      
      {/* Panel de ayuda */}
      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '5px 10px', borderRadius: '4px', fontSize: '12px' }}>
        <p><strong>Controles de cámara:</strong></p>
        <p>• Rotar vista: Click izquierdo + arrastrar</p>
        <p>• Zoom: Rueda del ratón</p>
        <p>• Mover vista: Click derecho + arrastrar</p>
        <p>• Resetear cámara: Tecla "R" (animado)</p>
        {isMoving && (
          <>
            <p style={{marginTop: '10px', color: '#ff006e'}}><strong>Modo movimiento activado:</strong></p>
            <p>• Arrastra las flechas de colores para mover el modelo</p>
            <p>• Rojo: eje X, Verde: eje Y, Azul: eje Z</p>
            <p>• O usa los controles numéricos para posición exacta</p>
          </>
        )}
      </div>
      
      {/* Componente para subir PDFs */}
      {!isMoving && <PdfUploader />}
    </div>
  );
}