/**
 * Engine Constants - Valores de configuración centralizados
 * Consolida todos los magic numbers del motor en un solo lugar
 */

// ============= BLOOM CONSTANTS =============

export const BLOOM_DEFAULTS = {
  RADIUS: 1.5,
  THRESHOLD: 0.7,
  INTENSITY: 0.5,
  QUALITY: 9, // 5, 9, or 13 samples
} as const;

// ============= TRAILS CONSTANTS =============

export const TRAILS_DEFAULTS = {
  DECAY: 0.95,
  OPACITY_TO_DECAY_MIN: 0.80, // opacity 1.0 → decay 0.80 (fast fade)
  OPACITY_TO_DECAY_MAX: 0.98, // opacity 0.1 → decay 0.98 (slow fade)
  OPACITY_RANGE: 0.18, // 0.98 - 0.80
} as const;

// ============= POST-PROCESSING CONSTANTS =============

export const POST_PROCESS_DEFAULTS = {
  // Chromatic Aberration
  CHROMATIC_ABERRATION_INTENSITY: 0.5,
  CHROMATIC_ABERRATION_OFFSET: 0.01,

  // Vignette
  VIGNETTE_INTENSITY: 0.6,
  VIGNETTE_SOFTNESS: 0.4,

  // Exposure
  EXPOSURE: 1.0,
} as const;

// ============= WEBGPU CONSTANTS =============

export const WEBGPU_DEFAULTS = {
  MSAA_SAMPLE_COUNT: 4,
  OPTIMAL_WORKGROUP_SIZE: 64,
  VECTOR_COMPONENT_SIZE: 4, // [baseX, baseY, angle, length]
  FLOAT32_BYTES: 4,
} as const;

// ============= COMPUTED CONSTANTS =============

export const COMPUTED = {
  /** Tamaño en bytes de un vector (4 floats × 4 bytes) */
  VECTOR_SIZE_BYTES: WEBGPU_DEFAULTS.VECTOR_COMPONENT_SIZE * WEBGPU_DEFAULTS.FLOAT32_BYTES,
} as const;

// ============= TYPE EXPORTS =============

export type BloomDefaults = typeof BLOOM_DEFAULTS;
export type TrailsDefaults = typeof TRAILS_DEFAULTS;
export type PostProcessDefaults = typeof POST_PROCESS_DEFAULTS;
export type WebGPUDefaults = typeof WEBGPU_DEFAULTS;
