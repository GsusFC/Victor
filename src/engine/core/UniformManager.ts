/**
 * UniformManager - Gestiona uniforms del motor WebGPU
 * Responsabilidades:
 * - Buffer de uniforms preallocado
 * - Diferential updates (solo escribir si cambió)
 * - Gradient stops caching inteligente
 * - Normalización de valores
 */

const MAX_GRADIENT_STOPS = 12;

export interface UniformData {
  aspect: number;
  time: number;
  vectorLength: number;
  vectorWidth: number;
  pixelToISO: number;
  zoom: number;
  speed: number;
  gradientStopCount: number;
  param1: number;
  param2: number;
  param3: number;
  maxLength: number;
  mouseX: number;
  mouseY: number;
  mouseActive: number;
  colorR: number;
  colorG: number;
  colorB: number;
  gradientEnabled: number;
  gradientMode: number;
  gradientType: number;
  linearDirX: number;
  linearDirY: number;
  linearMin: number;
  linearMax: number;
  radialMax: number;
  seed: number;
}

export class UniformManager {
  private device: GPUDevice;
  private uniformBuffer: GPUBuffer;
  private uniformData: Float32Array;
  private lastUniformData: Float32Array;
  private uniformsDirty: boolean = true;

  private gradientStopsCache = {
    lastHash: '',
    cachedData: new Float32Array(MAX_GRADIENT_STOPS * 4),
    cachedCount: 0,
  };

  constructor(device: GPUDevice) {
    this.device = device;

    // Estructura de uniforms:
    // 0-31:   Uniforms básicos (32 floats)
    // 32-47:  viewProjMatrix (16 floats, 4×vec4f) - Para cámara 3D
    // 48-50:  cameraPos (3 floats, vec3f) - Para cámara 3D
    // 51-55:  renderMode + padding (5 floats)
    // 56-103: gradientStops[12] (48 floats, 12×vec4f)
    const uniformFloats = 32 + 24 + MAX_GRADIENT_STOPS * 4; // 32 + 24 (camera) + 48 (gradients) = 104
    const uniformBytes = uniformFloats * Float32Array.BYTES_PER_ELEMENT;
    const paddedSize = Math.ceil(uniformBytes / 16) * 16;

    this.uniformBuffer = device.createBuffer({
      size: paddedSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: false,
    });

    this.uniformData = new Float32Array(uniformFloats);
    this.lastUniformData = new Float32Array(uniformFloats);

    console.log(`✅ UniformManager creado (${paddedSize} bytes, offsets: basic[0-31], camera3D[32-55], gradients[56-103])`);
  }

  getBuffer(): GPUBuffer {
    return this.uniformBuffer;
  }

  updateUniforms(data: UniformData, gradientStops: Array<{ color: string; position: number }>): void {
    // Procesar gradient stops primero para obtener el count correcto
    const processedStops = this.processGradientStops(gradientStops);

    this.uniformData[0] = data.aspect;
    this.uniformData[1] = data.time;
    this.uniformData[2] = data.vectorLength;
    this.uniformData[3] = data.vectorWidth;
    this.uniformData[4] = data.pixelToISO;
    this.uniformData[5] = data.zoom;
    this.uniformData[6] = data.speed;
    this.uniformData[7] = processedStops.count; // Usar el count procesado, no el del data
    this.uniformData[8] = data.param1;
    this.uniformData[9] = data.param2;
    this.uniformData[10] = data.param3;
    this.uniformData[11] = data.maxLength;
    this.uniformData[12] = data.mouseX;
    this.uniformData[13] = data.mouseY;
    this.uniformData[14] = data.mouseActive;
    this.uniformData[15] = data.colorR;
    this.uniformData[16] = data.colorG;
    this.uniformData[17] = data.colorB;
    this.uniformData[18] = data.gradientEnabled;
    this.uniformData[19] = 0;
    this.uniformData[20] = data.gradientMode;
    this.uniformData[21] = data.gradientType;
    this.uniformData[22] = data.linearDirX;
    this.uniformData[23] = data.linearDirY;
    this.uniformData[24] = data.linearMin;
    this.uniformData[25] = data.linearMax;
    this.uniformData[26] = data.radialMax;
    this.uniformData[27] = data.seed;
    this.uniformData[28] = 0; // padding1
    this.uniformData[29] = 0; // padding (alineación vec4f)
    this.uniformData[30] = 0; // padding
    this.uniformData[31] = 0; // padding

    // Offsets 32-55 reservados para datos de cámara 3D (se escriben en updateCamera3D)
    // Gradient stops ahora en offset 56
    this.uniformData.set(processedStops.data, 56);

    let hasChanged = this.uniformsDirty;
    if (!hasChanged) {
      for (let i = 0; i < this.uniformData.length; i++) {
        if (this.uniformData[i] !== this.lastUniformData[i]) {
          hasChanged = true;
          break;
        }
      }
    }

    if (hasChanged) {
      const bytes = new Uint8Array(this.uniformData.buffer, this.uniformData.byteOffset, this.uniformData.byteLength);
      this.device.queue.writeBuffer(this.uniformBuffer, 0, bytes as BufferSource);
      this.lastUniformData.set(this.uniformData);
      this.uniformsDirty = false;
    }
  }

