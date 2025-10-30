/**
 * Separable Gaussian Blur Shader
 * Implementa blur gaussiano separable (horizontal o vertical)
 * con diferentes niveles de calidad
 */

export const bloomBlurShader = /* wgsl */ `
struct BlurUniforms {
  direction: vec2f,  // (1,0) para horizontal, (0,1) para vertical
  radius: f32,       // Radio del blur en pixels
  quality: f32,      // 5, 9, o 13 samples
}

@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var<uniform> uniforms: BlurUniforms;

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

// Pesos gaussianos precalculados
const GAUSSIAN_5: array<f32, 5> = array<f32, 5>(
  0.0545, 0.2442, 0.4026, 0.2442, 0.0545
);

const GAUSSIAN_9: array<f32, 9> = array<f32, 9>(
  0.0162, 0.0540, 0.1216, 0.1945, 0.2270, 0.1945, 0.1216, 0.0540, 0.0162
);

const GAUSSIAN_13: array<f32, 13> = array<f32, 13>(
  0.0044, 0.0175, 0.0540, 0.1295, 0.2420, 0.3521, 0.3989,
  0.3521, 0.2420, 0.1295, 0.0540, 0.0175, 0.0044
);

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let texSize = vec2f(textureDimensions(inputTexture));
  let texelSize = 1.0 / texSize;

  var result = vec3f(0.0);
  var totalWeight = 0.0;

  let quality = i32(uniforms.quality);

  // Quality 5 (fast)
  if (quality <= 5) {
    for (var i = 0; i < 5; i = i + 1) {
      let offset = (f32(i) - 2.0) * uniforms.radius;
      let sampleUV = input.uv + uniforms.direction * offset * texelSize;
      let sampleColor = textureSample(inputTexture, texSampler, sampleUV).rgb;
      let weight = GAUSSIAN_5[i];

      result = result + sampleColor * weight;
      totalWeight = totalWeight + weight;
    }
  }
  // Quality 9 (medium)
  else if (quality <= 9) {
    for (var i = 0; i < 9; i = i + 1) {
      let offset = (f32(i) - 4.0) * uniforms.radius;
      let sampleUV = input.uv + uniforms.direction * offset * texelSize;
      let sampleColor = textureSample(inputTexture, texSampler, sampleUV).rgb;
      let weight = GAUSSIAN_9[i];

      result = result + sampleColor * weight;
      totalWeight = totalWeight + weight;
    }
  }
  // Quality 13 (high)
  else {
    for (var i = 0; i < 13; i = i + 1) {
      let offset = (f32(i) - 6.0) * uniforms.radius;
      let sampleUV = input.uv + uniforms.direction * offset * texelSize;
      let sampleColor = textureSample(inputTexture, texSampler, sampleUV).rgb;
      let weight = GAUSSIAN_13[i];

      result = result + sampleColor * weight;
      totalWeight = totalWeight + weight;
    }
  }

  return vec4f(result / totalWeight, 1.0);
}
`;
