/**
 * Shader de fade para el sistema de Trails
 * Renderiza un quad semi-transparente negro sobre la textura anterior
 * para crear el efecto de decay/desvanecimiento
 */

export const fadeShader = /* wgsl */ `
struct VertexOutput {
  @builtin(position) position: vec4f,
}

struct FadeUniforms {
  decay: f32,  // Factor de decay (0.95 = 5% de fade)
}

@group(0) @binding(0) var<uniform> uniforms: FadeUniforms;

// Vertex shader - genera un fullscreen quad sin vertex buffer
@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;

  // Generar posiciones de un quad que cubre toda la pantalla
  // 0: (-1, -1), 1: (3, -1), 2: (-1, 3)
  // Este patrón cubre toda la pantalla con solo 3 vértices
  let x = f32((vertexIndex << 1u) & 2u) * 2.0 - 1.0;
  let y = f32(vertexIndex & 2u) * 2.0 - 1.0;

  output.position = vec4f(x, y, 0.0, 1.0);
  return output;
}

// Fragment shader - aplica el fade
@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  // Retornar negro con alpha basado en el decay
  // decay = 0.95 -> alpha = 0.05 (fade suave)
  // decay = 0.5 -> alpha = 0.5 (fade rápido)
  let fadeAlpha = 1.0 - uniforms.decay;
  return vec4f(0.0, 0.0, 0.0, fadeAlpha);
}
`;
