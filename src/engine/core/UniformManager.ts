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

    const uniformFloats = 32 + MAX_GRADIENT_STOPS * 4;
    const uniformBytes = uniformFloats * Float32Array.BYTES_PER_ELEMENT;
    const paddedSize = Math.ceil(uniformBytes / 16) * 16;

    this.uniformBuffer = device.createBuffer({
      size: paddedSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: false,
    });

    this.uniformData = new Float32Array(uniformFloats);
    this.lastUniformData = new Float32Array(uniformFloats);

    console.log(`✅ UniformManager creado (${paddedSize} bytes)`);
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
    this.uniformData[28] = 0;
    this.uniformData[29] = 0;
    this.uniformData[30] = 0;
    this.uniformData[31] = 0;

    this.uniformData.set(processedStops.data, 32);

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
      this.device.queue.writeBuffer(this.uniformBuffer, 0, bytes);
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

  markDirty(): void {
    this.uniformsDirty = true;
  }

  dispose(): void {
    this.uniformBuffer.destroy();
  }
}
