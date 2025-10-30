/**
 * Bloom Combine Shader
 * Combina la imagen original con el bloom usando additive blending
 */

export const bloomCombineShader = /* wgsl */ `
struct CombineUniforms {
  bloomIntensity: f32,
  _padding: vec3f,
}

@group(0) @binding(0) var originalTexture: texture_2d<f32>;
@group(0) @binding(1) var bloomTexture: texture_2d<f32>;
@group(0) @binding(2) var texSampler: sampler;
@group(0) @binding(3) var<uniform> uniforms: CombineUniforms;

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

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  // Sample both textures
  let originalColor = textureSample(originalTexture, texSampler, input.uv).rgb;
  let bloomColor = textureSample(bloomTexture, texSampler, input.uv).rgb;

  // Additive blending
  let finalColor = originalColor + bloomColor * uniforms.bloomIntensity;

  return vec4f(finalColor, 1.0);
}
`;
