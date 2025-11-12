# Shader Chunks System

Reusable WGSL code snippets for building WebGPU compute and render shaders.

## Available Chunks

### `constants.wgsl.ts`
Mathematical constants:
- `PI`, `TWO_PI`, `HALF_PI`
- `EPSILON` (for floating point comparisons)
- `PHI` (golden ratio)

### `math.wgsl.ts`
Common mathematical functions:
- **Interpolation**: `lerp()`, `lerp_angle()`, `smoothstep_custom()`, `smootherstep()`
- **Angles**: `normalize_angle()`
- **Easing**: `ease_in_expo()`, `ease_out_expo()`, `ease_in_out_elastic()`
- **Geometry**: `rotate2d()`, `circle_sdf()`
- **Utilities**: `map_range()`, `smoothabs()`

### `noise.wgsl.ts`
Noise generation functions:
- **Basic**: `hash()`, `hash2()`
- **Perlin**: `perlin2d()`, `simplex2d()`, `value_noise()`
- **Fractals**: `fbm()`, `turbulence()`
- **Cellular**: `voronoi()`
- **Effects**: `wave_pattern()`, `domain_warp()`

### `random.wgsl.ts`
Pseudo-random number generation (PCG algorithm):
- **Core**: `pcg_hash()`, `u32_to_f32()`
- **Seeded**: `random_f32()`, `random_range()`, `random_vec2()`
- **Geometric**: `random_in_unit_circle()`, `random_direction()`
- **Noise**: `white_noise()`, `blue_noise_approx()`

### `color.wgsl.ts`
Color space conversions and manipulations:
- **Conversions**: `rgb_to_hsv()`, `hsv_to_rgb()`, `rgb_to_hsl()`, `hsl_to_rgb()`
- **Gamma**: `linear_to_srgb()`, `srgb_to_linear()`
- **Effects**: `temperature_to_rgb()`, `vibrance()`, `color_grade()`
- **Utilities**: `luminance()`

## Usage

### Method 1: Import Pre-combined Chunks

```typescript
import { commonChunks } from '@/engine/shaders/chunks';

const myShader = /* wgsl */ `
${commonChunks}

@compute @workgroup_size(64)
fn main() {
  // Your code here can use all functions from commonChunks
  let noise = perlin2d(vec2f(0.0, 0.0));
  let angle = normalize_angle(PI * 2.0);
}
`;
```

### Method 2: Import Individual Chunks

```typescript
import { constantsChunk, mathChunk, noiseChunk } from '@/engine/shaders/chunks';

const myShader = /* wgsl */ `
${constantsChunk}
${mathChunk}
${noiseChunk}

@compute @workgroup_size(64)
fn main() {
  // Use only the functions you imported
  let n = fbm(vec2f(1.0, 2.0), 4u);
}
`;
```

### Method 3: Combine Custom Chunks

```typescript
import { combineChunks, constantsChunk, randomChunk } from '@/engine/shaders/chunks';

const customChunks = combineChunks(constantsChunk, randomChunk);

const myShader = /* wgsl */ `
${customChunks}

// Your shader code
`;
```

## Pre-combined Exports

### `commonChunks`
Includes: `constants` + `math` + `noise` + `random`

Use this for most animations that need standard math and noise functions.

### `allChunks`
Includes: `constants` + `math` + `noise` + `random` + `color`

Use this when you need color manipulation functions.

## Best Practices

1. **Import only what you need**: Smaller shaders compile faster
2. **Use `commonChunks` for most cases**: It includes the most frequently used functions
3. **Keep chunks updated**: When adding common functionality, add it to the appropriate chunk
4. **Document custom functions**: If you create reusable functions, consider adding them to a chunk

## Example: Simple Animation

```typescript
import { commonChunks } from '@/engine/shaders/chunks';

export const waveAnimation = /* wgsl */ `
${commonChunks}

struct Vector {
  baseX: f32,
  baseY: f32,
  angle: f32,
  length: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read_write> vectors: array<Vector>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vec = vectors[index];

  // Use chunk functions
  let pos = vec2f(vec.baseX, vec.baseY);
  let noise = perlin2d(pos * 0.1 + uniforms.time);
  let smoothed = smootherstep(0.0, 1.0, noise);

  vec.angle = smoothed * PI;
  vectors[index] = vec;
}
`;
```

## Adding New Chunks

1. Create a new file in `src/engine/shaders/chunks/`
2. Export a constant with the chunk code
3. Add the export to `index.ts`
4. Update this README with documentation

Example:

```typescript
// my-chunk.wgsl.ts
export const myChunk = /* wgsl */ `
fn my_function(x: f32) -> f32 {
  return x * 2.0;
}
`;
```

```typescript
// index.ts
export { myChunk } from './my-chunk.wgsl';
```
