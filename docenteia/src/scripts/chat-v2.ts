import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { VectorStoreExtractor } from '../lib/VectorStoreExtractor';
import { Course, Session } from '../types';
import * as dotenv from 'dotenv';

// Configurar variables de entorno
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

// Colores para la terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Estado global de la conversación
interface ConversationState {
  selectedCourse: Course | null;
  selectedSession: Session | null;
  vectorStoreExtractor: VectorStoreExtractor | null;
  currentSessionKey: string | null;
  momentoActual: number;
  momentos: any[];
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  isInClass: boolean;
}

const conversationState: ConversationState = {
  selectedCourse: null,
  selectedSession: null,
  vectorStoreExtractor: null,
  currentSessionKey: null,
  momentoActual: 0,
  momentos: [],
  messages: [],
  isInClass: false
};

// Función para imprimir con colores
function print(color: keyof typeof colors, text: string): void {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

// Función para cargar la base de datos de cursos
function loadCoursesDatabase(): any {
  try {
    const filePath = path.join(__dirname, '../data/courses-database.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    print('red', '❌ Error cargando la base de datos de cursos');
    return null;
  }
}

// Función para mostrar cursos disponibles
function showCourses(): void {
  const data = loadCoursesDatabase();
  if (!data || !data.courses) return;
  
  print('cyan', '\n📚 Cursos Disponibles:');
  data.courses.forEach((course: Course, index: number) => {
    print('white', `${index + 1}. ${course.id} - ${course.name}`);
    print('yellow', `   👨‍🏫 ${course.specialist_role}`);
    print('yellow', `   📊 ${course.sessions.length} sesiones disponibles`);
  });
  print('yellow', '\n💡 Usa: /select <curso> <sesión> para seleccionar');
  print('yellow', '   Ejemplo: /select SSO001 1');
}

// Función para seleccionar curso y sesión
async function selectCourse(courseId: string, sessionNumber: number): Promise<void> {
  try {
    const sessionId = `sesion0${sessionNumber}`;
    
    // Cargar datos del curso desde la base de datos
    const data = loadCoursesDatabase();
    if (!data || !data.courses) {
      console.error('❌ No se pudo cargar la base de datos de cursos');
      return;
    }
  
    const course = data.courses.find((c: Course) => c.id === courseId);
    if (!course) {
      console.error(`❌ Curso ${courseId} no encontrado`);
      return;
    }
  
    // Validar que el número de sesión sea válido
    if (sessionNumber < 1 || sessionNumber > course.sessions.length) {
      console.error(`❌ Sesión ${sessionNumber} no encontrada. Sesiones disponibles: 1-${course.sessions.length}`);
      return;
    }
  
    const session = course.sessions[sessionNumber - 1];
    if (!session) {
      console.error(`❌ Sesión ${sessionNumber} no encontrada`);
      return;
    }
    
    // Actualizar estado de la conversación
    conversationState.selectedCourse = course;
    conversationState.selectedSession = session;
    
    console.log(`✅ Curso seleccionado: ${course.name}`);
    console.log(`✅ Sesión seleccionada: ${session.name}`);
    console.log(`✅ Especialista: ${course.specialist_role}`);
    console.log(`✅ Objetivo: ${session.learning_objective}`);
    console.log(`📁 File ID: ${session.file_id}`);
    console.log(`📄 Archivo: ${session.file_name}`);
    console.log(`🔗 Vector Store ID: ${course.vector_store_id}`);

    // Inicializar el extractor optimizado
    conversationState.vectorStoreExtractor = new VectorStoreExtractor();
    
    console.log(`🚀 Iniciando sesión optimizada...`);
    
    // Iniciar sesión optimizada con fragmentos pre-calculados
    const sessionInfo = await conversationState.vectorStoreExtractor.startSession(courseId, sessionId);
    conversationState.currentSessionKey = sessionInfo.sessionKey;
    
    console.log(`✅ Sesión iniciada: ${sessionInfo.momentos} momentos, ${sessionInfo.fragmentos} fragmentos`);
    console.log(`✅ Clave de sesión: ${sessionInfo.sessionKey}`);
    console.log(`✅ Momento actual: ${sessionInfo.currentMoment}`);

    // Obtener momentos para mostrar estructura
    conversationState.momentos = await conversationState.vectorStoreExtractor.getMomentosDelArchivo(courseId, sessionId);
    conversationState.momentoActual = 0;

    console.log(`📄 Momentos extraídos: ${conversationState.momentos.length}`);
    console.log(`🔗 Estructura de la clase:`);
    conversationState.momentos.forEach((momento: any, index: number) => {
      console.log(`   ${index + 1}. ${momento.momento}`);
    });

  } catch (error) {
    console.error(`❌ Error seleccionando curso: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para procesar mensajes del estudiante
async function processStudentMessage(message: string): Promise<void> {
  if (!conversationState.selectedCourse || !conversationState.selectedSession || !conversationState.currentSessionKey) {
    print('red', '❌ Debes seleccionar un curso y sesión primero con /select');
    return;
  }

  try {
    print('cyan', `\n👤 Estudiante: ${message}`);

    // Usar el método optimizado con fragmentos pre-calculados
    const respuesta = await conversationState.vectorStoreExtractor!.handleStudent(
      conversationState.currentSessionKey, 
      message
    );

    // Actualizar estado de la conversación
    conversationState.momentoActual = respuesta.progreso - 1; // Convertir progreso a índice

    // Agregar mensajes al historial
    conversationState.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    conversationState.messages.push({
      role: 'assistant',
      content: respuesta.respuesta,
      timestamp: new Date()
    });

    // Mostrar respuesta del docente
    print('green', `\n📁 ${conversationState.selectedCourse.specialist_role}:`);
    print('white', respuesta.respuesta);
    print('cyan', `🚀 Progreso: ${respuesta.progreso}/${respuesta.total_momentos}`);
    print('cyan', `📁 Momento actual: ${respuesta.momento_actual}`);
    print('cyan', `📁 ${respuesta.razon_avance}`);
    print('yellow', `⏭️ Siguiente: ${respuesta.siguiente_momento}`);

  } catch (error) {
    print('red', `❌ Error procesando mensaje: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para mostrar el progreso actual
function showProgress(): void {
  if (!conversationState.selectedCourse || !conversationState.selectedSession) {
    print('red', '❌ No estás en una clase');
    return;
  }

  print('cyan', '\n📊 PROGRESO DE LA SESIÓN:');
  print('white', `📁 Curso: ${conversationState.selectedCourse.name}`);
  print('white', `📚 Sesión: ${conversationState.selectedSession.name}`);
  print('white', `👨‍🏫 Especialista: ${conversationState.selectedCourse.specialist_role}`);
  print('white', `   Sesión activa: ${conversationState.currentSessionKey || 'N/A'}`);
  
  // Mostrar estadísticas del sistema si hay extractor
  if (conversationState.vectorStoreExtractor) {
    const stats = conversationState.vectorStoreExtractor.getCacheStats();
    print('cyan', `\n📊 ESTADÍSTICAS DEL SISTEMA:`);
    print('white', `   🎓 Sesiones activas: ${stats.activeSessions}`);
    print('white', `   💾 Cache: ${stats.cacheSize} elementos`);
    print('white', `   🎓 Tamaño de sesiones: ${stats.sessionsSize}`);
  } else {
    print('red', '❌ No hay extractor inicializado');
  }
  
  if (conversationState.messages && conversationState.messages.length > 0) {
    print('cyan', `\n💬 Mensajes intercambiados: ${conversationState.messages.length}`);
  }
}

// Función para procesar comandos
async function processCommand(input: string): Promise<void> {
  const parts = input.trim().split(' ');
  const command = parts[0];
  
  switch (command) {
    case '/select':
      if (parts.length < 3) {
        print('red', '❌ Uso: /select <courseId> <sessionNumber>');
        print('yellow', '   Ejemplo: /select SSO001 1');
        return;
      }
      const courseId = parts[1];
      const sessionNumber = parseInt(parts[2]);
      await selectCourse(courseId, sessionNumber);
      break;
      
    case '/start':
      if (!conversationState.selectedCourse || !conversationState.selectedSession) {
        print('red', '❌ Debes seleccionar un curso y sesión primero con /select');
        return;
      }
      conversationState.isInClass = true;
      print('green', `💾 ¡Bienvenido a la clase de ${conversationState.selectedSession.name}!`);
      print('cyan', `🧠 Docente IA especializado cargado`);
      print('cyan', `📁 Contenido extraído del Vector Store`);
      print('cyan', `⚡ Interfaz interactiva lista`);
      print('cyan', `🔗🏫🏫 ¡Hola! Soy tu ${conversationState.selectedCourse.specialist_role}`);
      print('cyan', `🚀 Hoy aprenderemos sobre: ${conversationState.selectedSession.name}`);
      print('cyan', `🚀 Objetivo: ${conversationState.selectedSession.learning_objective}`);
      print('cyan', `📁 Empezaremos con: MOMENTO_0`);
      print('cyan', `👤 ¡Escribe tu mensaje para comenzar la interacción!`);
      break;
      
    case '/sessions':
      if (conversationState.vectorStoreExtractor) {
        const sessions = conversationState.vectorStoreExtractor.listActiveSessions();
        if (sessions.length === 0) {
          print('yellow', '📋 No hay sesiones activas');
        } else {
          print('cyan', '📋 Sesiones activas:');
          sessions.forEach(session => {
            print('white', `   ${session.sessionKey}: ${session.course} - ${session.session} (${session.progress})`);
          });
        }
      } else {
        print('red', '❌ No hay extractor inicializado');
      }
      break;

    case '/clear-session':
      if (parts.length < 2) {
        print('red', '❌ Uso: /clear-session <sessionKey>');
        return;
      }
      if (conversationState.vectorStoreExtractor) {
        const sessionKey = parts[1];
        const cleared = conversationState.vectorStoreExtractor.clearSession(sessionKey);
        print(cleared ? 'green' : 'red', `✅ Sesión ${sessionKey} eliminada`);
      }
      break;

    case '/clear-all-sessions':
      if (conversationState.vectorStoreExtractor) {
        conversationState.vectorStoreExtractor.clearAllSessions();
        print('green', '✅ Todas las sesiones eliminadas');
      }
      break;
      
    case '/progress':
      showProgress();
      break;
      
    case '/stats':
      if (conversationState.vectorStoreExtractor) {
        const stats = conversationState.vectorStoreExtractor.getCacheStats();
        print('cyan', '\n📊 ESTADÍSTICAS DEL SISTEMA:');
        print('white', `   🎓 Sesiones activas: ${stats.activeSessions}`);
        print('white', `   💾 Tamaño del cache: ${stats.cacheSize}`);
        print('white', `   🎓 Tamaño de sesiones: ${stats.sessionsSize}`);
      } else {
        print('red', '❌ No hay extractor inicializado');
      }
      break;
      
    case '/reset':
      conversationState.selectedCourse = null;
      conversationState.selectedSession = null;
      conversationState.vectorStoreExtractor = null;
      conversationState.currentSessionKey = null;
      conversationState.momentoActual = 0;
      conversationState.momentos = [];
      conversationState.messages = [];
      conversationState.isInClass = false;
      print('green', '✅ Estado de conversación reiniciado');
      break;
      
    case '/help':
      showHelp();
      break;
      
    case '/exit':
      print('yellow', '👋 ¡Hasta luego!');
      process.exit(0);
      break;
      
    default:
      print('red', `❌ Comando no reconocido. Usa /help para ver comandos disponibles.`);
  }
}

// Función para mostrar ayuda
function showHelp(): void {
  print('cyan', '\n📚 DOCENTEIA - COMANDOS DISPONIBLES:');
  print('white', '\n🎯 SELECCIÓN Y CONTROL:');
  print('yellow', '   /select <courseId> <sessionNumber>  - Seleccionar curso y sesión');
  print('yellow', '   /start                              - Iniciar la clase interactiva');
  print('yellow', '   /reset                              - Reiniciar estado de conversación');

  print('white', '\n📋 GESTIÓN DE SESIONES:');
  print('yellow', '   /sessions                           - Listar sesiones activas');
  print('yellow', '   /clear-session <sessionKey>         - Eliminar sesión específica');
  print('yellow', '   /clear-all-sessions                 - Eliminar todas las sesiones');

  print('white', '\n📊 INFORMACIÓN:');
  print('yellow', '   /progress                           - Mostrar progreso actual');
  print('yellow', '   /stats                              - Estadísticas del sistema');
  print('yellow', '   /help                               - Mostrar esta ayuda');

  print('white', '\n💬 INTERACCIÓN:');
  print('yellow', '   Escribe cualquier mensaje para interactuar con el docente IA');
  print('yellow', '   El sistema avanzará automáticamente entre momentos según tu progreso');

  print('cyan', '\n⚡ CARACTERÍSTICAS OPTIMIZADAS:');
  print('white', '   • Fragmentos pre-calculados para respuestas más rápidas');
  print('white', '   • Gestión inteligente de sesiones');
  print('white', '   • Coordinación automática del avance de la clase');
  print('white', '   • Cache optimizado para mejor rendimiento');
  print('white', '   • Control de costos en tiempo real');
  print('white', '   • Selección dinámica de modelos');
}

// Función principal del chat
function startChat(): void {
  // Crear interfaz de readline
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: ''
  });
  
  print('cyan', '🤖 Chat Terminal - DocenteIA v3.0 (TypeScript + Optimizaciones)');
  print('cyan', 'Escribe /help para ver comandos\n');
  
  // Mostrar cursos disponibles
  showCourses();
  
  // Loop principal de conversación
  const askQuestion = () => {
    rl.question(`${colors.green}👤 Tú: ${colors.reset}`, async (input) => {
      const trimmedInput = input.trim();
      
      if (!trimmedInput) {
        askQuestion();
        return;
      }
      
      // Procesar comandos
      if (trimmedInput.startsWith('/')) {
        await processCommand(trimmedInput);
        askQuestion();
        return;
      }
      
      // Si estamos en clase, procesar como mensaje del estudiante
      if (conversationState.isInClass) {
        await processStudentMessage(trimmedInput);
      } else {
        print('yellow', '💡 Usa /select para elegir un curso y sesión, luego /start para iniciar la clase');
      }
      
      askQuestion();
    });
  };
  
  askQuestion();
}

// Manejar señales de salida
process.on('SIGINT', () => {
  print('green', '\n👋 ¡Hasta luego!');
  process.exit(0);
});

// Iniciar el chat
startChat(); 