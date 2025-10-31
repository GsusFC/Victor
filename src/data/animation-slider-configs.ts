/**
 * animation-slider-configs.ts - Configuraciones centralizadas de sliders por animación
 *
 * Este archivo define todos los parámetros de sliders para cada tipo de animación,
 * separando los datos de la lógica de UI y permitiendo ajustes centralizados.
 */

import type { AnimationType } from '@/types/engine';

export type SliderConfig = {
  label: string;
  param: 'frequency' | 'amplitude' | 'elasticity' | 'maxLength';
  min: number;
  max: number;
  step: number;
  suffix?: string;
  formatter?: (value: number) => string;
};

const defaultFormatter = (value: number) => value.toFixed(2);
const intFormatter = (v: number) => v.toFixed(0);

/**
 * Configuración de sliders por tipo de animación
 * Cada animación define sus 4 parámetros: frequency, amplitude, elasticity, maxLength
 */
export const ANIMATION_SLIDER_CONFIGS: Partial<Record<AnimationType, SliderConfig[]>> = {
  // NATURAL - Animaciones fluidas y orgánicas
  smoothWaves: [
    { label: 'Frecuencia', param: 'frequency', min: 0.001, max: 0.1, step: 0.001, formatter: defaultFormatter },
    { label: 'Amplitud', param: 'amplitude', min: 5, max: 100, step: 5, suffix: '°', formatter: intFormatter },
    { label: 'Elasticidad', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  seaWaves: [
    { label: 'Frecuencia base', param: 'frequency', min: 0.001, max: 0.05, step: 0.001, formatter: defaultFormatter },
    { label: 'Amplitud', param: 'amplitude', min: 10, max: 80, step: 5, suffix: '°', formatter: intFormatter },
    { label: 'Elasticidad', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  breathingSoft: [
    { label: 'Frecuencia giro', param: 'frequency', min: 0.1, max: 3, step: 0.05, formatter: defaultFormatter },
    { label: 'Pitch helicoidal', param: 'amplitude', min: 0, max: 180, step: 5, suffix: '°', formatter: intFormatter },
    { label: 'Mezcla axial', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  flowField: [
    { label: 'Escala de ruido', param: 'frequency', min: 0.01, max: 0.1, step: 0.005, formatter: defaultFormatter },
    { label: 'Intensidad flujo', param: 'amplitude', min: 0.5, max: 2, step: 0.1, formatter: defaultFormatter },
    { label: 'Velocidad evolución', param: 'elasticity', min: 0.1, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  dnaHelix: [
    { label: 'Velocidad rotación', param: 'frequency', min: 0.1, max: 3, step: 0.1, formatter: defaultFormatter },
    { label: 'Radio hélice', param: 'amplitude', min: 0.1, max: 0.8, step: 0.05, formatter: defaultFormatter },
    { label: 'Ángulo inclinación', param: 'elasticity', min: 0, max: 90, step: 5, suffix: '°', formatter: intFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  rippleEffect: [
    { label: 'Velocidad propagación', param: 'frequency', min: 0.5, max: 3, step: 0.1, formatter: defaultFormatter },
    { label: 'Número de fuentes', param: 'amplitude', min: 1, max: 8, step: 1, formatter: intFormatter },
    { label: 'Interferencia', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  organicGrowth: [
    { label: 'Velocidad crecimiento', param: 'frequency', min: 0.5, max: 3, step: 0.1, formatter: defaultFormatter },
    { label: 'Intensidad ramificación', param: 'amplitude', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Escala de ruido', param: 'elasticity', min: 0.1, max: 0.5, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  fluidDynamics: [
    { label: 'Escala turbulencia', param: 'frequency', min: 0.01, max: 0.1, step: 0.01, formatter: defaultFormatter },
    { label: 'Intensidad flujo', param: 'amplitude', min: 0.5, max: 2, step: 0.1, formatter: defaultFormatter },
    { label: 'Viscosidad', param: 'elasticity', min: 0.1, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  aurora: [
    { label: 'Frecuencia ondulación', param: 'frequency', min: 0.5, max: 3, step: 0.1, formatter: defaultFormatter },
    { label: 'Amplitud onda', param: 'amplitude', min: 10, max: 90, step: 5, suffix: '°', formatter: intFormatter },
    { label: 'Deriva horizontal', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],

  // ENERGETIC - Animaciones intensas y dinámicas
  electricPulse: [
    { label: 'Velocidad pulso', param: 'frequency', min: 0.005, max: 0.05, step: 0.001, formatter: defaultFormatter },
    { label: 'Intensidad', param: 'amplitude', min: 5, max: 60, step: 5, formatter: intFormatter },
    { label: 'Elasticidad', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  vortex: [
    { label: 'Intensidad remolino', param: 'frequency', min: 0, max: 3, step: 0.05, formatter: defaultFormatter },
    { label: 'Atracción centro', param: 'amplitude', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Caída radial', param: 'elasticity', min: 0.1, max: 3, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  directionalFlow: [
    { label: 'Ángulo base', param: 'frequency', min: 0, max: 360, step: 1, suffix: '°', formatter: intFormatter },
    { label: 'Turbulencia', param: 'amplitude', min: 0, max: 90, step: 1, suffix: '°', formatter: intFormatter },
    { label: 'Mezcla ruido', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  storm: [
    { label: 'Caos', param: 'frequency', min: 0.1, max: 3, step: 0.1, formatter: defaultFormatter },
    { label: 'Vorticidad', param: 'amplitude', min: 0, max: 2, step: 0.05, formatter: defaultFormatter },
    { label: 'Velocidad pulsos', param: 'elasticity', min: 0.1, max: 3, step: 0.1, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  solarFlare: [
    { label: 'Intensidad eyecciones', param: 'frequency', min: 0.5, max: 3, step: 0.1, formatter: defaultFormatter },
    { label: 'Rotación solar', param: 'amplitude', min: -2, max: 2, step: 0.1, formatter: defaultFormatter },
    { label: 'Ángulo apertura', param: 'elasticity', min: 0, max: 90, step: 5, suffix: '°', formatter: intFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  radiation: [
    { label: 'Velocidad ondas', param: 'frequency', min: 0.1, max: 3, step: 0.1, formatter: defaultFormatter },
    { label: 'Número fuentes', param: 'amplitude', min: 1, max: 8, step: 1, formatter: intFormatter },
    { label: 'Interferencia', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  magneticField: [
    { label: 'Número de polos', param: 'frequency', min: 2, max: 6, step: 1, formatter: intFormatter },
    { label: 'Intensidad magnética', param: 'amplitude', min: 0.5, max: 3, step: 0.1, formatter: defaultFormatter },
    { label: 'Velocidad orbital', param: 'elasticity', min: 0.1, max: 2, step: 0.1, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  chaosAttractor: [
    { label: 'Parámetro A', param: 'frequency', min: -2, max: 2, step: 0.1, formatter: defaultFormatter },
    { label: 'Parámetro B', param: 'amplitude', min: -2, max: 2, step: 0.1, formatter: defaultFormatter },
    { label: 'Parámetro C', param: 'elasticity', min: -2, max: 2, step: 0.1, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  plasmaBall: [
    { label: 'Intensidad núcleo', param: 'frequency', min: 0.5, max: 3, step: 0.1, formatter: defaultFormatter },
    { label: 'Número de rayos', param: 'amplitude', min: 3, max: 12, step: 1, formatter: intFormatter },
    { label: 'Turbulencia', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  blackHole: [
    { label: 'Fuerza atracción', param: 'frequency', min: 0.1, max: 2, step: 0.1, formatter: defaultFormatter },
    { label: 'Intensidad disco', param: 'amplitude', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Efecto arrastre', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  lightningStorm: [
    { label: 'Potencia rayo', param: 'frequency', min: 0.5, max: 3, step: 0.1, formatter: defaultFormatter },
    { label: 'Factor ramificación', param: 'amplitude', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Campo de carga', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  quantumField: [
    { label: 'Escala fluctuaciones', param: 'frequency', min: 0.01, max: 0.1, step: 0.01, formatter: defaultFormatter },
    { label: 'Incertidumbre', param: 'amplitude', min: 0.1, max: 2, step: 0.1, formatter: defaultFormatter },
    { label: 'Superposición', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],

  // GEOMETRIC - Patrones matemáticos y geométricos
  tangenteClasica: [
    { label: 'Velocidad rotación', param: 'frequency', min: 0, max: 2, step: 0.05, formatter: defaultFormatter },
    // amplitude usa un Select en lugar de slider (ver AnimationPanel línea 471-485)
    { label: 'Mezcla radial', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  lissajous: [
    { label: 'Frecuencia X', param: 'frequency', min: 0.5, max: 8, step: 0.1, formatter: defaultFormatter },
    { label: 'Frecuencia Y', param: 'amplitude', min: 0.5, max: 8, step: 0.1, formatter: defaultFormatter },
    { label: 'Amplitud', param: 'elasticity', min: 10, max: 180, step: 5, suffix: '°', formatter: intFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  geometricPattern: [
    { label: 'Frecuencia patrón', param: 'frequency', min: 0.5, max: 10, step: 0.1, formatter: defaultFormatter },
    { label: 'Torsión', param: 'amplitude', min: 0, max: 180, step: 5, suffix: '°', formatter: intFormatter },
    { label: 'Mezcla radial', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  harmonicOscillator: [
    { label: 'Frecuencia base', param: 'frequency', min: 0.5, max: 5, step: 0.1, formatter: defaultFormatter },
    { label: 'Desfase espacial', param: 'amplitude', min: 0, max: 2, step: 0.1, formatter: defaultFormatter },
    { label: 'Amortiguamiento', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  spirograph: [
    { label: 'Ratio de radios', param: 'frequency', min: 0.3, max: 0.9, step: 0.05, formatter: defaultFormatter },
    { label: 'Velocidad interna', param: 'amplitude', min: 0.5, max: 3, step: 0.1, formatter: defaultFormatter },
    { label: 'Velocidad externa', param: 'elasticity', min: 0.2, max: 2, step: 0.1, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  fibonacci: [
    { label: 'Tightness espiral', param: 'frequency', min: 0.1, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Velocidad rotación', param: 'amplitude', min: 0, max: 3, step: 0.1, formatter: defaultFormatter },
    { label: 'Ángulo Fibonacci', param: 'elasticity', min: 130, max: 140, step: 0.5, suffix: '°', formatter: (v) => v.toFixed(1) },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  voronoiDiagram: [
    { label: 'Número de células', param: 'frequency', min: 4, max: 20, step: 1, formatter: intFormatter },
    { label: 'Movimiento células', param: 'amplitude', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Nitidez bordes', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  mandalas: [
    { label: 'Ejes de simetría', param: 'frequency', min: 3, max: 12, step: 1, formatter: intFormatter },
    { label: 'Velocidad rotación', param: 'amplitude', min: 0, max: 3, step: 0.1, formatter: defaultFormatter },
    { label: 'Complejidad', param: 'elasticity', min: 1, max: 5, step: 0.5, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
  kaleidoscope: [
    { label: 'Número de espejos', param: 'frequency', min: 2, max: 8, step: 1, formatter: intFormatter },
    { label: 'Velocidad rotación', param: 'amplitude', min: 0, max: 3, step: 0.1, formatter: defaultFormatter },
    { label: 'Nivel de zoom', param: 'elasticity', min: 0.5, max: 3, step: 0.1, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],

  // EXPERIMENTAL
  springMesh: [
    { label: 'Rigidez resortes', param: 'frequency', min: 0.1, max: 2, step: 0.1, formatter: defaultFormatter },
    { label: 'Amortiguamiento', param: 'amplitude', min: 0.5, max: 0.95, step: 0.05, formatter: defaultFormatter },
    { label: 'Frec. perturbaciones', param: 'elasticity', min: 0.1, max: 1, step: 0.05, formatter: defaultFormatter },
    { label: 'Longitud máx.', param: 'maxLength', min: 50, max: 1920, step: 5, suffix: ' px', formatter: intFormatter },
  ],
};

/**
 * Obtiene la configuración de sliders para un tipo de animación
 * @param animationType - Tipo de animación
 * @returns Array de configuraciones de sliders, o undefined si no existe
 */
export function getSliderConfigs(animationType: AnimationType): SliderConfig[] | undefined {
  return ANIMATION_SLIDER_CONFIGS[animationType];
}

/**
 * Verifica si una animación tiene configuración de sliders
 * @param animationType - Tipo de animación
 * @returns true si la animación tiene sliders configurados
 */
export function hasSliderConfig(animationType: AnimationType): boolean {
  return animationType in ANIMATION_SLIDER_CONFIGS;
}
