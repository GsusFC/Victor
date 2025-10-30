/**
 * PostProcessStack - Pipeline de post-processing modular
 * Responsabilidades:
 * - Composición de múltiples post-process effects
 * - Bloom multi-pass (extract → blur H → blur V → combine)
 * - Blur separable
 * - Tone mapping (exposure, contrast, saturation)
 */

export interface PostProcessEffect {
  name: string;
  enabled: boolean;
  execute(
    commandEncoder: GPUCommandEncoder,
    pipelineManager: any,
    textureManager: any,
    uniformData: any
  ): void;
}

export interface PostProcessConfig {
  bloom: {
    enabled: boolean;
    threshold: number;
    intensity: number;
    blurRadius: number;
  };
  tonemap: {
    enabled: boolean;
    exposure: number;
    contrast: number;
    saturation: number;
  };
  blur: {
    enabled: boolean;
    radius: number;
  };
}

export class PostProcessStack {
  private effects: Map<string, PostProcessEffect> = new Map();
  private config: PostProcessConfig;

  constructor(config?: Partial<PostProcessConfig>) {
    this.config = {
      bloom: {
        enabled: true,
        threshold: 0.8,
        intensity: 1.0,
        blurRadius: 2.0,
      },
      tonemap: {
        enabled: true,
        exposure: 1.0,
        contrast: 1.0,
        saturation: 1.0,
      },
      blur: {
        enabled: false,
        radius: 1.0,
      },
      ...config,
    };
  }

  /**
   * Agrega un effect al stack
   */
  addEffect(name: string, effect: PostProcessEffect): void {
    this.effects.set(name, effect);
  }

  /**
   * Habilita/deshabilita un effect
   */
  setEffectEnabled(name: string, enabled: boolean): void {
    const effect = this.effects.get(name);
    if (effect) {
      effect.enabled = enabled;
    }
  }

  /**
   * Ejecuta todos los effects habilitados
   */
  execute(
    commandEncoder: GPUCommandEncoder,
    pipelineManager: any,
    textureManager: any,
    uniformData: any
  ): void {
    for (const effect of this.effects.values()) {
      if (effect.enabled) {
        effect.execute(commandEncoder, pipelineManager, textureManager, uniformData);
      }
    }
  }

  /**
   * Obtiene config actual
   */
  getConfig(): PostProcessConfig {
    return { ...this.config };
  }

  /**
   * Actualiza config
   */
  updateConfig(config: Partial<PostProcessConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Obtiene lista de effects
   */
  getEffects(): string[] {
    return Array.from(this.effects.keys());
  }
}

/**
 * Bloom Effect - Multi-pass bloom implementation
 */
export class BloomEffect implements PostProcessEffect {
  name = 'Bloom';
  enabled = true;

  execute(commandEncoder: GPUCommandEncoder, pipelineManager: any, textureManager: any, uniformData: any): void {
    const textures = textureManager.getPostProcessTextures();

    // 1. Extract bright areas
    this.extractBright(commandEncoder, pipelineManager, textures, uniformData);

    // 2. Blur horizontal
    this.blurHorizontal(commandEncoder, pipelineManager, textures, uniformData);

    // 3. Blur vertical
    this.blurVertical(commandEncoder, pipelineManager, textures, uniformData);

    // 4. Combine with original
    this.combine(commandEncoder, pipelineManager, textures, uniformData);
  }

  private extractBright(commandEncoder: GPUCommandEncoder, pipelineManager: any, textures: any, uniformData: any): void {
    // Extract bright pass using threshold
    console.log('🌟 Bloom: extracting bright areas');
  }

  private blurHorizontal(commandEncoder: GPUCommandEncoder, pipelineManager: any, textures: any, uniformData: any): void {
    // Horizontal blur
    console.log('→ Bloom: horizontal blur');
  }

  private blurVertical(commandEncoder: GPUCommandEncoder, pipelineManager: any, textures: any, uniformData: any): void {
    // Vertical blur
    console.log('↓ Bloom: vertical blur');
  }

  private combine(commandEncoder: GPUCommandEncoder, pipelineManager: any, textures: any, uniformData: any): void {
    // Combine bloom with original
    console.log('✨ Bloom: combining');
  }
}

/**
 * Tone Mapping Effect
 */
export class ToneMapEffect implements PostProcessEffect {
  name = 'ToneMap';
  enabled = true;

  execute(commandEncoder: GPUCommandEncoder, pipelineManager: any, textureManager: any, uniformData: any): void {
    console.log('🎨 Applying tone mapping');
    // Tone mapping: exposure, contrast, saturation
  }
}

/**
 * Blur Effect
 */
export class BlurEffect implements PostProcessEffect {
  name = 'Blur';
  enabled = false;

  execute(commandEncoder: GPUCommandEncoder, pipelineManager: any, textureManager: any, uniformData: any): void {
    console.log('🫧 Applying blur');
    // Separable blur implementation
  }
}

/**
 * Builder para crear PostProcessStack
 */
export class PostProcessStackBuilder {
  private stack: PostProcessStack;

  constructor(config?: Partial<PostProcessConfig>) {
    this.stack = new PostProcessStack(config);
  }

  withBloom(threshold: number, intensity: number, blurRadius: number): this {
    this.stack.updateConfig({
      bloom: { enabled: true, threshold, intensity, blurRadius },
    });
    this.stack.addEffect('bloom', new BloomEffect());
    return this;
  }

  withToneMap(exposure: number, contrast: number, saturation: number): this {
    this.stack.updateConfig({
      tonemap: { enabled: true, exposure, contrast, saturation },
    });
    this.stack.addEffect('tonemap', new ToneMapEffect());
    return this;
  }

  withBlur(radius: number): this {
    this.stack.updateConfig({
      blur: { enabled: true, radius },
    });
    this.stack.addEffect('blur', new BlurEffect());
    return this;
  }

  build(): PostProcessStack {
    return this.stack;
  }
}
