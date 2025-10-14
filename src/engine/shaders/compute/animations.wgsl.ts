/**
 * Shaders de compute para diferentes animaciones
 * Sistema modular de animaciones WebGPU
 */

// Estructura común
const COMMON_STRUCTS = /* wgsl */ `
const MAX_GRADIENT_STOPS: u32 = 6u;

struct Uniforms {
  aspect: f32,
  time: f32,
  vectorLength: f32,
  vectorWidth: f32,
  pixelToISO: f32,
  zoom: f32,
  speed: f32,
  gradientStopCount: f32,
  param1: f32,  // Parámetro genérico 1 (frequency, elasticity, etc)
  param2: f32,  // Parámetro genérico 2 (amplitude, maxLength, etc)
  param3: f32,  // Parámetro genérico 3
  param4: f32,  // Parámetro genérico 4
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
  gradientStops: array<vec4f, MAX_GRADIENT_STOPS>,
}

struct Vector {
  baseX: f32,
  baseY: f32,
  angle: f32,
  length: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read_write> vectors: array<Vector>;

const PI: f32 = 3.14159265359;
const TWO_PI: f32 = 6.28318530718;

fn normalize_angle(angle: f32) -> f32 {
  var a = angle;
  while (a > PI) { a = a - TWO_PI; }
  while (a < -PI) { a = a + TWO_PI; }
  return a;
}

// Lerp para suavizado temporal de ángulos
fn lerp_angle(current: f32, targetAngle: f32, factor: f32) -> f32 {
  // Normalizar ambos ángulos
  let a = normalize_angle(current);
  let b = normalize_angle(targetAngle);

  // Calcular la diferencia más corta
  var diff = b - a;
  if (diff > PI) { diff = diff - TWO_PI; }
  if (diff < -PI) { diff = diff + TWO_PI; }

  // Interpolar
  return normalize_angle(a + diff * factor);
}
`;

// 1. STATIC - Sin animación
export const staticShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  // Sin cambios en ángulo, pero sincronizar longitud con el control actual
  vector.angle = 0.0;
  vector.length = uniforms.vectorLength * uniforms.pixelToISO;

  vectors[index] = vector;
}
`;

// 1b. NONE - Mantener ángulos actuales
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

// 1c. STATIC ANGLE - Ángulo fijo configurable
export const staticAngleShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let angleDeg = uniforms.param1;
  vector.angle = normalize_angle(angleDeg * PI / 180.0);
  vector.length = uniforms.vectorLength * uniforms.pixelToISO;

  vectors[index] = vector;
}
`;

// 1d. RANDOM STATIC - Ángulo pseudoaleatorio estable
export const randomStaticShader = /* wgsl */ `
${COMMON_STRUCTS}

fn hash_static(vec: vec2f) -> f32 {
  return fract(sin(dot(vec, vec2f(127.1, 311.7))) * 43758.5453);
}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let noiseScale = max(uniforms.param1, 0.01);
  let spreadDeg = max(uniforms.param2, 0.0);
  let lengthVariation = uniforms.param3;
  let maxLengthPx = uniforms.param4;

  let seed = hash_static(vec2f(vector.baseX, vector.baseY) * noiseScale);
  let angle = (seed * 2.0 - 1.0) * spreadDeg * PI / 180.0;

  vector.angle = normalize_angle(angle);
  let lengthNoise = hash_static(vec2f(vector.baseX * 1.73, vector.baseY * 2.97));
  let lengthMod = 1.0 + (lengthNoise - 0.5) * lengthVariation;
  vector.length = min(uniforms.vectorLength * uniforms.pixelToISO * lengthMod, maxLengthPx * uniforms.pixelToISO);

  vectors[index] = vector;
}
`;

// 1e. RANDOM LOOP - Cambios aleatorios temporizados
export const randomLoopShader = /* wgsl */ `
${COMMON_STRUCTS}

fn hash_loop(vec: vec2f) -> f32 {
  return fract(sin(dot(vec, vec2f(12.9898, 78.233))) * 43758.5453);
}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let interval = max(uniforms.param1, 0.2);
  let spreadDeg = max(uniforms.param2, 0.0);
  let smoothing = clamp(uniforms.param3, 0.0, 1.0);
  let maxLengthPx = uniforms.param4;

  let phase = floor(uniforms.time * uniforms.speed / interval);
  let seed = hash_loop(vec2f(vector.baseX * 3.1, vector.baseY * 5.7) + vec2f(phase, phase * 0.37));
  let targetAngle = (seed * 2.0 - 1.0) * spreadDeg * PI / 180.0;

  vector.angle = lerp_angle(vector.angle, targetAngle, 0.1 + smoothing * 0.4);
  vector.length = min(uniforms.vectorLength * uniforms.pixelToISO, maxLengthPx * uniforms.pixelToISO);

  vectors[index] = vector;
}
`;

