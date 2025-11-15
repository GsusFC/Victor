/**
 * RecorderStrategy - Strategy pattern para diferentes tipos de recorders
 * Responsabilidades:
 * - Interface común para todos los recorders
 * - CanvasRecordStrategy: usa canvas-record library
 * - MediaRecorderStrategy: usa MediaRecorder nativo
 */

import { Recorder } from 'canvas-record';
import type { RecordingConfig, RecordingBuffer } from '@/types/recording';
import { hasWebCodecsSupport, getCodecConfig, getBitrate } from './codec-config';
import { RECORDING_CONSTANTS } from './constants';

/**
 * Interface para strategies de grabación
 */
export interface RecorderStrategy {
  initialize(canvas: HTMLCanvasElement, config: RecordingConfig): Promise<void>;
  start(): Promise<void>;
  captureFrame(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<RecordingBuffer | null>;
  dispose(): Promise<void>;
  isSupported(): boolean;
  getName(): string;
  getActualMimeType(): string; // NUEVO: Obtener el mime type real usado durante la grabación
}

/**
 * Strategy usando canvas-record library
 * Ventaja: Mejor control sobre encoding, WebCodecs support
 * Desventaja: Puede tener problemas con stop() en algunos casos
 */
export class CanvasRecordStrategy implements RecorderStrategy {
  private recorder: Recorder | null = null;
  private context: GPUCanvasContext | null = null;
  private config: RecordingConfig | null = null;
  private frameDelayCounter: number = 0;
  private isInitialized: boolean = false;
  private actualMimeType: string = ''; // NUEVO: Guardar el mime type real usado

  getName(): string {
    return 'CanvasRecord';
  }

  getActualMimeType(): string {
    return this.actualMimeType;
  }

  isSupported(): boolean {
    // canvas-record requiere WebGPU context
    return typeof Recorder !== 'undefined';
  }

  async initialize(canvas: HTMLCanvasElement, config: RecordingConfig): Promise<void> {
    this.context = canvas.getContext('webgpu');
    
    if (!this.context) {
      throw new Error('Canvas no tiene contexto WebGPU');
    }

    this.config = config;
    this.frameDelayCounter = 0;
    this.isInitialized = false;

    const codec = getCodecConfig(config.format);
    const bitrate = getBitrate(config.quality);

    // Guardar el mime type basado en el formato
    this.actualMimeType = config.format === 'mp4' ? 'video/mp4' : config.format === 'webm' ? 'video/webm' : 'image/gif';

    console.log('🎥 Inicializando CanvasRecordStrategy:', {
      format: config.format,
      quality: config.quality,
      fps: config.frameRate,
      codec: codec || 'WASM fallback',
      bitrate: `${(bitrate / 1_000_000).toFixed(1)} Mbps`,
      webCodecs: hasWebCodecsSupport(),
    });

    try {
      this.recorder = new Recorder(this.context, {
        name: config.fileName || 'victor-animation',
        frameRate: config.frameRate,
        download: false,
        extension: config.format,
        encoderOptions: codec
          ? {
              codec,
              videoBitsPerSecond: bitrate,
            }
          : undefined,
      });

      this.isInitialized = true;
      console.log('✅ CanvasRecordStrategy inicializado');
    } catch (error) {
      console.error('❌ Error inicializando CanvasRecordStrategy:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.recorder || !this.isInitialized) {
      throw new Error('Recorder no está inicializado');
    }

    await this.recorder.start();
    this.frameDelayCounter = 0;
    console.log('▶️ CanvasRecordStrategy iniciado');
  }

  async captureFrame(): Promise<void> {
    if (!this.recorder) {
      throw new Error('Recorder no disponible');
    }

    // Delay inicial para estabilización
    if (this.frameDelayCounter < RECORDING_CONSTANTS.RECORDER_START_DELAY_FRAMES) {
      this.frameDelayCounter++;
      return;
    }

    await this.recorder.step();
  }

  async pause(): Promise<void> {
    // canvas-record no tiene pause nativo - se maneja en el orchestrator
    console.log('⏸️ CanvasRecordStrategy pausado (simulado)');
  }

  async resume(): Promise<void> {
    // canvas-record no tiene resume nativo - se maneja en el orchestrator
    console.log('▶️ CanvasRecordStrategy reanudado (simulado)');
  }

  async stop(): Promise<RecordingBuffer | null> {
    if (!this.recorder) {
      console.warn('⚠️ Recorder ya fue detenido o no existe');
      return null;
    }

    console.log('🛑 Deteniendo CanvasRecordStrategy...');

    try {
      // Intentar flush si está disponible
      if (typeof (this.recorder as any).flush === 'function') {
        try {
          console.log('💧 Ejecutando flush()...');
          await (this.recorder as any).flush();
        } catch (flushError) {
          console.warn('⚠️ Flush error (no crítico):', flushError);
        }
      }

      const buffer = await this.recorder.stop();
      
      if (buffer) {
        console.log('✅ CanvasRecordStrategy detenido exitosamente');
        return buffer as RecordingBuffer;
      }

      // Intentar métodos alternativos si stop() retorna null
      if (typeof (this.recorder as any).getBuffer === 'function') {
        console.log('💡 Intentando getBuffer()...');
        const alternativeBuffer = (this.recorder as any).getBuffer();
        if (alternativeBuffer) {
          return alternativeBuffer as RecordingBuffer;
        }
      }

      console.warn('⚠️ canvas-record.stop() retornó null');
      return null;
    } catch (error) {
      console.error('❌ Error deteniendo CanvasRecordStrategy:', error);
      return null;
    }
  }

  async dispose(): Promise<void> {
    if (this.recorder) {
      try {
        await this.recorder.dispose();
        console.log('🧹 CanvasRecordStrategy disposed');
      } catch (error) {
        console.error('⚠️ Error disposing CanvasRecordStrategy:', error);
      }
      this.recorder = null;
    }
    this.context = null;
    this.config = null;
    this.isInitialized = false;
  }
}

/**
 * Strategy usando MediaRecorder nativo
 * Ventaja: Más confiable, funciona en más navegadores
 * Desventaja: Menos control sobre encoding
 */
export class MediaRecorderStrategy implements RecorderStrategy {
  private mediaRecorder: MediaRecorder | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private stream: MediaStream | null = null;
  private config: RecordingConfig | null = null;
  private chunks: Blob[] = [];
  private isRecording: boolean = false;
  private actualMimeType: string = ''; // NUEVO: Guardar el mime type real usado

