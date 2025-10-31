/**
 * stats-manager.ts - Gestión de estadísticas de grabación
 * Responsabilidades:
 * - Calcular duración, FPS, tamaño estimado
 * - Formatear valores para display
 * - Tracking de frames y tiempo
 */

import type { RecordingStats } from '@/types/recording';

export class StatsManager {
  private startTime: number = 0;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private frameTimeSamples: number[] = [];
  private readonly MAX_SAMPLES = 10; // Para FPS smoothing

  /**
   * Inicia el tracking de estadísticas
   */
  start(): void {
    this.startTime = performance.now();
    this.frameCount = 0;
    this.lastFrameTime = this.startTime;
    this.frameTimeSamples = [];
  }

  /**
   * Registra un nuevo frame capturado
   */
  recordFrame(): void {
    this.frameCount++;

    const now = performance.now();
    const frameDelta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Agregar muestra de tiempo entre frames
    this.frameTimeSamples.push(frameDelta);
    if (this.frameTimeSamples.length > this.MAX_SAMPLES) {
      this.frameTimeSamples.shift();
    }
  }

  /**
   * Obtiene las estadísticas actuales
   */
  getStats(bitrate: number): RecordingStats {
    const duration = this.startTime > 0
      ? (performance.now() - this.startTime) / 1000
      : 0;

    // Calcular FPS promedio basado en muestras recientes
    const avgFrameTime = this.frameTimeSamples.length > 0
      ? this.frameTimeSamples.reduce((a, b) => a + b, 0) / this.frameTimeSamples.length
      : 0;

    const currentFps = avgFrameTime > 0
      ? Math.round(1000 / avgFrameTime)
      : 0;

    // Estimar tamaño: (bitrate / 8) * duración
    const estimatedSize = Math.round((bitrate / 8) * duration);

    return {
      duration,
      frameCount: this.frameCount,
      estimatedSize,
      currentFps,
    };
  }

  /**
   * Formatea bytes a string legible
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Formatea duración a string MM:SS
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Resetea las estadísticas
   */
  reset(): void {
    this.startTime = 0;
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.frameTimeSamples = [];
  }
}
