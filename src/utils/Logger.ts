export class Logger {
  private context: string;
  private logLevel: string;

  constructor(context: string) {
    this.context = context;
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  /**
   * 📝 Log de información
   */
  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      this.log('INFO', message, data);
    }
  }

  /**
   * ⚠️ Log de advertencia
   */
  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      this.log('WARN', message, data);
    }
  }

  /**
   * ❌ Log de error
   */
  error(message: string, data?: any): void {
    if (this.shouldLog('error')) {
      this.log('ERROR', message, data);
    }
  }

  /**
   * 🐛 Log de debug
   */
  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      this.log('DEBUG', message, data);
    }
  }

  /**
   * 🎯 Log estructurado
   */
  private log(level: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...(data && { data })
    };

    const logString = `[${timestamp}] ${level} [${this.context}] ${message}`;
    
    // Console output
    switch (level) {
      case 'ERROR':
        console.error(logString, data ? data : '');
        break;
      case 'WARN':
        console.warn(logString, data ? data : '');
        break;
      case 'DEBUG':
        console.debug(logString, data ? data : '');
        break;
      default:
        console.log(logString, data ? data : '');
    }

    // TODO: Implementar logging a archivo o servicio externo
    // this.writeToFile(logEntry);
  }

  /**
   * 🔍 Verificar si debe hacer log según el nivel
   */
  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * 📊 Crear logger para métricas
   */
  static createMetricsLogger(): Logger {
    return new Logger('Metrics');
  }

  /**
   * 🔧 Crear logger para debugging
   */
  static createDebugLogger(): Logger {
    return new Logger('Debug');
  }
} 