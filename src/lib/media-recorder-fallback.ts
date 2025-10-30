/**
 * media-recorder-fallback.ts - Fallback nativo usando MediaRecorder API
 * Se usa cuando canvas-record falla o no puede capturar el buffer
 */

import type { RecordingConfig, RecordingStats } from '@/types/recording';

export class MediaRecorderFallback {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private config: RecordingConfig;
  private frameCount: number = 0;
  private startTime: number = 0;

  constructor(canvas: HTMLCanvasElement, config: RecordingConfig) {
    this.canvas = canvas;
    this.config = config;
  }

  /**
   * Verifica si MediaRecorder está disponible
   */
  static isSupported(): boolean {
    return typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
  }

  /**
   * Obtiene el MIME type según el formato configurado
   */
  private getMimeType(): string {
    const format = this.config.format;

    // MediaRecorder no soporta GIF, usar WebM como alternativa
    if (format === 'gif') {
      console.warn('⚠️ MediaRecorder no soporta GIF, usando WebM en su lugar');
      this.config.format = 'webm'; // Actualizar config
    }

    // Verificar soporte de diferentes codecs
    const codecs = [
      // MP4
      'video/mp4; codecs="avc1.42E01E"', // H.264 Baseline
      'video/mp4; codecs="avc1.4D401E"', // H.264 Main
      'video/mp4',
      // WebM
      'video/webm; codecs="vp9"',
      'video/webm; codecs="vp8"',
      'video/webm',
    ];

    // Filtrar por formato preferido
    const targetFormat = this.config.format === 'mp4' ? 'mp4' : 'webm';
    const preferredCodecs = codecs.filter(c => c.startsWith(`video/${targetFormat}`));

    // Encontrar el primer codec soportado
    for (const codec of preferredCodecs) {
      if (MediaRecorder.isTypeSupported(codec)) {
        console.log('📹 MediaRecorder usando codec:', codec);
        return codec;
      }
    }

    // Fallback genérico
    const fallback = targetFormat === 'mp4' ? 'video/mp4' : 'video/webm';
    console.warn('⚠️ Ningún codec preferido soportado, usando:', fallback);
    return fallback;
  }

  /**
   * Inicia la grabación
   */
  async start(): Promise<void> {
    if (!this.canvas) {
      throw new Error('Canvas no disponible');
    }

    try {
      // Capturar stream del canvas
      this.stream = this.canvas.captureStream(this.config.frameRate);

      if (!this.stream) {
        throw new Error('No se pudo capturar stream del canvas');
      }

      console.log('🎥 MediaRecorderFallback: Stream capturado a', this.config.frameRate, 'fps');

      // Crear MediaRecorder
      const mimeType = this.getMimeType();
      const options: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: this.getBitrate(),
      };

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.chunks = [];
      this.frameCount = 0;
      this.startTime = performance.now();

      // Event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
          console.log('📦 Chunk recibido:', event.data.size, 'bytes. Total chunks:', this.chunks.length);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
      };

      // Iniciar grabación - solicitar datos cada 100ms para no perder frames
      this.mediaRecorder.start(100);

      console.log('✅ MediaRecorderFallback iniciado');
    } catch (error) {
      console.error('❌ Error iniciando MediaRecorderFallback:', error);
      throw error;
    }
  }

  /**
   * Captura un frame (para compatibilidad con VideoRecorder)
   * MediaRecorder captura automáticamente, pero incrementamos el contador
   */
  async step(): Promise<void> {
    this.frameCount++;
  }

  /**
   * Detiene la grabación y retorna el buffer
   */
  async stop(): Promise<Blob[]> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder no inicializado'));
        return;
      }

      // Configurar handler de stop
      this.mediaRecorder.onstop = () => {
        console.log('✅ MediaRecorder detenido. Chunks recolectados:', this.chunks.length);

        if (this.chunks.length === 0) {
          console.error('⚠️ No se capturaron chunks');
          reject(new Error('No se capturaron datos de video'));
          return;
        }

        // Detener todas las pistas del stream
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }

        // Retornar los chunks como array
        resolve([...this.chunks]);
      };

      // Detener grabación
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          console.log('🛑 Deteniendo MediaRecorder...');
          this.mediaRecorder.stop();
        } else {
          console.warn('⚠️ MediaRecorder ya estaba inactivo');
          resolve([...this.chunks]);
        }
      } catch (error) {
        console.error('❌ Error deteniendo MediaRecorder:', error);
        reject(error);
      }
    });
  }

  /**
   * Obtiene el bitrate según la calidad configurada
   */
  private getBitrate(): number {
    const presets: Record<string, number> = {
      low: 6_000_000,
      medium: 12_000_000,
      high: 18_000_000,
      max: 30_000_000,
    };

    return presets[this.config.quality] || 18_000_000;
  }

  /**
   * Obtiene estadísticas actuales
   */
  getStats(): RecordingStats {
    const duration = (performance.now() - this.startTime) / 1000;
    const currentFps = duration > 0 ? this.frameCount / duration : 0;

    // Estimar tamaño basado en chunks
    const estimatedSize = this.chunks.reduce((total, chunk) => total + chunk.size, 0);

    return {
      duration,
      frameCount: this.frameCount,
      estimatedSize,
      currentFps,
    };
  }

  /**
   * Limpia recursos
   */
  async dispose(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      await this.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];
  }
}
