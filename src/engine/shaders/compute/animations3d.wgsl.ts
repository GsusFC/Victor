/**
 * 3D Animation Compute Shaders
 * Calculates vector directions in 3D space
 */

import { commonChunks } from '../chunks';

// Common structure for 3D animations
const COMMON_STRUCTS_3D = /* wgsl */ `
${commonChunks}

const MAX_GRADIENT_STOPS: u32 = 12u;

struct Uniforms {
  aspect: f32,
  time: f32,
  vectorLength: f32,
  vectorWidth: f32,
  pixelToISO: f32,
  zoom: f32,
  speed: f32,
  gradientStopCount: f32,
  param1: f32,
  param2: f32,
  param3: f32,
  param4: f32,
  mouseX: f32,
  mouseY: f32,
  mouseActive: f32,
  colorR: f32,
  colorG: f32,
  colorB: f32,
  gradientEnabled: f32,
  shapeType: f32,
  gradientMode: f32,
  gradientType: f32,
  gradientLinearX: f32,
  gradientLinearY: f32,
  gradientLinearMin: f32,
  gradientLinearMax: f32,
  gradientRadialMax: f32,
  seed: f32,
  padding1: f32,
  viewProjMatrix0: vec4f,
  viewProjMatrix1: vec4f,
  viewProjMatrix2: vec4f,
  viewProjMatrix3: vec4f,
  cameraPos: vec3f,
  renderMode: f32,
}

struct Vector3D {
  baseX: f32,
  baseY: f32,
  baseZ: f32,
  dirX: f32,
  dirY: f32,
  dirZ: f32,
  length: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read_write> vectors: array<Vector3D>;
`;

// ============================================
// SMOOTH WAVES 3D - Olas tridimensionales
// ============================================
export const smoothWaves3DShader = /* wgsl */ `
${COMMON_STRUCTS_3D}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let time = uniforms.time * uniforms.speed;
  let frequency = uniforms.param1;  // 0.1
  let amplitude = uniforms.param2;  // 1.0

  let pos = vec3f(vector.baseX, vector.baseY, vector.baseZ);

  // Wave traveling in XY plane, affecting Z direction
  let waveX = sin(time * 0.001 + pos.x * frequency);
  let waveY = sin(time * 0.001 + pos.y * frequency);
  let waveZ = cos(time * 0.001 + (pos.x + pos.y) * frequency * 0.5);

  // Direction vector
  let dir = vec3f(waveX, waveY, waveZ) * amplitude;
  let normalized = normalize(dir);

  vector.dirX = normalized.x;
  vector.dirY = normalized.y;
  vector.dirZ = normalized.z;
  vector.length = uniforms.vectorLength;

  vectors[index] = vector;
}
`;

// ============================================
// VORTEX 3D - Vórtice con componente Z
// ============================================
export const vortex3DShader = /* wgsl */ `
${COMMON_STRUCTS_3D}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let time = uniforms.time * uniforms.speed;
  let strength = uniforms.param1;  // 1.0

  let pos = vec3f(vector.baseX, vector.baseY, vector.baseZ);

  // Distance from center
  let distXY = length(vec2f(pos.x, pos.y));
  let dist3D = length(pos);

  // Tangential direction in XY plane
  let tangent = vec2f(-pos.y, pos.x) / (distXY + 0.001);

  // Add spiral component based on Z
  let spiral = sin(dist3D * 0.5 + time * 0.001) * strength;

  // Direction: tangent + upward spiral
  let dir = vec3f(
    tangent.x + pos.x * spiral * 0.1,
    tangent.y + pos.y * spiral * 0.1,
    spiral
  );

  let normalized = normalize(dir);

  vector.dirX = normalized.x;
  vector.dirY = normalized.y;
  vector.dirZ = normalized.z;
  vector.length = uniforms.vectorLength;

  vectors[index] = vector;
}
`;

// ============================================
// SPHERICAL WAVES 3D - Ondas esféricas desde centro
// ============================================
export const sphericalWaves3DShader = /* wgsl */ `
${COMMON_STRUCTS_3D}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let time = uniforms.time * uniforms.speed;
  let frequency = uniforms.param1;  // 2.0
  let amplitude = uniforms.param2;  // 1.0

  let pos = vec3f(vector.baseX, vector.baseY, vector.baseZ);

  // Distance from origin
  let dist = length(pos);

  // Radial direction
  let radial = normalize(pos);

  // Wave based on distance and time
  let wave = sin(dist * frequency - time * 0.002) * amplitude;

  // Direction: radial with wave modulation
  let dir = radial * (1.0 + wave);
  let normalized = normalize(dir);

  vector.dirX = normalized.x;
  vector.dirY = normalized.y;
  vector.dirZ = normalized.z;
  vector.length = uniforms.vectorLength * (1.0 + wave * 0.5);

  vectors[index] = vector;
}
`;

// Helper to get shader by animation name
export function get3DAnimationShader(animationName: string): string {
  switch (animationName) {
    case 'smoothWaves3D':
      return smoothWaves3DShader;
    case 'vortex3D':
      return vortex3DShader;
    case 'sphericalWaves3D':
      return sphericalWaves3DShader;
    default:
      return smoothWaves3DShader;
  }
}
