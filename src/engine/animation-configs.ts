/**
 * animation-configs.ts - Configuraciones centralizadas de parámetros de animación
 *
 * Este archivo define los valores por defecto y validadores para cada tipo de animación,
 * separando los datos de la lógica del motor WebGPU.
 */

import type { AnimationType } from '@/types/engine';

/**
 * Parámetros por defecto para una animación
 */
export type AnimationDefaults = {
  frequency: number;
  amplitude: number;
  elasticity: number;
  maxLength: number;
};

/**
 * Función validadora para un parámetro
 */
export type ParameterValidator = (value: number) => number;

/**
 * Validadores para los parámetros de una animación
 */
export type AnimationValidators = {
  frequency?: ParameterValidator;
  amplitude?: ParameterValidator;
  elasticity?: ParameterValidator;
  maxLength?: ParameterValidator;
};

/**
 * Valores por defecto para cada tipo de animación
 */
export const ANIMATION_DEFAULTS: Record<AnimationType, AnimationDefaults> = {
  // Sin animación
  none: { frequency: 0, amplitude: 0, elasticity: 0, maxLength: 60 },

  // NATURALES/FLUIDAS
  smoothWaves: { frequency: 0.02, amplitude: 20, elasticity: 0.5, maxLength: 90 },
  seaWaves: { frequency: 0.02, amplitude: 35, elasticity: 0.8, maxLength: 110 },
  breathingSoft: { frequency: 1.1, amplitude: 60, elasticity: 0.4, maxLength: 150 },
  flowField: { frequency: 0.03, amplitude: 1.2, elasticity: 0.5, maxLength: 100 },
  dnaHelix: { frequency: 1.5, amplitude: 0.4, elasticity: 30, maxLength: 120 },
  rippleEffect: { frequency: 1.5, amplitude: 4, elasticity: 0.5, maxLength: 120 },
  organicGrowth: { frequency: 1.5, amplitude: 0.5, elasticity: 0.3, maxLength: 120 },
  fluidDynamics: { frequency: 0.05, amplitude: 1.2, elasticity: 0.5, maxLength: 110 },
  aurora: { frequency: 1.5, amplitude: 45, elasticity: 0.5, maxLength: 130 },

  // ENERGÉTICAS
  electricPulse: { frequency: 0.02, amplitude: 28, elasticity: 0.6, maxLength: 120 },
  vortex: { frequency: 1.2, amplitude: 0.45, elasticity: 1.2, maxLength: 130 },
  directionalFlow: { frequency: 45, amplitude: 25, elasticity: 0.6, maxLength: 90 },
  storm: { frequency: 1.5, amplitude: 1.0, elasticity: 1.2, maxLength: 140 },
  solarFlare: { frequency: 1.8, amplitude: 0.5, elasticity: 45, maxLength: 150 },
  radiation: { frequency: 1.0, amplitude: 4, elasticity: 0.5, maxLength: 120 },
  magneticField: { frequency: 3, amplitude: 1.5, elasticity: 1.0, maxLength: 130 },
  chaosAttractor: { frequency: 0.5, amplitude: 0.5, elasticity: 0.5, maxLength: 100 },
  plasmaBall: { frequency: 1.5, amplitude: 6, elasticity: 0.5, maxLength: 140 },
  blackHole: { frequency: 0.8, amplitude: 0.5, elasticity: 0.5, maxLength: 150 },
  lightningStorm: { frequency: 1.5, amplitude: 0.5, elasticity: 0.5, maxLength: 130 },
  quantumField: { frequency: 0.05, amplitude: 1.0, elasticity: 0.5, maxLength: 110 },

  // GEOMÉTRICAS
  tangenteClasica: { frequency: 0.6, amplitude: 1, elasticity: 0.5, maxLength: 110 },
  lissajous: { frequency: 2.0, amplitude: 3.0, elasticity: 120, maxLength: 90 },
  geometricPattern: { frequency: 4, amplitude: 45, elasticity: 0.5, maxLength: 80 },
  harmonicOscillator: { frequency: 2.0, amplitude: 1.0, elasticity: 0.3, maxLength: 100 },
  spirograph: { frequency: 0.6, amplitude: 1.5, elasticity: 1.0, maxLength: 100 },
  fibonacci: { frequency: 0.5, amplitude: 1.5, elasticity: 137.5, maxLength: 110 },
  voronoiDiagram: { frequency: 8, amplitude: 0.3, elasticity: 0.5, maxLength: 90 },
  mandalas: { frequency: 6, amplitude: 1.5, elasticity: 3.0, maxLength: 100 },
  kaleidoscope: { frequency: 4, amplitude: 1.5, elasticity: 1.5, maxLength: 100 },

  // EXPERIMENTALES
  springMesh: { frequency: 1.0, amplitude: 0.8, elasticity: 0.5, maxLength: 110 },
};

