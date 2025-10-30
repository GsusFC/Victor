/**
 * Advanced Bloom Shader - Separable Gaussian Blur
 * Implementa blur gaussiano separable (horizontal + vertical) para HDR
 * Múltiples niveles de calidad y radio configurable
 */

export const bloomAdvancedShader = /* wgsl */ `
// Estructura de uniforms para bloom avanzado
struct BloomUniforms {
  // Dirección del blur: (1, 0) para horizontal, (0, 1) para vertical
  blurDirection: vec2f,
  // Radio del blur en pixels
  blurRadius: f32,
  // Threshold para extract bright pass
  bloomThreshold: f32,
  // Intensidad del bloom
  bloomIntensity: f32,
  // Calidad: número de samples (5, 9, 13)
  quality: f32,
  // Padding para alineación
  _padding: vec2f,
}

@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var<uniform> bloomUniforms: BloomUniforms;

// Vertex shader (fullscreen quad)
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;

  // Fullscreen triangle
  let x = f32((vertexIndex & 1u) << 2u);
  let y = f32((vertexIndex & 2u) << 1u);

  output.position = vec4f(x - 1.0, y - 1.0, 0.0, 1.0);
  output.uv = vec2f(x * 0.5, 1.0 - y * 0.5);

  return output;
}

// Pesos gaussianos precalculados para diferentes calidades
// Quality 5: [-2, -1, 0, 1, 2]
const GAUSSIAN_5: array<f32, 5> = array<f32, 5>(
  0.0545, 0.2442, 0.4026, 0.2442, 0.0545
);

// Quality 9: [-4, -3, -2, -1, 0, 1, 2, 3, 4]
const GAUSSIAN_9: array<f32, 9> = array<f32, 9>(
  0.0162, 0.0540, 0.1216, 0.1945, 0.2270, 0.1945, 0.1216, 0.0540, 0.0162
);

// Quality 13: [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6]
const GAUSSIAN_13: array<f32, 13> = array<f32, 13>(
  0.0044, 0.0175, 0.0540, 0.1295, 0.2420, 0.3521, 0.3989,
  0.3521, 0.2420, 0.1295, 0.0540, 0.0175, 0.0044
);

// Extract bright pass (threshold HDR colors)
fn extractBrightPass(color: vec3f, threshold: f32) -> vec3f {
  // Calcular luminancia
  let luminance = dot(color, vec3f(0.2126, 0.7152, 0.0722));

  // Soft threshold (smooth transition)
  let knee = 0.5;
  let soft = luminance - threshold + knee;
  soft = clamp(soft, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee + 0.00001);

  let contribution = max(soft, luminance - threshold);
  contribution = contribution / max(luminance, 0.00001);

  return color * contribution;
}

// Separable gaussian blur
fn gaussianBlur(uv: vec2f, direction: vec2f, radius: f32, quality: f32) -> vec3f {
  let texSize = vec2f(textureDimensions(inputTexture));
  let texelSize = 1.0 / texSize;

  var result = vec3f(0.0);
  var totalWeight = 0.0;

  // Quality 5 (rápido)
  if (quality < 7.0) {
    let offset = radius;
    for (var i = 0; i < 5; i = i + 1) {
      let sampleOffset = (f32(i) - 2.0) * offset;
      let sampleUV = uv + direction * sampleOffset * texelSize;
      let sampleColor = textureSample(inputTexture, texSampler, sampleUV).rgb;
      let weight = GAUSSIAN_5[i];

      result = result + sampleColor * weight;
      totalWeight = totalWeight + weight;
    }
  }
  // Quality 9 (medio)
  else if (quality < 11.0) {
    let offset = radius;
    for (var i = 0; i < 9; i = i + 1) {
      let sampleOffset = (f32(i) - 4.0) * offset;
      let sampleUV = uv + direction * sampleOffset * texelSize;
      let sampleColor = textureSample(inputTexture, texSampler, sampleUV).rgb;
      let weight = GAUSSIAN_9[i];

      result = result + sampleColor * weight;
      totalWeight = totalWeight + weight;
    }
  }
  // Quality 13 (alto)
  else {
    let offset = radius;
    for (var i = 0; i < 13; i = i + 1) {
      let sampleOffset = (f32(i) - 6.0) * offset;
      let sampleUV = uv + direction * sampleOffset * texelSize;
      let sampleColor = textureSample(inputTexture, texSampler, sampleUV).rgb;
      let weight = GAUSSIAN_13[i];

      result = result + sampleColor * weight;
      totalWeight = totalWeight + weight;
    }
  }

  return result / totalWeight;
}

// Fragment shader principal
@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  // Aplicar gaussian blur
  let blurredColor = gaussianBlur(
    input.uv,
    bloomUniforms.blurDirection,
    bloomUniforms.blurRadius,
    bloomUniforms.quality
  );

  return vec4f(blurredColor, 1.0);
}

// Fragment shader con extract bright pass (primera pasada)
@fragment
fn fragmentExtractBright(input: VertexOutput) -> @location(0) vec4f {
  // Sample HDR color
  let color = textureSample(inputTexture, texSampler, input.uv).rgb;

  // Extract bright colors above threshold
  let brightColor = extractBrightPass(color, bloomUniforms.bloomThreshold);

  return vec4f(brightColor, 1.0);
}

// Fragment shader de combinación final (additive blend)
@fragment
fn fragmentCombine(input: VertexOutput) -> @location(0) vec4f {
  // Sample original color (binding 0) y bloom (binding 1 será otra textura)
  let originalColor = textureSample(inputTexture, texSampler, input.uv).rgb;

  // Para combine necesitamos dos texturas - por ahora retornamos con intensidad
  let finalColor = originalColor * bloomUniforms.bloomIntensity;

  return vec4f(finalColor, 1.0);
}
`;

/**
 * Configuración de shaders para diferentes pasadas
 */
export const bloomShaderConfig = {
  // Pasada 1: Extract bright pass
  extractBright: {
    entryPoint: 'fragmentExtractBright',
    description: 'Extract bright colors above threshold',
  },

  // Pasada 2: Horizontal blur
  horizontalBlur: {
    entryPoint: 'fragmentMain',
    direction: [1, 0] as [number, number],
    description: 'Horizontal gaussian blur',
  },

  // Pasada 3: Vertical blur
  verticalBlur: {
    entryPoint: 'fragmentMain',
    direction: [0, 1] as [number, number],
    description: 'Vertical gaussian blur',
  },

  // Pasada 4: Combine con original
  combine: {
    entryPoint: 'fragmentCombine',
    description: 'Combine bloom with original',
  },
};

/**
 * Presets de calidad
 */
export const bloomQualityPresets = {
  low: {
    quality: 5,
    radius: 1.0,
    description: '5 samples - Fast',
  },
  medium: {
    quality: 9,
    radius: 1.5,
    description: '9 samples - Balanced',
  },
  high: {
    quality: 13,
    radius: 2.0,
    description: '13 samples - Quality',
  },
  ultra: {
    quality: 13,
    radius: 3.0,
    description: '13 samples - Ultra',
  },
} as const;
