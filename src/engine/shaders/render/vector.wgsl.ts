/**
 * Shader de renderizado de vectores WebGPU
 * Sistema ISO con instanced rendering
 */

export const vectorShader = /* wgsl */ `
// Estructura de uniforms
const MAX_GRADIENT_STOPS: u32 = 12u;
const PI: f32 = 3.14159265359;

// Uniform buffer layout (shared with 3D):
// Offsets 0-31:   Basic uniforms (aspect, time, vectorLength, etc.)
// Offsets 32-47:  viewProjMatrix (16 floats, mat4x4) - Camera 3D (unused in 2D)
// Offsets 48-50:  cameraPos (3 floats, vec3f) - Camera 3D (unused in 2D)
// Offsets 51-55:  renderMode + padding (5 floats)
// Offsets 56-103: gradientStops[12] (48 floats, 12×vec4f)
struct Uniforms {
  aspect: f32,              // 0
  time: f32,                // 1
  vectorLength: f32,        // 2
  vectorWidth: f32,         // 3
  pixelToISO: f32,          // 4
  zoom: f32,                // 5
  speed: f32,               // 6
  gradientStopCount: f32,   // 7
  param1: f32,              // 8
  param2: f32,              // 9
  param3: f32,              // 10
  param4: f32,              // 11
  mouseX: f32,              // 12
  mouseY: f32,              // 13
  mouseActive: f32,         // 14
  colorR: f32,              // 15
  colorG: f32,              // 16
  colorB: f32,              // 17
  gradientEnabled: f32,     // 18
  reserved: f32,            // 19 (antes shapeType)
  gradientMode: f32,        // 20
  gradientType: f32,        // 21
  gradientLinearX: f32,     // 22
  gradientLinearY: f32,     // 23
  gradientLinearMin: f32,   // 24
  gradientLinearMax: f32,   // 25
  gradientRadialMax: f32,   // 26
  seed: f32,                // 27
  _padding1: f32,           // 28
  // Padding for vec4f alignment (29-31)
  _padding2: f32,           // 29
  _padding3: f32,           // 30
  _padding4: f32,           // 31
  // Camera 3D data (unused in 2D, but needed for offset alignment)
  viewProjMatrix0: vec4f,   // 32-35 - Camera 3D (unused)
  viewProjMatrix1: vec4f,   // 36-39 - Camera 3D (unused)
  viewProjMatrix2: vec4f,   // 40-43 - Camera 3D (unused)
  viewProjMatrix3: vec4f,   // 44-47 - Camera 3D (unused)
  cameraPos: vec3f,         // 48-50 - Camera 3D (unused)
  renderMode: f32,          // 51 (0 = 2D, 1 = 3D)
  // Padding (52-55) for next vec4f alignment
  _padding5: f32,           // 52
  _padding6: f32,           // 53
  _padding7: f32,           // 54
  _padding8: f32,           // 55
  // Gradient stops start at offset 56
  gradientStops: array<vec4f, MAX_GRADIENT_STOPS>,  // 56-103
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

  // Calcular gradientT basado en el modo
  var gradientT: f32;

  if (uniforms.gradientMode > 0.5) {
    // FIELD MODE: calcular t basado en la posición en el campo
    if (uniforms.gradientType > 0.5) {
      // Radial gradient
      let distance = length(worldPos);
      // Proteger contra división por cero
      if (uniforms.gradientRadialMax > 0.0001) {
        gradientT = distance / uniforms.gradientRadialMax;
      } else {
        gradientT = 0.5;
      }
    } else {
      // Linear gradient
      let gradientDir = vec2f(uniforms.gradientLinearX, uniforms.gradientLinearY);
      let projection = dot(worldPos, gradientDir);
      let range = uniforms.gradientLinearMax - uniforms.gradientLinearMin;
      // Proteger contra división por cero
      if (abs(range) > 0.0001) {
        gradientT = (projection - uniforms.gradientLinearMin) / range;
      } else {
        gradientT = 0.5;
      }
    }
  } else {
    // VECTOR MODE: gradientT basado en la posición X del vértice (0-1 a lo largo del vector)
    gradientT = clamp(shapeVertex.x, 0.0, 1.0);
  }

  gradientT = clamp(gradientT, 0.0, 1.0);

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
