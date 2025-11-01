/**
 * codec-config.ts - Configuración de codecs para grabación de video
 * Responsabilidades:
 * - Detectar soporte de WebCodecs
 * - Configurar codecs apropiados (H.264, VP9)
 * - Calcular bitrates según calidad
 */

import { AVC } from 'media-codecs';
import type { VideoFormat, VideoQuality } from '@/types/recording';

/**
 * Detecta si WebCodecs está disponible para aceleración por hardware
 */
export function hasWebCodecsSupport(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined';
}

/**
 * Obtiene el codec apropiado según el formato
 */
export function getCodecConfig(format: VideoFormat): string | undefined {
  if (!hasWebCodecsSupport()) {
    return undefined; // Fallback automático a WASM
  }

  // H.264 High Profile para MP4 (mejor compatibilidad y calidad)
  if (format === 'mp4') {
    return AVC.getCodec({ profile: 'High', level: '5.2' });
  }

  // VP9 para WebM (mejor compresión)
  if (format === 'webm') {
    return 'vp09.00.10.08';
  }

  return undefined;
}

/**
 * Bitrate presets por calidad
 */
export const BITRATE_PRESETS: Record<VideoQuality, number> = {
  low: 6_000_000,     // 6 Mbps
  medium: 12_000_000, // 12 Mbps
  high: 18_000_000,   // 18 Mbps - Óptimo para arte
  max: 30_000_000,    // 30 Mbps
};

/**
 * Obtiene el bitrate según la calidad configurada
 */
export function getBitrate(quality: VideoQuality): number {
  return BITRATE_PRESETS[quality];
}

/**
 * FPS presets por calidad
 */
export const FPS_PRESETS: Record<VideoQuality, number> = {
  low: 30,
  medium: 30,
  high: 60,
  max: 60,
};

/**
 * Obtiene el FPS según la calidad configurada
 */
export function getFpsForQuality(quality: VideoQuality): number {
  return FPS_PRESETS[quality];
}

/**
 * Detecta qué formatos de video están soportados
 */
export function getSupportedFormats(): VideoFormat[] {
  const supported: VideoFormat[] = [];

  // Verificar MP4
  if (
    typeof MediaRecorder !== 'undefined' &&
    (MediaRecorder.isTypeSupported('video/mp4') ||
      MediaRecorder.isTypeSupported('video/mp4;codecs=h264') ||
      MediaRecorder.isTypeSupported('video/mp4;codecs=avc1'))
  ) {
    supported.push('mp4');
  }

  // Verificar WebM
  if (
    typeof MediaRecorder !== 'undefined' &&
    (MediaRecorder.isTypeSupported('video/webm') ||
      MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ||
      MediaRecorder.isTypeSupported('video/webm;codecs=vp8'))
  ) {
    supported.push('webm');
  }

  // GIF siempre soportado (post-process o fallback)
  supported.push('gif');

  return supported;
}

/**
 * Verifica si un formato específico está soportado
 */
export function isFormatSupported(format: VideoFormat): boolean {
  return getSupportedFormats().includes(format);
}

/**
 * Obtiene el formato de fallback si el seleccionado no está disponible
 */
export function getFallbackFormat(format: VideoFormat): VideoFormat {
  if (isFormatSupported(format)) {
    return format;
  }

  // Orden de preferencia: webm > mp4 > gif
  const supported = getSupportedFormats();

  if (supported.includes('webm')) {
    return 'webm';
  }
  if (supported.includes('mp4')) {
    return 'mp4';
  }

  return 'gif';
}

/**
 * Obtiene el MIME type para un formato
 */
export function getMimeType(format: VideoFormat): string {
  const mimeTypes: Record<VideoFormat, string[]> = {
    mp4: ['video/mp4', 'video/mp4;codecs=h264', 'video/mp4;codecs=avc1'],
    webm: ['video/webm', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8'],
    gif: ['image/gif'],
  };

  const candidates = mimeTypes[format] || [];

  for (const mimeType of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  // Fallback seguro
  return format === 'mp4' ? 'video/mp4' : format === 'webm' ? 'video/webm' : 'image/gif';
}
