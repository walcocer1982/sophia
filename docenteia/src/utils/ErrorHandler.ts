import { Logger } from './Logger';

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  OPENAI_API = 'OPENAI_API',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  DATA_LOADING = 'DATA_LOADING',
  COST_LIMIT = 'COST_LIMIT',
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN'
}

export class DocenteError extends Error {
  public readonly type: ErrorType;
  public readonly isRetryable: boolean;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(
    type: ErrorType,
    message: string,
    options: {
      isRetryable?: boolean;
      statusCode?: number;
      details?: any;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'DocenteError';
    this.type = type;
    this.isRetryable = options.isRetryable ?? false;
    this.statusCode = options.statusCode ?? 500;
    this.details = options.details;
    
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

export class ErrorHandler {
  private static logger = new Logger('ErrorHandler');

  /**
   * 🎯 Manejar errores de OpenAI
   */
  static handleOpenAIError(error: any): DocenteError {
    if (error.status === 401) {
      return new DocenteError(
        ErrorType.OPENAI_API,
        'API Key de OpenAI inválida o no configurada',
        { statusCode: 401, details: { action: 'Verifica tu OPENAI_API_KEY' } }
      );
    }

    if (error.status === 429) {
      return new DocenteError(
        ErrorType.RATE_LIMIT,
        'Límite de rate excedido en OpenAI',
        { 
          isRetryable: true, 
          statusCode: 429,
          details: { 
            retryAfter: error.headers?.['retry-after'] || 60,
            action: 'Espera y reintenta'
          }
        }
      );
    }

    if (error.status >= 500) {
      return new DocenteError(
        ErrorType.OPENAI_API,
        'Error interno de OpenAI',
        { 
          isRetryable: true, 
          statusCode: 502,
          details: { action: 'Reintenta en unos momentos' }
        }
      );
    }

    return new DocenteError(
      ErrorType.OPENAI_API,
      `Error de OpenAI: ${error.message}`,
      { statusCode: 500, cause: error }
    );
  }

  /**
   * 🎯 Manejar errores de validación
   */
  static handleValidationError(error: any, context: string): DocenteError {
    return new DocenteError(
      ErrorType.VALIDATION,
      `Error de validación en ${context}: ${error.message}`,
      { 
        statusCode: 400,
        details: { 
          context,
          validationErrors: error.errors || error.issues 
        }
      }
    );
  }

  /**
   * 🎯 Manejar errores de sesión
   */
  static handleSessionError(sessionKey: string, operation: string): DocenteError {
    return new DocenteError(
      ErrorType.SESSION_NOT_FOUND,
      `Sesión ${sessionKey} no encontrada para operación: ${operation}`,
      { 
        statusCode: 404,
        details: { 
          sessionKey,
          operation,
          action: 'Inicia una nueva sesión'
        }
      }
    );
  }

  /**
   * 🎯 Manejar errores de carga de datos
   */
  static handleDataLoadingError(resource: string, error: any): DocenteError {
    return new DocenteError(
      ErrorType.DATA_LOADING,
      `Error cargando ${resource}: ${error.message}`,
      { 
        statusCode: 500,
        details: { 
          resource,
          action: 'Verifica que los archivos de datos existan'
        },
        cause: error
      }
    );
  }

  /**
   * 🎯 Procesar errores y generar respuesta
   */
  static processError(error: any, context: string): {
    error: DocenteError;
    response: {
      success: false;
      error: {
        type: string;
        message: string;
        isRetryable: boolean;
        details?: any;
      };
    };
  } {
    this.logger.error(`Error en ${context}: ${error.message}`, {
      type: error.type || 'UNKNOWN',
      stack: error.stack
    });

    let docenteError: DocenteError;

    // Convertir error a DocenteError si no lo es
    if (error instanceof DocenteError) {
      docenteError = error;
    } else if (error.status) {
      // Error de OpenAI
      docenteError = this.handleOpenAIError(error);
    } else if (error.name === 'ZodError') {
      // Error de validación Zod
      docenteError = this.handleValidationError(error, context);
    } else {
      // Error genérico
      docenteError = new DocenteError(
        ErrorType.UNKNOWN,
        `Error interno: ${error.message}`,
        { cause: error }
      );
    }

    return {
      error: docenteError,
      response: {
        success: false,
        error: {
          type: docenteError.type,
          message: docenteError.message,
          isRetryable: docenteError.isRetryable,
          ...(docenteError.details && { details: docenteError.details })
        }
      }
    };
  }
} 