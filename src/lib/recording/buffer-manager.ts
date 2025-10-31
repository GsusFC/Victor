/**
 * RecordingBufferManager - Gestión del buffer de grabación
 * Responsabilidades:
 * - Almacenar buffer de video
 * - Proporcionar información sobre el buffer
 * - Limpiar buffer cuando sea necesario
 */

export type RecordingBuffer = ArrayBuffer | Uint8Array | Blob[];

export class RecordingBufferManager {
  private buffer: RecordingBuffer | null = null;

  /**
   * Almacena un buffer de grabación
   */
  store(buffer: RecordingBuffer): void {
    this.buffer = buffer;
    
    const size = this.getBufferSize();
    const type = this.getBufferType();
    
    console.log(`💾 Buffer stored: ${type}, ${this.formatBytes(size)}`);
  }

  /**
   * Recupera el buffer almacenado
   */
  retrieve(): RecordingBuffer | null {
    return this.buffer;
  }

  /**
   * Limpia el buffer almacenado
   */
  clear(): void {
    if (this.buffer) {
      const type = this.getBufferType();
      console.log(`🧹 Buffer cleared: ${type}`);
    }
    this.buffer = null;
  }

  /**
   * Verifica si hay un buffer almacenado
   */
  hasBuffer(): boolean {
    return this.buffer !== null;
  }

  /**
   * Obtiene el tipo de buffer almacenado
   */
  getBufferType(): string {
    if (!this.buffer) {
      return 'none';
    }

    if (Array.isArray(this.buffer)) {
      return `Blob[] (${this.buffer.length} blobs)`;
    }

    if (this.buffer instanceof ArrayBuffer) {
      return 'ArrayBuffer';
    }

    if (this.buffer instanceof Uint8Array) {
      return 'Uint8Array';
    }

    return 'unknown';
  }

  /**
   * Obtiene el tamaño del buffer en bytes
   */
  getBufferSize(): number {
    if (!this.buffer) {
      return 0;
    }

    if (Array.isArray(this.buffer)) {
      // Sum all blob sizes
      return this.buffer.reduce((total, blob) => total + blob.size, 0);
    }

    if (this.buffer instanceof ArrayBuffer) {
      return this.buffer.byteLength;
    }

    if (this.buffer instanceof Uint8Array) {
      return this.buffer.byteLength;
    }

    return 0;
  }

  /**
   * Formatea bytes a formato legible
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Obtiene información detallada del buffer
   */
  getBufferInfo(): {
    hasBuffer: boolean;
    type: string;
    size: number;
    sizeFormatted: string;
  } {
    return {
      hasBuffer: this.hasBuffer(),
      type: this.getBufferType(),
      size: this.getBufferSize(),
      sizeFormatted: this.formatBytes(this.getBufferSize()),
    };
  }

  /**
   * Verifica si el buffer está listo para descarga
   */
  isReadyForDownload(): boolean {
    if (!this.hasBuffer()) {
      return false;
    }

    const size = this.getBufferSize();
    
    // Buffer debe tener al menos 1KB para ser válido
    return size > 1024;
  }
}
