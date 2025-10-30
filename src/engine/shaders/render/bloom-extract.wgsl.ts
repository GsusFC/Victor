/**
 * Bloom Extract Bright Pass Shader
 * Extrae colores brillantes de la imagen HDR usando threshold
 */

export const bloomExtractShader = /* wgsl */ `
struct BloomExtractUniforms {
  threshold: f32,
  softKnee: f32,
  _padding: vec2f,
}

@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var<uniform> uniforms: BloomExtractUniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;

  // Fullscreen triangle
  let x = f32((vertexIndex & 1u) << 2u);
  let y = f32((vertexIndex & 2u) << 1u);

  output.position = vec4f(x - 1.0, y - 1.0, 0.0, 1.0);
  output.uv = vec2f(x * 0.5, 1.0 - y * 0.5);

  return output;
}

// Calcular luminancia perceptual
fn luminance(color: vec3f) -> f32 {
  return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

// Extract bright pass con soft threshold
fn extractBright(color: vec3f, threshold: f32, knee: f32) -> vec3f {
  let luma = luminance(color);

  // Soft threshold (smooth transition)
  let soft = luma - threshold + knee;
  let softClamped = clamp(soft, 0.0, 2.0 * knee);
  let softSquared = softClamped * softClamped / (4.0 * knee + 0.00001);

  let contribution = max(softSquared, luma - threshold);
  let weight = contribution / max(luma, 0.00001);

  return color * weight;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  // Sample HDR color
  let hdrColor = textureSample(inputTexture, texSampler, input.uv).rgb;

  // Extract bright colors above threshold
  let brightColor = extractBright(hdrColor, uniforms.threshold, uniforms.softKnee);

  return vec4f(brightColor, 1.0);
}
`;