  private processGradientStops(stops: Array<{ color: string; position: number }>): {
    data: Float32Array;
    count: number;
  } {
    if (stops.length === 0) {
      this.gradientStopsCache.lastHash = '';
      this.gradientStopsCache.cachedCount = 0;
      return {
        data: this.gradientStopsCache.cachedData,
        count: 0,
      };
    }

    const hash = stops
      .map((s) => `${s.color}|${(s.position ?? 0).toFixed(3)}`)
      .join(',');

    if (hash === this.gradientStopsCache.lastHash) {
      return {
        data: this.gradientStopsCache.cachedData,
        count: this.gradientStopsCache.cachedCount,
      };
    }

    const sortedStops = [...stops]
      .sort((a, b) => {
        const posA = a.position ?? 0;
        const posB = b.position ?? 0;
        return posA - posB;
      })
      .slice(0, MAX_GRADIENT_STOPS);

    const data = this.gradientStopsCache.cachedData;
    data.fill(0);

    sortedStops.forEach((stop, index) => {
      const rgb = this.hexToRgb(stop.color);
      const position = Math.min(1, Math.max(0, stop.position ?? index / Math.max(1, sortedStops.length - 1)));
      const offset = index * 4;
      data[offset + 0] = rgb.r;
      data[offset + 1] = rgb.g;
      data[offset + 2] = rgb.b;
      data[offset + 3] = position;
    });

    this.gradientStopsCache.lastHash = hash;
    this.gradientStopsCache.cachedCount = sortedStops.length;

    return {
      data,
      count: sortedStops.length,
    };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        }
      : { r: 1, g: 1, b: 1 };
  }

  /**
   * Update camera 3D uniforms (viewProjMatrix, cameraPos, renderMode)
   * Writes to offsets 32-55
   */
  updateCamera3D(viewProjMatrix: Float32Array, cameraPos: { x: number; y: number; z: number }, renderMode: '2D' | '3D'): void {
    // viewProjMatrix: 16 floats (mat4x4) at offset 32-47
    for (let i = 0; i < 16; i++) {
      this.uniformData[32 + i] = viewProjMatrix[i];
    }

    // cameraPos: 3 floats (vec3f) at offset 48-50
    this.uniformData[48] = cameraPos.x;
    this.uniformData[49] = cameraPos.y;
    this.uniformData[50] = cameraPos.z;

    // renderMode: 1 float at offset 51
    this.uniformData[51] = renderMode === '3D' ? 1.0 : 0.0;

    // Padding at offsets 52-55 (for vec4f alignment)
    this.uniformData[52] = 0;
    this.uniformData[53] = 0;
    this.uniformData[54] = 0;
    this.uniformData[55] = 0;

    // Mark as dirty to force write
    this.uniformsDirty = true;
  }

  markDirty(): void {
    this.uniformsDirty = true;
  }

  dispose(): void {
    this.uniformBuffer.destroy();
  }
}
