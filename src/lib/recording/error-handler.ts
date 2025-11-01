/**
 * error-handler.ts - Gestión centralizada de errores de grabación
 * Almacena y gestiona el estado de errores con mensajes específicos
 */

export type RecordingErrorCode =
  // Errores de soporte
  | 'WEBCODECS_NOT_SUPPORTED'
  | 'MEDIARECORDER_NOT_SUPPORTED'
  | 'CANVAS_STREAM_NOT_SUPPORTED'
  | 'CODEC_NOT_SUPPORTED'

  // Errores de formato
  | 'MP4_NOT_AVAILABLE'
  | 'WEBM_NOT_AVAILABLE'
  | 'FORMAT_MISMATCH'

  // Errores de buffer
  | 'BUFFER_EMPTY'
  | 'BUFFER_CORRUPTED'
  | 'BUFFER_TOO_SMALL'
  | 'BUFFER_INVALID_FORMAT'

  // Errores de canvas
  | 'CANVAS_NOT_READY'
  | 'CANVAS_DIMENSIONS_ODD'
  | 'WEBGPU_CONTEXT_LOST'

  // Errores generales
  | 'START_ERROR'
  | 'STOP_ERROR'
  | 'CAPTURE_ERROR'
  | 'DOWNLOAD_ERROR'
  | 'INIT_ERROR'
  | 'INVALID_DIMENSIONS'
  | 'BUFFER_ERROR'
  | 'UNKNOWN_ERROR';

export interface RecordingError {
  code: RecordingErrorCode;
  message: string;
  solution?: string;
  recoverable: boolean;
}

/**
 * Mensajes de error con soluciones
 */
const ERROR_CATALOG: Record<RecordingErrorCode, {
  message: string;
  solution: string;
}> = {
  // Errores de soporte
  WEBCODECS_NOT_SUPPORTED: {
    message: 'Tu navegador no soporta WebCodecs API',
    solution: 'Actualiza a Chrome 94+, Edge 94+, o Firefox 93+',
  },
  MEDIARECORDER_NOT_SUPPORTED: {
    message: 'MediaRecorder no está disponible',
    solution: 'Usa un navegador moderno (Chrome, Edge, Firefox, Safari 14.1+)',
  },
  CANVAS_STREAM_NOT_SUPPORTED: {
    message: 'No se puede capturar stream del canvas',
    solution: 'Verifica que uses un navegador compatible con canvas.captureStream()',
  },
  CODEC_NOT_SUPPORTED: {
    message: 'El codec de video no está disponible',
    solution: 'Intenta cambiar el formato o la calidad de grabación',
  },

  // Errores de formato
  MP4_NOT_AVAILABLE: {
    message: 'MP4 no está disponible en tu navegador',
    solution: 'Usa WebM o actualiza tu navegador. Algunos navegadores solo soportan WebM.',
  },
  WEBM_NOT_AVAILABLE: {
    message: 'WebM no está disponible en tu navegador',
    solution: 'Usa MP4 o actualiza tu navegador',
  },
  FORMAT_MISMATCH: {
    message: 'El formato seleccionado no está disponible',
    solution: 'Se usará un formato alternativo automáticamente',
  },

  // Errores de buffer
  BUFFER_EMPTY: {
    message: 'El buffer de grabación está vacío',
    solution: 'Intenta grabar de nuevo. Si persiste, prueba con WebM en lugar de MP4.',
  },
  BUFFER_CORRUPTED: {
    message: 'El video grabado está corrupto',
    solution: 'Intenta grabar de nuevo. Si el problema persiste, usa WebM en lugar de MP4.',
  },
  BUFFER_TOO_SMALL: {
    message: 'El video grabado es demasiado pequeño',
    solution: 'Verifica que el canvas tenga las dimensiones correctas y que grabaste suficiente contenido',
  },
  BUFFER_INVALID_FORMAT: {
    message: 'El formato del video no es reconocido',
    solution: 'Intenta cambiar el formato de grabación o actualiza tu navegador',
  },
  BUFFER_ERROR: {
    message: 'Error en el buffer de grabación',
    solution: 'Intenta cambiar el formato a WebM o reducir la calidad.',
  },

  // Errores de canvas
  CANVAS_NOT_READY: {
    message: 'El canvas no está listo',
    solution: 'Espera a que la aplicación se cargue completamente',
  },
  CANVAS_DIMENSIONS_ODD: {
    message: 'El canvas tiene dimensiones impares',
    solution: 'MP4 requiere dimensiones pares. Usa WebM o redimensiona el canvas.',
  },
  INVALID_DIMENSIONS: {
    message: 'El canvas tiene dimensiones inválidas',
    solution: 'Ajusta el tamaño del canvas a dimensiones pares (múltiplos de 2) o cambia el formato a WebM.',
  },
  WEBGPU_CONTEXT_LOST: {
    message: 'Se perdió la conexión con WebGPU',
    solution: 'Recarga la página y intenta de nuevo. Verifica que tu GPU esté habilitada.',
  },

  // Errores generales
  START_ERROR: {
    message: 'Error al iniciar la grabación',
    solution: 'Verifica que el navegador tenga permisos de cámara/micrófono. Intenta recargar la página.',
  },
  STOP_ERROR: {
    message: 'Error al detener la grabación',
    solution: 'Intenta recargar la página e intenta de nuevo',
  },
  CAPTURE_ERROR: {
    message: 'Error capturando frame de video',
    solution: 'Verifica que el canvas esté visible y accesible',
  },
  DOWNLOAD_ERROR: {
    message: 'Error descargando el video',
    solution: 'Verifica que el navegador permita descargas. Intenta de nuevo.',
  },
  INIT_ERROR: {
    message: 'Error inicializando el recorder',
    solution: 'Recarga la página e intenta de nuevo',
  },
  UNKNOWN_ERROR: {
    message: 'Error desconocido',
    solution: 'Recarga la página e intenta de nuevo. Si persiste, reporta en GitHub.',
  },
};

export class RecordingErrorHandler {
  private error: RecordingError | null = null;

  setError(
    code: RecordingErrorCode,
    message?: string,
    recoverable: boolean = false
  ): void {
    const catalog = ERROR_CATALOG[code] || ERROR_CATALOG.UNKNOWN_ERROR;

    this.error = {
      code,
      message: message || catalog.message,
      solution: catalog.solution,
      recoverable,
    };

    console.error(`❌ [${code}] ${this.error.message}`);
    if (this.error.solution) {
      console.log(`💡 Solución: ${this.error.solution}`);
    }
  }

  getError(): RecordingError | null {
    return this.error;
  }

  clearError(): void {
    this.error = null;
  }

  hasError(): boolean {
    return this.error !== null;
  }
}
