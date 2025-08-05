import { config } from 'dotenv';
import { DocenteAI } from '../core/DocenteAI';
import { Logger } from '../utils/Logger';
import * as readline from 'readline';

// Cargar variables de entorno
config();

const logger = new Logger('ChatFluido');

/**
 * 🚀 CHAT FLUIDO PARA DOCENTEIA V2
 * 
 * Chat continuo sin pausas - escribe y recibe respuestas inmediatamente
 */

class ChatFluido {
  private docente: DocenteAI;
  private rl: readline.Interface;
  private sessionKey: string | null = null;
  private isActive = false;

  constructor() {
    this.docente = new DocenteAI();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * 🚀 Iniciar el chat fluido
   */
  async start(): Promise<void> {
    try {
      console.log('\n🎓 ========================================');
      console.log('🚀 DOCENTEIA V2 - CHAT FLUIDO');
      console.log('========================================\n');

      // Verificar configuración
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('❌ OPENAI_API_KEY no configurada');
      }

      console.log('✅ Configuración verificada');
      console.log('📚 Cursos disponibles: SSO001 (Seguridad contra Incendios)');
      console.log('📝 Sesiones disponibles: sesion01, sesion02, sesion03\n');

      await this.iniciarSesion();

    } catch (error) {
      logger.error(`Error iniciando chat: ${error}`);
      console.log(`❌ Error: ${error}`);
      process.exit(1);
    }
  }

  /**
   * 🚀 Iniciar sesión automáticamente
   */
  private async iniciarSesion(): Promise<void> {
    console.log('🚀 Iniciando sesión automáticamente...');
    console.log('Curso: SSO001, Sesión: sesion01\n');

    try {
      const { sessionKey, initialMessage } = await this.docente.startSession('SSO001', 'sesion01');

      this.sessionKey = sessionKey;
      this.isActive = true;

      console.log('✅ Sesión iniciada exitosamente!');
      console.log(`🔑 Session Key: ${sessionKey}\n`);

      // Mostrar mensaje inicial
      console.log('🎓 DOCENTEIA:');
      console.log('='.repeat(50));
      console.log(initialMessage);
      console.log('='.repeat(50));
      console.log('\n💬 Escribe tu mensaje (o "salir" para terminar):\n');

      // Iniciar chat fluido
      await this.chatFluido();

    } catch (error) {
      console.log(`❌ Error iniciando sesión: ${error}`);
      process.exit(1);
    }
  }

  /**
   * 💬 Chat fluido sin pausas
   */
  private async chatFluido(): Promise<void> {
    this.rl.question('👤 Tú: ', async (message) => {
      const trimmedMessage = message.trim();

      // Comandos especiales
      if (trimmedMessage.toLowerCase() === 'salir' || trimmedMessage.toLowerCase() === 'exit') {
        await this.salir();
        return;
      }

      if (trimmedMessage.toLowerCase() === 'info') {
        await this.mostrarInfo();
        await this.chatFluido();
        return;
      }

      if (trimmedMessage.toLowerCase() === 'nueva') {
        await this.nuevaSesion();
        return;
      }

      if (trimmedMessage.toLowerCase() === 'limpiar') {
        await this.limpiarSesion();
        return;
      }

      // Procesar mensaje normal
      if (trimmedMessage) {
        try {
          console.log('\n🔄 Procesando...');
          
          const response = await this.docente.handleStudent(this.sessionKey!, trimmedMessage);

          console.log('\n🤖 DOCENTEIA:');
          console.log(response.respuesta);
          
          // Mostrar progreso de forma sutil
          console.log(`\n📊 [${response.progreso}/${response.total_momentos}] ${response.momento_actual} | ❓ ${response.preguntas_pendientes} pendientes`);
          console.log('─'.repeat(60));

        } catch (error) {
          console.log(`\n❌ Error: ${error}`);
          console.log('─'.repeat(60));
        }
      }

      // Continuar inmediatamente sin pausas
      await this.chatFluido();
    });
  }

  /**
   * 📊 Mostrar información de sesión
   */
  private async mostrarInfo(): Promise<void> {
    if (!this.sessionKey) {
      console.log('❌ No hay sesión activa');
      return;
    }

    try {
      const info = await this.docente.getSessionInfo(this.sessionKey);
      
      console.log('\n📊 INFORMACIÓN DE SESIÓN:');
      console.log(`🔑 Session Key: ${info.sessionKey}`);
      console.log(`📈 Progreso: ${info.progress}`);
      console.log(`🎯 Momento actual: ${info.currentMoment}`);
      console.log(`❓ Preguntas pendientes: ${info.pendingQuestions}`);
      console.log('─'.repeat(60));

    } catch (error) {
      console.log(`❌ Error obteniendo información: ${error}`);
    }
  }

  /**
   * 🚀 Iniciar nueva sesión
   */
  private async nuevaSesion(): Promise<void> {
    if (this.sessionKey) {
      try {
        await this.docente.clearSession(this.sessionKey);
      } catch (error) {
        // Ignorar errores al limpiar
      }
    }

    console.log('\n🔄 Iniciando nueva sesión...\n');
    await this.iniciarSesion();
  }

  /**
   * 🧹 Limpiar sesión actual
   */
  private async limpiarSesion(): Promise<void> {
    if (!this.sessionKey) {
      console.log('❌ No hay sesión activa');
      return;
    }

    try {
      await this.docente.clearSession(this.sessionKey);
      this.sessionKey = null;
      this.isActive = false;
      console.log('✅ Sesión limpiada');
      console.log('─'.repeat(60));
    } catch (error) {
      console.log(`❌ Error limpiando sesión: ${error}`);
    }
  }

  /**
   * ❌ Salir del chat
   */
  private async salir(): Promise<void> {
    if (this.sessionKey) {
      try {
        await this.docente.clearSession(this.sessionKey);
        console.log('✅ Sesión limpiada antes de salir.');
      } catch (error) {
        console.log(`⚠️ Error limpiando sesión: ${error}`);
      }
    }

    console.log('\n👋 ¡Gracias por usar DocenteIA V2!');
    this.rl.close();
    process.exit(0);
  }
}

/**
 * 🚀 Función principal
 */
async function main() {
  try {
    const chat = new ChatFluido();
    await chat.start();
  } catch (error) {
    logger.error(`Error en chat fluido: ${error}`);
    console.log(`❌ Error fatal: ${error}`);
    process.exit(1);
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main().catch(error => {
    logger.error(`Error fatal: ${error}`);
    process.exit(1);
  });
} 