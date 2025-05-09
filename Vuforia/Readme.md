# Proyecto de Vuforia y Unity para Juego Multijugador

## Descripción del Proyecto
Este proyecto consiste en crear un juego multijugador utilizando Vuforia y Unity. El objetivo es permitir que varios jugadores se conecten y, a través de la cámara, puedan ver un objeto 3D (un cubo) que puede ser rotado por el usuario que actúa como host. Los cambios realizados por el host se reflejarán en tiempo real para todos los demás jugadores.

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
    - Crear una interfaz simple para que los jugadores puedan unirse a una partida y ver el estado de la conexión.
    - Añadir controles para que el host pueda rotar el cubo.

## Flujo del Juego
1. Los jugadores inician la aplicación y se conectan al servidor de Photon.
2. Un jugador crea una sala y se convierte en el host.
3. Otros jugadores se unen a la sala creada por el host.
4. El host controla la rotación del cubo utilizando la interfaz de usuario.
5. Los cambios en la rotación del cubo se sincronizan en tiempo real y se reflejan en las vistas de todos los jugadores.

## Conclusión
Este proyecto combina las capacidades de realidad aumentada de Vuforia con las funcionalidades multijugador de Photon y Unity para crear una experiencia interactiva y colaborativa. La clave es la sincronización en tiempo real de los cambios realizados por el host para que todos los jugadores puedan ver el mismo estado del objeto 3D.
