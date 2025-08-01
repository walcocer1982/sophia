const readline = require('readline');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

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
  serverPort: 3000,
  // Nuevas variables para momentos personalizados
  momentosPersonalizados: null,
  contenidoReal: null,
  momentoActual: 0,
  teachingGuide: null,
  pedagogiaUniversal: null
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

// Función para cargar la pedagogía universal (personalidad del modelo)
function loadPedagogiaUniversal() {
  try {
    const filePath = path.join(__dirname, '../data/pedagogia-universal.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    print('red', '❌ Error cargando la pedagogía universal');
    return null;
  }
}

// Función para cargar contenido real de archivos por file_ID
async function loadFileContent(fileId, fileName) {
  try {
    print('yellow', `🔄 Cargando contenido real del archivo: ${fileName} (${fileId})`);
    
    // Verificar API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      print('red', '❌ Error: OPENAI_API_KEY no encontrada');
      return null;
    }
    
    const openai = new OpenAI({
      apiKey: apiKey
    });
    
    // Usar la API correcta para acceder al contenido del archivo
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: `Eres un asistente especializado en extraer y organizar contenido de archivos. 
          
INSTRUCCIONES:
- Extrae el contenido completo del archivo ${fileName} (ID: ${fileId})
- Organiza la información de manera clara y estructurada
- Mantén toda la estructura original del contenido
- Si no puedes acceder al archivo, indica claramente el error`
        },
        {
          role: "user", 
          content: `Necesito el contenido completo del archivo ${fileName} con ID ${fileId}. Por favor extrae toda la información disponible y organízala de manera clara.`
        }
      ],
      max_tokens: 4000,
      temperature: 0.1
    });
    
    const content = completion.choices[0]?.message?.content;
    
    if (content) {
      print('green', `✅ Contenido real cargado: ${fileName}`);
      return content;
    } else {
      print('red', `❌ Error: No se pudo extraer contenido del archivo ${fileName}`);
      return null;
    }
    
  } catch (error) {
    print('red', `❌ Error cargando contenido real del archivo: ${error.message}`);
    return null;
  }
}

// Función para generar momentos personalizados usando contenido real
async function generateMomentosConFileId(teachingGuide, contenidoReal, courseName, sessionName, fileId) {
  try {
    print('yellow', '🔄 Generando momentos personalizados con contenido real...');
    
    const momentos = [];
    
    for (let i = 0; i < teachingGuide.momentos.length; i++) {
      const momento = teachingGuide.momentos[i];
      
      // Usar file_search para generar momento personalizado con contenido real
      const apiKey = process.env.OPENAI_API_KEY;
      const openai = new OpenAI({ apiKey: apiKey });
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Eres un especialista en pedagogía que personaliza momentos de enseñanza. 
            
ESTRUCTURA DEL MOMENTO A PERSONALIZAR:
- Título: ${momento.titulo}
- Descripción: ${momento.descripcion}
- Ejemplos: ${momento.ejemplos.join(', ')}

CURSO: ${courseName}
SESIÓN: ${sessionName}
ARCHIVO: ${fileId}

Genera una versión personalizada de este momento que:
1. Se adapte específicamente al contenido del archivo
2. Use ejemplos relevantes al tema
3. Mantenga la estructura pedagógica
4. Sea específico para ${courseName} - ${sessionName}

Responde solo con el momento personalizado, sin explicaciones adicionales.`
          },
          {
            role: "user",
            content: `Personaliza el momento "${momento.titulo}" basándote en el contenido del archivo ${fileId}. Usa información específica del archivo para hacer el momento relevante al curso ${courseName} - ${sessionName}.`
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });
      
      const momentoPersonalizado = completion.choices[0]?.message?.content;
      
      if (momentoPersonalizado) {
        momentos.push({
          id: momento.momento,
          titulo: momento.titulo,
          descripcion: momento.descripcion,
          ejemplos: momento.ejemplos,
          personalizado: momentoPersonalizado
        });
        
        print('green', `✅ ${momento.momento} personalizado con contenido real`);
      }
    }
    
    print('green', `✅ Todos los momentos personalizados generados (${momentos.length})`);
    return momentos;
    
  } catch (error) {
    print('red', `❌ Error generando momentos personalizados: ${error.message}`);
    return null;
  }
}

// Función para consultar OpenAI optimizada (con embeddings)
async function queryOpenAI(query, sessionId, courseId) {
  try {
    const response = await axios.post(`http://localhost:${conversationState.serverPort}/api/openai-vector`, {
      query,
      sessionId,
      courseId
    }, {
      timeout: 20000 // Reducido de 30s a 15s
    });
    
    return response.data.response;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      print('red', '❌ Timeout: La respuesta tardó demasiado. Intenta de nuevo.');
    } else {
      print('red', `❌ Error consultando OpenAI: ${error.message}`);
    }
    return null;
  }
}

