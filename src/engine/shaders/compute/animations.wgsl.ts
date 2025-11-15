/**
 * Shaders de compute para diferentes animaciones
 * Sistema modular de animaciones WebGPU
 * Refactorizado para usar sistema de shader chunks
 */

import { commonChunks } from '../chunks';

// Helper: Generar shader con workgroup size dinámico
export function createShaderWithWorkgroupSize(shaderCode: string, workgroupSize: number): string {
  return shaderCode.replace(/@workgroup_size\(64\)/g, `@workgroup_size(${workgroupSize})`);
}

// Estructura común - usa chunks para funciones matemáticas
const COMMON_STRUCTS = /* wgsl */ `
${commonChunks}

const MAX_GRADIENT_STOPS: u32 = 12u;

// Uniform buffer layout (shared with 2D render and 3D):
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
  param1: f32,              // 8  (frequency, elasticity, etc)
  param2: f32,              // 9  (amplitude, maxLength, etc)
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
  padding2: f32,            // 29
  padding3: f32,            // 30
  padding4: f32,            // 31
  // Camera 3D data (unused in 2D, but needed for offset alignment)
  viewProjMatrix0: vec4f,   // 32-35 - Camera 3D (unused)
  viewProjMatrix1: vec4f,   // 36-39 - Camera 3D (unused)
  viewProjMatrix2: vec4f,   // 40-43 - Camera 3D (unused)
  viewProjMatrix3: vec4f,   // 44-47 - Camera 3D (unused)
  cameraPos: vec3f,         // 48-50 - Camera 3D (unused)
  renderMode: f32,          // 51 (0 = 2D, 1 = 3D)
  // Padding (52-55) for next vec4f alignment
  padding5: f32,            // 52
  padding6: f32,            // 53
  padding7: f32,            // 54
  padding8: f32,            // 55
  // Gradient stops start at offset 56
  gradientStops: array<vec4f, MAX_GRADIENT_STOPS>,  // 56-103
}

struct Vector {
  baseX: f32,
  baseY: f32,
  angle: f32,
  length: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read_write> vectors: array<Vector>;

// Helper functions using chunk functions
fn rand(seed: f32, x: f32, y: f32) -> f32 {
  let s = u32(seed);
  let ix = u32(x * 1000.0);
  let iy = u32(y * 1000.0);
  return random_f32(s, ix, iy);
}

fn rand_time(seed: f32, x: f32, y: f32, t: f32) -> f32 {
  let s = u32(seed);
  let ix = u32((x + 0.123456) * 1234.567);
  let iy = u32((y + 0.789012) * 2345.678);
  let it = u32(t * 100.0);
  return random_f32(s ^ it, ix, iy);
}

fn rand_range(seed: f32, x: f32, y: f32, min: f32, max: f32) -> f32 {
  return random_range(u32(seed), u32(x * 1000.0), u32(y * 1000.0), min, max);
}
`;

// ============================================
// NONE - Mantener ángulos actuales
// ============================================
export const noneShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  vector.length = uniforms.vectorLength * uniforms.pixelToISO;
  vectors[index] = vector;
}
`;

// ============================================
// NATURALES/FLUIDAS
// ============================================

// SMOOTH WAVES - Olas suaves
export const smoothWavesShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let frequency = uniforms.param1;      // 0.02
  let amplitude = uniforms.param2;      // 20
  let elasticity = uniforms.param3;     // 0.5
  let maxLengthPx = uniforms.param4;    // Longitud máxima en píxeles (>= vectorLength)

  // Convertir tiempo a milisegundos (como en fórmulas originales)
  let time = uniforms.time * uniforms.speed * 1000.0;

  // Escalar coordenadas ISO a píxeles reales usando el alto del canvas
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Fórmula original: sin(timestamp * 0.005 + baseX * 0.01) * 45 grados
  let waveFreq = frequency;  // frequency ya viene como 0.02 por defecto
  let targetAngle = sin(time * waveFreq * 0.001 + normX * 0.01) * (amplitude * PI / 180.0);

  // Aplicar suavizado temporal (lerp) - factor basado en elasticidad
  let smoothingFactor = 0.15;  // Mayor valor = más suave pero más lento
  vector.angle = lerp_angle(vector.angle, targetAngle, smoothingFactor);

  // Modular longitud con elasticidad
  let wave = sin(normX * frequency * 0.5 + time * waveFreq * 0.001);
  let lengthMod = 1.0 + wave * elasticity * 0.5;
  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// SEA WAVES - Olas de mar (más caóticas)
export const seaWavesShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let frequency = uniforms.param1;
  let amplitude = uniforms.param2;
  let elasticity = uniforms.param3;
  let maxLengthPx = uniforms.param4;

  // Convertir tiempo a milisegundos
  let time = uniforms.time * uniforms.speed * 1000.0;

  // Escalar coordenadas ISO a píxeles reales
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Fórmula original: baseAngle = sin(timestamp * 0.001 + baseX * 0.01) * 45
  //                   ripple = sin(timestamp * 0.002 + baseY * 0.01) * 15
  let baseAngle = sin(time * 0.001 + normX * 0.01) * (45.0 * PI / 180.0);
  let ripple = sin(time * 0.002 + normY * 0.01) * (15.0 * PI / 180.0);

  // Ola adicional para más caos
  let wave3 = cos((normX + normY) * frequency * 0.007 + time * 0.0008) * (amplitude * 0.5 * PI / 180.0);

  let targetAngle = baseAngle + ripple + wave3;

  // Aplicar suavizado temporal
  let smoothingFactor = 0.15;
  vector.angle = lerp_angle(vector.angle, targetAngle, smoothingFactor);

  // Longitud variable más dramática
  let combined = sin(normX * frequency * 0.01 + time * 0.001);
  let lengthMod = 1.0 + combined * elasticity;
  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// BREATHING SOFT - Respiración suave helicoidal (renombrado de helicalCurl)
export const breathingSoftShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let swirlFreq = max(uniforms.param1, 0.05);
  let pitchRad = clamp(uniforms.param2, 0.0, 360.0) * PI / 180.0;
  let axialMix = clamp(uniforms.param3, 0.0, 1.0);
  let maxLengthPx = uniforms.param4;

  let base = vec2f(vector.baseX, vector.baseY);
  let radius = length(base);
  let safeRadius = max(radius, 0.0002);

  var radialDir = base / safeRadius;
  var tangentialDir = vec2f(-base.y, base.x) / safeRadius;

  let time = uniforms.time * uniforms.speed * swirlFreq;

  if (radius < 0.0002) {
    let phase = time;
    radialDir = vec2f(cos(phase), sin(phase));
    tangentialDir = vec2f(-radialDir.y, radialDir.x);
  }

  let helixPhase = time + radius * 2.4;
  let axialPhase = time * 0.8 + radius * 1.6;

  let swirlGain = (0.85 + axialMix * 0.55) * (1.0 + sin(helixPhase) * pitchRad * 0.35);
  let liftGain = (1.0 - axialMix) * pitchRad * 0.45 * cos(axialPhase);

  var direction = tangentialDir * swirlGain + radialDir * liftGain;
  let dirLen = length(direction);
  if (dirLen < 0.0001) {
    direction = tangentialDir;
  } else {
    direction = direction / dirLen;
  }

  vector.angle = normalize_angle(atan2(direction.y, direction.x));

  let pulse = 1.0 + sin(helixPhase) * 0.32 + abs(cos(axialPhase)) * 0.22 * (1.0 - axialMix);
  let stretch = 1.0 + pitchRad * 0.12;
  let desiredLength = uniforms.vectorLength * uniforms.pixelToISO * pulse * stretch;
  let maxLengthISO = maxLengthPx * uniforms.pixelToISO;
  vector.length = min(desiredLength, maxLengthISO);

  vectors[index] = vector;
}
`;

// ============================================
// ENERGÉTICAS
// ============================================

// ELECTRIC PULSE - Pulso eléctrico mejorado (antes centerPulse)
export const electricPulseShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let frequency = uniforms.param1;   // Velocidad de propagación del pulso
  let intensity = uniforms.param2;   // Intensidad de la perturbación
  let elasticity = uniforms.param3;  // Suavidad del pulso
  let maxLengthPx = uniforms.param4;

  // Convertir tiempo a milisegundos
  let time = uniforms.time * uniforms.speed * 1000.0;

  // Escalar coordenadas ISO a píxeles reales para distancia correcta
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Distancia al centro en coordenadas escaladas
  let dist = sqrt(normX * normX + normY * normY);

  // Ángulo radial desde el centro (apuntando hacia afuera)
  let radialAngle = atan2(vector.baseY, vector.baseX);

  // MEJORA: Pulsos más dramáticos y orgánicos
  // Múltiples ondas superpuestas para efecto más eléctrico
  let waveSpeed = 0.003;
  let wave1 = sin(time * waveSpeed - dist * 0.08);
  let wave2 = sin(time * waveSpeed * 1.7 - dist * 0.12) * 0.6;
  let wave3 = sin(time * waveSpeed * 2.3 - dist * 0.15) * 0.3;

  // Pulso combinado con más variación
  let pulse = wave1 + wave2 + wave3;

  // Ángulo tangencial (perpendicular al radial)
  let tangentialAngle = radialAngle + PI / 2.0;

  // Influencia no lineal del pulso para efectos más dramáticos
  let pulseInfluence = pulse * pulse * sign(pulse) * (intensity * PI / 180.0);

  vector.angle = tangentialAngle + pulseInfluence;
  vector.angle = normalize_angle(vector.angle);

  // Longitud más dramática con variación espacial
  let lengthPulse = abs(pulse) * elasticity;
  let lengthMod = 1.0 + lengthPulse * (1.0 + sin(dist * 0.2));
  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// VORTEX - Remolino dinámico centrado
