/**
 * Definición de tipos para el sistema de visualización de vectores
 */

// Tipos base
export type VectorShape = 'line' | 'arrow' | 'dot' | 'triangle' | 'semicircle' | 'curve';
export type LineCap = 'butt' | 'round' | 'square'; // Definición de LineCap
// Actualizar para incluir todos los ratios de lib/constants.ts y el control
export type AspectRatio = '1:1' | '16:9' | '4:3' | '3:2' | '9:16' | '2:1' | 'free';

// Tipo para un vector individual
export interface VectorItem {
  id: string;
  baseX: number;
  baseY: number;
  currentAngle: number;
  r: number;
  c: number;
  flockId: number;
  shape: string;
}

// Tipos de animación
export const VALID_ANIMATION_TYPES = [
  'smoothWaves',
  'seaWaves',
  'perlinFlow',
  'mouseInteraction',
  'pinwheels',
  'oceanCurrents',
  'jitter',
  'centerPulse',
  'rippleEffect',
  'expandingWave',
  'cellularAutomata',
  'flocking',
  'vortex',
  'geometricPattern',
  'geometrico',
  'tangenteClasica',
  'followPath',
  'lissajous',
  'waterfall'
] as const;

export type ValidAnimationType = typeof VALID_ANIMATION_TYPES[number];
export type AnimationType = 
  | 'smoothWaves'
  | 'seaWaves'
  | 'perlinFlow'
  | 'mouseInteraction'
  | 'pinwheels'
  | 'oceanCurrents'
  | 'jitter'
  | 'centerPulse'
  | 'rippleEffect'
  | 'expandingWave'
  | 'cellularAutomata'
  | 'flocking'
  | 'vortex'
  | 'geometricPattern'
  | 'geometrico'
  | 'tangenteClasica'
  | 'followPath'
  | 'lissajous'
  | 'waterfall';

export function isValidAnimationType(value: string): value is AnimationType {
  return VALID_ANIMATION_TYPES.includes(value as ValidAnimationType);
}

/**
 * Estructura para almacenar un favorito de animación
 */
export interface AnimationFavorite {
  id: string;          // UUID para identificar cada favorito
  name: string;        // Nombre descriptivo asignado por el usuario
  timestamp: number;   // Fecha de creación/modificación
  settings: Partial<VectorSettings>; // Solo las propiedades relevantes para animación
}

// Helper para validar VectorShape
export const isValidVectorShape = (shape: unknown): shape is VectorShape => {
  return ['line', 'arrow', 'dot', 'triangle', 'semicircle', 'curve'].includes(shape as string);
};

// Tipo para el origen de la rotación del vector
export type RotationOrigin = 'start' | 'center' | 'end';

// Mapa para buscar vectores por coordenadas de rejilla
export type VectorGridMap = Map<string, number>;

// --- Interfaces Principales --- //
export interface PinwheelCenter {
  x: number;
  y: number;
  strength: number;
  speed: number;
}

export interface OceanEddy {
  x: number;
  y: number;
  strength: number;
  radius: number;
}

// Representa un único vector/línea en el SVG
export interface VectorItem {
  id: string;
  baseX: number;
  baseY: number;
  currentAngle: number;
  r: number;
  c: number;
  flockId: number;
  shape: string;
}

// Configuración base
export interface BaseVectorSettings {
  vectorLength: number;
  vectorWidth: number; // Añadido para control independiente del grosor
  vectorSpacing: number;
  gridRows: number;
  vectorColor: string;
  vectorShape: VectorShape;
  strokeLinecap: LineCap;
  animationSpeed: number;
  backgroundColor: string;
  mouseAttraction: boolean;
  aspectRatio: AspectRatio; // Corregido a tipo AspectRatio
  animationSpeedFactor: number;
  easingFactor: number;
  useAdvancedControls: boolean; // Indica si se usan controles avanzados
  vectorLineCap: LineCap;
  vectorStrokeWidth: number;
  isStrokeVariabilityActive: boolean;
  pinwheelCount: number;
  vortexInwardFactor: number;
  jitterIntensity: number;
  pulseInterval: number; // Añadido para animación 'centerPulse'
  rotationOrigin: RotationOrigin; // Añadido
  dynamicLengthEnabled: boolean; // ¿La longitud varía dinámicamente?
  dynamicLengthIntensity: number; // ¿Cuánto afecta la velocidad a la longitud?
}

// Configuración de animación
export interface AnimationVectorSettings extends BaseVectorSettings {
  animationType: AnimationType;
  currentAnimationType: AnimationType;
  seaWaveFrequency: number;
  seaWaveAmplitude: number;
  perlinNoiseScale: number;
  perlinNoiseSpeed: number;
  mouseAttractionRadius: number;
  mouseAttractionStrength: number;
  pulseDuration: number;
  
  // Parámetros para patrón geométrico
  geometricPatternSize: number;
  geometricPatternComplexity: number;
  geometricPatternRotationSpeed: number;
  
  // Parámetros para vórtice/remolino
  vortexStrength: number;
  vortexCenterX: number; // Posición X del centro del vórtice (porcentaje)
  vortexCenterY: number; // Posición Y del centro del vórtice (porcentaje)
  
  // Parámetros para seguir camino
  followPathComplexity: number;
  followPathSpeed: number;
  followPathVariation: number;
  
  // Parámetros para Lissajous
  lissajousParamA: number;
  lissajousParamB: number;
  lissajousFrequency: number;
  lissajousDelta: number; // Diferencia de fase
  
  // Parámetros para waterfall (cascada)
  waterfallTurbulence: number; // Amplitud de la oscilación
  waterfallTurbulenceSpeed: number; // Velocidad de la turbulencia
  waterfallOffsetFactor: number; // Factor de desfase para la cascada
  waterfallGravityCycle: number; // Duración del ciclo de gravedad en ms
  waterfallGravityStrength: number; // Intensidad del efecto de gravedad
  waterfallMaxStretch: number; // Estiramiento máximo de los vectores
  waterfallDriftStrength: number; // Intensidad de la deriva lateral
}

// Tipos de configuración
export interface VectorSettings extends BaseVectorSettings, AnimationVectorSettings {
  isPaused: boolean; // Añadido para controlar la pausa
}

export type PartialVectorSettings = Partial<VectorSettings>;

// Configuración de animación específica
export interface AnimationConfig {
  gridRows: number;
  gridCols: number;
  settings: VectorSettings;
}

// Propiedades del componente SVG
export interface SVGCanvasProps {
  containerRef?: React.RefObject<HTMLDivElement>;
  width?: number;
  height?: number;
  className?: string;
}
