/**
 * Shader de compute base para animaciones
 * Funciones comunes y estructura básica
 */

export const baseComputeShader = /* wgsl */ `
// Estructura de uniforms (compatible con render shader)
struct Uniforms {
  aspect: f32,
  time: f32,
  vectorLength: f32,
  vectorWidth: f32,
}

// Estructura de vector
struct Vector {
  baseX: f32,
  baseY: f32,
  angle: f32,
  length: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read_write> vectors: array<Vector>;

// Constantes
const PI: f32 = 3.14159265359;
const TWO_PI: f32 = 6.28318530718;

// Funciones matemáticas comunes

fn normalize_angle(angle: f32) -> f32 {
  var a = angle;
  while (a > PI) {
    a = a - TWO_PI;
  }
  while (a < -PI) {
    a = a + TWO_PI;
  }
  return a;
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
  return a + (b - a) * t;
}

fn smoothstep_custom(edge0: f32, edge1: f32, x: f32) -> f32 {
  let t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

// Compute shader principal - Animación SmoothWaves
@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;

  var vector = vectors[index];

  // SmoothWaves: olas suaves basadas en posición y tiempo
  let frequency = 0.02;
  let amplitude = 0.3;
  let speed = 1.0;

  // Calcular ángulo basado en posición y tiempo
  let wave = sin(vector.baseX * frequency + uniforms.time * speed)
           * cos(vector.baseY * frequency + uniforms.time * speed * 0.5);

  vector.angle = wave * amplitude * PI;

  // Normalizar ángulo
  vector.angle = normalize_angle(vector.angle);

  // Escribir de vuelta
  vectors[index] = vector;
}
`;
