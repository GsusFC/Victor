/**
 * video-recorder.ts - Sistema de grabación de video para canvas WebGPU
 * Usa canvas-record con soporte nativo para WebGPU
 */

import { Recorder } from 'canvas-record';
import { AVC } from 'media-codecs';
import { MediaRecorderFallback } from './media-recorder-fallback';
import { RECORDING_CONSTANTS } from './recording/constants';
import type { RecordingConfig, RecordingState, RecordingStats, RecordingError, VideoQuality } from '@/types/recording';

export class VideoRecorder {
  private recorder: Recorder | null = null;
  private fallbackRecorder: MediaRecorderFallback | null = null;
  private usingFallback: boolean = false;
  private context: GPUCanvasContext | null = null;
  private device: GPUDevice | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private config: RecordingConfig;
  private stats: RecordingStats;
  private state: RecordingState = 'idle';
  private startTime: number = 0;
  private frameCount: number = 0;
  private errorInfo: RecordingError | null = null;
  private savedBuffer: ArrayBuffer | Uint8Array | Blob[] | null = null;
  private recorderInitializing: boolean = false; // Flag para evitar captura durante inicialización
  private recorderStartDelayFrames: number = 0; // Frames a esperar después de iniciar recorder

  constructor(canvas: HTMLCanvasElement, config?: Partial<RecordingConfig>) {
    this.canvas = canvas;
    this.context = canvas.getContext('webgpu');

    // Configuración por defecto - obtener FPS del preset de calidad
    const defaultQuality = config?.quality || 'high';
    const QUALITY_PRESETS: Record<string, { fps: number }> = {
      low: { fps: 30 },
      medium: { fps: 30 },
      high: { fps: 60 },
      max: { fps: 60 },
    };
    const fpsForQuality = QUALITY_PRESETS[defaultQuality]?.fps || 60;

    this.config = {
      format: 'mp4',
      quality: 'high',
      frameRate: config?.frameRate || fpsForQuality,
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

    // Obtener device del contexto configurado
    const contextConfig = this.context.getConfiguration();
    this.device = contextConfig?.device || null;
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

    // H.264 High Profile para MP4 (mejor compatibilidad y calidad)
    if (this.config.format === 'mp4') {
      return AVC.getCodec({ profile: 'High', level: '5.2' }); // High Profile para mejor calidad
    }

    // VP9 para WebM (mejor compresión)
    return 'vp09.00.10.08';
  }

  /**
   * Obtiene el bitrate según la calidad configurada
   */
  private getBitrate(): number {
    const presets: Record<VideoQuality, number> = {
      low: 6_000_000, // 6 Mbps (mejorado)
      medium: 12_000_000, // 12 Mbps (mejorado)
      high: 18_000_000, // 18 Mbps (mejorado) - Óptimo para arte
      max: 30_000_000, // 30 Mbps (mejorado)
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
      this.frameCount = 0;
      this.startTime = performance.now();
      this.errorInfo = null;
      this.savedBuffer = null; // Limpiar buffer anterior
      this.recorderInitializing = false; // Reset flag
      this.recorderStartDelayFrames = 0; // Reset delay counter

      // Entrar en estado "recording" - Iniciar inmediatamente
      this.state = 'recording';

      console.log(`🎬 Iniciando grabación (sin warmup, con delay de ${RECORDING_CONSTANTS.RECORDER_START_DELAY_FRAMES} frames)`);
      
      // Iniciar recorder inmediatamente (sin esperar)
      this.recorderInitializing = true;
      await this.initializeRecorder();
      this.recorderInitializing = false;
      this.recorderStartDelayFrames = 0;
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
    if (this.state !== 'recording') {
      return;
    }

    // Delay después de iniciar recorder para permitir que canvas-record se estabilice
    // Evita capturar frames verdes o corruptos del inicio
    if (this.recorderStartDelayFrames < RECORDING_CONSTANTS.RECORDER_START_DELAY_FRAMES) {
      this.recorderStartDelayFrames++;
      console.log(`⏳ Delay de estabilización: ${this.recorderStartDelayFrames}/${RECORDING_CONSTANTS.RECORDER_START_DELAY_FRAMES} frames`);
      return;
    }

    // Capturar frames normalmente después del delay
    if (this.recorderInitializing) {
      console.error('❌ Recorder aún inicializando');
      return;
    }

    try {
      if (this.usingFallback && this.fallbackRecorder) {
        // MediaRecorder captura automáticamente, solo incrementar contador
        await this.fallbackRecorder.step();
      } else if (this.recorder) {
        // canvas-record requiere step() manual
        await this.recorder.step();
      } else {
        console.error('❌ Ningún recorder disponible');
        return;
      }

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
   * Inicializa el recorder después del warmup
   */
  private async initializeRecorder(): Promise<void> {
    if (!this.canvas) {
      throw new Error('Canvas no disponible');
    }

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const hasWebCodecs = this.hasWebCodecsSupport();
    const codec = this.getCodecConfig();
    const bitrate = this.getBitrate();

    console.log('🎥 Iniciando recorder:', {
      format: this.config.format,
      quality: this.config.quality,
      fps: this.config.frameRate,
      codec: codec || 'WASM fallback',
      bitrate: `${(bitrate / 1_000_000).toFixed(1)} Mbps`,
      size: `${canvasWidth}x${canvasHeight}`,
      webCodecs: hasWebCodecs,
    });

    // ESTRATEGIA: Usar MediaRecorder por defecto porque canvas-record tiene problemas con stop()
    // Solo usar canvas-record si se configura explícitamente (para debugging futuro)
    const forceMediaRecorder = true; // Cambiar a false para intentar canvas-record

    if (forceMediaRecorder || !this.context) {
      // Usar MediaRecorder nativo directamente
      if (!MediaRecorderFallback.isSupported()) {
        this.state = 'error';
        this.errorInfo = {
          code: 'START_ERROR',
          message: 'MediaRecorder no está disponible en este navegador',
          recoverable: false,
        };
        throw new Error('Sistema de grabación no disponible');
      }

      try {
        console.log('🎥 Usando MediaRecorder nativo (más confiable)...');
        this.fallbackRecorder = new MediaRecorderFallback(this.canvas, this.config);
        await this.fallbackRecorder.start();
        this.usingFallback = true;
        console.log('✅ MediaRecorder iniciado correctamente');
      } catch (fallbackError) {
        this.state = 'error';
        this.errorInfo = {
          code: 'START_ERROR',
          message: 'Error iniciando MediaRecorder',
          recoverable: false,
        };
        console.error('❌ Error iniciando MediaRecorder:', fallbackError);
        throw fallbackError;
      }
    } else {
      // Intentar canvas-record (solo si forceMediaRecorder = false)
      try {
        // FIX: Remover 'target' para permitir que canvas-record use su configuración por defecto
        // que sí guarda el buffer en memoria correctamente
        this.recorder = new Recorder(this.context, {
          name: this.config.fileName || 'victor-animation',
          frameRate: this.config.frameRate,
          download: false, // No descargar automáticamente - el usuario controla la descarga
          extension: this.config.format,
          // target: 'in-browser', // ← REMOVIDO: Esto causaba que stop() retorne null
          encoderOptions: codec
            ? {
                codec,
                videoBitsPerSecond: bitrate,
              }
            : undefined,
        });

        await this.recorder.start();
        this.usingFallback = false;
        console.log('✅ canvas-record iniciado correctamente');
      } catch (error) {
        console.warn('⚠️ canvas-record falló, usando MediaRecorder...', error);

        // Fallback a MediaRecorder nativo
        if (!MediaRecorderFallback.isSupported()) {
          this.state = 'error';
          this.errorInfo = {
            code: 'START_ERROR',
            message: 'Ni canvas-record ni MediaRecorder están disponibles',
            recoverable: false,
          };
          throw new Error('Sistema de grabación no disponible');
        }

        try {
          console.log('🔄 Usando MediaRecorder fallback...');
          this.fallbackRecorder = new MediaRecorderFallback(this.canvas, this.config);
          await this.fallbackRecorder.start();
          this.usingFallback = true;
          console.log('✅ MediaRecorder fallback iniciado correctamente');
        } catch (fallbackError) {
          this.state = 'error';
          this.errorInfo = {
            code: 'START_ERROR',
            message: 'Error iniciando sistema de grabación',
            recoverable: false,
          };
          console.error('❌ Error iniciando fallback:', fallbackError);
          throw fallbackError;
        }
      }
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
    if (!this.recorder && !this.fallbackRecorder) {
      this.state = 'idle';
      return;
    }

    if (this.state !== 'recording' && this.state !== 'paused') {
      console.warn('⏹️ Stop ignorado: el recorder no está activo');
      return;
    }

    try {
      this.state = 'processing';
      console.log('🛑 Deteniendo grabación...');

      let buffer = null;

      // Usar el recorder apropiado
      if (this.usingFallback && this.fallbackRecorder) {
        console.log('🛑 Usando MediaRecorder fallback para detener...');
        try {
          buffer = await this.fallbackRecorder.stop();
          console.log('✅ MediaRecorder fallback detenido exitosamente');
          console.log('📦 Buffer capturado:', buffer.length, 'blobs');
        } catch (fallbackError) {
          console.error('❌ Error deteniendo MediaRecorder fallback:', fallbackError);
        }
      } else if (this.recorder) {
        console.log('🛑 Usando canvas-record para detener...');

        // FIX: Intentar flush explícito antes de stop() para asegurar que el encoder finalice
        if (typeof (this.recorder as any).flush === 'function') {
          try {
            console.log('💧 Ejecutando flush() antes de stop()...');
            await (this.recorder as any).flush();
            console.log('✅ Flush completado');
          } catch (flushError) {
            console.warn('⚠️ Flush error (no crítico):', flushError);
          }
        }

        // Detener la grabación
        try {
          console.log('🛑 Llamando recorder.stop()...');
          buffer = await this.recorder.stop();
          console.log('✅ recorder.stop() completado');
          console.log('📦 Tipo de buffer:', buffer ? (Array.isArray(buffer) ? 'Blob[]' : buffer.constructor.name) : 'NULL/UNDEFINED');

          if (buffer) {
            if (Array.isArray(buffer)) {
              console.log('📦 Buffer es array con', buffer.length, 'elementos');
            } else if (buffer instanceof ArrayBuffer) {
              console.log('📦 Buffer es ArrayBuffer de', buffer.byteLength, 'bytes');
            } else if (buffer instanceof Uint8Array) {
              console.log('📦 Buffer es Uint8Array de', buffer.byteLength, 'bytes');
            }
          }
        } catch (stopError) {
          console.warn('⚠️ Error en recorder.stop():', stopError);

          // Intentar métodos alternativos
          if (typeof (this.recorder as any).render === 'function') {
            try {
              console.log('💡 Intentando render()...');
              await (this.recorder as any).render();
              console.log('✅ render() completado');
            } catch (e) {
              console.warn('⚠️ render() error:', e);
            }
          }

          if (typeof (this.recorder as any).getBuffer === 'function') {
            try {
              console.log('💡 Intentando getBuffer()...');
              buffer = (this.recorder as any).getBuffer();
              console.log('✅ getBuffer() retornó:', buffer ? 'DATOS' : 'NULL');
            } catch (getError) {
              console.warn('⚠️ getBuffer() error:', getError);
            }
          }

          if (!buffer && typeof (this.recorder as any).finalize === 'function') {
            try {
              console.log('💡 Intentando finalize()...');
              buffer = await (this.recorder as any).finalize();
              console.log('✅ finalize() retornó:', buffer ? 'DATOS' : 'NULL');
            } catch (finalizeError) {
              console.warn('⚠️ finalize() error:', finalizeError);
            }
          }
        }
      }

      this.updateStats();

      console.log('✅ Grabación completada:', {
        duration: `${this.stats.duration.toFixed(1)}s`,
        frames: this.frameCount,
        avgFps: this.stats.currentFps.toFixed(1),
        size: this.formatFileSize(this.stats.estimatedSize),
        hasBuffer: !!buffer,
        usingFallback: this.usingFallback,
      });

      // Guardar buffer para descarga manual
      if (buffer) {
        this.savedBuffer = buffer;
        console.log('💾 Buffer guardado exitosamente, listo para descargar');
        this.state = 'idle';
      } else {
        console.error('⚠️ No se pudo capturar el buffer - ' + this.frameCount + ' frames grabados sin buffer');
        console.error('💡 SUGERENCIA: Intenta cambiar el formato a WebM o reducir la calidad');
        this.state = 'idle';
        this.errorInfo = {
          code: 'BUFFER_ERROR',
          message: 'No se pudo capturar el buffer. Intenta cambiar el formato a WebM o reintentar.',
          recoverable: true,
        };
      }

      // Cleanup
      this.recorder = null;
      this.fallbackRecorder = null;
    } catch (error) {
      this.state = 'error';
      this.errorInfo = {
        code: 'STOP_ERROR',
        message: 'Error deteniendo grabación',
        recoverable: true,
      };
      console.error('❌ Error deteniendo grabación:', error);
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
   * Limpia el buffer guardado para permitir nueva grabación
   */
  clearBuffer(): void {
    if (this.savedBuffer) {
      this.savedBuffer = null;
      console.log('🧹 Buffer limpiado, listo para nueva grabación');
    }
  }

  /**
   * Limpia recursos
   */
  async dispose(): Promise<void> {
    if (this.recorder || this.fallbackRecorder) {
      if (this.state === 'recording' || this.state === 'paused') {
        await this.stop();
      } else {
        // Limpiar canvas-record
        if (this.recorder) {
          try {
            await this.recorder.dispose();
          } catch (error) {
            console.error('⚠️ Error liberando recorder:', error);
          }
        }

        // Limpiar fallback
        if (this.fallbackRecorder) {
          try {
            await this.fallbackRecorder.dispose();
          } catch (error) {
            console.error('⚠️ Error liberando fallback recorder:', error);
          }
        }
      }
    }

    this.recorder = null;
    this.fallbackRecorder = null;
    this.context = null;
    this.canvas = null;
  }
}