export const vortexShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let strength = uniforms.param1;
  let inward = clamp(uniforms.param2, 0.0, 1.0);
  let falloff = max(uniforms.param3, 0.01);
  let maxLengthPx = uniforms.param4;

  let dx = vector.baseX;
  let dy = vector.baseY;
  let radius = sqrt(dx * dx + dy * dy);

  let angleToCenter = atan2(dy, dx);
  let tangentialAngle = angleToCenter + PI / 2.0;
  let time = uniforms.time * uniforms.speed;
  let swirl = tangentialAngle + strength * time;

  let falloffFactor = exp(-falloff * radius * radius);
  let blend = clamp(falloffFactor + (1.0 - inward) * 0.5, 0.0, 1.0);

  let combined = mix(angleToCenter, swirl, blend);
  vector.angle = normalize_angle(combined);

  let lengthMod = 1.0 + falloffFactor * 0.6;
  vector.length = min(uniforms.vectorLength * uniforms.pixelToISO * lengthMod, maxLengthPx * uniforms.pixelToISO);

  vectors[index] = vector;
}
`;

// DIRECTIONAL FLOW - Flujo direccional continuo
export const directionalFlowShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let baseAngleDeg = uniforms.param1;
  let turbulenceDeg = uniforms.param2;
  let turbulenceScale = uniforms.param3;
  let maxLengthPx = uniforms.param4;

  let baseAngle = baseAngleDeg * PI / 180.0;
  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor * 0.01;
  let normY = vector.baseY * scaleFactor * 0.01;

  let noise = sin(normX + time * 0.4) + cos(normY * 0.8 + time * 0.35);
  let turbulence = (turbulenceDeg * PI / 180.0) * turbulenceScale * 0.5 * noise;

  vector.angle = normalize_angle(baseAngle + turbulence);
  vector.length = min(uniforms.vectorLength * uniforms.pixelToISO, maxLengthPx * uniforms.pixelToISO);

  vectors[index] = vector;
}
`;

// ============================================
// GEOMÉTRICAS
// ============================================

// TANGENTE CLÁSICA - Rotación tangencial alrededor del centro
export const tangenteClasicaShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let rotationSpeed = uniforms.param1;
  let directionRaw = uniforms.param2;
  let radialBlend = clamp(uniforms.param3, 0.0, 1.0);
  let maxLengthPx = uniforms.param4;

  let direction = select(-1.0, 1.0, directionRaw >= 0.0);

  let angleToCenter = atan2(vector.baseY, vector.baseX);
  let tangentialAngle = angleToCenter + direction * (PI / 2.0);
  let rotationOffset = uniforms.time * uniforms.speed * rotationSpeed;

  let baseAngle = mix(angleToCenter, tangentialAngle, radialBlend);
  vector.angle = normalize_angle(baseAngle + rotationOffset);

  let radius = sqrt(vector.baseX * vector.baseX + vector.baseY * vector.baseY);
  let lengthMod = clamp(1.0 + radius * 0.5, 0.5, 3.0);
  vector.length = min(uniforms.vectorLength * uniforms.pixelToISO * lengthMod, maxLengthPx * uniforms.pixelToISO);

  vectors[index] = vector;
}
`;

// LISSAJOUS - Patrones armónicos en cuadrícula
export const lissajousShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let xFreq = max(uniforms.param1, 0.1);
  let yFreq = max(uniforms.param2, 0.1);
  let amplitudeDeg = uniforms.param3;
  let maxLengthPx = uniforms.param4;

  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor * 0.01;
  let normY = vector.baseY * scaleFactor * 0.01;
  let time = uniforms.time * uniforms.speed;

  let pattern = sin(normX * xFreq + time) + cos(normY * yFreq + time * 1.3);
  let angle = pattern * amplitudeDeg * PI / 180.0;

  vector.angle = normalize_angle(angle);
  vector.length = min(uniforms.vectorLength * uniforms.pixelToISO, maxLengthPx * uniforms.pixelToISO);

  vectors[index] = vector;
}
`;

// GEOMETRIC PATTERN - Patrones geométricos iterativos
export const geometricPatternShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let patternFreq = uniforms.param1;
  let twistDeg = uniforms.param2;
  let radialMix = clamp(uniforms.param3, 0.0, 1.0);
  let maxLengthPx = uniforms.param4;

  let radius = sqrt(vector.baseX * vector.baseX + vector.baseY * vector.baseY);
  let angle = atan2(vector.baseY, vector.baseX);

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor * 0.02;
  let normY = vector.baseY * scaleFactor * 0.02;

  let gridComponent = sin(normX * patternFreq + time * 0.8) + cos(normY * patternFreq * 1.2 - time * 0.6);
  let twist = (twistDeg * PI / 180.0) * radius;
  let radialComponent = angle + twist + sin(radius * patternFreq + time * 0.5) * 0.35;

  let mixed = mix(gridComponent * PI * 0.3, radialComponent, radialMix);
  vector.angle = normalize_angle(mixed);

  let lengthMod = 1.0 + abs(gridComponent) * 0.45 + abs(sin(time + radius * patternFreq)) * 0.25;
  vector.length = min(uniforms.vectorLength * uniforms.pixelToISO * lengthMod, maxLengthPx * uniforms.pixelToISO);

  vectors[index] = vector;
}
`;

// ============================================
// NUEVAS ANIMACIONES ENERGÉTICAS
// ============================================

// STORM - Tormenta caótica con estructura (AHORA CON SEED!)
export const stormShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let chaos = clamp(uniforms.param1, 0.1, 3.0);        // Intensidad del caos
  let vorticity = clamp(uniforms.param2, 0.0, 2.0);    // Fuerza de remolino
  let pulseSpeed = max(uniforms.param3, 0.1);          // Velocidad de pulsos
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Distancia y ángulo al centro
  let radius = sqrt(normX * normX + normY * normY);
  let angleToCenter = atan2(normY, normX);
  let tangentialAngle = angleToCenter + PI / 2.0;

  // 🎲 Múltiples capas de ruido turbulento CON SEED
  let noise1 = rand_time(uniforms.seed, normX * 0.02, normY * 0.02, time * 0.3) * 2.0 - 1.0;
  let noise2 = rand_time(uniforms.seed + 1.0, normX * 0.05, normY * 0.05, time * 0.4) * 2.0 - 1.0;
  let noise3 = rand_time(uniforms.seed + 2.0, normX * 0.08, normY * 0.08, time * 0.6) * 2.0 - 1.0;

  // Ondas de choque circulares
  let shockwave1 = sin(radius * 0.03 - time * pulseSpeed * 2.0) * 0.5;
  let shockwave2 = sin(radius * 0.05 - time * pulseSpeed * 1.3) * 0.3;

  // Componente de vórtice
  let vortexComponent = tangentialAngle * vorticity + sin(time * 0.8 + radius * 0.1) * vorticity * 0.5;

  // Componente radial caótico (expansion/contracción)
  let radialChaos = (shockwave1 + shockwave2) * chaos * PI * 0.3;

  // Turbulencia combinada
  let turbulence = (noise1 + noise2 * 0.6 + noise3 * 0.3) * chaos * PI * 0.4;

  // Ángulo final: mezcla de vórtice, ondas radiales y caos turbulento
  let finalAngle = vortexComponent + radialChaos + turbulence;
  vector.angle = normalize_angle(finalAngle);

  // Longitud altamente variable y violenta
  let lengthNoise = abs(noise1) + abs(noise2) * 0.5;
  let lengthPulse = abs(shockwave1 + shockwave2);
  let lengthMod = 1.0 + (lengthNoise + lengthPulse) * chaos * 0.4;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// SOLAR FLARE - Explosión solar con eyecciones
export const solarFlareShader = /* wgsl */ `
${COMMON_STRUCTS}