// 2. SMOOTH WAVES - Olas suaves
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

// 3. SEA WAVES - Olas de mar (más caóticas)
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

// 4. PERLIN FLOW - Flujo tipo Perlin noise
export const perlinFlowShader = /* wgsl */ `
${COMMON_STRUCTS}

// Perlin noise simplificado
fn hash(p: vec2f) -> f32 {
  let h = dot(p, vec2f(127.1, 311.7));
  return fract(sin(h) * 43758.5453123);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let scale = uniforms.param1;      // Escala del noise (default ~0.02)
  let intensity = uniforms.param2;  // Intensidad (default ~20)
  let elasticity = uniforms.param3;
  let maxLengthPx = uniforms.param4;

  // Convertir tiempo a milisegundos
  let time = uniforms.time * uniforms.speed * 1000.0;

  // Escalar coordenadas ISO a píxeles reales
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Fórmula original (simplificada): noiseX = sin(timestamp * 0.001 + baseX * 0.02)
  //                                  noiseY = cos(timestamp * 0.001 + baseY * 0.02)
  //                                  angle = atan2(noiseY, noiseX)

  // Usar noise para comportamiento más orgánico
  let noiseScale = scale * 2.0;  // Ajustar escala
  let noisePos = vec2f(
    normX * noiseScale * 0.01 + time * 0.001,
    normY * noiseScale * 0.01 + time * 0.001 * 0.7
  );

  let n = noise(noisePos);

  // Convertir noise a ángulo como en la fórmula original
  vector.angle = n * TWO_PI - PI;
  vector.angle = normalize_angle(vector.angle);

  // Modular longitud
  let lengthMod = 0.5 + n * elasticity;
  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// 5. CENTER PULSE - Pulso radial con ondas viajeras desde el centro
export const centerPulseShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let frequency = uniforms.param1;   // Velocidad de propagación del pulso (default ~0.02)
  let intensity = uniforms.param2;   // Intensidad de la perturbación (default ~28)
  let elasticity = uniforms.param3;  // Suavidad del pulso (default ~0.6)
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

  // Onda que viaja desde el centro hacia afuera (como ondas en agua)
  let waveSpeed = 0.002;
  let wavePhase = time * waveSpeed - dist * 0.1;

  // Pulso sinusoidal que crea "anillos" de intensidad
  let pulse = sin(wavePhase);

  // Ángulo tangencial (perpendicular al radial)
  let tangentialAngle = radialAngle + PI / 2.0;

  // Durante el pulso, los vectores giran desde tangencial hacia radial
  let pulseInfluence = pulse * (intensity * PI / 180.0);

  vector.angle = tangentialAngle + pulseInfluence;
  vector.angle = normalize_angle(vector.angle);

  // Modular longitud con el pulso
  let lengthMod = 1.0 + pulse * elasticity * 0.5;
  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// 6. MOUSE INTERACTION - Interacción con el mouse
export const mouseInteractionShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  // param1: radio influencia en píxeles
  // param2: intensidad del efecto
  // param3: mezcla tangencial (0-1)
  // param4: longitud máxima en píxeles

  let influenceRadius = max(uniforms.param1 * uniforms.pixelToISO, 0.001);
  let intensity = uniforms.param2;
  let tangentialMix = clamp(uniforms.param3, 0.0, 1.0);
  let maxLengthPx = uniforms.param4;

  let mouseX = uniforms.mouseX;
  let mouseY = uniforms.mouseY;
  let mouseActive = uniforms.mouseActive > 0.5;

  // Convertir tiempo a milisegundos
  let time = uniforms.time * uniforms.speed * 1000.0;

  // Calcular distancia al mouse
  let dx = mouseX - vector.baseX;
  let dy = mouseY - vector.baseY;
  let distSq = dx * dx + dy * dy;
  let radiusSq = influenceRadius * influenceRadius;

  // Si está dentro del radio de influencia y el mouse es activo
  if (mouseActive && distSq < radiusSq && distSq > 0.0001) {
    // Ángulo apuntando hacia el mouse
    let angleToMouse = atan2(dy, dx);
    vector.angle = angleToMouse;

    // Modular longitud basado en distancia (más cerca = más largo)
    let dist = sqrt(distSq);
    let distNorm = 1.0 - (dist / influenceRadius);
    let lengthMod = 1.0 + distNorm * (intensity * 0.02);
    vector.length = min(
      uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
      maxLengthPx * uniforms.pixelToISO
    );
  } else {
    // Fuera del radio: comportamiento SmoothWaves
    let scaleFactor = 1.0 / uniforms.pixelToISO;
    let normX = vector.baseX * scaleFactor;
    let waveFreq = 0.005;
    let angleOffset = sin(time * waveFreq + normX * 0.01) * (20.0 * PI / 180.0);
    vector.angle = angleOffset;
    vector.length = min(uniforms.vectorLength * uniforms.pixelToISO, maxLengthPx * uniforms.pixelToISO);
  }

  // Mezcla tangencial si está dentro del radio
  if (mouseActive && distSq < influenceRadius * influenceRadius && distSq > 0.0001 && tangentialMix > 0.0) {
    let angleToCenter = atan2(vector.baseY - mouseY, vector.baseX - mouseX);
    let tangentialAngle = angleToCenter + PI / 2.0;
    vector.angle = normalize_angle(mix(vector.angle, tangentialAngle, tangentialMix));
  }

  vector.angle = normalize_angle(vector.angle);

  vectors[index] = vector;
}
`;