/**
 * Validadores específicos para cada tipo de animación
 * Si un parámetro no tiene validador, se usa el valor sin modificar
 */
export const ANIMATION_VALIDATORS: Partial<Record<AnimationType, AnimationValidators>> = {
  directionalFlow: {
    elasticity: (v) => Math.max(0, Math.min(1, v)),
  },
  tangenteClasica: {
    amplitude: (v) => (v >= 0 ? 1 : -1), // Solo dirección: 1 o -1
    elasticity: (v) => Math.max(0, Math.min(1, v)),
  },
  geometricPattern: {
    elasticity: (v) => Math.max(0, Math.min(1, v)),
  },
  vortex: {
    amplitude: (v) => Math.max(0, Math.min(1, v)),
    elasticity: (v) => Math.max(0.01, v),
  },
  breathingSoft: {
    frequency: (v) => Math.max(0.05, v),
    amplitude: (v) => Math.max(0, Math.min(360, v)),
    elasticity: (v) => Math.max(0, Math.min(1, v)),
  },
  storm: {
    frequency: (v) => Math.max(0.1, Math.min(3, v)),  // chaos: 0.1-3.0
    amplitude: (v) => Math.max(0, Math.min(2, v)),    // vorticity: 0-2.0
    elasticity: (v) => Math.max(0.1, v),              // pulseSpeed: min 0.1
  },
  solarFlare: {
    frequency: (v) => Math.max(0.5, Math.min(3, v)), // flareIntensity: 0.5-3.0
    // amplitude y elasticity sin restricción
  },
  radiation: {
    frequency: (v) => Math.max(0.1, v),                // waveSpeed: min 0.1
    amplitude: (v) => Math.max(1, Math.min(8, v)),    // numSources: 1-8
    elasticity: (v) => Math.max(0, Math.min(1, v)),   // interference: 0-1
  },
};

/**
 * Obtiene los valores por defecto para un tipo de animación
 */
export function getAnimationDefaults(type: AnimationType): AnimationDefaults {
  return ANIMATION_DEFAULTS[type];
}

/**
 * Obtiene los validadores para un tipo de animación
 */
export function getAnimationValidators(type: AnimationType): AnimationValidators | undefined {
  return ANIMATION_VALIDATORS[type];
}

/**
 * Valida y aplica límites a los parámetros de una animación
 */
export function validateAnimationParams(
  type: AnimationType,
  params: Partial<AnimationDefaults>
): AnimationDefaults {
  const defaults = getAnimationDefaults(type);
  const validators = getAnimationValidators(type);

  const result = {
    frequency: params.frequency ?? defaults.frequency,
    amplitude: params.amplitude ?? defaults.amplitude,
    elasticity: params.elasticity ?? defaults.elasticity,
    maxLength: params.maxLength ?? defaults.maxLength,
  };

  // Aplicar validadores si existen
  if (validators) {
    if (validators.frequency) {
      result.frequency = validators.frequency(result.frequency);
    }
    if (validators.amplitude) {
      result.amplitude = validators.amplitude(result.amplitude);
    }
    if (validators.elasticity) {
      result.elasticity = validators.elasticity(result.elasticity);
    }
    if (validators.maxLength) {
      result.maxLength = validators.maxLength(result.maxLength);
    }
  }

  return result;
}
