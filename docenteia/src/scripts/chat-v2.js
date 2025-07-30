const readline = require('readline');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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
const conversationState = {
  currentCourse: null,
  currentSession: null,
  isInClass: false,
  studentName: 'estudiante',
  messages: [], // Historial de mensajes en formato OpenAI
  serverPort: 3000
};

// Función para imprimir con colores
function print(color, text) {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

// Función para detectar el puerto del servidor
async function detectServerPort() {
  for (let port = 3000; port <= 3005; port++) {
    try {
      const response = await axios.get(`http://localhost:${port}`, { timeout: 1000 });
      if (response.status === 200) {
        conversationState.serverPort = port;
        return port;
      }
    } catch (error) {
      continue;
    }
  }
  return 3000; // Puerto por defecto
}

// Función para cargar la base de datos de cursos
function loadCoursesDatabase() {
  try {
    const filePath = path.join(__dirname, '../data/courses-database.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    print('red', '❌ Error cargando la base de datos de cursos');
    return null;
  }
}

// Función para cargar la guía de enseñanza
function loadTeachingGuide() {
  try {
    const filePath = path.join(__dirname, '../data/teaching-guide.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    print('red', '❌ Error cargando la guía de enseñanza');
    return null;
  }
}

// Función para consultar OpenAI
async function queryOpenAI(query, sessionId, courseId) {
  try {
    const response = await axios.post(`http://localhost:${conversationState.serverPort}/api/openai-vector`, {
      query,
      sessionId,
      courseId
    }, {
      timeout: 30000
    });
    
    return response.data.response;
  } catch (error) {
    print('red', `❌ Error consultando OpenAI: ${error.message}`);
    return null;
  }
}



// Función para mostrar cursos disponibles
function showCourses() {
  const data = loadCoursesDatabase();
  if (!data || !data.courses) return;
  
  print('cyan', '\n📚 Cursos Disponibles:');
  data.courses.forEach((course, index) => {
    print('white', `${index + 1}. ${course.id} - ${course.name}`);
  });
  print('yellow', '\n💡 Usa: /select <curso> <sesión> para seleccionar');
  print('yellow', '   Ejemplo: /select SSO001 1');
}

// Función para seleccionar curso y sesión
async function selectCourse(courseId, sessionNumber) {
  const data = loadCoursesDatabase();
  if (!data || !data.courses) return false;
  
  const course = data.courses.find(c => c.id === courseId);
  if (!course) {
    print('red', `❌ Curso ${courseId} no encontrado`);
    return false;
  }
  
  // Validar que el número de sesión sea válido
  if (sessionNumber < 1 || sessionNumber > course.sessions.length) {
    print('red', `❌ Sesión ${sessionNumber} no encontrada. Sesiones disponibles: 1-${course.sessions.length}`);
    return false;
  }
  
  const session = course.sessions[sessionNumber - 1];
  if (!session) {
    print('red', `❌ Sesión ${sessionNumber} no encontrada`);
    return false;
  }
  
  conversationState.currentCourse = course;
  conversationState.currentSession = session;
  
  print('green', `✅ Curso seleccionado: ${course.name}`);
  print('green', `✅ Sesión seleccionada: ${session.name}`);
  print('green', `✅ Especialista: ${course.specialist_role}`);
  print('green', `✅ Objetivo: ${session.learning_objective}`);
  
  return true;
}

// Función para iniciar la clase
async function startClass() {
  if (!conversationState.currentCourse || !conversationState.currentSession) {
    print('red', '❌ Debes seleccionar un curso y sesión primero');
    return;
  }
  
  // Cargar la guía de enseñanza
  const teachingGuide = loadTeachingGuide();
  if (!teachingGuide) {
    print('red', '❌ Error cargando la guía de enseñanza');
    return;
  }
  
  conversationState.isInClass = true;
  conversationState.messages = []; // Limpiar historial
  
  // Configurar el system prompt para conversación natural
  const systemPrompt = `Eres un ${conversationState.currentCourse.specialist_role} en una conversación natural y empática.

CURSO: ${conversationState.currentCourse.name}
SESIÓN: ${conversationState.currentSession.name}
OBJETIVO DE APRENDIZAJE: ${conversationState.currentSession.learning_objective}
PUNTOS CLAVE:
${conversationState.currentSession.key_points.map((point, index) => `${index + 1}. ${point}`).join('\n')}

GUÍA DE ENSEÑANZA (como referencia):
${teachingGuide.momentos.map(momento => 
  `${momento.titulo}: ${momento.descripcion}`
).join('\n')}

INSTRUCCIONES:
- Mantén una conversación natural y fluida
- Basa tus respuestas en el contenido del archivo: ${conversationState.currentSession.file_name}
- Usa los ejemplos del teaching guide como referencia, no como estructura rígida
- Responde directamente a las preguntas del estudiante
- Haz preguntas cuando sea apropiado para la conversación
- Valida y construye sobre las respuestas del estudiante
- Mantén el enfoque en los puntos clave de la sesión
- No sigas un flujo estructurado paso a paso`;

  // Agregar mensaje del sistema
  conversationState.messages.push({
    role: 'system',
    content: systemPrompt
  });
  
  print('green', `🎓 ¡Bienvenido a la clase de ${conversationState.currentSession.name}!`);
  print('cyan', '💬 Conversación iniciada. Escribe tus preguntas o respuestas naturalmente.\n');
  
  // Generar saludo inicial simple
  const greeting = await generateAIResponse("Saluda al estudiante de forma natural y presenta brevemente el tema de la sesión.");
  
  if (greeting) {
    print('cyan', `👨‍🏫 ${greeting}`);
    conversationState.messages.push({
      role: 'assistant',
      content: greeting
    });
  }
}

// Función para generar respuesta de la IA
async function generateAIResponse(userMessage) {
  // Agregar mensaje del usuario al historial
  conversationState.messages.push({
    role: 'user',
    content: userMessage
  });
  
  // Crear el prompt completo con el historial
  const fullPrompt = conversationState.messages.map(msg => 
    `${msg.role === 'system' ? 'SISTEMA' : msg.role === 'user' ? 'ESTUDIANTE' : 'DOCENTE'}: ${msg.content}`
  ).join('\n\n');
  
  // Consultar OpenAI
  const response = await queryOpenAI(fullPrompt, conversationState.currentSession?.id, conversationState.currentCourse?.id);
  
  if (response) {
    // Agregar respuesta de la IA al historial
    conversationState.messages.push({
      role: 'assistant',
      content: response
    });
    
    return response;
  }
  
  return null;
}

// Función para procesar comandos
async function processCommand(input) {
  const parts = input.trim().split(' ');
  const command = parts[0].toLowerCase();
  
  switch (command) {
    case '/help':
      showHelp();
      break;
      
    case '/courses':
      showCourses();
      break;
      
    case '/select':
      if (parts.length >= 3) {
        const courseId = parts[1];
        const sessionNumber = parseInt(parts[2]);
        await selectCourse(courseId, sessionNumber);
      } else {
        print('red', '❌ Uso: /select <curso> <sesión>');
      }
      break;
      
    case '/start':
      await startClass();
      break;
      
    case '/clear':
      conversationState.messages = [];
      conversationState.isInClass = false;
      print('green', '✅ Estado de conversación limpiado');
      break;
      
    case '/quit':
    case '/exit':
      print('yellow', '👋 ¡Hasta luego!');
      process.exit(0);
      break;
      
    default:
      print('red', `❌ Comando no reconocido: ${command}`);
      showHelp();
      break;
  }
}

// Función para mostrar ayuda
function showHelp() {
  print('cyan', '\n📖 Comandos disponibles:');
  print('white', '/help - Mostrar esta ayuda');
  print('white', '/courses - Mostrar cursos disponibles');
  print('white', '/select <curso> <sesión> - Seleccionar curso y sesión');
  print('white', '/start - Iniciar la clase');
  print('white', '/clear - Limpiar estado de conversación');
  print('white', '/quit o /exit - Salir del chat');
  print('yellow', '\n💡 Una vez iniciada la clase, simplemente escribe tus respuestas');
}

// Función principal del chat
async function startChat() {
  // Detectar puerto del servidor
  await detectServerPort();
  print('green', `🌐 Servidor detectado en puerto ${conversationState.serverPort}`);
  
  // Crear interfaz de readline
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: ''
  });
  
  print('cyan', '🤖 Chat Terminal - DocenteIA v2.0');
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
      
      // Si estamos en clase, procesar como respuesta del estudiante
      if (conversationState.isInClass) {
        print('yellow', '🔄 Generando respuesta del docente...');
        
        const aiResponse = await generateAIResponse(trimmedInput);
        
        if (aiResponse) {
          print('cyan', `\n👨‍🏫 ${aiResponse}\n`);
        } else {
          print('red', '❌ Error generando respuesta');
        }
      } else {
        print('yellow', '💡 Usa /start para iniciar una clase primero');
      }
      
      askQuestion();
    });
  };
  
  askQuestion();
}

// Manejar señales de salida
process.on('SIGINT', () => {
  print('\n👋 ¡Hasta luego!');
  process.exit(0);
});

// Iniciar el chat
startChat().catch(console.error); 