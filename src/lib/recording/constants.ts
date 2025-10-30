/**
 * recording/constants.ts - Constantes centralizadas para el sistema de grabación
 */

export const RECORDING_CONSTANTS = {
  // Canvas-record configuration
  RECORDER_START_DELAY_FRAMES: 10,

  // MediaRecorder configuration
  CHUNK_REQUEST_INTERVAL: 100, // milliseconds
  STATS_UPDATE_INTERVAL: 100, // milliseconds

  // Validation
  MIN_FRAMES_FOR_VALID_RECORDING: 5,

  // Cleanup timing
  CLEANUP_DELAY_MS: 1000,

  // Default values
  DEFAULT_FRAME_RATE: 60,
  DEFAULT_BITRATE_PRESETS: {
    low: 6_000_000,
    medium: 12_000_000,
    high: 18_000_000,
    max: 30_000_000,
  } as const,
} as const;
