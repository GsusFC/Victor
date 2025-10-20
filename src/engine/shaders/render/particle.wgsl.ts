/**
 * Shader de renderizado de partículas WebGPU
 * Sistema ISO con instanced rendering - versión simplificada para partículas
 */

export const particleShader = /* wgsl */ `
// Estructura de uniforms
const MAX_GRADIENT_STOPS: u32 = 6u;
const PI: f32 = 3.14159265359;

struct Uniforms {
  aspect: f32,
  time: f32,
  vectorLength: f32,        // Reutilizado como velocityScale
  vectorWidth: f32,         // Reutilizado como particleSize
  pixelToISO: f32,
  zoom: f32,
  speed: f32,
  gradientStopCount: f32,
  param1: f32,
  param2: f32,
  param3: f32,
  param4: f32,
  mouseX: f32,
  mouseY: f32,
  mouseActive: f32,
  colorR: f32,
  colorG: f32,
  colorB: f32,
  gradientEnabled: f32,
  reserved: f32,
  gradientMode: f32,
  gradientType: f32,
  gradientLinearX: f32,
  gradientLinearY: f32,
  gradientLinearMin: f32,
  gradientLinearMax: f32,
  gradientRadialMax: f32,
  seed: f32,
  _padding1: f32,
  _padding2: f32,
  _padding3: f32,
  _padding4: f32,
  gradientStops: array<vec4f, MAX_GRADIENT_STOPS>,
}

// Estructura de partícula (misma memoria que Vector pero diferente interpretación)
struct Particle {
  baseX: f32,      // posición X
  baseY: f32,      // posición Y
  velocityX: f32,  // velocidad X (o ángulo en modo vector)
  velocityY: f32,  // velocidad Y (o longitud en modo vector)
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) gradientT: f32,
}

fn baseColor() -> vec3f {
  return vec3f(uniforms.colorR, uniforms.colorG, uniforms.colorB);
}

fn sampleGradient(t: f32) -> vec3f {
  let clampedT = clamp(t, 0.0, 1.0);
  let count = u32(uniforms.gradientStopCount);

  if (count == 0u) {
    return baseColor();
  }

  if (count == 1u) {
    return uniforms.gradientStops[0].xyz;
  }

  var prevColor = uniforms.gradientStops[0].xyz;
  var prevPos = uniforms.gradientStops[0].w;

  for (var i = 1u; i < count; i = i + 1u) {
    let stopColor = uniforms.gradientStops[i].xyz;
    let stopPos = uniforms.gradientStops[i].w;

    if (clampedT <= stopPos) {
      let segmentRange = stopPos - prevPos;
      if (segmentRange < 0.001) {
        return stopColor;
      }

      let localT = (clampedT - prevPos) / segmentRange;
      return mix(prevColor, stopColor, localT);
    }

    prevColor = stopColor;
    prevPos = stopPos;
  }

  return prevColor;
}

// Vertex shader para partículas (más simple que vectores)
@vertex
fn vertexMain(
  @location(0) shapeVertex: vec2f,  // Vértice de la forma (círculo/cuadrado)
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var output: VertexOutput;

  // Obtener partícula actual
  let particle = particles[instanceIndex];

  // Escalar el vértice de la forma por el tamaño de partícula
  let particleSize = uniforms.vectorWidth * uniforms.pixelToISO;
  let localPos = shapeVertex * particleSize;

  // Posición final en espacio ISO (sin rotación, solo traslación)
  let finalPos = vec2f(particle.baseX, particle.baseY) + localPos;

  // Transformar a clip space con zoom
  let clipX = (finalPos.x / uniforms.aspect) * uniforms.zoom;
  let clipY = finalPos.y * uniforms.zoom;
  output.position = vec4f(clipX, clipY, 0.0, 1.0);

  // Calcular color con gradiente si está habilitado
  var gradientT = 0.0;

  if (uniforms.gradientEnabled > 0.5) {
    let mode = u32(uniforms.gradientMode);

    // Mode 0 = field, 1 = vector
    if (mode == 0u) {
      // Field mode: basado en posición de la partícula
      let gradType = u32(uniforms.gradientType);

      if (gradType == 0u) {
        // Linear gradient
        let dir = normalize(vec2f(uniforms.gradientLinearX, uniforms.gradientLinearY));
        let projection = dot(vec2f(particle.baseX, particle.baseY), dir);
        gradientT = (projection - uniforms.gradientLinearMin) / (uniforms.gradientLinearMax - uniforms.gradientLinearMin);
      } else {
        // Radial gradient
        let dist = length(vec2f(particle.baseX, particle.baseY));
        gradientT = dist / uniforms.gradientRadialMax;
      }
    } else {
      // Vector mode: basado en velocidad de la partícula
      let speed = length(vec2f(particle.velocityX, particle.velocityY));
      gradientT = speed / (uniforms.vectorLength + 0.0001);  // Normalizar por velocidad máxima
    }
  }

  let sampledColor = select(baseColor(), sampleGradient(gradientT), uniforms.gradientEnabled > 0.5);
  output.color = vec4f(sampledColor, 1.0);
  output.gradientT = gradientT;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return input.color;
}
`;