// 7. DIRECTIONAL FLOW - Flujo direccional continuo
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

// 8. TANGENTE CLÁSICA - Rotación tangencial alrededor del centro
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

// 9. LISSAJOUS - Patrones armónicos en cuadrícula
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

// 10. VORTEX - Remolino dinámico centrado
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

// 10b. HELICAL CURL - Flujo remolino con torsión helicoidal
export const helicalCurlShader = /* wgsl */ `
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

// 11. GEOMETRIC PATTERN - Patrones geométricos iterativos
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

// 12. FLOCKING - Alineación aproximada estilo boids
export const flockingShader = /* wgsl */ `
${COMMON_STRUCTS}

fn pseudo_noise(v: vec2f) -> f32 {
  return fract(sin(dot(v, vec2f(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0;
}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let radius = max(uniforms.param1, 0.05);
  let alignmentStrength = clamp(uniforms.param2, 0.0, 2.0);
  let cohesionStrength = clamp(uniforms.param3, 0.0, 1.0);
  let maxLengthPx = uniforms.param4;

  let toCenter = normalize(vec2f(-vector.baseX, -vector.baseY));
  let noiseAngle = pseudo_noise(vec2f(vector.baseX * 8.0, vector.baseY * 9.3 + uniforms.time)) * PI;

  let alignmentAngle = atan2(toCenter.y, toCenter.x) * alignmentStrength;
  let cohesionAngle = atan2(vector.baseY, vector.baseX + 0.0001) * cohesionStrength;

  let combinedAngle = alignmentAngle + cohesionAngle + noiseAngle;
  vector.angle = normalize_angle(combinedAngle);

  let lengthMod = 1.0 + clamp(radius * 0.4, 0.0, 1.0);
  vector.length = min(uniforms.vectorLength * uniforms.pixelToISO * lengthMod, maxLengthPx * uniforms.pixelToISO);

  vectors[index] = vector;
}
`;

// 18. HEARTBEAT - Latido/Respiración sincronizada (expansión/contracción)
export const heartbeatShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let frequency = uniforms.param1;      // Frecuencia del latido (default ~0.015)
  let intensity = uniforms.param2;      // NO USADO - siempre alterna dirección
  let distanceEffect = uniforms.param3; // Cuánto afecta la distancia (default ~0.7)
  let maxLengthPx = uniforms.param4;

  // Convertir tiempo a milisegundos
  let time = uniforms.time * uniforms.speed * 1000.0;

  // Escalar coordenadas ISO a píxeles reales
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Distancia al centro
  let dist = sqrt(normX * normX + normY * normY);

  // Ángulo radial desde el centro
  let radialAngle = atan2(vector.baseY, vector.baseX);

  // Latido sincronizado SIMPLE - todo el campo junto
  let beatPhase = time * frequency * 0.001;
  let heartbeat = sin(beatPhase);

  // INVERSIÓN COMPLETA DE DIRECCIÓN según el signo del latido
  // heartbeat > 0 → EXPANSIÓN: vectores apuntan HACIA AFUERA (radial)
  // heartbeat < 0 → CONTRACCIÓN: vectores apuntan HACIA DENTRO (radial + 180°)
  let direction = select(
    radialAngle + PI,  // Contracción: apuntan hacia el centro
    radialAngle,       // Expansión: apuntan desde el centro
    heartbeat > 0.0
  );

  vector.angle = normalize_angle(direction);

  // Longitud: más largos durante picos del latido (abs para que siempre sean visibles)
  let beatStrength = abs(heartbeat);
  let lengthModulation = 0.7 + beatStrength * 0.8;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthModulation,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;
