## Requisitos
1. **Unity**: Motor de desarrollo de juegos.
2. **Vuforia**: SDK de realidad aumentada para Unity.
3. **Photon Unity Networking (PUN)**: Framework para implementar funcionalidades multijugador en Unity.
4. **Marcador de Vuforia**: Imagen o patrón que Vuforia utilizará para detectar y rastrear el cubo en 3D.

## Lógica del Proyecto
1. **Configuración de Vuforia**:
    - Importar el SDK de Vuforia en Unity.
    - Configurar una base de datos de imágenes en Vuforia y añadir el marcador del cubo.
    - En Unity, añadir un `ImageTarget` que utilizará el marcador del cubo para posicionar el objeto 3D.

2. **Configuración del Objeto 3D**:
    - Crear o importar un modelo 3D de un cubo en Unity.
    - Asociar el cubo al `ImageTarget` para que aparezca en la posición del marcador cuando sea detectado por la cámara.

3. **Implementación del Multijugador**:
    - Importar y configurar Photon Unity Networking (PUN) en el proyecto de Unity.
    - Crear un sistema de salas donde los jugadores puedan unirse a una partida.
    - Designar un jugador como el host que tendrá el control para rotar el cubo.

4. **Sincronización en Tiempo Real**:
    - Utilizar Photon para sincronizar la rotación del cubo entre todos los jugadores.
    - El host enviará los datos de rotación a los demás jugadores en tiempo real.
    - Los clientes recibirán estos datos y actualizarán la posición del cubo en sus respectivas vistas.

5. **Interfaz de Usuario**: