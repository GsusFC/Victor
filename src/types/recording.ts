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
  maxDuration?: number; // Segundos, undefined = ilimitado
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
    label: 'Baja (720p30)',
    resolution: '720p',
    bitrate: 4_000_000, // 4 Mbps
    fps: 30,
  },
  medium: {
    label: 'Media (1080p60)',
    resolution: '1080p',
    bitrate: 8_000_000, // 8 Mbps
    fps: 60,
  },
  high: {
    label: 'Alta (1080p60)',
    resolution: '1080p',
    bitrate: 12_000_000, // 12 Mbps
    fps: 60,
  },
  max: {
    label: 'Máxima (1440p60)',
    resolution: '1440p',
    bitrate: 20_000_000, // 20 Mbps
    fps: 60,
  },
};

export interface RecordingError {
  code: string;
  message: string;
  recoverable: boolean;
}
