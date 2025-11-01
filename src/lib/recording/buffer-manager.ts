/**
 * buffer-manager.ts - Gestión centralizada del buffer de grabación
 * Con validación de magic bytes
 */

import type { RecordingBuffer, RecordingBufferInfo } from '@/types/recording';

// Función no necesaria - getFirstBytesAsync maneja todos los casos

/**
 * Extrae bytes de forma asincrónica (para Blobs)
 */
async function getFirstBytesAsync(buffer: RecordingBuffer, count: number): Promise<Uint8Array | null> {
  try {
    if (Array.isArray(buffer) && buffer.length > 0) {
      const blob = buffer[0];
      const arrayBuffer = await blob.arrayBuffer();
      return new Uint8Array(arrayBuffer, 0, Math.min(count, arrayBuffer.byteLength));
    }
    if (buffer instanceof Blob) {
      const arrayBuffer = await buffer.arrayBuffer();
      return new Uint8Array(arrayBuffer, 0, Math.min(count, arrayBuffer.byteLength));
    }
    if (buffer instanceof ArrayBuffer) {
      return new Uint8Array(buffer, 0, Math.min(count, buffer.byteLength));
    }
    if (buffer instanceof Uint8Array) {
      return buffer.slice(0, count);
    }
  } catch (error) {
    console.error('Error extrayendo bytes:', error);
  }
  return null;
}

/**
 * Verifica magic bytes de MP4
 */
function isMP4MagicBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const isFtyp = bytes[0] === 0x66 && bytes[1] === 0x74 && bytes[2] === 0x79 && bytes[3] === 0x70;
  const isMdat = bytes[0] === 0x6d && bytes[1] === 0x64 && bytes[2] === 0x61 && bytes[3] === 0x74;
  return isFtyp || isMdat;
}

/**
 * Verifica magic bytes de WebM
 */
function isWebMMagicBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
}

/**
 * Verifica magic bytes de GIF
 */
function isGIFMagicBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 3) return false;
  return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
}

export interface BufferValidation {
  isValid: boolean;
  error?: string;
  format?: string;
}

export class RecordingBufferManager {
  private buffer: RecordingBuffer | null = null;
  private bufferSize: number = 0;

  /**
   * Almacena un nuevo buffer
   */
  store(buffer: RecordingBuffer): void {
    this.buffer = buffer;
    this.bufferSize = this.getBufferSize(buffer);
    console.log(`✅ Buffer almacenado: ${this.formatSize(this.bufferSize)}`);
  }

  /**
   * Recupera el buffer almacenado
   */
  retrieve(): RecordingBuffer | null {
    return this.buffer;
  }

  /**
   * Obtiene el tamaño del buffer
   */
  private getBufferSize(buffer: RecordingBuffer): number {
    if (Array.isArray(buffer)) {
      return buffer.reduce((total, blob) => total + blob.size, 0);
    }
    if (buffer instanceof Blob) {
      return buffer.size;
    }
    if (buffer instanceof ArrayBuffer) {
      return buffer.byteLength;
    }
    if (buffer instanceof Uint8Array) {
      return buffer.byteLength;
    }
    return 0;
  }

  /**
   * Valida los magic bytes del buffer (async)
   */
  async validateMagicBytes(): Promise<BufferValidation> {
    if (!this.buffer) {
      return { isValid: false, error: 'Buffer vacío' };
    }

    const bytes = await getFirstBytesAsync(this.buffer, 12);
    if (!bytes) {
      return { isValid: false, error: 'No se pudo leer magic bytes' };
    }

    if (isMP4MagicBytes(bytes)) {
      return { isValid: true, format: 'mp4' };
    }

    if (isWebMMagicBytes(bytes)) {
      return { isValid: true, format: 'webm' };
    }

    if (isGIFMagicBytes(bytes)) {
      return { isValid: true, format: 'gif' };
    }

    return {
      isValid: false,
      error: 'Formato de video no reconocido o corrupto',
    };
  }

  /**
   * Verifica si hay buffer listo para descargar
   */
  async isReadyForDownload(): Promise<boolean> {
    if (!this.buffer) return false;

    // Validación 1: tamaño mínimo de 1KB
    const size = this.getBufferSize(this.buffer);
    if (size < 1024) {
      console.warn(`⚠️ Buffer muy pequeño: ${size} bytes`);
      return false;
    }

    // Validación 2: magic bytes válidos
    const validation = await this.validateMagicBytes();
    if (!validation.isValid) {
      console.warn(`⚠️ Magic bytes no válidos: ${validation.error}`);
      return false;
    }

    console.log(`✅ Buffer validado: ${validation.format?.toUpperCase()}`);
    return true;
  }

  /**
   * Limpia el buffer actual
   */
  clear(): void {
    this.buffer = null;
    this.bufferSize = 0;
    console.log('🧹 Buffer limpiado');
  }

  /**
   * Verifica si hay un buffer almacenado
   */
  hasBuffer(): boolean {
    return this.buffer !== null && this.bufferSize > 0;
  }

  /**
   * Obtiene información del buffer
   */
  getBufferInfo(): RecordingBufferInfo {
    return {
      hasBuffer: this.hasBuffer(),
      size: this.bufferSize,
      formattedSize: this.formatSize(this.bufferSize),
    };
  }

  /**
   * Formatea bytes a formato legible
   */
  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
}
