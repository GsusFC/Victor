/**
 * Common mathematical functions for WGSL shaders
 * @license MIT
 */

export const mathChunk = /* wgsl */ `
// Angle normalization: wraps angle to [-PI, PI] range
fn normalize_angle(angle: f32) -> f32 {
  var a = angle;
  while (a > PI) { a = a - TWO_PI; }
  while (a < -PI) { a = a + TWO_PI; }
  return a;
}

// Linear interpolation
fn lerp(a: f32, b: f32, t: f32) -> f32 {
  return a + (b - a) * t;
}

// Angle interpolation (takes shortest path)
fn lerp_angle(current: f32, targetAngle: f32, factor: f32) -> f32 {
  let a = normalize_angle(current);
  let b = normalize_angle(targetAngle);

  var diff = b - a;
  if (diff > PI) { diff = diff - TWO_PI; }
  if (diff < -PI) { diff = diff + TWO_PI; }

  return normalize_angle(a + diff * factor);
}

// Smooth hermite interpolation
fn smoothstep_custom(edge0: f32, edge1: f32, x: f32) -> f32 {
  let t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

// Smoother step (Ken Perlin's improved version)
fn smootherstep(edge0: f32, edge1: f32, x: f32) -> f32 {
  let t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// 2D rotation
fn rotate2d(v: vec2f, angle: f32) -> vec2f {
  let c = cos(angle);
  let s = sin(angle);
  return vec2f(
    v.x * c - v.y * s,
    v.x * s + v.y * c
  );
}

// Value mapping from one range to another
fn map_range(value: f32, in_min: f32, in_max: f32, out_min: f32, out_max: f32) -> f32 {
  return out_min + (out_max - out_min) * ((value - in_min) / (in_max - in_min));
}

// Smooth absolute value (useful for avoiding discontinuities)
fn smoothabs(x: f32, k: f32) -> f32 {
  return sqrt(x * x + k);
}

// Circular distance (wraps around)
fn circular_distance(a: f32, b: f32, max_val: f32) -> f32 {
  let diff = abs(a - b);
  return min(diff, max_val - diff);
}

// Signed distance to circle
fn circle_sdf(p: vec2f, center: vec2f, radius: f32) -> f32 {
  return length(p - center) - radius;
}

// Exponential ease-in
fn ease_in_expo(t: f32) -> f32 {
  return select(pow(2.0, 10.0 * (t - 1.0)), 0.0, t == 0.0);
}

// Exponential ease-out
fn ease_out_expo(t: f32) -> f32 {
  return select(1.0 - pow(2.0, -10.0 * t), 1.0, t == 1.0);
}

// Elastic ease-in-out
fn ease_in_out_elastic(t: f32) -> f32 {
  if (t == 0.0 || t == 1.0) { return t; }

  let p = 0.3;
  let s = p / 4.0;
  let t2 = t * 2.0 - 1.0;

  if (t2 < 0.0) {
    return -0.5 * pow(2.0, 10.0 * t2) * sin((t2 - s) * TWO_PI / p);
  } else {
    return 0.5 * pow(2.0, -10.0 * t2) * sin((t2 - s) * TWO_PI / p) + 1.0;
  }
}
`;
