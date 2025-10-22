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
// Mejorado para evitar patrones simétricos de cuadrantes
fn rand_time(seed: f32, x: f32, y: f32, t: f32) -> f32 {
  let s = u32(seed);
  // Usar más resolución y offsets asimétricos para romper simetría
  let ix = u32((x + 0.123456) * 1234.567);
  let iy = u32((y + 0.789012) * 2345.678);
  let it = u32(t * 100.0);
  // XOR con números primos grandes para mejor distribución
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
  // Usar multiplicadores asimétricos (números primos/irracionales) para evitar patrones de cuadrantes
  let noiseValue = rand_time(uniforms.seed, vector.baseX * 7.919, vector.baseY * 11.237, uniforms.time * 0.1);
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

// ============================================
// FASE 1: NUEVAS ANIMACIONES NATURALES
// ============================================

// Función helper: Perlin-like noise 2D simplificado (usando hash)
const PERLIN_NOISE_HELPER = /* wgsl */ `
// Ruido Perlin 2D simplificado usando interpolación de valores hash
fn perlin_noise_2d(x: f32, y: f32, seed: f32) -> f32 {
  // Coordenadas enteras de la celda
  let xi = floor(x);
  let yi = floor(y);

  // Coordenadas fraccionarias dentro de la celda
  let xf = x - xi;
  let yf = y - yi;

  // Suavizado (smoothstep cúbico)
  let u = xf * xf * (3.0 - 2.0 * xf);
  let v = yf * yf * (3.0 - 2.0 * yf);

  // Valores en las 4 esquinas de la celda
  let v00 = rand(seed, xi, yi);
  let v10 = rand(seed, xi + 1.0, yi);
  let v01 = rand(seed, xi, yi + 1.0);
  let v11 = rand(seed, xi + 1.0, yi + 1.0);

  // Interpolación bilineal con suavizado
  let x1 = mix(v00, v10, u);
  let x2 = mix(v01, v11, u);

  return mix(x1, x2, v) * 2.0 - 1.0; // Mapear de [0,1] a [-1,1]
}
`;

// FLOW FIELD - Campo de flujo con ruido Perlin
export const flowFieldShader = /* wgsl */ `
${COMMON_STRUCTS}
${PERLIN_NOISE_HELPER}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let noiseScale = clamp(uniforms.param1, 0.01, 0.1);      // Escala del campo de ruido
  let flowIntensity = clamp(uniforms.param2, 0.5, 2.0);   // Intensidad del flujo
  let evolution = clamp(uniforms.param3, 0.1, 1.0);        // Velocidad de evolución
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed * evolution;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Campo de flujo basado en ruido Perlin a dos escalas
  let noise1 = perlin_noise_2d(normX * noiseScale, normY * noiseScale, uniforms.seed + time * 0.1);
  let noise2 = perlin_noise_2d(normX * noiseScale * 2.0, normY * noiseScale * 2.0, uniforms.seed + 100.0 + time * 0.15);

  // Combinar múltiples octavas de ruido
  let combinedNoise = noise1 + noise2 * 0.5;

  // El ruido define el ángulo del campo de flujo
  let flowAngle = combinedNoise * PI * flowIntensity;

  // Componente de deriva temporal (corriente constante que cambia lentamente)
  let driftAngle = sin(time * 0.3) * PI * 0.3;

  let targetAngle = flowAngle + driftAngle;

  // Suavizar transición de ángulos
  vector.angle = lerp_angle(vector.angle, targetAngle, 0.12);

  // Longitud variable basada en intensidad del campo
  let lengthMod = 1.0 + abs(combinedNoise) * 0.4;
  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// ORGANIC GROWTH - Crecimiento orgánico (Reaction-Diffusion simplificado)
export const organicGrowthShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let influenceRadius = clamp(uniforms.param1, 0.05, 0.3);  // Radio de influencia de vecinos
  let threshold = clamp(uniforms.param2, 0.3, 0.7);          // Umbral de activación
  let growthSpeed = clamp(uniforms.param3, 0.1, 1.0);        // Velocidad de crecimiento
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed * growthSpeed;

  // Posición actual
  let pos = vec2f(vector.baseX, vector.baseY);
  let radius = length(pos);

  // Simular "densidad" basada en la posición y ruido temporal
  // Usar multiplicadores asimétricos para evitar patrones de cuadrantes
  let density = rand_time(uniforms.seed, vector.baseX * 5.477, vector.baseY * 6.831, time * 0.2);

  // Patrón de activación/inhibición (como en Reaction-Diffusion)
  let activation = step(threshold, density); // 1.0 si density >= threshold, 0.0 sino

  // Dirección radial base (desde el centro)
  let radialAngle = atan2(vector.baseY, vector.baseX);

  // Perturbación orgánica basada en densidad
  let organicPerturbation = sin(density * TWO_PI + time) * PI * 0.4;

  // Patrón de crecimiento: expandir cuando activado, contraer cuando no
  let growthDirection = select(
    radialAngle + PI,  // Contraer (hacia el centro)
    radialAngle,       // Expandir (hacia afuera)
    activation > 0.5
  );

  // Añadir ondulación orgánica
  let wavyPerturbation = sin(radius * 8.0 + time * 2.0) * PI * 0.2;

  let targetAngle = growthDirection + organicPerturbation + wavyPerturbation;

  // Suavizar transición
  vector.angle = lerp_angle(vector.angle, targetAngle, 0.1);

  // Longitud basada en activación (más largo cuando activo)
  let lengthMod = select(
    0.7,  // Corto cuando inactivo
    1.3,  // Largo cuando activo
    activation > 0.5
  ) + sin(time + radius * 3.0) * 0.2;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// ============================================
// FASE 2: NUEVAS ANIMACIONES GEOMÉTRICAS
// ============================================

// HARMONIC OSCILLATOR - Oscilador armónico 2D
export const harmonicOscillatorShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let baseFreq = clamp(uniforms.param1, 0.5, 5.0);         // Frecuencia base
  let spatialPhase = clamp(uniforms.param2, 0.0, 2.0);     // Desfase espacial
  let damping = clamp(uniforms.param3, 0.0, 1.0);          // Amortiguamiento
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Distancia al centro (afecta la frecuencia)
  let radius = sqrt(normX * normX + normY * normY);

  // Fase única basada en posición
  let phaseX = normX * 0.01 * spatialPhase;
  let phaseY = normY * 0.01 * spatialPhase;

  // Oscilación en X e Y con frecuencias ligeramente diferentes
  let oscX = sin(time * baseFreq + phaseX) * (1.0 - damping * radius * 0.01);
  let oscY = cos(time * baseFreq * 1.3 + phaseY) * (1.0 - damping * radius * 0.01);

  // Calcular ángulo del vector resultante
  let targetAngle = atan2(oscY, oscX);

  // Suavizar
  vector.angle = lerp_angle(vector.angle, targetAngle, 0.15);

  // Longitud basada en amplitud de oscilación
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

  let radiusRatio = clamp(uniforms.param1, 0.3, 0.9);      // Ratio de radios (R/r)
  let innerSpeed = clamp(uniforms.param2, 0.5, 3.0);       // Velocidad de rotación interna
  let outerSpeed = clamp(uniforms.param3, 0.2, 2.0);       // Velocidad de rotación externa
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Ángulo y distancia al centro
  let radius = sqrt(normX * normX + normY * normY);
  let angleToCenter = atan2(normY, normX);

  // Parámetros del espirógrafo
  let R = 100.0;  // Radio del círculo fijo
  let r = R * radiusRatio;  // Radio del círculo que rueda
  let k = radiusRatio;  // Ratio k = r/R

  // Ángulos de rotación (múltiples círculos para efecto más complejo)
  let theta1 = time * outerSpeed + angleToCenter;
  let theta2 = time * innerSpeed - radius * 0.01;

  // Fórmula de epitrocoide/hipotrocoide
  // x = (R - r) * cos(t) + d * cos((R - r)/r * t)
  // y = (R - r) * sin(t) - d * sin((R - r)/r * t)

  let spiralX = cos(theta1) + k * cos(theta1 / k + theta2);
  let spiralY = sin(theta1) - k * sin(theta1 / k + theta2);

  // Calcular dirección tangente al patrón
  let targetAngle = atan2(spiralY, spiralX);

  // Añadir variación radial
  let radialComponent = sin(radius * 0.05 + time) * PI * 0.2;

  vector.angle = lerp_angle(vector.angle, targetAngle + radialComponent, 0.18);

  // Longitud variable según el patrón
  let patternMagnitude = sqrt(spiralX * spiralX + spiralY * spiralY);
  let lengthMod = 0.8 + patternMagnitude * 0.3;

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// ============================================
// FASE 3: NUEVAS ANIMACIONES ENERGÉTICAS
// ============================================

// MAGNETIC FIELD - Campo magnético con attractors/repellers
export const magneticFieldShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let numPoles = clamp(uniforms.param1, 2.0, 6.0);         // Número de polos magnéticos
  let intensity = clamp(uniforms.param2, 0.5, 3.0);        // Intensidad magnética
  let orbitalSpeed = clamp(uniforms.param3, 0.1, 2.0);     // Velocidad orbital
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed * orbitalSpeed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Acumular campo magnético de múltiples polos
  var fieldX: f32 = 0.0;
  var fieldY: f32 = 0.0;

  let poles = i32(numPoles);
  for (var i = 0; i < poles; i = i + 1) {
    let angle = (f32(i) / numPoles) * TWO_PI + time * 0.5;
    let orbitRadius = 150.0; // Radio de órbita

    // Posición del polo (alternando norte/sur)
    let poleX = cos(angle) * orbitRadius;
    let poleY = sin(angle) * orbitRadius;

    // Vector desde el polo a la partícula
    let dx = normX - poleX;
    let dy = normY - poleY;
    let dist = sqrt(dx * dx + dy * dy) + 0.1; // +0.1 para evitar división por cero

    // Polaridad alterna (norte atrae, sur repele)
    let polarity = select(-1.0, 1.0, f32(i % 2) == 0.0);

    // Campo magnético (fuerza inversamente proporcional al cuadrado de la distancia)
    let force = polarity * intensity / (dist * dist * 0.01);

    // Dirección perpendicular (campo magnético forma líneas curvas)
    let perpX = -dy / dist;
    let perpY = dx / dist;

    fieldX = fieldX + perpX * force;
    fieldY = fieldY + perpY * force;
  }

  // Normalizar y calcular ángulo
  let fieldMag = sqrt(fieldX * fieldX + fieldY * fieldY);
  if (fieldMag > 0.01) {
    let targetAngle = atan2(fieldY, fieldX);
    vector.angle = lerp_angle(vector.angle, targetAngle, 0.15);
  }

  // Longitud basada en intensidad del campo
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

  // Parámetros del atractor de Clifford: x' = sin(a*y) + c*cos(a*x), y' = sin(b*x) + d*cos(b*y)
  let a = mix(-2.0, 2.0, (uniforms.param1 + 2.0) / 4.0);
  let b = mix(-2.0, 2.0, (uniforms.param2 + 2.0) / 4.0);
  let c = mix(-2.0, 2.0, (uniforms.param3 + 2.0) / 4.0);
  let maxLengthPx = uniforms.param4;

  // Valor de 'd' derivado de 'c' para estabilidad
  let d = c * 0.8;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor * 0.01; // Escalar a rango apropiado [-2, 2]
  let normY = vector.baseY * scaleFactor * 0.01;

  // Ecuaciones del atractor de Clifford (moduladas por tiempo)
  let modulation = sin(time * 0.3) * 0.2 + 1.0;
  let x_next = sin(a * normY * modulation) + c * cos(a * normX);
  let y_next = sin(b * normX * modulation) + d * cos(b * normY);

  // Calcular dirección del flujo del atractor
  let dx = x_next - normX;
  let dy = y_next - normY;

  let targetAngle = atan2(dy, dx);

  // Suavizar transición (attractors caóticos necesitan más suavizado)
  vector.angle = lerp_angle(vector.angle, targetAngle, 0.08);

  // Longitud basada en "velocidad" del flujo
  let velocity = sqrt(dx * dx + dy * dy);
  let lengthMod = 0.7 + clamp(velocity * 2.0, 0.0, 0.8);

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;

// ============================================
// FASE 4: NUEVAS ANIMACIONES EXPERIMENTALES
// ============================================

// SPRING MESH - Malla de resortes
export const springMeshShader = /* wgsl */ `
${COMMON_STRUCTS}

@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  var vector = vectors[index];

  let stiffness = clamp(uniforms.param1, 0.1, 2.0);           // Rigidez de resortes
  let dampingFactor = clamp(uniforms.param2, 0.5, 0.95);      // Amortiguamiento
  let perturbFreq = clamp(uniforms.param3, 0.1, 1.0);         // Frecuencia de perturbaciones
  let maxLengthPx = uniforms.param4;

  let time = uniforms.time * uniforms.speed;
  let scaleFactor = 1.0 / uniforms.pixelToISO;
  let normX = vector.baseX * scaleFactor;
  let normY = vector.baseY * scaleFactor;

  // Simular conexiones a vecinos virtuales en una malla
  // Vecinos en las 4 direcciones cardinales
  let neighborDist = 50.0; // Distancia entre nodos de la malla

  var totalForceX: f32 = 0.0;
  var totalForceY: f32 = 0.0;

  // Simular 4 vecinos virtuales
  for (var i = 0; i < 4; i = i + 1) {
    let angle = f32(i) * PI * 0.5; // 0°, 90°, 180°, 270°
    let neighborX = normX + cos(angle) * neighborDist;
    let neighborY = normY + sin(angle) * neighborDist;

    // Posición del vecino oscila (perturbación)
    let perturbX = sin(time * perturbFreq + neighborX * 0.02) * 10.0;
    let perturbY = cos(time * perturbFreq + neighborY * 0.02) * 10.0;

    let finalNeighborX = neighborX + perturbX;
    let finalNeighborY = neighborY + perturbY;

    // Fuerza del resorte (ley de Hooke: F = -k * x)
    let dx = finalNeighborX - normX;
    let dy = finalNeighborY - normY;
    let dist = sqrt(dx * dx + dy * dy);
    let displacement = dist - neighborDist;

    // Fuerza proporcional al desplazamiento
    let forceMag = stiffness * displacement;
    totalForceX = totalForceX + (dx / dist) * forceMag;
    totalForceY = totalForceY + (dy / dist) * forceMag;
  }

  // Aplicar amortiguamiento
  totalForceX = totalForceX * dampingFactor;
  totalForceY = totalForceY * dampingFactor;

  // Calcular ángulo de la fuerza resultante
  let targetAngle = atan2(totalForceY, totalForceX);

  // Suavizar
  vector.angle = lerp_angle(vector.angle, targetAngle, 0.12);

  // Longitud basada en magnitud de la fuerza
  let forceMag = sqrt(totalForceX * totalForceX + totalForceY * totalForceY);
  let lengthMod = 0.8 + clamp(forceMag * 0.02, 0.0, 0.7);

  vector.length = min(
    uniforms.vectorLength * uniforms.pixelToISO * lengthMod,
    maxLengthPx * uniforms.pixelToISO
  );

  vectors[index] = vector;
}
`;
