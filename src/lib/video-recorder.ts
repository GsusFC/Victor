/**
 * video-recorder.ts - Sistema de grabación de video para canvas WebGPU
 * Usa canvas-record con soporte nativo para WebGPU
 */

import { Recorder } from 'canvas-record';
import { AVC } from 'media-codecs';
import type { RecordingConfig, RecordingState, RecordingStats, RecordingError, VideoQuality } from '@/types/recording';

export class VideoRecorder {
  private recorder: Recorder | null = null;
  private context: GPUCanvasContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private config: RecordingConfig;
  private stats: RecordingStats;
  private state: RecordingState = 'idle';
  private startTime: number = 0;
  private frameCount: number = 0;
  private errorInfo: RecordingError | null = null;
  private savedBuffer: ArrayBuffer | Uint8Array | Blob[] | null = null;

  constructor(canvas: HTMLCanvasElement, config?: Partial<RecordingConfig>) {
    this.canvas = canvas;
    this.context = canvas.getContext('webgpu');

    // Configuración por defecto
    this.config = {
      format: 'mp4',
      quality: 'high',
      frameRate: 60,
      fileName: 'victor-animation',
      ...config,
    };

    this.stats = {
      duration: 0,
      frameCount: 0,
      estimatedSize: 0,
      currentFps: 0,
    };

    if (!this.context) {
      throw new Error('Canvas no tiene contexto WebGPU');
    }
  }

  /**
   * Detecta si WebCodecs está disponible para aceleración por hardware
   */
  private hasWebCodecsSupport(): boolean {
    return typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined';
  }

  /**
   * Obtiene el codec apropiado según el formato y calidad
   */
  private getCodecConfig(): string | undefined {
    if (!this.hasWebCodecsSupport()) {
      return undefined; // Fallback automático a WASM
    }

    // H.264 para MP4 (mejor compatibilidad)
    if (this.config.format === 'mp4') {
      return AVC.getCodec({ profile: 'Main', level: '5.2' });
    }

    // VP9 para WebM (mejor compresión)
    return 'vp09.00.10.08';
  }

  /**
   * Obtiene el bitrate según la calidad configurada
   */
  private getBitrate(): number {
    const presets: Record<VideoQuality, number> = {
      low: 4_000_000, // 4 Mbps
      medium: 8_000_000, // 8 Mbps
      high: 12_000_000, // 12 Mbps
      max: 20_000_000, // 20 Mbps
    };

    return presets[this.config.quality];
  }

  /**
   * Inicializa el recorder y comienza la grabación
   */
  async start(): Promise<void> {
    if (this.state === 'recording') {
      console.warn('Ya está grabando');
      return;
    }

    if (!this.context || !this.canvas) {
      throw new Error('Canvas o contexto no disponible');
    }

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const needsEvenDimensions = this.config.format === 'mp4';
    const hasOddDimension = canvasWidth % 2 !== 0 || canvasHeight % 2 !== 0;

    if (needsEvenDimensions && hasOddDimension) {
      const message = `MP4 requiere dimensiones pares y el canvas actual es ${canvasWidth}x${canvasHeight}. Ajusta el tamaño o usa WebM.`;
      this.state = 'error';
      this.errorInfo = {
        code: 'INVALID_DIMENSIONS',
        message,
        recoverable: true,
      };
      console.error(`❌ ${message}`);
      throw new Error(message);
    }

    try {
      this.state = 'processing';
      this.frameCount = 0;
      this.startTime = performance.now();
      this.errorInfo = null;
      this.savedBuffer = null; // Limpiar buffer anterior

      const hasWebCodecs = this.hasWebCodecsSupport();
      const codec = this.getCodecConfig();
      const bitrate = this.getBitrate();

      console.log('🎥 Iniciando grabación:', {
        format: this.config.format,
        quality: this.config.quality,
        fps: this.config.frameRate,
        codec: codec || 'WASM fallback',
        bitrate: `${(bitrate / 1_000_000).toFixed(1)} Mbps`,
        size: `${canvasWidth}x${canvasHeight}`,
        webCodecs: hasWebCodecs,
      });

      // Configurar recorder
      // NOTA: Usamos download: true pero guardaremos el blob antes de que se descargue
      this.recorder = new Recorder(this.context, {
        name: this.config.fileName || 'victor-animation',
        frameRate: this.config.frameRate,
        download: true, // Necesario para obtener el buffer
        extension: this.config.format,
        target: 'in-browser',
        encoderOptions: codec
          ? {
              codec,
              videoBitsPerSecond: bitrate,
            }
          : undefined,
      });

      await this.recorder.start();

      this.state = 'recording';
      console.log('✅ Grabación iniciada exitosamente');
    } catch (error) {
      this.state = 'error';
      this.errorInfo = {
        code: 'START_ERROR',
        message: error instanceof Error ? error.message : 'Error desconocido al iniciar grabación',
        recoverable: false,
      };
      console.error('❌ Error iniciando grabación:', error);
      if (this.recorder) {
        try {
          await this.recorder.dispose();
        } catch (disposeError) {
          console.error('⚠️ Error liberando recorder tras fallo de inicio:', disposeError);
        }
      }
      this.recorder = null;
      throw error;
    }
  }