  getName(): string {
    return 'MediaRecorder';
  }

  getActualMimeType(): string {
    return this.actualMimeType;
  }

  isSupported(): boolean {
    return typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream !== 'undefined';
  }

  async initialize(canvas: HTMLCanvasElement, config: RecordingConfig): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('MediaRecorder no está disponible en este navegador');
    }

    this.canvas = canvas;
    this.config = config;
    this.chunks = [];

    // Capturar stream del canvas
    this.stream = canvas.captureStream(config.frameRate);

    if (!this.stream) {
      throw new Error('No se pudo capturar stream del canvas');
    }

    // Determinar mime type
    const mimeType = this.getMimeType(config.format);
    this.actualMimeType = mimeType; // GUARDAR el mime type real usado
    const bitrate = getBitrate(config.quality);

    console.log('🎥 Inicializando MediaRecorderStrategy:', {
      format: config.format,
      quality: config.quality,
      fps: config.frameRate,
      mimeType,
      bitrate: `${(bitrate / 1_000_000).toFixed(1)} Mbps`,
    });

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        videoBitsPerSecond: bitrate,
      });

      // Setup event listeners
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
      };

      console.log('✅ MediaRecorderStrategy inicializado');
    } catch (error) {
      console.error('❌ Error inicializando MediaRecorderStrategy:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.mediaRecorder) {
      throw new Error('MediaRecorder no está inicializado');
    }

    this.chunks = [];
    this.mediaRecorder.start(100); // Timeslice de 100ms
    this.isRecording = true;
    console.log('▶️ MediaRecorderStrategy iniciado');
  }

  async captureFrame(): Promise<void> {
    // MediaRecorder captura automáticamente del stream
    // No requiere acción manual por frame
  }

  async pause(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.isRecording = false;
      console.log('⏸️ MediaRecorderStrategy pausado');
    }
  }

  async resume(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.isRecording = true;
      console.log('▶️ MediaRecorderStrategy reanudado');
    }
  }

  async stop(): Promise<RecordingBuffer | null> {
    if (!this.mediaRecorder) {
      console.warn('⚠️ MediaRecorder ya fue detenido o no existe');
      return null;
    }

    console.log('🛑 Deteniendo MediaRecorderStrategy...');

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        if (this.chunks.length > 0) {
          console.log(`✅ MediaRecorderStrategy detenido: ${this.chunks.length} chunks capturados`);
          resolve(this.chunks);
        } else {
          console.warn('⚠️ No se capturaron chunks');
          resolve(null);
        }
        this.isRecording = false;
      };

      this.mediaRecorder.stop();
    });
  }

  async dispose(): Promise<void> {
    if (this.mediaRecorder) {
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.canvas = null;
    this.config = null;
    this.chunks = [];
    this.isRecording = false;
    console.log('🧹 MediaRecorderStrategy disposed');
  }

  private getMimeType(format: 'mp4' | 'webm' | 'gif'): string {
    const mimeTypes: Record<string, string[]> = {
      mp4: ['video/mp4', 'video/mp4;codecs=h264', 'video/webm;codecs=h264'],
      webm: ['video/webm', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8'],
      gif: ['video/webm'], // GIF se genera después del encoding
    };

    const candidates = mimeTypes[format] || mimeTypes.webm;

    for (const mimeType of candidates) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        console.log(`✅ Mime type seleccionado: ${mimeType}`);
        return mimeType;
      }
    }

    // Fallback a webm básico
    console.warn('⚠️ Usando fallback mime type: video/webm');
    return 'video/webm';
  }
}

/**
 * Factory para seleccionar la strategy apropiada
 */
export function createRecorderStrategy(
  preferMediaRecorder: boolean = true
): RecorderStrategy {
  if (preferMediaRecorder) {
    const mediaStrategy = new MediaRecorderStrategy();
    if (mediaStrategy.isSupported()) {
      console.log('🎯 Usando MediaRecorderStrategy (más confiable)');
      return mediaStrategy;
    }
  }

  const canvasStrategy = new CanvasRecordStrategy();
  if (canvasStrategy.isSupported()) {
    console.log('🎯 Usando CanvasRecordStrategy');
    return canvasStrategy;
  }

  throw new Error('No hay strategy de grabación disponible');
}
