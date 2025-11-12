/**
 * 3D Vector Render Shader
 * Renders vector fields in 3D space with camera transformation
 */

export const vector3DShader = /* wgsl */ `
// Uniform buffer layout (shared with 2D, extended for 3D):
// Offsets 0-31:   Basic uniforms (aspect, time, vectorLength, etc.)
// Offsets 32-47:  viewProjMatrix (16 floats, mat4x4) - Camera 3D
// Offsets 48-50:  cameraPos (3 floats, vec3f) - Camera 3D
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
  shapeType: f32,           // 19
  gradientMode: f32,        // 20
  gradientType: f32,        // 21
  gradientLinearX: f32,     // 22
  gradientLinearY: f32,     // 23
  gradientLinearMin: f32,   // 24
  gradientLinearMax: f32,   // 25
  gradientRadialMax: f32,   // 26
  seed: f32,                // 27
  padding1: f32,            // 28
  // Padding for vec4f alignment (29-31)
  viewProjMatrix0: vec4f,   // 32-35 - Camera 3D
  viewProjMatrix1: vec4f,   // 36-39 - Camera 3D
  viewProjMatrix2: vec4f,   // 40-43 - Camera 3D
  viewProjMatrix3: vec4f,   // 44-47 - Camera 3D
  cameraPos: vec3f,         // 48-50 - Camera 3D
  renderMode: f32,          // 51 (0 = 2D, 1 = 3D)
  // Padding (52-55) for next vec4f alignment
  // gradientStops start at offset 56
}

// Vector 3D structure
struct Vector3D {
  baseX: f32,
  baseY: f32,
  baseZ: f32,
  dirX: f32,
  dirY: f32,
  dirZ: f32,
  length: f32,
  _padding: f32,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) normal: vec3f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> vectors: array<Vector3D>;

// Reconstruct view-projection matrix from vec4s
fn getViewProjMatrix() -> mat4x4<f32> {
  return mat4x4<f32>(
    uniforms.viewProjMatrix0,
    uniforms.viewProjMatrix1,
    uniforms.viewProjMatrix2,
    uniforms.viewProjMatrix3
  );
}

// Build transformation matrix for vector
fn buildTransformMatrix(
  position: vec3f,
  direction: vec3f,
  length: f32
) -> mat4x4<f32> {
  // Normalize direction
  let dir = normalize(direction);

  // Build orthonormal basis
  let up = select(vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0), abs(dir.y) > 0.99);
  let right = normalize(cross(up, dir));
  let realUp = cross(dir, right);

  // Build transform matrix (rotation + scale + translation)
  return mat4x4<f32>(
    vec4f(right * uniforms.vectorWidth, 0.0),
    vec4f(dir * length, 0.0),
    vec4f(realUp * uniforms.vectorWidth, 0.0),
    vec4f(position, 1.0)
  );
}

@vertex
fn vertexMain(
  @location(0) localPos: vec3f,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var output: VertexOutput;

  // Get vector data
  let vector = vectors[instanceIndex];

  // Build transformation matrix
  let worldPos = vec3f(vector.baseX, vector.baseY, vector.baseZ);
  let direction = vec3f(vector.dirX, vector.dirY, vector.dirZ);
  let transform = buildTransformMatrix(worldPos, direction, vector.length);

  // Transform local vertex to world space
  let worldVertex = transform * vec4f(localPos, 1.0);

  // Apply camera view-projection
  let viewProj = getViewProjMatrix();
  output.position = viewProj * worldVertex;

  // Calculate normal for lighting (Y-axis of transform)
  let normal = normalize((transform * vec4f(0.0, 1.0, 0.0, 0.0)).xyz);
  output.normal = normal;

  // Simple directional lighting
  let lightDir = normalize(uniforms.cameraPos - worldVertex.xyz);
  let diffuse = max(0.0, dot(normal, lightDir)) * 0.7 + 0.3;

  // Base color
  let baseColor = vec3f(uniforms.colorR, uniforms.colorG, uniforms.colorB);
  output.color = vec4f(baseColor * diffuse, 1.0);

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return input.color;
}
`;
