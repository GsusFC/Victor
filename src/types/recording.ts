/**
 * recording.ts - Tipos TypeScript para el sistema de grabación de video
 */

export type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'error';

export type VideoFormat = 'mp4' | 'webm' | 'gif';

export type VideoQuality = 'low' | 'medium' | 'high' | 'max';

export interface RecordingConfig {
  format: VideoFormat;
  quality: VideoQuality;
  frameRate: number;
  fileName?: string;
}

export interface RecordingStats {
  duration: number; // Segundos
  frameCount: number;
  estimatedSize: number; // Bytes
  currentFps: number;
}

export interface QualityPreset {
  label: string;
  resolution: string;
  bitrate: number;
  fps: number;
}

export const QUALITY_PRESETS: Record<VideoQuality, QualityPreset> = {
  low: {
    label: 'Baja (1080p30)',
    resolution: '1080p',
    bitrate: 6_000_000, // 6 Mbps
    fps: 30,
  },
  medium: {
    label: 'Redes Sociales (1080p30)',
    resolution: '1080p',
    bitrate: 8_000_000, // 8 Mbps - Optimizado para Instagram, TikTok, YouTube
    fps: 30,
  },
  high: {
    label: 'Alta (1080p60)',
    resolution: '1080p',
    bitrate: 18_000_000, // 18 Mbps - Óptimo para arte
    fps: 60,
  },
  max: {
    label: 'Máxima (1080p60)',
    resolution: '1080p',
    bitrate: 30_000_000, // 30 Mbps
    fps: 60,
  },
};

export interface RecordingError {
  code: string;
  message: string;
  recoverable: boolean;
}
