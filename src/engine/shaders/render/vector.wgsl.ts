/**
 * Shader de renderizado de vectores WebGPU
 * Sistema ISO con instanced rendering
 */

export const vectorShader = /* wgsl */ `
// Estructura de uniforms
const MAX_GRADIENT_STOPS: u32 = 6u;
const PI: f32 = 3.14159265359;

struct Uniforms {
  aspect: f32,
  time: f32,
  vectorLength: f32,
  vectorWidth: f32,
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
  reserved: f32,  // Reserved (antes shapeType)
  gradientMode: f32,
  gradientType: f32,
  gradientLinearX: f32,
  gradientLinearY: f32,
  gradientLinearMin: f32,
  gradientLinearMax: f32,
  gradientRadialMax: f32,
  _padding: f32,  // Padding para alinear gradientStops a 16 bytes
  gradientStops: array<vec4f, MAX_GRADIENT_STOPS>,
}

// Estructura de vector
struct Vector {
  baseX: f32,
  baseY: f32,
  angle: f32,
  length: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> vectors: array<Vector>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) gradientT: f32,  // Posición en el gradiente (0 = inicio, 1 = fin)
}

fn baseColor() -> vec3f {
  return vec3f(uniforms.colorR, uniforms.colorG, uniforms.colorB);
}

fn sampleGradient(t: f32) -> vec3f {
  let clampedT = clamp(t, 0.0, 1.0);
  let count = u32(uniforms.gradientStopCount);

  // Si no hay stops, usar color base
  if (count == 0u) {
    return baseColor();
  }

  // Si solo hay un stop, usar su color
  if (count == 1u) {
    return uniforms.gradientStops[0].xyz;
  }

  // Obtener el primer stop
  let firstStop = uniforms.gradientStops[0];
  let firstColor = firstStop.xyz;
  let firstPos = clamp(firstStop.w, 0.0, 1.0);

  // Si t está antes del primer stop, usar el color del primer stop
  if (clampedT <= firstPos) {
    return firstColor;
  }

  // Buscar el segmento correcto para interpolar
  var prevColor = firstColor;
  var prevPos = firstPos;

  for (var i: u32 = 1u; i < count && i < MAX_GRADIENT_STOPS; i = i + 1u) {
    let stop = uniforms.gradientStops[i];
    let stopColor = stop.xyz;
    let stopPos = clamp(stop.w, 0.0, 1.0);

    // Si encontramos el segmento que contiene clampedT
    if (clampedT <= stopPos) {
      // Calcular el factor de interpolación local dentro de este segmento
      let segmentRange = stopPos - prevPos;

      // Prevenir división por cero si dos stops están en la misma posición
      if (segmentRange < 0.0001) {
        // Si los stops están en la misma posición, usar el color del stop actual
        return stopColor;
      }

      // Calcular t local dentro del segmento [0, 1]
      let localT = (clampedT - prevPos) / segmentRange;

      // Interpolar linealmente entre prevColor y stopColor
      return mix(prevColor, stopColor, localT);
    }

    // Avanzar al siguiente segmento
    prevColor = stopColor;
    prevPos = stopPos;
  }

  // Si llegamos aquí, t está después del último stop
  // Retornar el color del último stop
  return prevColor;
}

// Vertex shader con geometry instancing
@vertex
fn vertexMain(
  @location(0) shapeVertex: vec2f,  // Vértice de la geometría de la forma
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var output: VertexOutput;

  // Obtener vector actual (posición, ángulo, longitud)
  let vector = vectors[instanceIndex];

  // Transformación del vértice de la forma al espacio del vector
  let direction = vec2f(cos(vector.angle), sin(vector.angle));
  let perpendicular = vec2f(-sin(vector.angle), cos(vector.angle));

  // Escalar el vértice de la forma por longitud y ancho del vector
  let scaledX = shapeVertex.x * vector.length;
  let scaledY = shapeVertex.y * uniforms.vectorWidth * uniforms.pixelToISO;

  // Transformar al espacio ISO rotado
  let localPos = direction * scaledX + perpendicular * scaledY;

  // Posición final en espacio ISO
  let worldPos = vec2f(vector.baseX, vector.baseY) + localPos;

  // Calcular gradientT basado en la coordenada X de la forma (0 a 1)
  let gradientT = clamp(shapeVertex.x, 0.0, 1.0);

  // Convertir de ISO a clip space con zoom
  let clipX = (worldPos.x / uniforms.aspect) * uniforms.zoom;
  let clipY = worldPos.y * uniforms.zoom;

  output.position = vec4f(clipX, clipY, 0.0, 1.0);
  output.color = vec4f(uniforms.colorR, uniforms.colorG, uniforms.colorB, 1.0);
  output.gradientT = gradientT;

  return output;
}

// Fragment shader
@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  // Si el gradiente está activado, usar sampleGradient
  if (uniforms.gradientEnabled > 0.5 && uniforms.gradientStopCount > 0.0) {
    let color = sampleGradient(input.gradientT);
    return vec4f(color, 1.0);
  }

  // Si no, usar color base
  return vec4f(baseColor(), 1.0);
}
`;
