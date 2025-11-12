/**
 * Pseudo-random number generation for WGSL shaders
 * PCG (Permuted Congruential Generator) implementation
 * @license MIT
 */

export const randomChunk = /* wgsl */ `
// PCG Hash: hash a u32 to another u32
fn pcg_hash(input: u32) -> u32 {
  var state = input * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

// Convert u32 to f32 in range [0, 1)
fn u32_to_f32(x: u32) -> f32 {
  return f32(x) / 4294967296.0; // 2^32
}

// Generate pseudo-random number in [0, 1) based on seed and position
fn random_f32(seed: u32, x: u32, y: u32) -> f32 {
  let hash_input = seed + x * 374761393u + y * 668265263u;
  return u32_to_f32(pcg_hash(hash_input));
}

// Random in range [min, max)
fn random_range(seed: u32, x: u32, y: u32, min_val: f32, max_val: f32) -> f32 {
  let r = random_f32(seed, x, y);
  return min_val + r * (max_val - min_val);
}

// Random vec2 in unit square [0, 1) x [0, 1)
fn random_vec2(seed: u32, x: u32, y: u32) -> vec2f {
  return vec2f(
    random_f32(seed, x, y),
    random_f32(seed + 1u, x, y)
  );
}

// Random vec2 in unit circle
fn random_in_unit_circle(seed: u32, x: u32, y: u32) -> vec2f {
  let angle = random_f32(seed, x, y) * TWO_PI;
  let r = sqrt(random_f32(seed + 1u, x, y));
  return vec2f(cos(angle) * r, sin(angle) * r);
}

// Random direction (normalized vec2)
fn random_direction(seed: u32, x: u32, y: u32) -> vec2f {
  let angle = random_f32(seed, x, y) * TWO_PI;
  return vec2f(cos(angle), sin(angle));
}

// White noise (simple hash-based)
fn white_noise(p: vec2f, seed: f32) -> f32 {
  let n = sin(dot(p, vec2f(12.9898, 78.233)) + seed) * 43758.5453;
  return fract(n);
}

// Blue noise approximation (uses spatial coherence)
fn blue_noise_approx(p: vec2f, seed: f32) -> f32 {
  // Simple blue noise approximation using triangular distribution
  let n1 = white_noise(p, seed);
  let n2 = white_noise(p + vec2f(0.1), seed + 1.0);
  return (n1 + n2) * 0.5;
}
`;
