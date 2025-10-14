/**
 * Funciones de ruido y matemáticas avanzadas para shaders
 * Incluye Perlin noise, funciones trigonométricas, etc.
 */

export const noiseShader = /* wgsl */ `
// Constantes
const PI: f32 = 3.14159265359;
const TWO_PI: f32 = 6.28318530718;

// Hash function para generar pseudo-random
fn hash(p: vec2f) -> f32 {
  let p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  let dp = dot(p3, vec3f(p3.y, p3.z, p3.x) + 33.333);
  return fract((p3.x + p3.y) * dp);
}

// Perlin noise 2D simplificado
fn perlin2d(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);

  // Smooth interpolation
  let u = f * f * (3.0 - 2.0 * f);

  // Hash de las 4 esquinas
  let a = hash(i + vec2f(0.0, 0.0));
  let b = hash(i + vec2f(1.0, 0.0));
  let c = hash(i + vec2f(0.0, 1.0));
  let d = hash(i + vec2f(1.0, 1.0));

  // Interpolación bilineal
  return mix(
    mix(a, b, u.x),
    mix(c, d, u.x),
    u.y
  ) * 2.0 - 1.0;
}

// Fractal Brownian Motion (FBM) - múltiples octavas de Perlin
fn fbm(p: vec2f, octaves: u32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pos = p;

  for (var i = 0u; i < octaves; i = i + 1u) {
    value = value + amplitude * perlin2d(pos * frequency);
    frequency = frequency * 2.0;
    amplitude = amplitude * 0.5;
  }

  return value;
}

// Función de easing suave (smooth hermite)
fn smootherstep(edge0: f32, edge1: f32, x: f32) -> f32 {
  let t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// Rotación 2D
fn rotate2d(v: vec2f, angle: f32) -> vec2f {
  let c = cos(angle);
  let s = sin(angle);
  return vec2f(
    v.x * c - v.y * s,
    v.x * s + v.y * c
  );
}

// Valor absoluto suave
fn smoothabs(x: f32, k: f32) -> f32 {
  return sqrt(x * x + k);
}

// Mapeo de rango
fn map_range(value: f32, in_min: f32, in_max: f32, out_min: f32, out_max: f32) -> f32 {
  return out_min + (out_max - out_min) * ((value - in_min) / (in_max - in_min));
}

// Distancia de un punto a un círculo
fn circle_sdf(p: vec2f, center: vec2f, radius: f32) -> f32 {
  return length(p - center) - radius;
}

// Patrón de onda sinusoidal 2D
fn wave_pattern(p: vec2f, frequency: f32, amplitude: f32, time: f32) -> f32 {
  return sin(p.x * frequency + time) * cos(p.y * frequency + time) * amplitude;
}

// Turbulencia (ruido absoluto)
fn turbulence(p: vec2f, octaves: u32) -> f32 {
  var value = 0.0;
  var amplitude = 1.0;
  var frequency = 1.0;
  var pos = p;

  for (var i = 0u; i < octaves; i = i + 1u) {
    value = value + abs(perlin2d(pos * frequency)) * amplitude;
    frequency = frequency * 2.0;
    amplitude = amplitude * 0.5;
  }

  return value;
}
`;