  /**
   * Captura el frame actual del canvas
   * Debe llamarse en cada ciclo de renderizado
   */
  async captureFrame(): Promise<void> {
    if (this.state !== 'recording' || !this.recorder) {
      return;
    }

    try {
      await this.recorder.step();
      this.frameCount++;

      // Actualizar stats cada 30 frames
      if (this.frameCount % 30 === 0) {
        this.updateStats();
      }
    } catch (error) {
      console.error('❌ Error capturando frame:', error);
      this.state = 'error';
      this.errorInfo = {
        code: 'CAPTURE_ERROR',
        message: 'Error capturando frame',
        recoverable: true,
      };
    }
  }

  /**
   * Pausa la grabación
   */
  async pause(): Promise<void> {
    if (this.state !== 'recording') {
      return;
    }

    // canvas-record no tiene pause nativo, pero podemos simular
    // simplemente dejando de llamar captureFrame()
    this.state = 'paused';
    console.log('⏸️ Grabación pausada');
  }

  /**
   * Reanuda la grabación
   */
  async resume(): Promise<void> {
    if (this.state !== 'paused') {
      return;
    }

    this.state = 'recording';
    console.log('▶️ Grabación reanudada');
  }

  /**
   * Detiene la grabación y guarda el buffer
   */
  async stop(): Promise<void> {
    if (!this.recorder) {
      return;
    }

    if (this.state !== 'recording' && this.state !== 'paused') {
      console.warn('⏹️ Stop ignorado: el recorder no está activo');
      return;
    }

    try {
      this.state = 'processing';
      console.log('🛑 Deteniendo grabación...');

      // Prevenir la descarga automática interceptando createElement('a')
      let blobPromiseResolve: ((blob: Blob | null) => void) | null = null;
      const blobPromise = new Promise<Blob | null>((resolve) => {
        blobPromiseResolve = resolve;
        // Timeout de 5 segundos
        setTimeout(() => resolve(null), 5000);
      });

      const originalCreateElement = document.createElement.bind(document);

      document.createElement = function(tagName: string) {
        const element = originalCreateElement(tagName);

        if (tagName.toLowerCase() === 'a') {
          // Interceptar el setter de href para capturar el blob URL
          const originalHrefSetter = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'href')!.set!;
          Object.defineProperty(element, 'href', {
            set: function(value: string) {
              if (value.startsWith('blob:')) {
                console.log('🎣 Blob URL interceptado:', value.substring(0, 50));
                // Obtener el blob del URL de forma sincrónica usando fetch
                fetch(value)
                  .then(r => r.blob())
                  .then(blob => {
                    console.log('💾 Blob capturado:', blob.size, 'bytes');
                    if (blobPromiseResolve) {
                      blobPromiseResolve(blob);
                    }
                  })
                  .catch(err => {
                    console.error('Error capturando blob:', err);
                    if (blobPromiseResolve) {
                      blobPromiseResolve(null);
                    }
                  });
              }
              originalHrefSetter.call(this, value);
            },
            get: function() {
              return this.getAttribute('href') || '';
            }
          });

          // Prevenir el click
          element.click = function() {
            console.log('🚫 Descarga automática bloqueada');
            // NO llamar originalClick para prevenir la descarga
          };
        }

        return element;
      } as typeof document.createElement;

      // Detener la grabación
      const buffer = await this.recorder.stop();

      // Esperar a que se capture el blob
      const blob = await blobPromise;

      // Restaurar createElement
      document.createElement = originalCreateElement;

      this.updateStats();

      console.log('✅ Grabación completada:', {
        duration: `${this.stats.duration.toFixed(1)}s`,
        frames: this.frameCount,
        avgFps: this.stats.currentFps.toFixed(1),
        size: this.formatFileSize(this.stats.estimatedSize),
        bufferFromStop: !!buffer,
        blobCaptured: !!blob,
      });

      // Usar el blob capturado o el buffer retornado
      if (blob) {
        this.savedBuffer = [blob];
        console.log('💾 Blob guardado desde interceptor, listo para descargar');
      } else if (buffer) {
        this.savedBuffer = buffer;
        console.log('💾 Buffer guardado desde stop(), listo para descargar');
      } else {
        console.error('⚠️ No se pudo capturar el buffer');
      }

      this.state = 'idle';
      this.recorder = null;
    } catch (error) {
      // Restaurar createElement en caso de error
      document.createElement = document.createElement.bind(document);

      this.state = 'error';
      this.errorInfo = {
        code: 'STOP_ERROR',
        message: 'Error deteniendo grabación',
        recoverable: false,
      };
      console.error('❌ Error deteniendo grabación:', error);
      throw error;
    }
  }

  /**
   * Descarga el buffer como archivo
   */
  private downloadBuffer(buffer: ArrayBuffer | Uint8Array | Blob[]): void {
    try {
      console.log('📦 Iniciando descarga del buffer...');
      console.log('📦 Tipo de buffer:', Array.isArray(buffer) ? 'Blob[]' : buffer.constructor.name);

      let blob: Blob;

      // Convertir el buffer a Blob según su tipo
      if (Array.isArray(buffer)) {
        // Si es Blob[], usar directamente
        console.log('📦 Convirtiendo array de Blobs...');
        blob = new Blob(buffer);
      } else if (buffer instanceof ArrayBuffer) {
        // Si es ArrayBuffer, crear Blob
        console.log('📦 Convirtiendo ArrayBuffer...');
        blob = new Blob([buffer]);
      } else {
        // Si es Uint8Array, copiar los datos a un nuevo ArrayBuffer estándar
        console.log('📦 Convirtiendo Uint8Array...');
        // Crear una copia en un ArrayBuffer nuevo para evitar problemas con SharedArrayBuffer
        const copy = new Uint8Array(buffer);
        blob = new Blob([copy]);
      }

      console.log('📦 Blob creado:', blob.size, 'bytes');

      // Obtener el MIME type correcto
      const mimeTypes: Record<string, string> = {
        mp4: 'video/mp4',
        webm: 'video/webm',
        gif: 'image/gif',
      };

      const mimeType = mimeTypes[this.config.format] || 'application/octet-stream';
      const finalBlob = new Blob([blob], { type: mimeType });

      console.log('📦 Blob final con MIME type:', mimeType, '-', finalBlob.size, 'bytes');

      // Crear URL del objeto
      const url = URL.createObjectURL(finalBlob);
      console.log('📦 URL creada:', url.substring(0, 50) + '...');

      // Crear elemento de descarga
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.config.fileName}.${this.config.format}`;
      a.style.display = 'none';

      // Agregar al DOM
      document.body.appendChild(a);
      console.log('📦 Elemento <a> agregado al DOM');

      // Intentar la descarga con múltiples métodos para mejor compatibilidad
      try {
        // Método 1: Click directo
        a.click();
        console.log('✅ Click ejecutado en elemento <a>');
      } catch (clickError) {
        console.warn('⚠️ Error con click(), intentando método alternativo:', clickError);

        // Método 2: Disparar evento manualmente
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
        });
        a.dispatchEvent(clickEvent);
        console.log('✅ Evento de click disparado manualmente');
      }

      // Cleanup con delay para asegurar que la descarga comience
      setTimeout(() => {
        try {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          console.log('🧹 Cleanup completado');
        } catch (cleanupError) {
          console.warn('⚠️ Error en cleanup:', cleanupError);
        }
      }, 1000); // Aumentado a 1 segundo para dar más tiempo

      console.log('📥 Descarga iniciada:', a.download);
    } catch (error) {
      console.error('❌ Error en downloadBuffer:', error);
      throw error;
    }
  }

  /**
   * Actualiza las estadísticas de grabación
   */
  private updateStats(): void {
    const elapsed = (performance.now() - this.startTime) / 1000;
    const currentFps = elapsed > 0 ? this.frameCount / elapsed : 0;

    // Estimar tamaño del archivo
    // Fórmula: (bitrate / 8) * duración
    const bitrate = this.getBitrate();
    const estimatedSize = (bitrate / 8) * elapsed;

    this.stats = {
      duration: elapsed,
      frameCount: this.frameCount,
      estimatedSize,
      currentFps,
    };
  }

  /**
   * Formatea el tamaño del archivo a formato legible
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Obtiene el estado actual
   */
  getState(): RecordingState {
    return this.state;
  }

  /**
   * Obtiene las estadísticas actuales
   */
  getStats(): RecordingStats {
    if (this.state === 'recording' || this.state === 'paused') {
      this.updateStats();
    }
    return { ...this.stats };
  }

  /**
   * Obtiene información del error (si existe)
   */
  getError(): RecordingError | null {
    return this.errorInfo;
  }

  /**
   * Verifica si está grabando actualmente
   */
  isRecording(): boolean {
    return this.state === 'recording';
  }

  /**
   * Verifica si está pausado
   */
  isPaused(): boolean {
    return this.state === 'paused';
  }

  /**
   * Verifica si está procesando
   */
  isProcessing(): boolean {
    return this.state === 'processing';
  }

  /**
   * Verifica si hay un buffer listo para descargar
   */
  hasBuffer(): boolean {
    return this.savedBuffer !== null;
  }

  /**
   * Descarga el video guardado en el buffer
   * @throws Error si no hay buffer disponible
   */
  download(): void {
    if (!this.savedBuffer) {
      throw new Error('No hay video disponible para descargar');
    }

    this.downloadBuffer(this.savedBuffer);
  }

  /**
   * Limpia recursos
   */
  async dispose(): Promise<void> {
    if (this.recorder) {
      if (this.state === 'recording' || this.state === 'paused') {
        await this.stop();
      } else {
        try {
          await this.recorder.dispose();
        } catch (error) {
          console.error('⚠️ Error liberando recorder:', error);
        }
      }
    }
    this.recorder = null;
    this.context = null;
    this.canvas = null;
  }
}
