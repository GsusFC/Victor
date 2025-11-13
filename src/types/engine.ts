/**
 * engine.ts - Tipos compartidos para el motor WebGPU
 */

export type AnimationType =
  | 'none'
  // Naturales/Fluidas
  | 'smoothWaves'
  | 'seaWaves'
  | 'breathingSoft'
  | 'flowField'
  | 'dnaHelix'
  | 'rippleEffect'
  | 'organicGrowth'
  | 'fluidDynamics'
  | 'aurora'
  | 'particleFlow'
  | 'crystallization'
  // Energéticas
  | 'electricPulse'
  | 'vortex'
  | 'directionalFlow'
  | 'storm'
  | 'solarFlare'
  | 'radiation'
  | 'magneticField'
  | 'chaosAttractor'
  | 'plasmaBall'
  | 'blackHole'
  | 'lightningStorm'
  | 'quantumField'
  | 'shockWaves'
  | 'interferenceWaves'
  // Geométricas
  | 'tangenteClasica'
  | 'lissajous'
  | 'geometricPattern'
  | 'harmonicOscillator'
  | 'spirograph'
  | 'fibonacci'
  | 'voronoiDiagram'
  | 'mandalas'
  | 'kaleidoscope'
  | 'animatedFractals'
  // Experimentales
  | 'springMesh'
  | 'gravityField'
  | 'coupledOscillators'
  | 'dynamicMaze'
  // 3D Animations
  | 'smoothWaves3D'
  | 'vortex3D'
  | 'sphericalWaves3D';

export type VectorShape = 'line' | 'triangle' | 'arc' | 'circle' | 'star' | 'hexagon' | 'arrow' | 'diamond' | 'semicircle' | 'cross';

export interface WebGPUEngineConfig {
  vectorCount: number;
  vectorLength: number;
  vectorWidth: number;
  gridRows: number;
  gridCols: number;
  vectorShape: VectorShape;
}