fn pseudo_noise(v: vec2f) -> f32 {
  return fract(sin(dot(v, vec2f(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0;
}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let flareIntensity = clamp(uniforms.param1, 0.5, 3.0);  // Intensidad de eyecciones
  let rotationSpeed = uniforms.param2;                     // Velocidad de rotación solar
  let ejectionAngle = uniforms.param3;                     // Ángulo de apertura (grados)
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  let radius = sqrt(normX * normX + normY * normY);
  let angleToCenter = atan2(normY, normX);

  // Rotación de la superficie solar
  let surfaceRotation = time * rotationSpeed * 0.5;

  // Pulsos de eyección que viajan hacia afuera
  let ejectionWave1 = sin(time * 1.5 - radius * 0.08);
  let ejectionWave2 = sin(time * 2.3 - radius * 0.12) * 0.7;
  let ejectionWave3 = sin(time * 1.1 - radius * 0.06) * 0.5;

  let combinedEjection = ejectionWave1 + ejectionWave2 + ejectionWave3;

  // Filamentos magnéticos (ruido angular)
  let magneticNoise = pseudo_noise(vec2f(
    angleToCenter * 3.0 + time * 0.3,
    radius * 0.1 + time * 0.2
  ));

  // Dirección radial base (hacia afuera desde el centro)
  let radialAngle = angleToCenter;

  // Perturbación angular por campos magnéticos
  let magneticPerturbation = magneticNoise * (ejectionAngle * PI / 180.0) * flareIntensity;

  // Curvatura por rotación solar (efecto Parker spiral)
  let spiralCurvature = (radius * 0.02) * rotationSpeed * sign(ejectionWave1);

  // Solo eyectar cuando hay pulso positivo fuerte
  let ejectionStrength = max(combinedEjection, 0.0);
  let ejectionFactor = ejectionStrength * ejectionStrength;

  // Dirección final: principalmente radial con perturbaciones
  let finalAngle = radialAngle + magneticPerturbation + spiralCurvature + surfaceRotation;

  // Suavizar transición entre estados
  let targetAngle = finalAngle;
  vector.angle = lerp_angle(vector.angle, targetAngle, 0.2);

  // Longitud basada en intensidad de eyección
  let baseLengthMod = 1.0 + ejectionFactor * flareIntensity * 0.8;

  // Variación por filamentos magnéticos
  let magneticVariation = 1.0 + abs(magneticNoise) * 0.3;

  let finalLengthMod = baseLengthMod * magneticVariation;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * finalLengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// RADIATION - Pulsos de radiación desde múltiples fuentes
export const radiationShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let waveSpeed = max(uniforms.param1, 0.1);
  let numSources = clamp(uniforms.param2, 1.0, 8.0);
  let interference = clamp(uniforms.param3, 0.0, 1.0);
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  var totalWaveX: f32 = 0.0;
  var totalWaveY: f32 = 0.0;
  var totalIntensity: f32 = 0.0;

  let sources = i32(numSources);
  for (var i = 0; i < sources; i = i + 1) {
    let angle = (f32(i) / numSources) * TWO_PI + time * 0.3;
    let orbitRadius = 200.0;

    let sourceX = cos(angle) * orbitRadius;
    let sourceY = sin(angle) * orbitRadius;

    let dx = normX - sourceX;
    let dy = normY - sourceY;
    let dist = sqrt(dx * dx + dy * dy);

    let wave = sin(dist * 0.05 - time * waveSpeed * 2.0);
    let attenuation = 1.0 / (1.0 + dist * 0.005);
    let intensity = wave * attenuation;
    totalIntensity = totalIntensity + abs(intensity);

    let radialX = dx / max(dist, 0.001);
    let radialY = dy / max(dist, 0.001);

    totalWaveX = totalWaveX + radialX * intensity;
    totalWaveY = totalWaveY + radialY * intensity;
  }

  let magnitude = sqrt(totalWaveX * totalWaveX + totalWaveY * totalWaveY);

  if (magnitude > 0.001) {
    let dirX = totalWaveX / magnitude;
    let dirY = totalWaveY / magnitude;

    let resultAngle = atan2(dirY, dirX);

    let interferenceNoise = sin(normX * 0.03 + time) * cos(normY * 0.03 - time * 0.7);
    let perturbation = interferenceNoise * interference * PI * 0.3;

    vector.angle = normalize_angle(resultAngle + perturbation);
  } else {
    vector.angle = vector.angle;
  }

  let avgIntensity = totalIntensity / numSources;
  let lengthMod = 1.0 + avgIntensity * 0.8;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// ============================================
// DNA HELIX - Nueva animación geométrica
// ============================================

export const dnaHelixShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let rotationSpeed = clamp(uniforms.param1, 0.1, 3.0);     // Velocidad de rotación de hélice
  let helixRadius = clamp(uniforms.param2, 0.1, 0.8);       // Radio de cada hélice (en ISO coords)
  let pitchAngle = clamp(uniforms.param3, 0.0, 90.0);       // Ángulo de inclinación (grados)
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed * rotationSpeed;

  // Normalizar posición Y para usarlo como parámetro de la hélice
  let yParam = vector.baseY;  // En ISO, Y va de -1 a 1
  
  // Parámetro de progreso a lo largo del eje de la hélice
  let helixProgress = (yParam + 1.0) / 2.0;  // Normalizar a [0, 1]

  // Dos hélices girando juntas (separadas 180 grados)
  let helix1_phase = time + helixProgress * 10.0;
  let helix2_phase = time + PI + helixProgress * 10.0;

  // Posición en la hélice 1
  let helix1_angle = helix1_phase;
  let helix1_x = cos(helix1_angle) * helixRadius;
  let helix1_y = helixProgress * 2.0 - 1.0;

  // Posición en la hélice 2
  let helix2_angle = helix2_phase;
  let helix2_x = cos(helix2_angle) * helixRadius;
  let helix2_y = helixProgress * 2.0 - 1.0;

  // Determinar cuál hélice es más cercana
  let dist1 = abs(vector.baseX - helix1_x);
  let dist2 = abs(vector.baseX - helix2_x);

  // Usar la hélice más cercana
  let isHelix1 = dist1 < dist2;
  let targetX = select(helix2_x, helix1_x, isHelix1);
  let targetAngle_temp = select(helix2_angle, helix1_angle, isHelix1);

  // Ángulo de inclinación (pitch) - cómo de "apretada" es la espiral
  let pitchRad = pitchAngle * PI / 180.0;
  
  // Dirección del vector: apunta tangencialmente a la hélice
  let tangentialDirection = -sin(targetAngle_temp);  // Perpendicular a la hélice
  let axialDirection = pitchRad;  // Componente a lo largo del eje

  // Combinar direcciones
  let targetAngle = atan2(sin(axialDirection), cos(axialDirection) * tangentialDirection);

  // Suavizar transición
  vector.angle = lerp_angle(vector.angle, targetAngle, 0.1);

  // Longitud variable: más larga cerca del eje central, más corta en los extremos
  let distanceFromAxis = abs(vector.baseX);
  let lengthMod = 1.0 + (1.0 - distanceFromAxis) * 0.5;

  // Pulsación basada en progresión a lo largo de la hélice
  let pulse = 1.0 + sin(helixProgress * TWO_PI) * 0.3;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod * pulse,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;


// FLOW FIELD - Campo de flujo con ruido Perlin
export const flowFieldShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let noiseScale = clamp(uniforms.param1, 0.01, 0.1);
  let flowIntensity = clamp(uniforms.param2, 0.5, 2.0);
  let evolution = clamp(uniforms.param3, 0.1, 1.0);
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed * evolution;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Ruido Perlin simple
  let baseAngle = (rand(uniforms.seed, normX * noiseScale, normY * noiseScale) - 0.5) * PI;
  let driftAngle = sin(time * 0.3) * PI * 0.3;
  let targetAngle = baseAngle + driftAngle;

  vector.angle = lerp_angle(vector.angle, targetAngle, 0.12);

  let lengthMod = 1.0 + abs(rand(uniforms.seed + 1.0, normX * noiseScale, normY * noiseScale) - 0.5) * 0.4;
  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// HARMONIC OSCILLATOR - Oscilador armónico 2D
export const harmonicOscillatorShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let baseFreq = clamp(uniforms.param1, 0.5, 5.0);
  let spatialPhase = clamp(uniforms.param2, 0.0, 2.0);
  let damping = clamp(uniforms.param3, 0.0, 1.0);
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  let radius = sqrt(normX * normX + normY * normY);
  let phaseX = normX * 0.01 * spatialPhase;
  let phaseY = normY * 0.01 * spatialPhase;

  let oscX = sin(time * baseFreq + phaseX) * (1.0 - damping * radius * 0.01);
  let oscY = cos(time * baseFreq * 1.3 + phaseY) * (1.0 - damping * radius * 0.01);

  let targetAngle = atan2(oscY, oscX);
  vector.angle = lerp_angle(vector.angle, targetAngle, 0.15);

  let amplitude = sqrt(oscX * oscX + oscY * oscY);
  let lengthMod = 0.7 + amplitude * 0.8;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// SPIROGRAPH - Patrones de espirógrafo (epitrocoides)
export const spirographShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let radiusRatio = clamp(uniforms.param1, 0.3, 0.9);
  let innerSpeed = clamp(uniforms.param2, 0.5, 3.0);
  let outerSpeed = clamp(uniforms.param3, 0.2, 2.0);
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  let radius = sqrt(normX * normX + normY * normY);
  let angleToCenter = atan2(normY, normX);

  let theta1 = time * outerSpeed + angleToCenter;
  let theta2 = time * innerSpeed - radius * 0.01;

  let spiralX = cos(theta1) + radiusRatio * cos(theta1 / radiusRatio + theta2);
  let spiralY = sin(theta1) - radiusRatio * sin(theta1 / radiusRatio + theta2);

  let targetAngle = atan2(spiralY, spiralX);
  let radialComponent = sin(radius * 0.05 + time) * PI * 0.2;

  vector.angle = lerp_angle(vector.angle, targetAngle + radialComponent, 0.18);

  let patternMagnitude = sqrt(spiralX * spiralX + spiralY * spiralY);
  let lengthMod = 0.8 + patternMagnitude * 0.3;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// MAGNETIC FIELD - Campo magnético con attractors/repellers
export const magneticFieldShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let numPoles = clamp(uniforms.param1, 2.0, 6.0);
  let intensity = clamp(uniforms.param2, 0.5, 3.0);
  let orbitalSpeed = clamp(uniforms.param3, 0.1, 2.0);
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed * orbitalSpeed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  var fieldX: f32 = 0.0;
  var fieldY: f32 = 0.0;

  let poles = i32(numPoles);
  for (var i = 0; i < poles; i = i + 1) {
    let angle = (f32(i) / numPoles) * TWO_PI + time * 0.5;
    let orbitRadius = 150.0;

    let poleX = cos(angle) * orbitRadius;
    let poleY = sin(angle) * orbitRadius;

    let dx = normX - poleX;
    let dy = normY - poleY;
    let dist = sqrt(dx * dx + dy * dy) + 0.1;

    let polarity = select(-1.0, 1.0, f32(i % 2) == 0.0);
    let force = polarity * intensity / (dist * dist * 0.01);

    let perpX = -dy / dist;
    let perpY = dx / dist;

    fieldX = fieldX + perpX * force;
    fieldY = fieldY + perpY * force;
  }

  let fieldMag = sqrt(fieldX * fieldX + fieldY * fieldY);
  if (fieldMag > 0.01) {
    let targetAngle = atan2(fieldY, fieldX);
    vector.angle = lerp_angle(vector.angle, targetAngle, 0.15);
  }

  let lengthMod = 1.0 + clamp(fieldMag * 0.1, 0.0, 0.8);
  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// CHAOS ATTRACTOR - Strange Attractor de Clifford
export const chaosAttractorShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let a = mix(-2.0, 2.0, (uniforms.param1 + 2.0) / 4.0);
  let b = mix(-2.0, 2.0, (uniforms.param2 + 2.0) / 4.0);
  let c = mix(-2.0, 2.0, (uniforms.param3 + 2.0) / 4.0);
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor * 0.01;
  let normY = vector.baseY * scaleFactor * 0.01;

  let modulation = sin(time * 0.3) * 0.2 + 1.0;
  let d = c * 0.8;
  let x_next = sin(a * normY * modulation) + c * cos(a * normX);
  let y_next = sin(b * normX * modulation) + d * cos(b * normY);

  let dx = x_next - normX;
  let dy = y_next - normY;

  let targetAngle = atan2(dy, dx);
  vector.angle = lerp_angle(vector.angle, targetAngle, 0.08);

  let velocity = sqrt(dx * dx + dy * dy);
  let lengthMod = 0.7 + clamp(velocity * 2.0, 0.0, 0.8);

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// SPRING MESH - Malla de resortes
export const springMeshShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let stiffness = clamp(uniforms.param1, 0.1, 2.0);
  let dampingFactor = clamp(uniforms.param2, 0.5, 0.95);
  let perturbFreq = clamp(uniforms.param3, 0.1, 1.0);
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  let neighborDist = 50.0;

  var totalForceX: f32 = 0.0;
  var totalForceY: f32 = 0.0;

  for (var i = 0; i < 4; i = i + 1) {
    let angle = f32(i) * PI * 0.5;
    let neighborX = normX + cos(angle) * neighborDist;
    let neighborY = normY + sin(angle) * neighborDist;

    let perturbX = sin(time * perturbFreq + neighborX * 0.02) * 10.0;
    let perturbY = cos(time * perturbFreq + neighborY * 0.02) * 10.0;

    let finalNeighborX = neighborX + perturbX;
    let finalNeighborY = neighborY + perturbY;

    let dx = finalNeighborX - normX;
    let dy = finalNeighborY - normY;
    let dist = sqrt(dx * dx + dy * dy);
    let displacement = dist - neighborDist;

    let forceMag = stiffness * displacement;
    totalForceX = totalForceX + (dx / dist) * forceMag;
    totalForceY = totalForceY + (dy / dist) * forceMag;
  }

  totalForceX = totalForceX * dampingFactor;
  totalForceY = totalForceY * dampingFactor;

  let targetAngle = atan2(totalForceY, totalForceX);
  vector.angle = lerp_angle(vector.angle, targetAngle, 0.12);

  let forceMag = sqrt(totalForceX * totalForceX + totalForceY * totalForceY);
  let lengthMod = 0.8 + clamp(forceMag * 0.02, 0.0, 0.7);

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// ============================================
// NUEVAS ANIMACIONES NATURALES/FLUIDAS
// ============================================

// RIPPLE EFFECT - Ondas expansivas desde múltiples fuentes
export const rippleEffectShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let propagationSpeed = clamp(uniforms.param1, 0.5, 3.0);    // Velocidad de propagación de ondas
  let numSources = clamp(uniforms.param2, 1.0, 8.0);          // Número de fuentes de ondas
  let waveAmplitude = clamp(uniforms.param3, 0.0, 2.0);       // Amplitud de las ondas
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed * propagationSpeed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  var totalDirectionX: f32 = 0.0;
  var totalDirectionY: f32 = 0.0;
  var totalIntensity: f32 = 0.0;
  var ringPattern: f32 = 0.0;

  let sources = i32(numSources);
  for (var i = 0; i < sources; i = i + 1) {
    // Las fuentes orbitan lentamente
    let sourceAngle = (f32(i) / numSources) * TWO_PI + time * 0.05;
    let orbitRadius = 150.0;

    let sourceX = cos(sourceAngle) * orbitRadius;
    let sourceY = sin(sourceAngle) * orbitRadius;

    let dx = normX - sourceX;
    let dy = normY - sourceY;
    let dist = sqrt(dx * dx + dy * dy) + 0.001;

    // Múltiples ondas en cada fuente para efecto más rico
    let wave1 = sin(dist * 0.06 - time * 0.8) * cos(time * 0.3);
    let wave2 = sin(dist * 0.04 - time * 1.2 + f32(i) * PI) * 0.6;
    let wave3 = cos(dist * 0.08 - time * 0.5 + f32(i)) * 0.4;

    let combinedWave = wave1 + wave2 + wave3;

    // Falloff más suave para anillos más definidos
    let peakRingDist = 50.0 + sin(time * 0.5 + f32(i)) * 20.0;
    let ringWidth = 30.0;
    let ringIntensity = exp(-pow(dist - peakRingDist, 2.0) / (ringWidth * ringWidth));

    // Amplitud combinada: onda + anillo
    let amplitude = combinedWave * (0.3 + ringIntensity * waveAmplitude * 0.7);

    // Dirección radial (hacia afuera desde la fuente)
    let radialX = dx / dist;
    let radialY = dy / dist;

    // Dirección tangente a la onda (perpendicular al radio)
    let tangentX = -dy / dist;
    let tangentY = dx / dist;

    // Mezcla: principalmente tangencial con componente radial
    let blendedX = mix(radialX, tangentX, 0.7) * amplitude;
    let blendedY = mix(radialY, tangentY, 0.7) * amplitude;

    totalDirectionX = totalDirectionX + blendedX;
    totalDirectionY = totalDirectionY + blendedY;
    totalIntensity = totalIntensity + abs(amplitude);
    ringPattern = ringPattern + ringIntensity;
  }

  // Perturbación por interferencia constructiva/destructiva
  let interference = sin(time * 0.4 + normX * 0.005 + normY * 0.005) * waveAmplitude * PI * 0.15;

  let magnitude = sqrt(totalDirectionX * totalDirectionX + totalDirectionY * totalDirectionY);
  if (magnitude > 0.001) {
    let targetAngle = atan2(totalDirectionY, totalDirectionX) + interference;
    vector.angle = lerp_angle(vector.angle, targetAngle, 0.12);
  }

  // Longitud: más corta en las crestas de las ondas, más larga en los valles
  let avgIntensity = totalIntensity / numSources;
  let ringEffect = (ringPattern / numSources) * waveAmplitude;
  
  // Crear efecto de amplitud variable
  let lengthMod = 0.7 + avgIntensity * 0.5 + ringEffect * 0.6;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO * 1.2  // Permitir más variación
  );

  vectors[index] = vector;
}
`;

// ORGANIC GROWTH - Crecimiento orgánico fractal tipo dendrita
export const organicGrowthShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let growthSpeed = clamp(uniforms.param1, 0.5, 3.0);
  let branchingIntensity = clamp(uniforms.param2, 0.0, 1.0);
  let noiseScale = clamp(uniforms.param3, 0.1, 0.5);
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed * growthSpeed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  let radius = sqrt(normX * normX + normY * normY);
  let angleFromCenter = atan2(normY, normX);

  // Ruido orgánico multicapa para crear ramificaciones
  let noise1 = rand_time(uniforms.seed, normX * noiseScale, normY * noiseScale, time * 0.1);
  let noise2 = rand_time(uniforms.seed + 1.0, normX * noiseScale * 2.0, normY * noiseScale * 2.0, time * 0.15);
  let noise3 = rand_time(uniforms.seed + 2.0, normX * noiseScale * 0.5, normY * noiseScale * 0.5, time * 0.05);

  // Crecimiento desde el centro hacia afuera
  let growthPhase = radius - time * 30.0;
  let growthWave = smoothstep(0.0, 50.0, growthPhase) * smoothstep(150.0, 50.0, growthPhase);

  // Ramificación basada en ruido
  let branching = mix(angleFromCenter, angleFromCenter + (noise1 - 0.5) * PI * branchingIntensity, growthWave);

  // Perturbación adicional
  let perturbation = (noise2 - 0.5) * 0.3 + (noise3 - 0.5) * 0.15;

  vector.angle = normalize_angle(branching + perturbation);

  // Longitud: mayor en puntas de crecimiento, menor en el centro
  let growthFactor = growthWave * (0.5 + noise2 * 0.5);
  let lengthMod = 0.7 + growthFactor * 0.8;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// FLUID DYNAMICS - Simulación de fluidos con vórtices
export const fluidDynamicsShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let turbulenceScale = clamp(uniforms.param1, 0.01, 0.15);
  let flowIntensity = clamp(uniforms.param2, 0.5, 3.0);
  let viscosity = clamp(uniforms.param3, 0.1, 1.0);
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  let radius = sqrt(normX * normX + normY * normY);

  // Turbulencia TEMPORAL multicapa - usamos rand_time para animación
  let noise1 = rand_time(uniforms.seed, normX * turbulenceScale, normY * turbulenceScale, time * 0.2);
  let noise2 = rand_time(uniforms.seed + 1.0, normX * turbulenceScale * 0.5, normY * turbulenceScale * 0.5, time * 0.15);
  let noise3 = rand_time(uniforms.seed + 2.0, normX * turbulenceScale * 2.0, normY * turbulenceScale * 2.0, time * 0.3);

  // Campo base: componente circular que varía con flowIntensity
  let circularAngle = atan2(normY, normX);
  let vortexCore = sin(time * 0.3 + radius * 0.02) * flowIntensity * 0.5;

  // Turbulencia dinámica que cambia constantemente
  let turbulentAngle = (noise1 - 0.5) * PI * 0.5 * flowIntensity + (noise2 - 0.5) * PI * 0.3;
  
  // Modulación temporal fuerte para movimiento visible
  let timeModulation = sin(time * 0.2 + normX * 0.01) + cos(time * 0.15 - normY * 0.01);
  let timeModulation2 = sin(time * 0.35 + radius * 0.05) * flowIntensity;

  // Combinación con viscosity (suavizado)
  // Menor viscosidad = más caótico, mayor viscosidad = más suave
  let baseAngle = mix(circularAngle + vortexCore, turbulentAngle, 1.0 - viscosity);
  let finalAngle = baseAngle + timeModulation * 0.4 + timeModulation2 * 0.3;

  vector.angle = normalize_angle(finalAngle);

  // Longitud: MUY variable con intensidad de flujo y turbulencia
  let flowPulse = abs(sin(radius * 0.05 + time * 0.4)) + abs(sin(time * 0.6 - radius * 0.02));
  let turbulenceVariation = abs(noise1 - 0.5) + abs(noise3 - 0.5) * 0.5;
  let lengthMod = 0.7 + (flowPulse + turbulenceVariation) * flowIntensity * 0.6;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO * 1.5  // Permitir más rango
  );

  vectors[index] = vector;
}
`;

// AURORA - Aurora boreal ondulante
export const auroraShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let waveFreq = clamp(uniforms.param1, 0.5, 3.0);
  let waveAmplitude = clamp(uniforms.param2, 10.0, 90.0);
  let horizontalDrift = clamp(uniforms.param3, 0.0, 1.0);
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Ondas principales: principalmente verticales
  let verticalPhase = normY + time * waveFreq;
  let mainWave = sin(verticalPhase * 2.0) * (waveAmplitude * PI / 180.0);

  // Ondas secundarias para crear "cortinas"
  let secondaryWave = cos(verticalPhase * 3.0 - normX * 0.005) * (waveAmplitude * 0.5 * PI / 180.0);

  // Drift horizontal lento
  let horizontalDriftPhase = normX * 0.002 + time * 0.1 * horizontalDrift;
  let driftComponent = sin(horizontalDriftPhase) * (waveAmplitude * 0.3 * PI / 180.0);

  // Shimmer: variación sutil de amplitud
  let shimmer = sin(time * 1.5 + normX * 0.01 + normY * 0.005) * 0.2;

  // Ángulo: principalmente vertical con perturbaciones
  let baseAngle = PI / 2.0 + mainWave + secondaryWave + driftComponent;
  let perturbedAngle = baseAngle + shimmer * PI * 0.1;

  vector.angle = normalize_angle(perturbedAngle);

  // Longitud: modulación tipo "cortina de luz"
  let curtainIntensity = 0.5 + 0.5 * sin(time * 0.8 + normX * 0.01);
  let heightModulation = 1.0 - abs(normY) * 0.3;  // Más cortos en los extremos
  let lengthMod = curtainIntensity * heightModulation * 1.2;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// ============================================
// NUEVAS ANIMACIONES ENERGÉTICAS ADICIONALES
// ============================================

// PLASMA BALL - Bola de plasma con rayos
export const plasmaBallShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let coreIntensity = clamp(uniforms.param1, 0.5, 3.0);      // Intensidad del núcleo
  let rayCount = clamp(uniforms.param2, 3.0, 12.0);          // Número de rayos
  let turbulence = clamp(uniforms.param3, 0.0, 1.0);         // Turbulencia
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  let radius = sqrt(normX * normX + normY * normY);
  let angleFromCenter = atan2(normY, normX);

  // Núcleo pulsante
  let corePulse = sin(time * 2.0) * 0.5 + 0.5;
  let coreRadius = 50.0 * corePulse;

  // Rayos: múltiples direcciones desde el centro
  let rays = i32(rayCount);
  var rayStrength: f32 = 0.0;
  var rayAngle: f32 = 0.0;

  for (var i = 0; i < rays; i = i + 1) {
    let rayBaseAngle = (f32(i) / rayCount) * TWO_PI;
    let rayPhase = rayBaseAngle + time * 1.5 + radius * 0.02;
    
    // Onda de plasma propagándose por cada rayo
    let wave = sin(rayPhase) * (1.0 - radius * 0.005);
    let waveStrength = max(0.0, wave) * exp(-radius * 0.01);

    // Calcular desviación angular del rayo
    let angleDiff = angleFromCenter - rayBaseAngle;
    let normalizedDiff = normalize_angle(angleDiff);
    
    // Si estamos dentro de la "zona" del rayo
    if (abs(normalizedDiff) < PI / rayCount * (0.7 + waveStrength * 0.3)) {
      rayStrength = max(rayStrength, waveStrength);
      rayAngle = rayBaseAngle;
    }
  }

  // Turbulencia
  let turbulentAngle = sin(time * 0.5 + radius * 0.01) * turbulence * PI * 0.2;
  let turbulentIntensity = sin(time * 1.2 + normX * 0.02 + normY * 0.02) * turbulence;

  // Dirección final: combinación de rayos y turbulencia
  let targetAngle = rayAngle + turbulentAngle;
  vector.angle = lerp_angle(vector.angle, targetAngle, 0.12);

  // Longitud basada en intensidad del plasma
  let baseLengthMod = 1.0 + rayStrength * coreIntensity * 0.5;
  let turbulenceMod = 1.0 + turbulentIntensity * 0.3;
  let lengthMod = baseLengthMod * turbulenceMod;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// BLACK HOLE - Atracción tipo agujero negro
export const blackHoleShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let pullStrength = clamp(uniforms.param1, 0.1, 2.0);       // Fuerza de atracción
  let accretionDisk = clamp(uniforms.param2, 0.0, 1.0);      // Intensidad del disco
  let ergosphere = clamp(uniforms.param3, 0.0, 1.0);         // Efecto de arrastre
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  let radius = sqrt(normX * normX + normY * normY) + 0.1;
  let angleFromCenter = atan2(normY, normX);

  // Líneas de campo (geodésicas)
  let fieldLine = sin(angleFromCenter * 3.0 + radius * 0.02 - time * 0.3) * 0.3;
  
  // Velocidad orbital (espiral hacia adentro)
  let orbitalPhase = angleFromCenter - time * pullStrength * (1.0 / max(radius, 10.0));
  
  // Disco de acreción (anillo rotante)
  var diskIntensity = 0.0;
  if (radius > 80.0 && radius < 150.0) {
    let diskPhase = angleFromCenter - time * pullStrength * 0.8;
    diskIntensity = (1.0 - abs(sin(diskPhase * 3.0))) * accretionDisk;
  }

  // Efecto de arrastre (frame-dragging)
  let dragEffect = sin(time * 0.5 + radius * 0.01) * ergosphere * PI * 0.1;

  // Dirección tangencial (espiral hacia el centro)
  let tangentialAngle = angleFromCenter + PI / 2.0;
  let attractionFactor = 1.0 / (1.0 + radius * 0.01);
  let finalAngle = mix(tangentialAngle, orbitalPhase, attractionFactor * pullStrength) + dragEffect;

  vector.angle = normalize_angle(finalAngle);

  // Longitud: creciente cerca del horizonte, decreciente lejos
  let horizonDistance = max(1.0, radius - 50.0);
  let horizonEffect = 1.0 / (1.0 + horizonDistance * 0.02);
  let lengthMod = 0.7 + horizonEffect * 0.6 + diskIntensity * 0.3;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// LIGHTNING STORM - Relámpagos fractales
export const lightningStormShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let strikePower = clamp(uniforms.param1, 0.5, 3.0);        // Potencia del rayo
  let branchingFactor = clamp(uniforms.param2, 0.0, 1.0);    // Factor de ramificación
  let chargeField = clamp(uniforms.param3, 0.0, 1.0);        // Intensidad del campo
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Strikes (rayos principales)
  let strikePhase = fract(time * strikePower);
  let strikeActive = step(0.7, strikePhase);  // 70% del tiempo silencioso, 30% con rayos

  // Múltiples rayos fractales
  var strikeDirection: vec2f = vec2f(0.0, -1.0);  // Hacia abajo por defecto
  var strikeIntensity: f32 = 0.0;

  for (var i = 0; i < 3; i = i + 1) {
    let offset = f32(i) * 0.3;
    let noise1 = rand_time(uniforms.seed, normX * 0.01, normY * 0.01 + offset, time);
    let noise2 = rand_time(uniforms.seed + 1.0, normX * 0.02, normY * 0.02 - offset, time);
    
    let rayAngle = -PI / 2.0 + (noise1 - 0.5) * PI * 0.3 * (1.0 - f32(i) * 0.2);
    let rayX = cos(rayAngle);
    let rayY = sin(rayAngle);
    
    let proximity = abs(normX * rayY - normY * rayX);
    let distanceAlongRay = normX * rayX + normY * rayY;
    
    if (proximity < 30.0 && distanceAlongRay > 0.0) {
      let rayStrength = (1.0 - proximity / 30.0) * (1.0 - distanceAlongRay * 0.01);
      if (rayStrength > strikeIntensity) {
        strikeIntensity = rayStrength;
        strikeDirection = vec2f(rayX, rayY);
      }
    }
  }

  // Branching: ramificaciones secundarias
  let branchPhase = sin(time * 3.0 + normX * 0.01) * branchingFactor;
  let branchAngle = branchPhase * PI * 0.4;

  // Campo de carga (dirige hacia regiones de carga opuesta)
  let chargeField1 = sin(normX * 0.01 + time * 0.5) * sin(normY * 0.01 - time * 0.3);
  let chargeField2 = cos(normX * 0.01 - time * 0.4) * cos(normY * 0.01 + time * 0.2);
  let chargeAngle = atan2(chargeField2, chargeField1) * chargeField;

  // Combinación: rayo + ramificación + campo de carga
  let finalAngle = atan2(strikeDirection.y, strikeDirection.x) + branchAngle + chargeAngle;
  vector.angle = normalize_angle(finalAngle);

  // Longitud: explosiva durante strikes, débil en silencio
  let lengthMod = mix(0.3, 1.0 + strikeIntensity * strikePower * 0.8, strikeActive);

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// QUANTUM FIELD - Campo cuántico con fluctuaciones
export const quantumFieldShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let quantumScale = clamp(uniforms.param1, 0.01, 0.1);      // Escala de fluctuaciones
  let uncertainty = clamp(uniforms.param2, 0.1, 2.0);        // Principio de incertidumbre
  let superposition = clamp(uniforms.param3, 0.0, 1.0);      // Superposición
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Fluctuaciones cuánticas (múltiples capas de ruido)
  let fluctuation1 = rand_time(uniforms.seed, normX * quantumScale, normY * quantumScale, time * 0.5);
  let fluctuation2 = rand_time(uniforms.seed + 1.0, normX * quantumScale * 2.0, normY * quantumScale * 2.0, time * 0.7);
  let fluctuation3 = rand_time(uniforms.seed + 2.0, normX * quantumScale * 0.5, normY * quantumScale * 0.5, time * 0.3);

  // Estados superpuestos (dos caminos simultáneos)
  let state1Angle = sin(normX * 0.02 + time * 0.4) * PI * 0.3 + cos(normY * 0.02 - time * 0.3) * PI * 0.2;
  let state2Angle = cos(normX * 0.02 - time * 0.5) * PI * 0.3 + sin(normY * 0.02 + time * 0.4) * PI * 0.2;

  // Desfase de los estados
  let phaseShift = time * 2.0;
  let state1Mix = 0.5 + 0.5 * sin(phaseShift);
  let state2Mix = 0.5 + 0.5 * cos(phaseShift);

  // Combinar estados superpuestos
  let superposedAngle = mix(state1Angle, state2Angle, superposition);
  
  // Incertidumbre (desviación aleatoria)
  let uncertainty1 = (fluctuation1 - 0.5) * uncertainty * PI * 0.2;
  let uncertainty2 = (fluctuation2 - 0.5) * uncertainty * PI * 0.15;

  // Ángulo final con decoherencia temporal
  let coherence = 0.7 + 0.3 * cos(time * 0.8);
  let finalAngle = superposedAngle + uncertainty1 + uncertainty2;
  vector.angle = normalize_angle(finalAngle);

  // Longitud: oscilaciones cuánticas
  let amplitudeOscillation = 1.0 + (fluctuation3 - 0.5) * 0.6;
  let quantumWave = 1.0 + sin(time * 1.5 + normX * 0.01) * coherence * 0.3;
  let lengthMod = amplitudeOscillation * quantumWave;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// ============================================
// NUEVAS ANIMACIONES GEOMÉTRICAS AVANZADAS
// ============================================

// FIBONACCI - Espiral de Fibonacci natural
export const fibonacciShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let spiralTightness = clamp(uniforms.param1, 0.1, 1.0);    // Qué tan apretada es la espiral
  let rotationSpeed = clamp(uniforms.param2, 0.0, 3.0);      // Velocidad de rotación
  let phyllotaxis = clamp(uniforms.param3, 130.0, 140.0);    // Ángulo de oro ~137.5°
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  let radius = sqrt(normX * normX + normY * normY);
  let angle = atan2(normY, normX);

  // Parámetro de la espiral (similar a t en r = a*sqrt(t))
  let t = radius * 0.03;
  
  // Radio de Fibonacci: r = sqrt(n) donde n es el número de puntos
  let fibonacciRadius = sqrt(t) * 50.0;
  
  // Ángulo de Fibonacci (phyllotaxis)
  let fibonacciAngle = t * (phyllotaxis * PI / 180.0) + time * rotationSpeed;
  
  // Punto en la espiral de Fibonacci
  let spiralPointX = cos(fibonacciAngle) * fibonacciRadius;
  let spiralPointY = sin(fibonacciAngle) * fibonacciRadius;

  // Vector hacia el punto en la espiral
  let dx = spiralPointX - normX;
  let dy = spiralPointY - normY;
  let dist = sqrt(dx * dx + dy * dy) + 0.001;

  let targetAngle = atan2(dy, dx);
  
  // Oscilación adicional: separarse y acercarse a la espiral
  let oscillation = sin(time + radius * 0.1) * 0.3;
  let finalAngle = targetAngle + oscillation;

  vector.angle = normalize_angle(finalAngle);

  // Longitud: más larga cerca de la espiral
  let proximity = 1.0 / (1.0 + dist * 0.02);
  let lengthMod = 0.7 + proximity * 0.6;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// VORONOI DIAGRAM - Diagrama de Voronoi animado
export const voronoiDiagramShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let numCells = clamp(uniforms.param1, 4.0, 20.0);          // Número de células
  let cellMotion = clamp(uniforms.param2, 0.0, 1.0);         // Movimiento de células
  let edgeSharpness = clamp(uniforms.param3, 0.0, 1.0);      // Nitidez de bordes
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  var minDist: f32 = 999999.0;
  var secondMinDist: f32 = 999999.0;
  var closestCellAngle: f32 = 0.0;

  let cells = i32(numCells);
  for (var i = 0; i < cells; i = i + 1) {
    let angle = (f32(i) / numCells) * TWO_PI;
    
    // Célula orbitando
    let orbitRadius = 200.0;
    let cellX = cos(angle) * orbitRadius + sin(time * 0.3 + f32(i)) * cellMotion * 50.0;
    let cellY = sin(angle) * orbitRadius + cos(time * 0.3 + f32(i)) * cellMotion * 50.0;

    let dx = normX - cellX;
    let dy = normY - cellY;
    let dist = sqrt(dx * dx + dy * dy);

    // Mantener dos distancias mínimas para bordes
    if (dist < minDist) {
      secondMinDist = minDist;
      minDist = dist;
      closestCellAngle = angle;
    } else if (dist < secondMinDist) {
      secondMinDist = dist;
    }
  }

  // Distancia al borde (diferencia entre dos células más cercanas)
  let edgeDistance = secondMinDist - minDist;
  
  // Vector apuntando hacia el borde
  let targetAngle = closestCellAngle + PI * 0.5;
  
  // Perturbación según cercanía al borde
  let edgeInfluence = mix(0.0, 1.0, clamp(edgeDistance * 0.1, 0.0, 1.0)) * edgeSharpness;
  let perturbation = sin(time + edgeDistance) * edgeInfluence * PI * 0.2;

  vector.angle = normalize_angle(targetAngle + perturbation);

  // Longitud: más larga en bordes
  let lengthMod = 0.6 + edgeInfluence * 0.7;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// MANDALAS - Patrones de mandalas rotatorios
export const mandalasShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let symmetry = clamp(uniforms.param1, 3.0, 12.0);
  let rotationSpeed = clamp(uniforms.param2, 0.0, 3.0);
  let complexity = clamp(uniforms.param3, 1.0, 5.0);
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  let radius = sqrt(normX * normX + normY * normY);
  let angle = atan2(normY, normX);

  // Rotación global que es visible
  let globalRotation = time * rotationSpeed * 2.0;
  let rotatedAngle = angle + globalRotation;

  // Patrón radial con simetría
  let symmetryAngle = (PI * 2.0) / symmetry;
  let offsetAngle = rotatedAngle + symmetryAngle * 0.5;
  let symmetricAngle = fract(offsetAngle / symmetryAngle) * symmetryAngle - symmetryAngle * 0.5;

  // Patrones con movimiento visible
  let pattern1 = cos(rotatedAngle * complexity);
  let pattern2 = sin(radius * 0.08 * complexity);
  let pattern3 = cos(rotatedAngle * (complexity * 0.5) + time * 0.5);

  // Combinación de patrones
  let mandalaPattern = pattern1 * pattern2 * pattern3;

  // Dirección: tangencial con perturbación por patrón
  let tangentialAngle = angle + PI / 2.0;
  let perturbation = sin(mandalaPattern * PI) * PI * 0.5 + time * rotationSpeed;

  vector.angle = normalize_angle(tangentialAngle + perturbation);

  // Longitud variable
  let radialPulse = 0.5 + 0.5 * sin(radius * 0.05 - time * 0.3);
  let lengthMod = 0.8 + abs(mandalaPattern) * 0.5 + radialPulse * 0.3;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// KALEIDOSCOPE - Efecto caleidoscopio
export const kaleidoscopeShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let mirrorCount = clamp(uniforms.param1, 2.0, 8.0);
  let rotationSpeed = clamp(uniforms.param2, 0.0, 3.0);
  let zoomLevel = clamp(uniforms.param3, 0.5, 3.0);
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor * zoomLevel;
  let normY = vector.baseY * scaleFactor * zoomLevel;

  let radius = sqrt(normX * normX + normY * normY);
  let angle = atan2(normY, normX);

  let mirrorAngle = (PI * 2.0) / mirrorCount;
  
  var reflectedAngle = fract(angle / mirrorAngle) * mirrorAngle;
  if (reflectedAngle > mirrorAngle * 0.5) {
    reflectedAngle = mirrorAngle - reflectedAngle;
  }

  let globalRotation = time * rotationSpeed;
  let rotatedAngle = reflectedAngle + globalRotation;

  let patternX = cos(rotatedAngle) * radius;
  let patternY = sin(rotatedAngle) * radius;

  let targetX = patternX - normX;
  let targetY = patternY - normY;

  let targetAngle = atan2(targetY, targetX);
  
  let wave = sin(radius * 0.1 - time * 0.5) * 0.3;
  let finalAngle = targetAngle + wave;

  vector.angle = normalize_angle(finalAngle);

  let concentricPattern = 1.0 + 0.5 * sin(radius * 0.08 + time * 0.4);
  let lengthMod = concentricPattern * 0.8;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// =========================================================
// NUEVAS ANIMACIONES
// =========================================================

/**
 * Interference Waves - Ondas de interferencia constructiva/destructiva
 * Múltiples fuentes de ondas que crean patrones de interferencia
 */
export const interferenceWavesShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let numSources = max(1.0, floor(uniforms.param1));
  let amplitude = uniforms.param2 * PI / 180.0;
  let phaseDiff = uniforms.param3;
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Calcular interferencia de múltiples fuentes distribuidas en círculo
  var totalWave: f32 = 0.0;
  for (var i = 0; i < i32(numSources); i = i + 1) {
    let angle = f32(i) * TWO_PI / numSources;
    let sourceX = cos(angle) * 200.0;
    let sourceY = sin(angle) * 200.0;

    let dx = normX - sourceX;
    let dy = normY - sourceY;
    let dist = sqrt(dx * dx + dy * dy);

    let phase = f32(i) * phaseDiff;
    let wave = sin(dist * 0.05 - time * 0.5 + phase);
    totalWave += wave;
  }

  // Normalizar y aplicar amplitud
  totalWave = totalWave / numSources;
  let targetAngle = totalWave * amplitude;
  vector.angle = normalize_angle(targetAngle);

  // Modulación de longitud basada en interferencia
  let lengthMod = 1.0 + abs(totalWave) * 0.5;
  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

/**
 * Particle Flow - Simulación de flujo de partículas en fluido viscoso
 * Combina flujo laminar y turbulento
 */
export const particleFlowShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let flowSpeed = uniforms.param1;
  let viscosity = uniforms.param2;
  let turbulence = uniforms.param3;
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Flujo laminar base (dirección general)
  let flowAngle = PI * 0.25; // 45 grados
  let flowX = cos(flowAngle) * flowSpeed;
  let flowY = sin(flowAngle) * flowSpeed;

  // Componente de vorticidad (efecto viscoso)
  let vortexCenterX = sin(time * 0.3) * 100.0;
  let vortexCenterY = cos(time * 0.3) * 100.0;
  let toVortexX = normX - vortexCenterX;
  let toVortexY = normY - vortexCenterY;
  let vortexDist = sqrt(toVortexX * toVortexX + toVortexY * toVortexY);
  let vortexAngle = atan2(toVortexY, toVortexX) + PI * 0.5;
  let vortexStrength = exp(-vortexDist * 0.005) * viscosity;
  let vortexX = cos(vortexAngle) * vortexStrength;
  let vortexY = sin(vortexAngle) * vortexStrength;

  // Turbulencia usando noise
  let noiseScale = 0.02;
  let turbX = (perlin2d(normX * noiseScale, normY * noiseScale, uniforms.seed) * 2.0 - 1.0) * turbulence;
  let turbY = (perlin2d(normX * noiseScale + 100.0, normY * noiseScale, uniforms.seed) * 2.0 - 1.0) * turbulence;

  // Combinar todas las componentes
  let totalX = flowX + vortexX + turbX;
  let totalY = flowY + vortexY + turbY;
  let targetAngle = atan2(totalY, totalX);

  vector.angle = lerp_angle(vector.angle, targetAngle, 0.1);

  // Longitud basada en velocidad local
  let speed = sqrt(totalX * totalX + totalY * totalY);
  let lengthMod = 0.5 + speed * 0.5;
  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

/**
 * Animated Fractals - Patrones fractales animados (Julia set)
 * Visualización de conjuntos de Julia en movimiento
 */
export const animatedFractalsShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let zoomSpeed = uniforms.param1;
  let rotationSpeed = uniforms.param2;
  let maxIterations = max(2.0, floor(uniforms.param3));
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;

  // Zoom oscilante
  let zoom = 0.003 * (1.0 + sin(time * zoomSpeed) * 0.5);
  let normX = vector.baseX * scaleFactor * zoom;
  let normY = vector.baseY * scaleFactor * zoom;

  // Parámetro de Julia que se mueve en círculo
  let cX = cos(time * rotationSpeed * 0.5) * 0.7;
  let cY = sin(time * rotationSpeed * 0.5) * 0.27;

  // Calcular iteraciones de Julia set
  var zX = normX;
  var zY = normY;
  var iteration: f32 = 0.0;

  for (var i = 0; i < i32(maxIterations); i = i + 1) {
    let xTemp = zX * zX - zY * zY + cX;
    zY = 2.0 * zX * zY + cY;
    zX = xTemp;

    if (zX * zX + zY * zY > 4.0) {
      break;
    }
    iteration += 1.0;
  }

  // Ángulo basado en escape
  let escapeAngle = atan2(zY, zX);
  let mixFactor = iteration / maxIterations;

  // Combinar con posición original para continuidad
  let originalAngle = atan2(normY, normX);
  let targetAngle = mix(escapeAngle, originalAngle, mixFactor);

  vector.angle = normalize_angle(targetAngle);

  // Longitud basada en velocidad de escape
  let lengthMod = 0.3 + (1.0 - mixFactor) * 1.2;
  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

/**
 * Crystallization - Patrones de cristalización con crecimiento ramificado
 * Simula formación de cristales como copos de nieve
 */
export const crystallizationShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let growthSpeed = uniforms.param1;
  let symmetry = max(3.0, floor(uniforms.param2));
  let branching = uniforms.param3;
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  let radius = sqrt(normX * normX + normY * normY);
  let angle = atan2(normY, normX);

  // Aplicar simetría radial
  let symmetryAngle = TWO_PI / symmetry;
  let sectorAngle = fract(angle / symmetryAngle) * symmetryAngle;

  // Reflejar para simetría bilateral
  var reflectedAngle = sectorAngle;
  if (sectorAngle > symmetryAngle * 0.5) {
    reflectedAngle = symmetryAngle - sectorAngle;
  }

  // Frente de cristalización que avanza con el tiempo
  let growthFront = time * growthSpeed * 50.0;
  let distToFront = abs(radius - growthFront);

  // Ramificación dendrítica usando ruido
  let branchNoise = perlin2d(
    normX * 0.05 + time * 0.2,
    normY * 0.05,
    uniforms.seed
  );

  let branchAngle = branchNoise * branching * PI * 0.5;

  // Dirección de crecimiento radial con ramificación
  let growthAngle = reflectedAngle + branchAngle;

  // Modulación por distancia al frente
  let frontInfluence = exp(-distToFront * 0.01);
  let targetAngle = mix(angle, growthAngle, frontInfluence);

  vector.angle = normalize_angle(targetAngle);

  // Longitud mayor en el frente de crecimiento
  let lengthMod = 0.5 + frontInfluence * 1.0 + abs(branchNoise) * 0.5;
  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

/**
 * Shock Waves - Ondas de choque expansivas desde múltiples puntos
 * Simula impactos y ondas de choque concéntricas
 */
export const shockWavesShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let impactFreq = uniforms.param1;
  let numWaves = max(2.0, floor(uniforms.param2));
  let decaySpeed = uniforms.param3;
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  var totalForceX: f32 = 0.0;
  var totalForceY: f32 = 0.0;
  var maxIntensity: f32 = 0.0;

  // Múltiples puntos de impacto que se generan periódicamente
  for (var i = 0; i < i32(numWaves); i = i + 1) {
    let impactTime = floor(time * impactFreq / numWaves + f32(i)) * numWaves / impactFreq;
    let timeSinceImpact = time - impactTime;

    if (timeSinceImpact > 0.0 && timeSinceImpact < 10.0) {
      // Posición del impacto (pseudo-aleatoria basada en tiempo)
      let impactX = sin(impactTime * 1.3 + f32(i) * 2.7 + uniforms.seed) * 300.0;
      let impactY = cos(impactTime * 1.7 + f32(i) * 3.1 + uniforms.seed) * 300.0;

      let dx = normX - impactX;
      let dy = normY - impactY;
      let dist = sqrt(dx * dx + dy * dy);

      // Frente de onda que se expande
      let waveFront = timeSinceImpact * 150.0;
      let distToWave = abs(dist - waveFront);

      // Intensidad decae con distancia y tiempo
      let waveIntensity = exp(-distToWave * 0.1) * exp(-timeSinceImpact * decaySpeed);

      if (waveIntensity > 0.01) {
        // Dirección radial desde el impacto
        let dirX = dx / max(dist, 0.1);
        let dirY = dy / max(dist, 0.1);

        totalForceX += dirX * waveIntensity;
        totalForceY += dirY * waveIntensity;
        maxIntensity = max(maxIntensity, waveIntensity);
      }
    }
  }

  let targetAngle = atan2(totalForceY, totalForceX);
  vector.angle = normalize_angle(targetAngle);

  // Longitud basada en intensidad de la onda
  let lengthMod = 0.3 + maxIntensity * 2.0;
  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

/**
 * Gravity Field - Campo gravitacional con múltiples masas orbitantes
 * Simula atracción gravitacional y órbitas
 */
export const gravityFieldShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let numMasses = max(1.0, floor(uniforms.param1));
  let gravityStrength = uniforms.param2;
  let orbitalSpeed = uniforms.param3;
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  var totalForceX: f32 = 0.0;
  var totalForceY: f32 = 0.0;

  // Múltiples masas orbitando
  for (var i = 0; i < i32(numMasses); i = i + 1) {
    let orbitAngle = time * orbitalSpeed + f32(i) * TWO_PI / numMasses;
    let orbitRadius = 150.0 + f32(i) * 50.0;

    let massX = cos(orbitAngle) * orbitRadius;
    let massY = sin(orbitAngle) * orbitRadius;

    let dx = normX - massX;
    let dy = normY - massY;
    let distSq = dx * dx + dy * dy + 1.0; // +1 para evitar división por cero
    let dist = sqrt(distSq);

    // Fuerza gravitacional inversamente proporcional al cuadrado de la distancia
    let force = gravityStrength * 1000.0 / distSq;

    // Dirección hacia la masa
    totalForceX -= (dx / dist) * force;
    totalForceY -= (dy / dist) * force;
  }

  let targetAngle = atan2(totalForceY, totalForceX);
  vector.angle = lerp_angle(vector.angle, targetAngle, 0.15);

  // Longitud basada en intensidad del campo
  let forceIntensity = sqrt(totalForceX * totalForceX + totalForceY * totalForceY);
  let lengthMod = 0.5 + min(forceIntensity * 0.1, 1.0);
  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

/**
 * Coupled Oscillators - Osciladores acoplados (modelo Kuramoto)
 * Simula sincronización emergente entre osciladores
 */
export const coupledOscillatorsShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let naturalFreq = uniforms.param1;
  let couplingStrength = uniforms.param2;
  let damping = uniforms.param3;
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Fase local basada en posición y tiempo
  let localPhase = time * naturalFreq + perlin2d(normX * 0.01, normY * 0.01, uniforms.seed) * TWO_PI;

  // Calcular fase promedio de los vecinos (simplificado con noise)
  var neighborPhase: f32 = 0.0;
  let numSamples: i32 = 8;

  for (var i = 0; i < numSamples; i = i + 1) {
    let angle = f32(i) * TWO_PI / f32(numSamples);
    let sampleDist = 50.0;
    let sampleX = normX + cos(angle) * sampleDist;
    let sampleY = normY + sin(angle) * sampleDist;

    let samplePhaseNoise = perlin2d(sampleX * 0.01, sampleY * 0.01, uniforms.seed);
    let samplePhase = time * naturalFreq + samplePhaseNoise * TWO_PI;
    neighborPhase += samplePhase;
  }

  neighborPhase = neighborPhase / f32(numSamples);

  // Ecuación de Kuramoto: dθ/dt = ω + K*sin(θ_neighbor - θ)
  let phaseDiff = sin(neighborPhase - localPhase);
  let syncedPhase = localPhase + couplingStrength * phaseDiff;

  // Aplicar damping
  let targetAngle = syncedPhase + cos(localPhase) * (1.0 - damping) * PI * 0.3;
  vector.angle = normalize_angle(targetAngle);

  // Longitud basada en sincronización
  let syncLevel = 1.0 - abs(phaseDiff);
  let lengthMod = 0.5 + syncLevel * 0.8;
  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

/**
 * Dynamic Maze - Laberinto dinámico que se reconfigura
 * Crea y reforma caminos laberínticos
 */
export const dynamicMazeShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let changeSpeed = uniforms.param1;
  let complexity = max(2.0, floor(uniforms.param2));
  let density = uniforms.param3;
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Crear grid de celdas que cambia con el tiempo
  let cellSize = 100.0 / complexity;
  let cellX = floor(normX / cellSize);
  let cellY = floor(normY / cellSize);

  // Generar patrón de laberinto usando noise con evolución temporal
  let timeLayer = floor(time * changeSpeed);
  let cellNoise = perlin2d(
    cellX * 0.5 + timeLayer * 0.1,
    cellY * 0.5,
    uniforms.seed
  );

  // Determinar si la celda es "pared" o "camino"
  let isWall = cellNoise < (1.0 - density);

  // Posición dentro de la celda
  let localX = fract(normX / cellSize) - 0.5;
  let localY = fract(normY / cellSize) - 0.5;

  var targetAngle: f32;

  if (isWall) {
    // En paredes: vectores perpendiculares a la pared más cercana
    if (abs(localX) > abs(localY)) {
      targetAngle = PI * 0.5; // Vertical
    } else {
      targetAngle = 0.0; // Horizontal
    }
  } else {
    // En caminos: flujo que sigue el laberinto
    let flowNoise = perlin2d(
      normX * 0.02 + time * changeSpeed * 0.5,
      normY * 0.02,
      uniforms.seed + 1.0
    );

    targetAngle = flowNoise * TWO_PI;
  }

  // Añadir variación suave en los bordes
  let edgeNoise = perlin2d(normX * 0.05, normY * 0.05, uniforms.seed + 2.0);
  targetAngle += edgeNoise * PI * 0.2;

  vector.angle = lerp_angle(vector.angle, targetAngle, 0.2);

  // Longitud mayor en caminos, menor en paredes
  var lengthMod: f32;
  if (isWall) {
    lengthMod = 0.3;
  } else {
    lengthMod = 0.8 + abs(edgeNoise) * 0.4;
  }

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;
