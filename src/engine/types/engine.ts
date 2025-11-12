/**
 * Types for WebGPU Engine
 */

export interface Vector2D {
  baseX: number;
  baseY: number;
  angle: number;
  length: number;
}

export interface Vector3D {
  baseX: number;
  baseY: number;
  baseZ: number;
  dirX: number;
  dirY: number;
  dirZ: number;
  length: number;
  _padding: number; // For alignment to 32 bytes
}

export type RenderMode = '2D' | '3D';

export interface EngineConfig {
  canvas: HTMLCanvasElement;
  initialMode?: RenderMode;
}
