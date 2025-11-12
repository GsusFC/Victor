/**
 * 3D Animation Compute Shaders
 * Calculates vector directions in 3D space
 */

import { commonChunks } from '../chunks';

// Common structure for 3D animations
const COMMON_STRUCTS_3D = /* wgsl */ `
${commonChunks}

const MAX_GRADIENT_STOPS: u32 = 12u;

// Uniform buffer layout (shared with 2D, extended for 3D):
// Offsets 0-31:   Basic uniforms (aspect, time, vectorLength, etc.)
// Offsets 32-47:  viewProjMatrix (16 floats, mat4x4) - Camera 3D
// Offsets 48-50:  cameraPos (3 floats, vec3f) - Camera 3D
// Offsets 51-55:  renderMode + padding (5 floats)
// Offsets 56-103: gradientStops[12] (48 floats, 12×vec4f)
struct Uniforms {
  aspect: f32,              // 0
  time: f32,                // 1
  vectorLength: f32,        // 2
  vectorWidth: f32,         // 3
  pixelToISO: f32,          // 4
  zoom: f32,                // 5
  speed: f32,               // 6
  gradientStopCount: f32,   // 7
  param1: f32,              // 8
  param2: f32,              // 9
  param3: f32,              // 10
  param4: f32,              // 11
  mouseX: f32,              // 12
  mouseY: f32,              // 13
  mouseActive: f32,         // 14
  colorR: f32,              // 15
  colorG: f32,              // 16
  colorB: f32,              // 17
  gradientEnabled: f32,     // 18
  shapeType: f32,           // 19
  gradientMode: f32,        // 20
  gradientType: f32,        // 21
  gradientLinearX: f32,     // 22
  gradientLinearY: f32,     // 23
  gradientLinearMin: f32,   // 24
  gradientLinearMax: f32,   // 25
  gradientRadialMax: f32,   // 26
  seed: f32,                // 27
  padding1: f32,            // 28
  // Padding for vec4f alignment (29-31)
  viewProjMatrix0: vec4f,   // 32-35
  viewProjMatrix1: vec4f,   // 36-39
  viewProjMatrix2: vec4f,   // 40-43
  viewProjMatrix3: vec4f,   // 44-47
  cameraPos: vec3f,         // 48-50
  renderMode: f32,          // 51
  // Padding (52-55) for next vec4f alignment
  // gradientStops start at offset 56 (written by UniformManager)
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

  let time = uniforms.time * uniforms.speed * 0.001; // Scale down time
  let frequency = uniforms.param1 * 0.05;  // Reduce frequency for slower movement
  let amplitude = uniforms.param2;  // 1.0

  let pos = vec3f(vector.baseX, vector.baseY, vector.baseZ);

  // Wave traveling in XY plane, affecting Z direction
  let waveX = sin(time + pos.x * frequency);
  let waveY = sin(time + pos.y * frequency);
  let waveZ = cos(time + (pos.x + pos.y) * frequency * 0.5);

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

  let time = uniforms.time * uniforms.speed * 0.001; // Scale down time
  let strength = uniforms.param1 * 0.5;  // Reduce strength

  let pos = vec3f(vector.baseX, vector.baseY, vector.baseZ);

  // Distance from center
  let distXY = length(vec2f(pos.x, pos.y));
  let dist3D = length(pos);

  // Tangential direction in XY plane
  let tangent = vec2f(-pos.y, pos.x) / (distXY + 0.001);

  // Add spiral component based on Z
  let spiral = sin(dist3D * 0.02 + time) * strength; // Reduced frequency

  // Direction: tangent + upward spiral
  let dir = vec3f(
    tangent.x + pos.x * spiral * 0.05,
    tangent.y + pos.y * spiral * 0.05,
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

  let time = uniforms.time * uniforms.speed * 0.001; // Scale down time
  let frequency = uniforms.param1 * 0.05;  // Reduce frequency
  let amplitude = uniforms.param2;  // 1.0

  let pos = vec3f(vector.baseX, vector.baseY, vector.baseZ);

  // Distance from origin
  let dist = length(pos);

  // Radial direction
  let radial = normalize(pos + vec3f(0.001)); // Avoid zero vector

  // Wave based on distance and time
  let wave = sin(dist * frequency - time) * amplitude;

  // Direction: radial with wave modulation
  let dir = radial * (1.0 + wave * 0.3); // Reduce wave impact
  let normalized = normalize(dir);

  vector.dirX = normalized.x;
  vector.dirY = normalized.y;
  vector.dirZ = normalized.z;
  vector.length = uniforms.vectorLength * (1.0 + wave * 0.2); // Less length variation

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
