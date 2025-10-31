/**
 * RecordingErrorHandler - Gestión centralizada de errores de grabación
 * Responsabilidades:
 * - Almacenar y recuperar errores
 * - Proporcionar sugerencias de recuperación
 * - Categorizar errores por recuperabilidad
 */

import type { RecordingError } from '@/types/recording';

export type ErrorCode =
  | 'INVALID_DIMENSIONS'
  | 'START_ERROR'
  | 'CAPTURE_ERROR'
  | 'STOP_ERROR'
  | 'BUFFER_ERROR'
  | 'UNSUPPORTED_FORMAT'
  | 'CODEC_ERROR'
  | 'PERMISSION_DENIED';

export class RecordingErrorHandler {
  private currentError: RecordingError | null = null;

  /**
   * Registra un nuevo error
   */
  setError(code: ErrorCode, message: string, recoverable: boolean = true): void {
    this.currentError = {
      code,
      message,
      recoverable,
    };

    console.error(`❌ Recording Error [${code}]: ${message}`);
  }

  /**
   * Obtiene el error actual (si existe)
   */
  getError(): RecordingError | null {
    return this.currentError ? { ...this.currentError } : null;
  }

  /**
   * Limpia el error actual
   */
  clearError(): void {
    if (this.currentError) {
      console.log(`✅ Error cleared: ${this.currentError.code}`);
    }
    this.currentError = null;
  }

  /**
   * Verifica si hay un error activo
   */
  hasError(): boolean {
    return this.currentError !== null;
  }

  /**
   * Obtiene una sugerencia de recuperación para un código de error
   */
  getSuggestion(code: ErrorCode): string {
    const suggestions: Record<ErrorCode, string> = {
      INVALID_DIMENSIONS:
        'Ajusta el tamaño del canvas a dimensiones pares (múltiplos de 2) o cambia el formato a WebM.',
      START_ERROR:
        'Verifica que el canvas esté correctamente inicializado y que WebGPU esté disponible.',
      CAPTURE_ERROR:
        'Intenta reducir la calidad de grabación o el framerate. Verifica que el canvas no esté siendo usado por otro proceso.',
      STOP_ERROR:
        'Espera unos segundos e intenta detener nuevamente. Si persiste, reinicia la grabación.',
      BUFFER_ERROR:
        'El buffer de grabación no pudo capturarse. Intenta cambiar el formato a WebM o reducir la calidad.',
      UNSUPPORTED_FORMAT:
        'El formato seleccionado no está soportado. Prueba con WebM que tiene mejor compatibilidad.',
      CODEC_ERROR:
        'El codec no está disponible en tu navegador. Intenta con otro formato o actualiza tu navegador.',
      PERMISSION_DENIED:
        'El navegador no tiene permisos para grabar. Verifica la configuración de permisos.',
    };

    return suggestions[code] || 'Intenta reiniciar la grabación.';
  }

  /**
   * Obtiene un error con sugerencia incluida
   */
  getErrorWithSuggestion(): (RecordingError & { suggestion: string }) | null {
    if (!this.currentError) {
      return null;
    }

    return {
      ...this.currentError,
      suggestion: this.getSuggestion(this.currentError.code as ErrorCode),
    };
  }

  /**
   * Verifica si el error actual es recuperable
   */
  isRecoverable(): boolean {
    return this.currentError?.recoverable ?? false;
  }
}
