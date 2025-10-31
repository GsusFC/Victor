/**
 * video-recorder.ts - Sistema de grabación de video para canvas WebGPU
 * Usa canvas-record con soporte nativo para WebGPU
 */

import { Recorder } from 'canvas-record';
import { MediaRecorderFallback } from './media-recorder-fallback';
import { RECORDING_CONSTANTS } from './recording/constants';
import { hasWebCodecsSupport, getCodecConfig, getBitrate, getFpsForQuality } from './recording/codec-config';
import { StatsManager } from './recording/stats-manager';
import { downloadBuffer, generateFileName } from './recording/download-manager';
import type { RecordingConfig, RecordingState, RecordingStats, RecordingError } from '@/types/recording';

export class VideoRecorder {
  private recorder: Recorder | null = null;
  private fallbackRecorder: MediaRecorderFallback | null = null;
  private usingFallback: boolean = false;
  private context: GPUCanvasContext | null = null;
  private device: GPUDevice | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private config: RecordingConfig;
  private stats: RecordingStats;
  private statsManager: StatsManager;
  private state: RecordingState = 'idle';
  private errorInfo: RecordingError | null = null;
  private savedBuffer: ArrayBuffer | Uint8Array | Blob[] | null = null;
  private recorderInitializing: boolean = false;
  private recorderStartDelayFrames: number = 0;

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

    // Inicializar StatsManager
    this.statsManager = new StatsManager();

    if (!this.context) {
      throw new Error('Canvas no tiene contexto WebGPU');
    }

    // Obtener device del contexto configurado
    const contextConfig = this.context.getConfiguration();
    this.device = contextConfig?.device || null;
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
      this.statsManager.reset();
      this.statsManager.start();
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

      this.statsManager.recordFrame();

      // Actualizar stats cada 30 frames
      const currentStats = this.statsManager.getStats(getBitrate(this.config.quality));
      if (currentStats.frameCount % 30 === 0) {
        this.stats = currentStats;
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
    const hasWebCodecs = hasWebCodecsSupport();
    const codec = getCodecConfig(this.config.format);
    const bitrate = getBitrate(this.config.quality);

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

      // Actualizar stats finales
      this.stats = this.statsManager.getStats(getBitrate(this.config.quality));

      console.log('✅ Grabación completada:', {
        duration: `${this.stats.duration.toFixed(1)}s`,
        frames: this.stats.frameCount,
        avgFps: this.stats.currentFps.toFixed(1),
        size: this.statsManager.formatFileSize(this.stats.estimatedSize),
        hasBuffer: !!buffer,
        usingFallback: this.usingFallback,
      });

      // Guardar buffer para descarga manual
      if (buffer) {
        this.savedBuffer = buffer;
        console.log('💾 Buffer guardado exitosamente, listo para descargar');
        this.state = 'idle';
      } else {
        console.error('⚠️ No se pudo capturar el buffer - ' + this.stats.frameCount + ' frames grabados sin buffer');
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
      this.stats = this.statsManager.getStats(getBitrate(this.config.quality));
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

    const fileName = generateFileName(this.config.fileName || 'victor-animation', this.config.format);
    downloadBuffer(this.savedBuffer, fileName, this.config.format);
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
