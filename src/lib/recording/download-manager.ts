/**
 * download-manager.ts - Gestión de descarga de archivos de video
 * Responsabilidades:
 * - Convertir buffers a blobs
 * - Generar nombres de archivo con timestamp
 * - Descargar archivo al sistema
 * - Cleanup de URLs
 */

import type { VideoFormat } from '@/types/recording';

/**
 * MIME types por formato de video
 */
const MIME_TYPES: Record<VideoFormat, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  gif: 'image/gif',
};

/**
 * Genera nombre de archivo con timestamp
 */
export function generateFileName(baseName: string, format: VideoFormat): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${baseName}-${timestamp}.${format}`;
}

/**
 * Convierte buffer a Blob
 */
export function bufferToBlob(
  buffer: ArrayBuffer | Uint8Array | Blob[],
  format: VideoFormat
): Blob {
  const mimeType = MIME_TYPES[format];

  // Si ya es un array de Blobs, combinarlos
  if (Array.isArray(buffer)) {
    return new Blob(buffer, { type: mimeType });
  }

  // Si es ArrayBuffer o Uint8Array
  if (buffer instanceof ArrayBuffer) {
    return new Blob([buffer], { type: mimeType });
  }

  if (buffer instanceof Uint8Array) {
    return new Blob([buffer.buffer], { type: mimeType });
  }

  throw new Error('Tipo de buffer no soportado');
}

/**
 * Descarga un blob como archivo
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup después de un delay para asegurar que la descarga comenzó
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/**
 * Descarga un buffer directamente
 */
export function downloadBuffer(
  buffer: ArrayBuffer | Uint8Array | Blob[],
  fileName: string,
  format: VideoFormat
): void {
  const blob = bufferToBlob(buffer, format);
  downloadBlob(blob, fileName);
}
