/**
 * 3D Vector Render Shader
 * Renders vector fields in 3D space with camera transformation
 */

export const vector3DShader = /* wgsl */ `
// Uniforms structure (extended for 3D)
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
  shapeType: f32,
  gradientMode: f32,
  gradientType: f32,
  gradientLinearX: f32,
  gradientLinearY: f32,
  gradientLinearMin: f32,
  gradientLinearMax: f32,
  gradientRadialMax: f32,
  seed: f32,
  padding1: f32,
  // 3D Camera uniforms (mat4x4 = 16 floats)
  viewProjMatrix0: vec4f,
  viewProjMatrix1: vec4f,
  viewProjMatrix2: vec4f,
  viewProjMatrix3: vec4f,
  cameraPos: vec3f,
  renderMode: f32,  // 0 = 2D, 1 = 3D
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
