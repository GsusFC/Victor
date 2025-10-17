/**
 * Shaders de compute para diferentes animaciones
 * Sistema modular de animaciones WebGPU - LIMPIEZA Y REORGANIZACIÓN
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
  seed: f32,  // Seed para generación pseudo-aleatoria reproducible
  padding1: f32,  // Padding para alineación
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

// ============================================
// PRNG (Pseudo-Random Number Generator)
// Usando PCG Hash - muy eficiente en GPU
// ============================================

// PCG Hash: hash un u32 a otro u32
fn pcg_hash(input: u32) -> u32 {
  var state = input * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

// Convierte u32 a f32 en rango [0, 1)
fn u32_to_f32(x: u32) -> f32 {
  return f32(x) / 4294967296.0; // 2^32
}

// Genera número pseudo-aleatorio en [0, 1) basado en seed y posición
fn rand(seed: f32, x: f32, y: f32) -> f32 {
  let s = u32(seed);
  let ix = u32(x * 1000.0);
  let iy = u32(y * 1000.0);
  let hash_input = s ^ (ix * 374761393u) ^ (iy * 668265263u);
  return u32_to_f32(pcg_hash(hash_input));
}

// Genera número pseudo-aleatorio en [0, 1) basado en seed, posición y tiempo
fn rand_time(seed: f32, x: f32, y: f32, t: f32) -> f32 {
  let s = u32(seed);
  let ix = u32(x * 1000.0);
  let iy = u32(y * 1000.0);
  let it = u32(t * 100.0);
  let hash_input = s ^ (ix * 374761393u) ^ (iy * 668265263u) ^ (it * 1103515245u);
  return u32_to_f32(pcg_hash(hash_input));
}

// Genera número pseudo-aleatorio en rango [min, max)
fn rand_range(seed: f32, x: f32, y: f32, min: f32, max: f32) -> f32 {
  return min + rand(seed, x, y) * (max - min);
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

// FLOCKING - Alineación aproximada estilo boids (AHORA CON SEED!)
export const flockingShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let radius = max(uniforms.param1, 0.05);
  let alignmentStrength = clamp(uniforms.param2, 0.0, 2.0);
  let cohesionStrength = clamp(uniforms.param3, 0.0, 1.0);
  let maxLengthPx = uniforms.param4;

  let toCenter = normalize(vec2f(-vector.baseX, -vector.baseY));

  // 🎲 USAR SEED para ruido reproducible!
  // Ahora con la misma seed, obtienes el mismo patrón de ruido
  let noiseValue = rand_time(uniforms.seed, vector.baseX * 8.0, vector.baseY * 9.3, uniforms.time * 0.1);
  let noiseAngle = (noiseValue * 2.0 - 1.0) * PI;

  let alignmentAngle = atan2(toCenter.y, toCenter.x) * alignmentStrength;
  let cohesionAngle = atan2(vector.baseY, vector.baseX + 0.0001) * cohesionStrength;

  let combinedAngle = alignmentAngle + cohesionAngle + noiseAngle;
  vector.angle = normalize_angle(combinedAngle);

  let lengthMod = 1.0 + clamp(radius * 0.4, 0.0, 1.0);
  vector.length = min(uniforms.vectorLength * uniforms.pixelToISO * lengthMod, maxLengthPx * uniforms.pixelToISO);

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
  let ejectionFactor = ejectionStrength * ejectionStrength; // No lineal para más drama

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

  let waveSpeed = max(uniforms.param1, 0.1);           // Velocidad de ondas
  let numSources = clamp(uniforms.param2, 1.0, 8.0);   // Número de fuentes
  let interference = clamp(uniforms.param3, 0.0, 1.0); // Interferencia entre ondas
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Crear múltiples fuentes de radiación que orbitan el centro
  var totalWaveX: f32 = 0.0;
  var totalWaveY: f32 = 0.0;
  var totalIntensity: f32 = 0.0;

  let sources = i32(numSources);
  for (var i = 0; i < sources; i = i + 1) {
    let angle = (f32(i) / numSources) * TWO_PI + time * 0.3;
    let orbitRadius = 200.0; // Distancia de órbita en píxeles

    // Posición de la fuente
    let sourceX = cos(angle) * orbitRadius;
    let sourceY = sin(angle) * orbitRadius;

    // Distancia a esta fuente
    let dx = normX - sourceX;
    let dy = normY - sourceY;
    let dist = sqrt(dx * dx + dy * dy);

    // Onda que se propaga desde esta fuente
    let wave = sin(dist * 0.05 - time * waveSpeed * 2.0);

    // Atenuación por distancia (ley del cuadrado inverso simplificada)
    let attenuation = 1.0 / (1.0 + dist * 0.005);

    let intensity = wave * attenuation;
    totalIntensity = totalIntensity + abs(intensity);

    // Dirección radial desde esta fuente
    let radialX = dx / max(dist, 0.001);
    let radialY = dy / max(dist, 0.001);

    // Acumular contribución de esta fuente
    totalWaveX = totalWaveX + radialX * intensity;
    totalWaveY = totalWaveY + radialY * intensity;
  }

  // Normalizar el vector resultante
  let magnitude = sqrt(totalWaveX * totalWaveX + totalWaveY * totalWaveY);

  if (magnitude > 0.001) {
    let dirX = totalWaveX / magnitude;
    let dirY = totalWaveY / magnitude;

    // Calcular ángulo de la dirección resultante
    let resultAngle = atan2(dirY, dirX);

    // Agregar interferencia (perturbación)
    let interferenceNoise = sin(normX * 0.03 + time) * cos(normY * 0.03 - time * 0.7);
    let perturbation = interferenceNoise * interference * PI * 0.3;

    vector.angle = normalize_angle(resultAngle + perturbation);
  } else {
    // Sin fuerzas significativas, mantener ángulo actual
    vector.angle = vector.angle;
  }

  // Longitud basada en intensidad total
  let avgIntensity = totalIntensity / numSources;
  let lengthMod = 1.0 + avgIntensity * 0.8;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;
