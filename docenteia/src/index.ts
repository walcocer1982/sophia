import { config } from 'dotenv';
import { DocenteAI } from './core/DocenteAI';
import { SessionStore } from './data/SessionStore';
import { Logger } from './utils/Logger';
import { CostTracker } from './utils/CostTracker';

// Cargar variables de entorno
config();

const logger = new Logger('Main');

/**
 * 🚀 DOCENTEIA V2 - Sistema Refactorizado
 * 
 * Características principales:
 * - OpenAI Responses API con structured outputs
 * - JSON garantizado por OpenAI
 * - Estado automático gestionado por OpenAI
 * - Tracking de costos integrado
 * - Logging estructurado
 */

async function main() {
  try {
    logger.info('🚀 Iniciando DocenteIA V2...');
    
    // Verificar configuración
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no configurada');
    }

    // Inicializar SessionStore
    await SessionStore.initialize();
    logger.info('✅ SessionStore inicializado');

    // Crear instancia principal
    const docente = new DocenteAI();
    
    logger.info('✅ DocenteIA V2 iniciado correctamente');
    
    // Ejemplo de uso
    await demonstrateUsage(docente);
    
  } catch (error) {
    logger.error(`Error iniciando DocenteIA V2: ${error}`);
    process.exit(1);
  }
}

/**
 * 📚 Demostración de uso
 */
async function demonstrateUsage(docente: DocenteAI) {
  try {
    logger.info('📚 Iniciando demostración de uso...');

    // 1. Iniciar sesión
    logger.info('1️⃣ Iniciando sesión...');
    const { sessionKey, initialMessage } = await docente.startSession('SSO001', 'sesion01');
    
    console.log('\n🎓 MENSAJE INICIAL:');
    console.log(initialMessage);
    console.log('\n' + '='.repeat(50));

    // 2. Procesar respuesta del estudiante
    logger.info('2️⃣ Procesando respuesta del estudiante...');
    const studentResponse = 'Hola, estoy listo para aprender sobre seguridad contra incendios';
    
    const response = await docente.handleStudent(sessionKey, studentResponse);
    
    console.log('\n🤖 RESPUESTA DEL DOCENTE:');
    console.log(response.respuesta);
    console.log('\n📊 METADATOS:');
    console.log(`- Momento actual: ${response.momento_actual}`);
    console.log(`- Progreso: ${response.progreso}/${response.total_momentos}`);
    console.log(`- Debe avanzar: ${response.debe_avanzar}`);
    console.log(`- Razón: ${response.razon_avance}`);
    console.log('\n' + '='.repeat(50));

    // 3. Obtener información de la sesión
    logger.info('3️⃣ Obteniendo información de sesión...');
    const sessionInfo = await docente.getSessionInfo(sessionKey);
    
    console.log('\n📋 INFORMACIÓN DE SESIÓN:');
    console.log(`- Clave: ${sessionInfo.sessionKey}`);
    console.log(`- Progreso: ${sessionInfo.progress}`);
    console.log(`- Momento actual: ${sessionInfo.currentMoment}`);
    console.log(`- Preguntas pendientes: ${sessionInfo.pendingQuestions}`);

    logger.info('✅ Demostración completada exitosamente');

  } catch (error) {
    logger.error(`Error en demostración: ${error}`);
  }
}

/**
 * 🔧 Función para testing manual
 */
export async function testSession(courseId: string, sessionId: string, studentMessage: string) {
  try {
    const docente = new DocenteAI();
    
    // Iniciar sesión
    const { sessionKey, initialMessage } = await docente.startSession(courseId, sessionId);
    console.log('Mensaje inicial:', initialMessage);
    
    // Procesar mensaje del estudiante
    const response = await docente.handleStudent(sessionKey, studentMessage);
    console.log('Respuesta:', response.respuesta);
    
    return { sessionKey, response };
    
  } catch (error) {
    logger.error(`Error en test: ${error}`);
    throw error;
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main().catch(error => {
    logger.error(`Error fatal: ${error}`);
    process.exit(1);
  });
}

export { DocenteAI }; 