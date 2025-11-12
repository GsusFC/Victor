/**
 * Noise functions for WGSL shaders
 * Includes Perlin noise, FBM, turbulence, and hash functions
 * @license MIT
 */

export const noiseChunk = /* wgsl */ `
// Hash function for pseudo-random number generation
fn hash(p: vec2f) -> f32 {
  let p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  let dp = dot(p3, vec3f(p3.y, p3.z, p3.x) + 33.333);
  return fract((p3.x + p3.y) * dp);
}

// 2D hash returning vec2
fn hash2(p: vec2f) -> vec2f {
  let p3 = fract(vec3f(p.x, p.y, p.x) * vec3f(0.1031, 0.1030, 0.0973));
  let p3x = p3 + dot(p3, vec3f(p3.y, p3.z, p3.x) + 33.33);
  return fract(vec2f(
    (p3x.x + p3x.y) * p3x.z,
    (p3x.x + p3x.z) * p3x.y
  ));
}

// Simplifed 2D Perlin noise
fn perlin2d(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);

  // Smooth interpolation (hermite)
  let u = f * f * (3.0 - 2.0 * f);

  // Hash the four corners
  let a = hash(i + vec2f(0.0, 0.0));
  let b = hash(i + vec2f(1.0, 0.0));
  let c = hash(i + vec2f(0.0, 1.0));
  let d = hash(i + vec2f(1.0, 1.0));

  // Bilinear interpolation
  return mix(
    mix(a, b, u.x),
    mix(c, d, u.x),
    u.y
  ) * 2.0 - 1.0;
}

// Fractal Brownian Motion - multiple octaves of Perlin noise
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

// Turbulence - absolute value noise
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

// Simplex-like noise (faster approximation)
fn simplex2d(p: vec2f) -> f32 {
  let K1 = 0.366025404; // (sqrt(3)-1)/2
  let K2 = 0.211324865; // (3-sqrt(3))/6

  let i = floor(p + (p.x + p.y) * K1);
  let a = p - i + (i.x + i.y) * K2;
  let o = select(vec2f(0.0, 1.0), vec2f(1.0, 0.0), a.x > a.y);
  let b = a - o + K2;
  let c = a - 1.0 + 2.0 * K2;

  let h = max(0.5 - vec3f(dot(a,a), dot(b,b), dot(c,c)), vec3f(0.0));
  let n = h * h * h * h * vec3f(
    dot(a, hash2(i) * 2.0 - 1.0),
    dot(b, hash2(i + o) * 2.0 - 1.0),
    dot(c, hash2(i + 1.0) * 2.0 - 1.0)
  );

  return dot(n, vec3f(70.0));
}

// Value noise (simpler than Perlin, blocky look)
fn value_noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);

  // Cubic interpolation for smoother results
  let u = f * f * (3.0 - 2.0 * f);

  let a = hash(i + vec2f(0.0, 0.0));
  let b = hash(i + vec2f(1.0, 0.0));
  let c = hash(i + vec2f(0.0, 1.0));
  let d = hash(i + vec2f(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Voronoi/cellular noise - returns (distance, cell_id)
fn voronoi(p: vec2f) -> vec2f {
  let i = floor(p);
  let f = fract(p);

  var min_dist = 8.0;
  var min_point = vec2f(0.0);

  for (var y = -1; y <= 1; y++) {
    for (var x = -1; x <= 1; x++) {
      let neighbor = vec2f(f32(x), f32(y));
      let point = hash2(i + neighbor);
      let diff = neighbor + point - f;
      let dist = length(diff);

      if (dist < min_dist) {
        min_dist = dist;
        min_point = point;
      }
    }
  }

  return vec2f(min_dist, hash(min_point));
}

// Wave pattern combining sin/cos
fn wave_pattern(p: vec2f, frequency: f32, amplitude: f32, time: f32) -> f32 {
  return sin(p.x * frequency + time) * cos(p.y * frequency + time) * amplitude;
}

// Domain warping - distort space using noise
fn domain_warp(p: vec2f, amount: f32) -> vec2f {
  return vec2f(
    p.x + perlin2d(p) * amount,
    p.y + perlin2d(p + vec2f(5.2, 1.3)) * amount
  );
}
`;
