#!/usr/bin/env node

const readline = require('readline');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configurar readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Colores simples
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function print(color, text) {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

// Función para consultar OpenAI
// Función para detectar el puerto del servidor Next.js
async function detectServerPort() {
  const ports = [3000, 3001, 3002, 3003, 3004, 3005];
  
  for (const port of ports) {
    try {
      const response = await axios.get(`http://localhost:${port}`, { timeout: 1000 });
      if (response.status === 200) {
        return port;
      }
    } catch (error) {
      // Continuar con el siguiente puerto
    }
  }
  
  // Si no encuentra ningún puerto, usar 3000 por defecto
  return 3000;
}

async function queryVectorStore(query, sessionId = null, courseId = null) {
  try {
    print('yellow', '🔍 Consultando OpenAI...');
    
    // Detectar puerto automáticamente
    const port = await detectServerPort();
    print('cyan', `🌐 Conectando al servidor en puerto ${port}...`);
    
    const requestBody = {
      query,
      ...(sessionId && { sessionId }),
      ...(courseId && { courseId })
    };
    
    const response = await axios.post(`http://localhost:${port}/api/openai-vector`, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    print('green', '\n🤖 Respuesta:');
    console.log(response.data.response);
    console.log('');
    
    return response.data.response;
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      print('red', '❌ Error: El servidor Next.js no está corriendo.');
      print('yellow', '💡 Ejecuta: npm run dev');
    } else {
      print('red', `Error: ${error.message}`);
    }
    return null;
  }
}

// Función para mostrar sesiones disponibles
function showSessions() {
  print('cyan', '\n🎯 Cursos Disponibles:');
  print('white', '1. SSO001 - Seguridad y Salud Ocupacional');
  print('white', '2. PER001 - Operación de Equipos de Perforación');
  print('cyan', '\n💡 Usa: /select <curso> <sesión> para seleccionar');
  print('cyan', '   Ejemplos:');
  print('cyan', '   /select SSO001 1 - SSO, sesión 1 (IPERC)');
  print('cyan', '   /select PER001 1 - Perforación, sesión 1 (Fundamentos)\n');
}

// Variables globales
let currentCourse = null;
let currentSession = null;
let loadedMoments = null;
let isClassActive = false;
let currentMoment = 0;
let conversationHistory = [];
let isInConversation = false;
let studentName = null;

// Función para limpiar variables globales
function clearGlobalState() {
  currentCourse = null;
  currentSession = null;
  loadedMoments = null;
  isClassActive = false;
  currentMoment = 0;
  conversationHistory = [];
  isInConversation = false;
  studentName = null;
}

// Función para cargar la base de datos de cursos
function loadCoursesDatabase() {
  try {
    const coursesPath = path.join(__dirname, '../data/courses-database.json');
    const coursesData = fs.readFileSync(coursesPath, 'utf8');
    return JSON.parse(coursesData).courses;
  } catch (error) {
    print('red', '❌ Error al cargar la base de datos de cursos');
    return [];
  }
}

// Función para seleccionar curso y sesión
async function selectSession(courseId, sessionNumber) {
  const courses = loadCoursesDatabase();
  
  // Buscar el curso
  const course = courses.find(c => c.id === courseId);
  if (!course) {
    print('red', `❌ Curso ${courseId} no encontrado. Cursos disponibles: SSO001, PER001\n`);
    return null;
  }
  
  // Buscar la sesión
  const sessionIndex = parseInt(sessionNumber) - 1;
  if (sessionIndex < 0 || sessionIndex >= course.sessions.length) {
    print('red', `❌ Número de sesión inválido. Sesiones disponibles: 1-${course.sessions.length}\n`);
    return null;
  }
  
  const session = course.sessions[sessionIndex];
  
  // Establecer curso y sesión actuales
  currentCourse = course;
  currentSession = session;
  
  print('green', `✅ Curso seleccionado: ${currentCourse.id}`);
  print('cyan', `👨‍🏫 Especialista: ${currentCourse.specialist_role}`);
  print('green', `✅ Sesión seleccionada: ${currentSession.id}`);
  print('cyan', `📚 Tema: ${currentSession.name}`);
  print('cyan', `🎯 Objetivo: ${currentSession.learning_objective}`);
  
  // Cargar momentos automáticamente
  print('yellow', '🔄 Cargando momentos automáticamente...');
  await loadAllMoments();
  
  // Iniciar conversación automáticamente
  print('green', '🚀 Iniciando conversación automáticamente...\n');
  await startConversation();
  
  return { course: currentCourse, session: currentSession };
}

// Función para cargar todos los momentos de una sesión
async function loadAllMoments() {
  if (!currentSession) {
    print('red', '❌ No hay sesión seleccionada. Usa /select primero.\n');
    return;
  }

  print('yellow', `🔄 Cargando todos los momentos de ${currentSession.id}...`);
  
  // Cargar guía de enseñanza para obtener títulos precisos
  const teachingGuide = loadTeachingGuide();
  
  if (teachingGuide) {
    loadedMoments = teachingGuide.momentos.map(moment => ({
      id: moment.momento,
      title: moment.titulo
    }));
    print('green', `📖 Usando guía de enseñanza: ${teachingGuide.rol_docente_ia}`);
  } else {
    // Fallback a títulos básicos si no se puede cargar la guía
    loadedMoments = [
      { id: 'MOMENTO_0', title: 'SALUDO Y ENCENDIDO DEL AULA' },
      { id: 'MOMENTO_1', title: 'CONEXIÓN CON SABERES PREVIOS Y RELEVANCIA' },
      { id: 'MOMENTO_2', title: 'ADQUISICIÓN DE CONOCIMIENTOS BÁSICOS' },
      { id: 'MOMENTO_3', title: 'APLICACIÓN PRÁCTICA' },
      { id: 'MOMENTO_4', title: 'DISCUSIÓN Y CONTRASTE' },
      { id: 'MOMENTO_5', title: 'REFLEXIÓN FINAL Y CIERRE' }
    ];
  }

  print('green', `✅ Momentos de ${currentSession.id} cargados exitosamente\n`);
}

// Función para cargar la guía de enseñanza
function loadTeachingGuide() {
  try {
    const guidePath = path.join(__dirname, '../data/teaching-guide.json');
    const guideData = fs.readFileSync(guidePath, 'utf8');
    return JSON.parse(guideData);
  } catch {
    print('red', '❌ Error al cargar la guía de enseñanza');
    return null;
  }
}

// Función para generar prompt específico de un momento
function generateMomentPrompt(momentoId, sessionContent, teachingGuide) {
  const moment = teachingGuide.momentos.find(m => m.momento === momentoId);
  if (!moment) {
    return `¿Qué dice el ${momentoId} del contenido ${sessionContent}?`;
  }

  const randomExample = moment.ejemplos[Math.floor(Math.random() * moment.ejemplos.length)];
  
  return `Actúa como un ${teachingGuide.rol_docente_ia} en modalidad ${teachingGuide.modalidad}.

${moment.titulo}: ${moment.descripcion}

Ejemplo de interacción: "${randomExample}"

Ahora, basándote en el contenido del ${momentoId} del archivo ${sessionContent}, desarrolla este momento de la clase de manera natural y pedagógica. Incluye:
1. Una introducción al contenido específico del momento
2. Preguntas interactivas basadas en el material
3. Ejemplos prácticos relacionados
4. Verificación de comprensión

Contenido a consultar: ¿Qué dice el ${momentoId} del contenido ${sessionContent}?`;
}

// Función para comenzar la clase automática
async function startClass() {
  if (!currentSession) {
    print('red', '❌ No hay sesión seleccionada. Usa /select primero.\n');
    return;
  }

  if (!loadedMoments) {
    print('red', '❌ No hay momentos cargados. Usa /load primero.\n');
    return;
  }

  // Cargar guía de enseñanza
  const teachingGuide = loadTeachingGuide();
  if (!teachingGuide) {
    print('red', '❌ No se pudo cargar la guía de enseñanza. Continuando sin ella...\n');
  } else {
    print('green', `📖 Guía de enseñanza cargada: ${teachingGuide.rol_docente_ia}`);
  }

  isClassActive = true;
  print('green', `🎓 ¡Bienvenidos a la clase de ${currentSession.name}!`);
  print('cyan', '🚀 Iniciando clase automática con Docente-IA...\n');

  for (let i = 0; i < loadedMoments.length; i++) {
    if (!isClassActive) break; // Permitir pausar la clase
    
    const moment = loadedMoments[i];
    print('yellow', `\n📚 ${moment.id}: ${moment.title}`);
    print('cyan', '🔄 Docente-IA preparando el momento...');
    
    // Generar prompt específico del momento
    const sessionContent = `contenido_sso_${currentSession.id}_MSEII`;
    const query = teachingGuide 
      ? generateMomentPrompt(moment.id, sessionContent, teachingGuide)
      : `¿Qué dice el ${moment.id} del contenido ${sessionContent}?`;
    
    await queryVectorStore(query);
    
    if (i < loadedMoments.length - 1) {
      print('yellow', '⏸️  Presiona Enter para continuar al siguiente momento...');
      await new Promise(resolve => {
        rl.question('', () => resolve());
      });
    }
  }

  if (isClassActive) {
    print('green', '\n🎉 ¡Clase completada exitosamente!');
    print('cyan', '📝 Gracias por participar en la sesión.\n');
  }
  
  isClassActive = false;
}

// Función para esperar respuesta del estudiante
async function waitForStudentResponse() {
  return new Promise((resolve) => {
    // Usar readline de forma más controlada
    const tempRl = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    tempRl.question(`${colors.green}👤 Tú: ${colors.reset}`, (input) => {
      tempRl.close();
      resolve(input.trim());
    });
  });
}



// Función para guiar conversación por momentos
async function guideThroughMoments() {
  if (!loadedMoments) {
    print('red', '❌ No hay momentos cargados. Usa /load primero.');
    return;
  }

  print('green', `🎓 ¡Bienvenido a la clase de ${currentSession.name}!`);
  print('cyan', '🚀 Iniciando conversación guiada...\n');

  for (let i = 0; i < loadedMoments.length; i++) {
    if (!isInConversation) break; // Permitir pausar
    
    currentMoment = i;
    const moment = loadedMoments[i];
    
    print('yellow', `\n📚 ${moment.id}: ${moment.title}`);
    
    // 1. Obtener contenido real del momento
    const contentQuery = `¿Qué dice el ${moment.id} del ${currentSession.file_name}?`;
    print('cyan', '🔄 Obteniendo contenido del momento...');
    print('cyan', `📁 Archivo: ${currentSession.file_name}`);
    print('cyan', `🎯 Curso: ${currentCourse?.id} - ${currentCourse?.name}`);
    
    const momentContent = await queryVectorStore(contentQuery, currentSession.id, currentCourse?.id);
    
    // 2. Obtener estructura del momento desde teaching-guide.json
    const teachingGuide = loadTeachingGuide();
    const momentGuide = teachingGuide?.momentos.find(m => m.momento === moment.id);
    
    if (momentGuide) {
      print('green', `📖 Usando guía: ${momentGuide.titulo}`);
      
      // 3. Seguir estructura específica del momento
      if (moment.id === 'MOMENTO_0') {
        // MOMENTO_0: Saludo específico
        const saludo = momentGuide.ejemplos[0].replace('[nombre]', studentName || 'estudiante');
        print('cyan', `\n🎓 ${saludo}`);
        
        // Esperar respuesta del estudiante
        const respuesta = await waitForStudentResponse();
        conversationHistory.push(`Docente: ${saludo}`);
        conversationHistory.push(`Estudiante: ${respuesta}`);
        
        // Segunda pregunta del MOMENTO_0
        const segundaPregunta = momentGuide.ejemplos[1];
        print('cyan', `\n🎓 ${segundaPregunta}`);
        const segundaRespuesta = await waitForStudentResponse();
        conversationHistory.push(`Docente: ${segundaPregunta}`);
        conversationHistory.push(`Estudiante: ${segundaRespuesta}`);
        
      } else if (moment.id === 'MOMENTO_1') {
        // MOMENTO_1: Historia/caso específico sobre el contenido
        print('cyan', `\n📚 ${momentGuide.titulo}:`);
        print('cyan', momentGuide.descripcion);
        
        // Mostrar contenido específico
        print('cyan', '\n📖 Contenido del tema:');
        console.log(momentContent);
        
        // Generar historia/caso específico sobre el contenido
        const historiaPrompt = `Basándote en este contenido específico del ${moment.id}:

${momentContent}

Genera una historia o caso breve relacionado con este contenido sobre prevención de incendios que:
- Esté directamente relacionada con el material mostrado
- Sea realista y relevante
- Active el pensamiento crítico
- Termine con una pregunta que invite a opinar

Responde SOLO con la historia y pregunta, sin explicaciones adicionales.`;
        
        print('yellow', '🔄 Generando historia específica del momento...');
        const historiaEspecifica = await queryVectorStore(historiaPrompt, currentSession.id, currentCourse?.id);
        
        print('cyan', `\n🎓 ${historiaEspecifica}`);
        print('yellow', '⏳ Escribe tu respuesta y presiona Enter...');
        const respuesta = await waitForStudentResponse();
        print('green', `✅ Respuesta capturada: "${respuesta}"`);
        conversationHistory.push(`Docente: ${historiaEspecifica}`);
        conversationHistory.push(`Estudiante: ${respuesta}`);
        
        // Generar respuesta del docente basada en la respuesta del estudiante
        const respuestaDocentePrompt = `Como ${currentCourse.specialist_role}, responde de manera empática y constructiva a la respuesta del estudiante:

Respuesta del estudiante: "${respuesta}"

Genera una respuesta que:
- Valide la respuesta del estudiante
- Agregue información relevante del contenido
- Mantenga el enfoque en los puntos clave de la sesión
- Sea conversacional y motivadora

Responde SOLO con tu respuesta, sin explicaciones adicionales.`;
        
        print('yellow', '🔄 Generando respuesta del docente...');
        const respuestaDocente = await queryVectorStore(respuestaDocentePrompt, currentSession.id, currentCourse?.id);
        print('cyan', `\n👨‍🏫 ${respuestaDocente}`);
        conversationHistory.push(`Docente: ${respuestaDocente}`);
        
        // Pausa para que el estudiante lea la respuesta
        print('yellow', '\n⏸️  Presiona Enter para continuar...');
        await waitForStudentResponse();
        
      } else if (moment.id === 'MOMENTO_2') {
        // MOMENTO_2: Explicación de conceptos
        print('cyan', `\n📚 ${momentGuide.titulo}:`);
        print('cyan', momentGuide.descripcion);
        
                 // Explicar contenido del file_id
         print('cyan', '\n📖 Contenido específico:');
         console.log(momentContent);
        
        // Hacer pregunta de verificación
        const preguntaVerificacion = momentGuide.ejemplos[0];
        print('cyan', `\n🎓 ${preguntaVerificacion}`);
        const respuesta = await waitForStudentResponse();
        conversationHistory.push(`Docente: ${preguntaVerificacion}`);
        conversationHistory.push(`Estudiante: ${respuesta}`);
        
        // Generar respuesta del docente basada en la respuesta del estudiante
        const respuestaDocentePrompt = `Como ${currentCourse.specialist_role}, responde de manera empática y constructiva a la respuesta del estudiante:

Respuesta del estudiante: "${respuesta}"

Genera una respuesta que:
- Valide la respuesta del estudiante
- Agregue información relevante del contenido
- Mantenga el enfoque en los puntos clave de la sesión
- Sea conversacional y motivadora

Responde SOLO con tu respuesta, sin explicaciones adicionales.`;
        
        print('yellow', '🔄 Generando respuesta del docente...');
        const respuestaDocente = await queryVectorStore(respuestaDocentePrompt, currentSession.id, currentCourse?.id);
        print('cyan', `\n👨‍🏫 ${respuestaDocente}`);
        conversationHistory.push(`Docente: ${respuestaDocente}`);
        
             } else {
         // Otros momentos: Combinar contenido con estructura de la guía
         print('cyan', `\n📚 ${momentGuide.titulo}:`);
         print('cyan', momentGuide.descripcion);
         
         // Mostrar contenido específico
         print('cyan', '\n📖 Contenido del tema:');
         console.log(momentContent);
         
         // Generar pregunta específica sobre el contenido del momento
         const preguntaPrompt = `Basándote en este contenido específico del ${moment.id}:

${momentContent}

Y siguiendo la estructura del momento: ${momentGuide.titulo}
${momentGuide.descripcion}

Genera UNA SOLA pregunta específica sobre este contenido que:
- Esté directamente relacionada con el material mostrado
- Siga el propósito del momento (${momentGuide.titulo})
- Sea conversacional y empática
- Invite a la reflexión sobre el contenido específico

Responde SOLO con la pregunta, sin explicaciones.`;
         
         print('yellow', '🔄 Generando pregunta específica del momento...');
         const preguntaEspecifica = await queryVectorStore(preguntaPrompt, currentSession.id, currentCourse?.id);
         
         print('cyan', `\n🎓 ${preguntaEspecifica}`);
         const respuesta = await waitForStudentResponse();
         conversationHistory.push(`Docente: ${preguntaEspecifica}`);
         conversationHistory.push(`Estudiante: ${respuesta}`);
         
         // Generar respuesta del docente basada en la respuesta del estudiante
         const respuestaDocentePrompt = `Como ${currentCourse.specialist_role}, responde de manera empática y constructiva a la respuesta del estudiante:

Respuesta del estudiante: "${respuesta}"

Genera una respuesta que:
- Valide la respuesta del estudiante
- Agregue información relevante del contenido
- Mantenga el enfoque en los puntos clave de la sesión
- Sea conversacional y motivadora

Responde SOLO con tu respuesta, sin explicaciones adicionales.`;
         
         print('yellow', '🔄 Generando respuesta del docente...');
         const respuestaDocente = await queryVectorStore(respuestaDocentePrompt, currentSession.id, currentCourse?.id);
         print('cyan', `\n👨‍🏫 ${respuestaDocente}`);
         conversationHistory.push(`Docente: ${respuestaDocente}`);
       }
    } else {
      // Fallback si no se encuentra la guía
      print('yellow', '⚠️ No se encontró guía específica para este momento');
      
      // Hacer pregunta genérica
      const preguntaPrompt = `Basándote en este contenido del ${moment.id}:

${momentContent}

Genera UNA SOLA pregunta específica y conversacional sobre este contenido. Responde SOLO con la pregunta.`;
      
      const pregunta = await queryVectorStore(preguntaPrompt, currentSession.id, currentCourse?.id);
      print('cyan', `\n🎓 ${pregunta}`);
      const respuesta = await waitForStudentResponse();
      conversationHistory.push(`Docente: ${pregunta}`);
      conversationHistory.push(`Estudiante: ${respuesta}`);
      
      // Generar respuesta del docente basada en la respuesta del estudiante
      const respuestaDocentePrompt = `Como ${currentCourse.specialist_role}, responde de manera empática y constructiva a la respuesta del estudiante:

Respuesta del estudiante: "${respuesta}"

Genera una respuesta que:
- Valide la respuesta del estudiante
- Agregue información relevante del contenido
- Mantenga el enfoque en los puntos clave de la sesión
- Sea conversacional y motivadora

Responde SOLO con tu respuesta, sin explicaciones adicionales.`;
      
      print('yellow', '🔄 Generando respuesta del docente...');
      const respuestaDocente = await queryVectorStore(respuestaDocentePrompt, currentSession.id, currentCourse?.id);
      print('cyan', `\n👨‍🏫 ${respuestaDocente}`);
      conversationHistory.push(`Docente: ${respuestaDocente}`);
    }
    
    // 5. Transicionar al siguiente momento
    if (i < loadedMoments.length - 1) {
      print('yellow', '\n⏸️  Presiona Enter para continuar al siguiente momento...');
      await new Promise(resolve => {
        rl.question('', () => resolve());
      });
    }
  }

  if (isInConversation) {
    print('green', '\n🎉 ¡Conversación completada exitosamente!');
    print('cyan', '📝 Gracias por participar en la sesión.\n');
  }
  
  isInConversation = false;
}

// Función para iniciar conversación
async function startConversation() {
  if (!currentSession) {
    print('red', '❌ No hay sesión seleccionada. Usa /select primero.\n');
    return;
  }

  if (!loadedMoments) {
    print('red', '❌ No hay momentos cargados. Usa /load primero.\n');
    return;
  }

  isInConversation = true;
  currentMoment = 0;
  conversationHistory = [];
  
  // Preguntar nombre del estudiante
  print('cyan', '👋 ¡Hola! Soy tu docente virtual. ¿Cómo te llamas?');
  studentName = await waitForStudentResponse();
  
  if (studentName) {
    print('green', `¡Hola ${studentName}! Es un placer conocerte.`);
  }
  
  // Iniciar conversación guiada por momentos
  await guideThroughMoments();
}

// Función para mostrar ayuda
function showHelp() {
  print('cyan', '\n=== COMANDOS ===');
  print('white', '/vector <consulta> - Consultar contenido del curso');
  print('white', '/sessions - Mostrar sesiones disponibles');
  print('white', '/select <curso> <sesión> - Seleccionar curso y sesión (ej: /select SSO001 1)');
  print('white', '/start - Comenzar clase automática');
  print('white', '/conversar - Iniciar conversación guiada con Docente-IA');
  print('white', '/clear - Limpiar estado y variables globales');
  print('white', '/help - Mostrar ayuda');
  print('white', '/exit - Salir');
  print('cyan', '================\n');
}

// Función principal
async function startChat() {
  print('cyan', '🤖 Chat Terminal - Docente-IA');
  print('yellow', 'Escribe /help para ver comandos\n');
  
  // Mostrar sesiones disponibles automáticamente
  showSessions();

  const askQuestion = () => {
    rl.question(`${colors.green}👤 Tú: ${colors.reset}`, async (input) => {
      const trimmedInput = input.trim();

      if (trimmedInput === '') {
        askQuestion();
        return;
      }

      if (trimmedInput === '/exit') {
        print('yellow', '¡Hasta luego! 👋');
        rl.close();
        return;
      }

      if (trimmedInput === '/help') {
        showHelp();
        askQuestion();
        return;
      }

      if (trimmedInput === '/sessions') {
        showSessions();
        askQuestion();
        return;
      }

      if (trimmedInput.startsWith('/select ')) {
        const parts = trimmedInput.substring(8).trim().split(' ');
        if (parts.length >= 2) {
          const courseId = parts[0];
          const sessionNumber = parts[1];
          await selectSession(courseId, sessionNumber);
        } else {
          print('red', '❌ Formato incorrecto. Usa: /select <curso> <sesión>');
          print('cyan', '   Ejemplo: /select SSO001 1');
        }
        askQuestion();
        return;
      }

      if (trimmedInput === '/load') {
        await loadAllMoments();
        askQuestion();
        return;
      }

      if (trimmedInput === '/start') {
        await startClass();
        askQuestion();
        return;
      }

      if (trimmedInput === '/clear') {
        clearGlobalState();
        print('green', '✅ Estado limpiado. Variables globales reiniciadas.');
        askQuestion();
        return;
      }

      if (trimmedInput === '/conversar') {
        await startConversation();
        askQuestion();
        return;
      }

      if (trimmedInput.startsWith('/vector ')) {
        const query = trimmedInput.substring(8);
        await queryVectorStore(query);
        askQuestion();
        return;
      }

      print('red', '❌ Comando no reconocido. Usa /help para ver comandos disponibles.');
      askQuestion();
    });
  };

  askQuestion();
}

// Manejar salida
rl.on('close', () => {
  process.exit(0);
});

// Iniciar
startChat().catch(console.error); 