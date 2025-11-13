/**
 * VideoRecorder - Orchestrator para sistema de grabación de video
 * Versión refactorizada usando Strategy Pattern y módulos especializados
 * 
 * Reducido de 563 → ~200 líneas delegando responsabilidades a:
 * - RecorderStrategy (CanvasRecord / MediaRecorder)
 * - RecordingStateMachine (gestión de estados)
 * - RecordingBufferManager (gestión de buffer)
 * - RecordingErrorHandler (gestión de errores)
 * - StatsManager (estadísticas) ✅
 * - DownloadManager (descargas) ✅
 */

import type { RecordingConfig, RecordingState, RecordingStats, RecordingError } from '@/types/recording';
import { RecordingStateMachine } from './recording/state-machine';
import { RecordingBufferManager } from './recording/buffer-manager';
import { RecordingErrorHandler } from './recording/error-handler';
import { StatsManager } from './recording/stats-manager';
import { downloadBuffer, generateFileName } from './recording/download-manager';
import { createRecorderStrategy, type RecorderStrategy } from './recording/recorder-strategy';
import { getBitrate, getFpsForQuality } from './recording/codec-config';

export class VideoRecorder {
  // Dependencies
  private strategy: RecorderStrategy;
  private stateMachine: RecordingStateMachine;
  private bufferManager: RecordingBufferManager;
  private statsManager: StatsManager;
  private errorHandler: RecordingErrorHandler;

  // Configuration
  private config: RecordingConfig;
  private canvas: HTMLCanvasElement;
  private recordedFormat: string | null = null; // Guardar formato de la grabación actual

  constructor(canvas: HTMLCanvasElement, config?: Partial<RecordingConfig>) {
    this.canvas = canvas;
    this.config = this.normalizeConfig(config);

    // Initialize dependencies
    this.stateMachine = new RecordingStateMachine();
    this.bufferManager = new RecordingBufferManager();
    this.statsManager = new StatsManager();
    this.errorHandler = new RecordingErrorHandler();

    // Select strategy (prefer MediaRecorder by default)
    try {
      this.strategy = createRecorderStrategy(true);
      console.log(`🎬 VideoRecorder creado con ${this.strategy.getName()}`);
    } catch (error) {
      this.errorHandler.setError(
        'START_ERROR',
        'No hay sistema de grabación disponible',
        false
      );
      throw error;
    }
  }

  /**
   * Normaliza y valida la configuración
   */
  private normalizeConfig(config?: Partial<RecordingConfig>): RecordingConfig {
    const defaultQuality = config?.quality || 'high';
    const fpsForQuality = getFpsForQuality(defaultQuality);

    return {
      format: config?.format || 'mp4',
      quality: defaultQuality,
      frameRate: config?.frameRate || fpsForQuality,
      fileName: config?.fileName || 'victor-animation',
    };
  }

  /**
   * Valida dimensiones del canvas
   */
  private validateCanvasDimensions(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const needsEvenDimensions = this.config.format === 'mp4';
    const hasOddDimension = width % 2 !== 0 || height % 2 !== 0;

    if (needsEvenDimensions && hasOddDimension) {
      const message = `MP4 requiere dimensiones pares. Canvas actual: ${width}x${height}`;
      this.errorHandler.setError('INVALID_DIMENSIONS', message, true);
      throw new Error(message);
    }
  }

  /**
   * Inicializa el recorder y comienza la grabación
   */
  async start(): Promise<void> {
    // Validar estado
    if (!this.stateMachine.canStart()) {
      console.warn('⚠️ No se puede iniciar: estado actual no lo permite');
      return;
    }

    try {
      // Validar dimensiones
      this.validateCanvasDimensions();

      // Limpiar estado anterior
      this.errorHandler.clearError();
      this.bufferManager.clear();
      this.statsManager.reset();

      // Guardar el formato de esta grabación
      this.recordedFormat = this.config.format;

      // Inicializar strategy
      await this.strategy.initialize(this.canvas, this.config);

      // Transición a recording
      this.stateMachine.transition('recording');
      this.statsManager.start();

      // Iniciar strategy
      await this.strategy.start();

      console.log(`🎬 Grabación iniciada (${this.strategy.getName()}) - Formato: ${this.recordedFormat}`);
    } catch (error) {
      this.stateMachine.transition('error');
      this.errorHandler.setError(
        'START_ERROR',
        error instanceof Error ? error.message : 'Error desconocido',
        false
      );
      console.error('❌ Error iniciando grabación:', error);
      throw error;
    }
  }

