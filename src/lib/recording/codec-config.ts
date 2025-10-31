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
