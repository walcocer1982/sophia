import { config } from 'dotenv';
import { DocenteAI } from '../core/DocenteAI';
import { SessionStore } from '../data/SessionStore';
import { Logger } from '../utils/Logger';
import * as readline from 'readline';

// Cargar variables de entorno
config();

const logger = new Logger('ChatInteractive');

/**
 * 🚀 CHAT INTERACTIVO PARA DOCENTEIA V2
 * 
 * Permite probar el sistema en tiempo real con interacción manual
 */

class ChatInteractive {
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
   * 🚀 Iniciar el chat
   */
  async start(): Promise<void> {
    try {
      console.log('\n🎓 ========================================');
      console.log('🚀 DOCENTEIA V2 - CHAT INTERACTIVO');
      console.log('========================================\n');

      // Verificar configuración
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('❌ OPENAI_API_KEY no configurada');
      }

      // Inicializar SessionStore
      await SessionStore.initialize();
      console.log('✅ SessionStore inicializado');

      console.log('✅ Configuración verificada');
      console.log('📚 Cursos disponibles: SSO001 (Seguridad contra Incendios)');
      console.log('📝 Sesiones disponibles: sesion01, sesion02, sesion03\n');

      await this.showMenu();

    } catch (error) {
      logger.error(`Error iniciando chat: ${error}`);
      console.log(`❌ Error: ${error}`);
      process.exit(1);
    }
  }

  /**
   * 📋 Mostrar menú principal
   */
  private async showMenu(): Promise<void> {
    console.log('\n🎯 MENÚ PRINCIPAL:');
    console.log('1. 🚀 Iniciar nueva sesión');
    console.log('2. 💬 Continuar chat');
    console.log('3. 📊 Ver información de sesión');
    console.log('4. 🧹 Limpiar sesión');
    console.log('5. 📈 Ver estadísticas');
    console.log('6. ❌ Salir');

    this.rl.question('\nSelecciona una opción (1-6): ', async (answer) => {
      switch (answer.trim()) {
        case '1':
          await this.startNewSession();
          break;
        case '2':
          await this.continueChat();
          break;
        case '3':
          await this.showSessionInfo();
          break;
        case '4':
          await this.clearSession();
          break;
        case '5':
          await this.showStats();
          break;
        case '6':
          await this.exit();
          break;
        default:
          console.log('❌ Opción inválida. Intenta de nuevo.');
          await this.showMenu();
      }
    });
  }

  /**
   * 🚀 Iniciar nueva sesión
   */
  private async startNewSession(): Promise<void> {
    console.log('\n🚀 INICIANDO NUEVA SESIÓN');
    console.log('Cursos disponibles: SSO001');
    console.log('Sesiones disponibles: sesion01, sesion02, sesion03');

    this.rl.question('\nIngresa el ID del curso (ej: SSO001): ', async (courseId) => {
      this.rl.question('Ingresa el ID de la sesión (ej: sesion01): ', async (sessionId) => {
        try {
          console.log('\n🔄 Iniciando sesión...');
          
          const { sessionKey, initialMessage } = await this.docente.startSession(
            courseId.trim(), 
            sessionId.trim()
          );

          this.sessionKey = sessionKey;
          this.isActive = true;

                     console.log('\n✅ Sesión iniciada exitosamente!');
           console.log(`🔑 Session Key: ${sessionKey}`);
           console.log('\n🎓 MENSAJE INICIAL DEL DOCENTE:');
           console.log('='.repeat(50));
           console.log(initialMessage);
           console.log('='.repeat(50));

           // Continuar directamente con el chat después del mensaje inicial
           await this.continueChat();

        } catch (error) {
          console.log(`❌ Error iniciando sesión: ${error}`);
          await this.showMenu();
        }
      });
    });
  }

  /**
   * 💬 Continuar chat
   */
  private async continueChat(): Promise<void> {
    if (!this.sessionKey || !this.isActive) {
      console.log('❌ No hay una sesión activa. Inicia una sesión primero.');
      await this.showMenu();
      return;
    }

    console.log('\n💬 CHAT ACTIVO');
    console.log('Escribe tu mensaje (o "menu" para volver al menú):');

    this.rl.question('\n👤 Tú: ', async (message) => {
      if (message.trim().toLowerCase() === 'menu') {
        await this.showMenu();
        return;
      }

      try {
        console.log('\n🔄 Procesando respuesta...');
        
        const response = await this.docente.handleStudent(this.sessionKey!, message);

        console.log('\n🤖 DOCENTEIA:');
        console.log('='.repeat(50));
        console.log(response.respuesta);
        console.log('='.repeat(50));
        
        console.log('\n📊 METADATOS:');
        console.log(`- Momento actual: ${response.momento_actual}`);
        console.log(`- Progreso: ${response.progreso}/${response.total_momentos}`);
        console.log(`- Debe avanzar: ${response.debe_avanzar}`);
        console.log(`- Razón: ${response.razon_avance}`);
        console.log(`- Preguntas pendientes: ${response.preguntas_pendientes}`);

        // Continuar chat
        await this.continueChat();

      } catch (error) {
        console.log(`❌ Error procesando mensaje: ${error}`);
        await this.continueChat();
      }
    });
  }

  /**
   * 📊 Mostrar información de sesión
   */
  private async showSessionInfo(): Promise<void> {
    if (!this.sessionKey) {
      console.log('❌ No hay una sesión activa.');
      await this.showMenu();
      return;
    }

    try {
      const info = await this.docente.getSessionInfo(this.sessionKey);
      
      console.log('\n📊 INFORMACIÓN DE SESIÓN:');
      console.log('='.repeat(30));
      console.log(`🔑 Session Key: ${info.sessionKey}`);
      console.log(`📈 Progreso: ${info.progress}`);
      console.log(`🎯 Momento actual: ${info.currentMoment}`);
      console.log(`❓ Preguntas pendientes: ${info.pendingQuestions}`);
      console.log('='.repeat(30));

    } catch (error) {
      console.log(`❌ Error obteniendo información: ${error}`);
    }

    await this.showMenu();
  }

  /**
   * 🧹 Limpiar sesión
   */
  private async clearSession(): Promise<void> {
    if (!this.sessionKey) {
      console.log('❌ No hay una sesión activa.');
      await this.showMenu();
      return;
    }

    try {
      await this.docente.clearSession(this.sessionKey);
      this.sessionKey = null;
      this.isActive = false;
      console.log('✅ Sesión limpiada exitosamente.');
    } catch (error) {
      console.log(`❌ Error limpiando sesión: ${error}`);
    }

    await this.showMenu();
  }

  /**
   * 📈 Mostrar estadísticas
   */
  private async showStats(): Promise<void> {
    try {
      const stats = await this.docente.getCostStats();
      
      console.log('\n📈 ESTADÍSTICAS:');
      console.log('='.repeat(20));
      console.log(JSON.stringify(stats, null, 2));
      console.log('='.repeat(20));

    } catch (error) {
      console.log(`❌ Error obteniendo estadísticas: ${error}`);
    }

    await this.showMenu();
  }

  /**
   * ❌ Salir
   */
  private async exit(): Promise<void> {
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
    const chat = new ChatInteractive();
    await chat.start();
  } catch (error) {
    logger.error(`Error en chat interactivo: ${error}`);
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