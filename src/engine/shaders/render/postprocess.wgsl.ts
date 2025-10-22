/**
 * Post-Processing Shader - Efectos visuales avanzados
 * Incluye: Bloom, Chromatic Aberration, Vignette, Tone Mapping
 */

export const postProcessShader = /* wgsl */ `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

struct PostProcessUniforms {
  // Bloom
  bloomEnabled: f32,
  bloomIntensity: f32,
  bloomThreshold: f32,
  bloomRadius: f32,

  // Chromatic Aberration
  chromaticEnabled: f32,
  chromaticIntensity: f32,
  chromaticOffset: f32,

  // Vignette
  vignetteEnabled: f32,
  vignetteIntensity: f32,
  vignetteSoftness: f32,

  // Tone Mapping
  exposure: f32,
  contrast: f32,
  saturation: f32,
  brightness: f32,

  // Padding para alineación
  _padding1: f32,
}

@group(0) @binding(0) var<uniform> uniforms: PostProcessUniforms;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var inputSampler: sampler;

// Vertex shader - fullscreen quad
@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;

  // Generar fullscreen quad sin vertex buffer
  let x = f32((vertexIndex << 1u) & 2u) * 2.0 - 1.0;
  let y = f32(vertexIndex & 2u) * 2.0 - 1.0;

  output.position = vec4f(x, y, 0.0, 1.0);
  output.uv = vec2f((x + 1.0) * 0.5, (1.0 - y) * 0.5);

  return output;
}

// ============================================
// CHROMATIC ABERRATION
// ============================================

fn applyChromaticAberration(uv: vec2f, intensity: f32) -> vec3f {
  // Calcular offset desde el centro
  let center = vec2f(0.5, 0.5);
  let dir = normalize(uv - center);
  let dist = length(uv - center);

  // Offset basado en distancia al centro (más fuerte en los bordes)
  let offset = dir * dist * intensity * uniforms.chromaticOffset;

  // Sample RGB en diferentes posiciones
  let r = textureSample(inputTexture, inputSampler, uv + offset).r;
  let g = textureSample(inputTexture, inputSampler, uv).g;
  let b = textureSample(inputTexture, inputSampler, uv - offset).b;

  return vec3f(r, g, b);
}

// ============================================
// VIGNETTE
// ============================================

fn applyVignette(color: vec3f, uv: vec2f) -> vec3f {
  let center = vec2f(0.5, 0.5);
  let dist = length(uv - center);

  // Vignette suave usando smoothstep
  let vignette = smoothstep(
    uniforms.vignetteIntensity,
    uniforms.vignetteIntensity - uniforms.vignetteSoftness,
    dist
  );

  return color * vignette;
}

// ============================================
// TONE MAPPING & COLOR GRADING
// ============================================

// ACES Tone Mapping simplificado
fn acesToneMapping(color: vec3f) -> vec3f {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;

  return clamp((color * (a * color + b)) / (color * (c * color + d) + e), vec3f(0.0), vec3f(1.0));
}

// Ajustar contraste
fn adjustContrast(color: vec3f, contrast: f32) -> vec3f {
  return (color - 0.5) * contrast + 0.5;
}

// Ajustar saturación
fn adjustSaturation(color: vec3f, saturation: f32) -> vec3f {
  let luminance = dot(color, vec3f(0.299, 0.587, 0.114));
  return mix(vec3f(luminance), color, saturation);
}

// ============================================
// BLOOM (Simple threshold + blend)
// ============================================

fn extractBrightness(color: vec3f, threshold: f32) -> vec3f {
  let brightness = dot(color, vec3f(0.299, 0.587, 0.114));

  if (brightness > threshold) {
    return color * (brightness - threshold) / (1.0 - threshold);
  }

  return vec3f(0.0);
}

// ============================================
// FRAGMENT SHADER PRINCIPAL
// ============================================

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  var color: vec3f;

  // 1. Chromatic Aberration (si está habilitado)
  if (uniforms.chromaticEnabled > 0.5) {
    color = applyChromaticAberration(input.uv, uniforms.chromaticIntensity);
  } else {
    color = textureSample(inputTexture, inputSampler, input.uv).rgb;
  }

  // 2. Bloom (simple brightness extraction)
  if (uniforms.bloomEnabled > 0.5) {
    let brightColor = extractBrightness(color, uniforms.bloomThreshold);
    color = color + brightColor * uniforms.bloomIntensity;
  }

  // 3. Exposure
  color = color * uniforms.exposure;

  // 4. Tone Mapping (ACES)
  color = acesToneMapping(color);

  // 5. Brightness
  color = color * uniforms.brightness;

  // 6. Contrast
  color = adjustContrast(color, uniforms.contrast);

  // 7. Saturation
  color = adjustSaturation(color, uniforms.saturation);

  // 8. Vignette (si está habilitado)
  if (uniforms.vignetteEnabled > 0.5) {
    color = applyVignette(color, input.uv);
  }

  return vec4f(color, 1.0);
}
`;
