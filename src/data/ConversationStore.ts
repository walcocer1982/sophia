import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/Logger';

export interface ConversationMessage {
  id: number;
  sessionKey: string;
  sender: 'student' | 'ai';
  content: string;
  timestamp: Date;
  momentoIndex?: number;
  momentoName?: string;
}

export interface ConversationHistory {
  sessionKey: string;
  messages: ConversationMessage[];
  startTime: Date;
  lastActivity: Date;
  totalMessages: number;
}

export class ConversationStore {
  private static logger: Logger = new Logger('ConversationStore');
  private static conversationFilePath = path.join(process.cwd(), 'src', 'data', 'conversation-history.json');

  /**
   * 🗣️ AGREGAR MENSAJE A LA CONVERSACIÓN
   */
  static async addMessage(
    sessionKey: string, 
    sender: 'student' | 'ai', 
    content: string,
    momentoIndex?: number,
    momentoName?: string
  ): Promise<void> {
    try {
      const conversations = await this.loadConversations();
      
      if (!conversations[sessionKey]) {
        conversations[sessionKey] = {
          sessionKey,
          messages: [],
          startTime: new Date(),
          lastActivity: new Date(),
          totalMessages: 0
        };
      }

      const conversation = conversations[sessionKey];
      const messageId = conversation.messages.length + 1;

      const newMessage: ConversationMessage = {
        id: messageId,
        sessionKey,
        sender,
        content,
        timestamp: new Date(),
        momentoIndex,
        momentoName
      };

      conversation.messages.push(newMessage);
      conversation.lastActivity = new Date();
      conversation.totalMessages = conversation.messages.length;

      await this.saveConversations(conversations);
      
      this.logger.info(`💬 Mensaje agregado: ${sessionKey} - ${sender} (${content.length} chars)`);
      
    } catch (error) {
      this.logger.error(`Error agregando mensaje: ${error}`);
      throw error;
    }
  }

  /**
   * 📖 OBTENER HISTORIAL DE CONVERSACIÓN
   */
  static async getHistory(sessionKey: string): Promise<ConversationHistory | null> {
    try {
      const conversations = await this.loadConversations();
      return conversations[sessionKey] || null;
    } catch (error) {
      this.logger.error(`Error obteniendo historial: ${error}`);
      return null;
    }
  }

  /**
   * 🔍 OBTENER MENSAJES RECIENTES
   */
  static async getRecentMessages(sessionKey: string, limit: number = 5): Promise<ConversationMessage[]> {
    try {
      const history = await this.getHistory(sessionKey);
      if (!history || !history.messages) return [];
      
      // Obtener los últimos N mensajes
      return history.messages.slice(-limit);
    } catch (error) {
      this.logger.error(`Error obteniendo mensajes recientes: ${error}`);
      return [];
    }
  }

  /**
   * 🔍 OBTENER MENSAJES DEL MOMENTO ACTUAL
   */
  static async getCurrentMomentMessages(sessionKey: string, momentoIndex: number): Promise<ConversationMessage[]> {
    try {
      const history = await this.getHistory(sessionKey);
      if (!history || !history.messages) return [];
      
      // Filtrar mensajes del momento actual
      const currentMomentMessages = history.messages.filter(msg => 
        msg.momentoIndex === momentoIndex || 
        (!msg.momentoIndex && history.messages.indexOf(msg) >= history.messages.length - 10) // últimos 10 si no tienen momentoIndex
      );
      
      return currentMomentMessages;
    } catch (error) {
      this.logger.error(`Error obteniendo mensajes del momento actual: ${error}`);
      return [];
    }
  }

  /**
   * 🔢 CONTAR INTERCAMBIOS EN MOMENTO ACTUAL
   */
  static async countCurrentMomentInterchanges(sessionKey: string, momentoIndex: number): Promise<number> {
    try {
      const currentMessages = await this.getCurrentMomentMessages(sessionKey, momentoIndex);
      // Un intercambio = 1 mensaje del estudiante + 1 del AI
      const studentMessages = currentMessages.filter(m => m.sender === 'student').length;
      const aiMessages = currentMessages.filter(m => m.sender === 'ai').length;
      
      // Retornar el mínimo (intercambios completos)
      return Math.min(studentMessages, aiMessages + 1); // +1 porque el AI está por responder
    } catch (error) {
      this.logger.error(`Error contando intercambios: ${error}`);
      return 0;
    }
  }

  /**
   * 📊 OBTENER ESTADÍSTICAS DE CONVERSACIÓN
   */
  static async getStats(sessionKey: string): Promise<{
    totalMessages: number;
    studentMessages: number;
    aiMessages: number;
    duration: number; // en minutos
  } | null> {
    try {
      const history = await this.getHistory(sessionKey);
      if (!history) return null;

      const studentMessages = history.messages.filter(m => m.sender === 'student').length;
      const aiMessages = history.messages.filter(m => m.sender === 'ai').length;
      const duration = (history.lastActivity.getTime() - history.startTime.getTime()) / (1000 * 60);

      return {
        totalMessages: history.totalMessages,
        studentMessages,
        aiMessages,
        duration: Math.round(duration * 100) / 100
      };
    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas: ${error}`);
      return null;
    }
  }

  /**
   * 🗑️ LIMPIAR CONVERSACIÓN
   */
  static async clearHistory(sessionKey: string): Promise<void> {
    try {
      const conversations = await this.loadConversations();
      delete conversations[sessionKey];
      await this.saveConversations(conversations);
      this.logger.info(`🧹 Historial limpiado: ${sessionKey}`);
    } catch (error) {
      this.logger.error(`Error limpiando historial: ${error}`);
      throw error;
    }
  }

  /**
   * 📁 MÉTODOS PRIVADOS PARA MANEJO DE ARCHIVOS
   */
  private static async loadConversations(): Promise<Record<string, ConversationHistory>> {
    try {
      if (!fs.existsSync(this.conversationFilePath)) {
        return {};
      }
      
      const data = fs.readFileSync(this.conversationFilePath, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Convertir strings a Date objects
      Object.values(parsed).forEach((conv: any) => {
        conv.startTime = new Date(conv.startTime);
        conv.lastActivity = new Date(conv.lastActivity);
        conv.messages.forEach((msg: any) => {
          msg.timestamp = new Date(msg.timestamp);
        });
      });
      
      return parsed;
    } catch (error) {
      this.logger.error(`Error cargando conversaciones: ${error}`);
      return {};
    }
  }

  private static async saveConversations(conversations: Record<string, ConversationHistory>): Promise<void> {
    try {
      fs.writeFileSync(this.conversationFilePath, JSON.stringify(conversations, null, 2));
    } catch (error) {
      this.logger.error(`Error guardando conversaciones: ${error}`);
      throw error;
    }
  }
}