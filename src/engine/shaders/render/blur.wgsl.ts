/**
 * Gaussian Blur Shader - Para efectos de Bloom
 * Implementa blur separable (horizontal + vertical) para eficiencia
 */

export const blurShader = /* wgsl */ `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

struct BlurUniforms {
  direction: vec2f,  // (1, 0) para horizontal, (0, 1) para vertical
  radius: f32,       // Radio del blur
  strength: f32,     // Intensidad del blur
}

@group(0) @binding(0) var<uniform> uniforms: BlurUniforms;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var inputSampler: sampler;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;

  let x = f32((vertexIndex << 1u) & 2u) * 2.0 - 1.0;
  let y = f32(vertexIndex & 2u) * 2.0 - 1.0;

  output.position = vec4f(x, y, 0.0, 1.0);
  output.uv = vec2f((x + 1.0) * 0.5, (1.0 - y) * 0.5);

  return output;
}

// Gaussian weights para 9-tap blur
const GAUSSIAN_WEIGHTS = array<f32, 9>(
  0.0625, 0.125, 0.0625,
  0.125,  0.25,  0.125,
  0.0625, 0.125, 0.0625
);

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let texSize = vec2f(textureDimensions(inputTexture));
  let texelSize = 1.0 / texSize;

  var result = vec3f(0.0);
  var totalWeight = 0.0;

  // 9-tap Gaussian blur
  for (var i = -1; i <= 1; i = i + 1) {
    for (var j = -1; j <= 1; j = j + 1) {
      let offset = vec2f(f32(i), f32(j)) * uniforms.direction * texelSize * uniforms.radius;
      let sampleUV = input.uv + offset;

      let weight = GAUSSIAN_WEIGHTS[(i + 1) * 3 + (j + 1)];
      result = result + textureSample(inputTexture, inputSampler, sampleUV).rgb * weight;
      totalWeight = totalWeight + weight;
    }
  }

  result = result / totalWeight;

  return vec4f(result, 1.0);
}
`;