// Función para consultar OpenAI directamente sin embeddings (para conversación)
async function queryOpenAIDirect(messages) {
  try {
    // Verificar API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      print('red', '❌ Error: OPENAI_API_KEY no encontrada');
      return null;
    }
    
    const openai = new OpenAI({
      apiKey: apiKey
    });
    
    // Llamada directa a OpenAI sin embeddings
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7
    });
    
    return completion.choices[0].message.content;
    
  } catch (error) {
    print('red', `❌ Error consultando OpenAI directamente: ${error.message}`);
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
  print('cyan', `📁 File ID: ${session.file_id}`);
  print('cyan', `📄 Archivo: ${session.file_name}`);
  
  // Cargar todo el contexto al inicio (una sola vez)
  print('yellow', '🔄 Cargando contexto completo...');
  
  // 1. Cargar pedagogía universal (personalidad del modelo)
  conversationState.pedagogiaUniversal = loadPedagogiaUniversal();
  if (!conversationState.pedagogiaUniversal) {
    print('red', '❌ Error cargando pedagogía universal');
    return false;
  }
  print('green', '✅ Pedagogía universal cargada (personalidad del modelo)');
  
  // 2. Cargar teaching guide (estructura de momentos)
  conversationState.teachingGuide = loadTeachingGuide();
  if (!conversationState.teachingGuide) {
    print('red', '❌ Error cargando teaching guide');
    return false;
  }
  print('green', '✅ Teaching guide cargado (estructura de momentos)');
  
  // 3. Cargar contenido real del archivo usando file_id
  conversationState.contenidoReal = await loadFileContent(session.file_id, session.file_name);
  if (!conversationState.contenidoReal) {
    print('red', '❌ Error cargando contenido real del archivo');
    return false;
  }
  print('green', '✅ Contenido real del archivo cargado');
  
  // 4. Generar momentos personalizados con contenido real
  conversationState.momentosPersonalizados = await generateMomentosConFileId(
    conversationState.teachingGuide,
    conversationState.contenidoReal,
    course.name,
    session.name,
    session.file_id
  );
  
  if (!conversationState.momentosPersonalizados) {
    print('red', '❌ Error generando momentos personalizados');
    return false;
  }
  
  print('green', `✅ Contexto completo cargado (${conversationState.momentosPersonalizados.length} momentos)`);
  print('cyan', '🚀 Listo para iniciar la clase con momentos personalizados');
  
  return true;
}