  /**
   * Captura el frame actual del canvas
   */
  async captureFrame(): Promise<void> {
    if (!this.stateMachine.isRecording()) {
      return;
    }

    try {
      await this.strategy.captureFrame();
      this.statsManager.recordFrame();

      // Actualizar stats cada 30 frames
      const frameCount = this.statsManager.getStats(getBitrate(this.config.quality)).frameCount;
      if (frameCount % 30 === 0) {
        // Stats se obtienen via getStats() cuando se necesiten
      }
    } catch (error) {
      console.error('❌ Error capturando frame:', error);
      this.stateMachine.transition('error');
      this.errorHandler.setError('CAPTURE_ERROR', 'Error capturando frame', true);
    }
  }

  /**
   * Pausa la grabación
   */
  async pause(): Promise<void> {
    if (!this.stateMachine.canPause()) {
      console.warn('⚠️ No se puede pausar: estado actual no lo permite');
      return;
    }

    try {
      await this.strategy.pause();
      this.stateMachine.transition('paused');
      console.log('⏸️ Grabación pausada');
    } catch (error) {
      console.error('❌ Error pausando:', error);
    }
  }

  /**
   * Reanuda la grabación
   */
  async resume(): Promise<void> {
    if (!this.stateMachine.canResume()) {
      console.warn('⚠️ No se puede reanudar: estado actual no lo permite');
      return;
    }

    try {
      await this.strategy.resume();
      this.stateMachine.transition('recording');
      console.log('▶️ Grabación reanudada');
    } catch (error) {
      console.error('❌ Error reanudando:', error);
    }
  }

  /**
   * Detiene la grabación y guarda el buffer
   */
  async stop(): Promise<void> {
    if (!this.stateMachine.canStop()) {
      console.warn('⚠️ No se puede detener: el recorder no está activo');
      return;
    }

    try {
      this.stateMachine.transition('processing');
      console.log('🛑 Deteniendo grabación...');

      // Detener strategy y obtener buffer
      const buffer = await this.strategy.stop();

      // Validar y guardar buffer
      if (buffer) {
        this.bufferManager.store(buffer);
        console.log('✅ Grabación completada:', this.getStats());
      } else {
        console.error('⚠️ No se pudo capturar el buffer');
        this.errorHandler.setError(
          'BUFFER_ERROR',
          'No se pudo capturar el buffer. Intenta cambiar el formato a WebM.',
          true
        );
      }

      // Transición a idle
      this.stateMachine.transition('idle');
    } catch (error) {
      this.stateMachine.transition('error');
      this.errorHandler.setError('STOP_ERROR', 'Error deteniendo grabación', true);
      console.error('❌ Error deteniendo grabación:', error);
    }
  }

  /**
   * Descarga el video guardado en el buffer
   */
  download(): void {
    const buffer = this.bufferManager.retrieve();

    if (!buffer) {
      throw new Error('No hay video disponible para descargar');
    }

    if (!this.bufferManager.isReadyForDownload()) {
      throw new Error('El buffer no está listo para descarga (tamaño insuficiente)');
    }

    // Usar el formato guardado durante la grabación (no el config actual)
    const format = this.recordedFormat || this.config.format;

    // CRITICAL FIX: Obtener el mime type REAL usado durante la grabación
    const actualMimeType = this.strategy.getActualMimeType();

    const fileName = generateFileName(this.config.fileName || 'victor-animation', format as any);
    downloadBuffer(buffer, fileName, format as any, actualMimeType);
    console.log(`📥 Descargando: ${fileName} (formato: ${format}, mime: ${actualMimeType})`);
  }

  /**
   * Limpia el buffer guardado
   */
  clearBuffer(): void {
    this.bufferManager.clear();
  }

  /**
   * Limpia recursos
   */
  async dispose(): Promise<void> {
    try {
      // Detener si está grabando
      if (this.stateMachine.isRecording() || this.stateMachine.isPaused()) {
        await this.stop();
      }

      // Dispose strategy
      await this.strategy.dispose();

      // Limpiar buffer
      this.bufferManager.clear();

      // Reset state machine
      this.stateMachine.reset();

      console.log('🧹 VideoRecorder disposed');
    } catch (error) {
      console.error('⚠️ Error en dispose:', error);
    }
  }

  // ============= Getters =============

  getState(): RecordingState {
    return this.stateMachine.getCurrentState();
  }

  getStats(): RecordingStats {
    return this.statsManager.getStats(getBitrate(this.config.quality));
  }

  getError(): RecordingError | null {
    return this.errorHandler.getError();
  }

  isRecording(): boolean {
    return this.stateMachine.isRecording();
  }

  isPaused(): boolean {
    return this.stateMachine.isPaused();
  }

  isProcessing(): boolean {
    return this.stateMachine.isProcessing();
  }

  hasBuffer(): boolean {
    return this.bufferManager.hasBuffer();
  }

  /**
   * Obtiene información detallada del buffer
   */
  getBufferInfo() {
    return this.bufferManager.getBufferInfo();
  }

  /**
   * Obtiene el nombre de la strategy actual
   */
  getStrategyName(): string {
    return this.strategy?.getName() ?? 'Unknown';
  }
}
