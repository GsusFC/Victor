/**
 * Shape Constants - Configuración centralizada para geometrías de formas
 */

export const SHAPE_CONFIG = {
  // Arc configuration
  ARC: {
    SEGMENTS: 12,
    HALF_WIDTH: 0.05,
    CURVATURE: 0.8, // 80% de altura
  },

  // Circle configuration
  CIRCLE: {
    SEGMENTS: 16,
    HALF_WIDTH: 0.05,
  },

  // Star configuration
  STAR: {
    POINTS: 5,
    INNER_RADIUS: 0.5,
  },

  // Semicircle configuration
  SEMICIRCLE: {
    SEGMENTS: 12,
    HALF_WIDTH: 0.05,
  },

  // Line configuration
  LINE: {
    BASE_Y: 0.5, // Half width at base
  },

  // Triangle configuration
  TRIANGLE: {
    BASE_WIDTH: 0.6, // Extra width at base
  },

  // Cross configuration
  CROSS: {
    ARM_WIDTH: 0.2,
    ARM_LENGTH: 0.4,
  },

  // Arrow configuration
  ARROW: {
    SHAFT_WIDTH: 0.3,
    SHAFT_LENGTH: 0.6,
    HEAD_WIDTH: 0.8,
    HEAD_LENGTH: 0.4,
  },

  // Diamond configuration
  DIAMOND: {
    WIDTH: 0.5,
  },
} as const;

export type ShapeConfig = typeof SHAPE_CONFIG;