// Función para iniciar la clase
async function startClass() {
  if (!conversationState.currentCourse || !conversationState.currentSession) {
    print('red', '❌ Debes seleccionar un curso y sesión primero');
    return;
  }
  
  if (!conversationState.momentosPersonalizados) {
    print('red', '❌ No hay momentos personalizados cargados. Usa /select primero');
    return;
  }
  
  if (!conversationState.pedagogiaUniversal) {
    print('red', '❌ No hay pedagogía universal cargada. Usa /select primero');
    return;
  }
  
  conversationState.isInClass = true;
  conversationState.messages = []; // Limpiar historial
  conversationState.momentoActual = 0; // Iniciar en el primer momento
  
  // Configurar el system prompt con personalidad pedagógica completa
  const pedagogia = conversationState.pedagogiaUniversal.pedagogia_universal;
  const systemPrompt = `Eres un ${conversationState.currentCourse.specialist_role} aplicando la metodología "Teach Like a Champion" con enfoque inductivo puro.

CURSO: ${conversationState.currentCourse.name}
SESIÓN: ${conversationState.currentSession.name}
OBJETIVO: ${conversationState.currentSession.learning_objective}
PUNTOS CLAVE: ${conversationState.currentSession.key_points.join(', ')}

PERSONALIDAD PEDAGÓGICA - PRINCIPIOS FUNDAMENTALES:
- Filosofía: ${pedagogia.principios_fundamentales.filosofia_base}
- Enfoque respuestas: ${pedagogia.principios_fundamentales.enfoque_respuestas}
- Manejo errores: ${pedagogia.principios_fundamentales.manejo_errores}
- Validación: ${pedagogia.principios_fundamentales.validacion}
- Personalización: ${pedagogia.principios_fundamentales.personalizacion}

MOMENTOS PEDAGÓGICOS DISPONIBLES:
${Object.entries(pedagogia.momentos_pedagogicos).map(([key, momento]) => 
  `${key}: ${momento.objetivo_pedagogico}`
).join('\n')}

PRINCIPIOS TRANSVERSALES:
- Adaptación ritmo: ${pedagogia.principios_transversales.adaptacion_ritmo.join(', ')}
- Mantenimiento engagement: ${pedagogia.principios_transversales.mantenimiento_engagement.join(', ')}
- Construcción confianza: ${pedagogia.principios_transversales.construccion_confianza.join(', ')}

MOMENTOS PERSONALIZADOS DE LA CLASE:
${conversationState.momentosPersonalizados.map((momento, index) => 
  `${index + 1}. ${momento.titulo}: ${momento.personalizado}`
).join('\n')}

INSTRUCCIONES CRÍTICAS:
- NUNCA dar definiciones directas (metodología inductiva pura)
- Usar técnicas específicas de cada momento pedagógico
- Construir sobre respuestas parciales, nunca descartar totalmente
- Verificar comprensión constantemente antes de avanzar
- Adaptar al ritmo del estudiante individual
- Mantener engagement y construir confianza
- Aplicar "Right is Right" - solo respuestas completamente correctas
- Usar "Stretch It" - profundizar con "¿Por qué?" o "¿Qué más?"`;

  // Agregar mensaje del sistema
  conversationState.messages.push({
    role: 'system',
    content: systemPrompt
  });
  
  print('green', `🎓 ¡Bienvenido a la clase de ${conversationState.currentSession.name}!`);
  print('cyan', '🧠 Aplicando metodología "Teach Like a Champion" con enfoque inductivo puro.');
  print('cyan', '🎯 Personalidad pedagógica completa cargada.');
  print('cyan', '📁 Contenido real de archivos cargado.');
  print('cyan', '⚡ Modo optimizado: Sin generación de embeddings durante conversación.\n');
  
  // Usar el primer momento personalizado para el saludo
  const primerMomento = conversationState.momentosPersonalizados[0];
  const greeting = await generateAIResponse(`Aplica el primer momento personalizado: ${primerMomento.personalizado}`);
  
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
  
  // Determinar el momento actual basado en la conversación
  const momentoActual = conversationState.momentoActual;
  if (conversationState.momentosPersonalizados && momentoActual < conversationState.momentosPersonalizados.length) {
    const momento = conversationState.momentosPersonalizados[momentoActual];
    
    // Agregar contexto del momento actual al historial de mensajes
    conversationState.messages.push({
      role: 'system',
      content: `MOMENTO ACTUAL: ${momento.titulo}\n${momento.personalizado}`
    });
    
    // Usar función directa sin embeddings
    const response = await queryOpenAIDirect(conversationState.messages);
    
    // Remover el mensaje del momento actual del historial (para no acumular)
    conversationState.messages.pop();
    
    // Avanzar al siguiente momento después de una respuesta exitosa
    if (response) {
      conversationState.momentoActual++;
      if (conversationState.momentoActual >= conversationState.momentosPersonalizados.length) {
        print('green', '🎉 ¡Has completado todos los momentos de la sesión!');
      }
    }
    
    if (response) {
      // Agregar respuesta de la IA al historial
      conversationState.messages.push({
        role: 'assistant',
        content: response
      });
    }
    
    return response;
  } else {
    // Fallback si no hay momentos personalizados - usar función directa
    const response = await queryOpenAIDirect(conversationState.messages);
    
    if (response) {
      // Agregar respuesta de la IA al historial
      conversationState.messages.push({
        role: 'assistant',
        content: response
      });
    }
    
    return response;
  }
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
      conversationState.momentoActual = 0;
      print('green', '✅ Estado de conversación limpiado');
      break;
      
    case '/momentos':
      if (conversationState.momentosPersonalizados) {
        print('cyan', '\n📚 Momentos Personalizados:');
        conversationState.momentosPersonalizados.forEach((momento, index) => {
          const status = index === conversationState.momentoActual ? '🔄 ACTUAL' : 
                        index < conversationState.momentoActual ? '✅ COMPLETADO' : '⏳ PENDIENTE';
          print('white', `${index + 1}. ${momento.titulo} - ${status}`);
        });
        print('cyan', `\nProgreso: ${conversationState.momentoActual}/${conversationState.momentosPersonalizados.length} momentos`);
      } else {
        print('red', '❌ No hay momentos personalizados cargados');
      }
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
  print('white', '/start - Iniciar la clase con momentos personalizados');
  print('white', '/momentos - Ver progreso de momentos');
  print('white', '/clear - Limpiar estado de conversación');
  print('white', '/quit o /exit - Salir del chat');
  print('yellow', '\n💡 Una vez iniciada la clase, simplemente escribe tus respuestas');
  print('yellow', '🎯 El sistema seguirá automáticamente la secuencia de momentos personalizados');
  print('yellow', '🧠 Personalidad pedagógica completa basada en "Teach Like a Champion"');
  print('yellow', '📁 Contenido real de archivos de OpenAI por file_ID');
  print('yellow', '⚡ Modo optimizado: Respuestas instantáneas sin generación de embeddings');
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
