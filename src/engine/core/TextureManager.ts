/**
 * TextureManager - Gestiona todas las texturas del motor WebGPU
 * Responsabilidades:
 * - Texturas MSAA para antialiasing
 * - Render-to-texture para post-processing
 * - Ping-pong buffers para blur
 * - Bloom textures (multi-pass)
 * - Samplers y vistas
 */

export interface TextureSet {
  texture: GPUTexture;
  view: GPUTextureView;
}

export interface PostProcessTextures {
  // Render target MSAA (donde renderizamos los vectores)
  renderMSAA: TextureSet;
  
  // Textura resuelta (non-MSAA) para samplear en post-process
  resolved: TextureSet;
  
  // Blur texture (ping-pong para separable blur)
  blur: TextureSet;
  
  // Bloom textures (multi-pass bloom)
  bloomExtract: TextureSet;   // Bright pass
  bloomBlur1: TextureSet;     // Horizontal blur
  bloomBlur2: TextureSet;     // Vertical blur (resultado final)
  
  // Sampler para todas las texturas
  sampler: GPUSampler;
}

export class TextureManager {
  private device: GPUDevice;
  private canvas: HTMLCanvasElement;
  private sampleCount: number = 4; // 4x MSAA
  
  private postProcessTextures: PostProcessTextures | null = null;

  constructor(device: GPUDevice, canvas: HTMLCanvasElement) {
    this.device = device;
    this.canvas = canvas;
  }

  /**
   * Obtiene las texturas de post-processing
   * Crea si no existen, reutiliza si las dimensiones coinciden
   */
  getPostProcessTextures(canvasFormat: GPUTextureFormat): PostProcessTextures {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Si existen y las dimensiones coinciden, reutilizar
    if (this.postProcessTextures) {
      const currentSize = this.postProcessTextures.resolved.texture.width;
      if (currentSize === width) {
        return this.postProcessTextures;
      }
    }

    // Destruir texturas antiguas si existen
    if (this.postProcessTextures) {
      this.destroyPostProcessTextures();
    }

    // Crear nuevas texturas
    this.postProcessTextures = this.createPostProcessTextures(width, height, canvasFormat);
    
    return this.postProcessTextures;
  }

  /**
   * Crea todas las texturas de post-processing
   */
  private createPostProcessTextures(
    width: number,
    height: number,
    format: GPUTextureFormat
  ): PostProcessTextures {
    console.log(`🎨 Creando texturas de post-processing: ${width}x${height}`);

    // Render target MSAA (4x antialiasing)
    const renderMSAA = this.createMSAATexture(width, height, format);

    // Textura resuelta (non-MSAA, para samplear en shaders)
    const resolved = this.createStandardTexture(width, height, format);

    // Blur texture (ping-pong)
    const blur = this.createStandardTexture(width, height, format);

    // Bloom textures (para multi-pass bloom)
    const bloomExtract = this.createStandardTexture(width, height, format);
    const bloomBlur1 = this.createStandardTexture(width, height, format);
    const bloomBlur2 = this.createStandardTexture(width, height, format);

    // Sampler compartido
    const sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });

    console.log('✅ Texturas de post-processing creadas');

    return {
      renderMSAA,
      resolved,
      blur,
      bloomExtract,
      bloomBlur1,
      bloomBlur2,
      sampler,
    };
  }

  /**
   * Crea una textura MSAA
   */
  private createMSAATexture(
    width: number,
    height: number,
    format: GPUTextureFormat
  ): TextureSet {
    const texture = this.device.createTexture({
      size: { width, height },
      sampleCount: this.sampleCount,
      format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const view = texture.createView();

    return { texture, view };
  }

  /**
   * Crea una textura estándar (non-MSAA)
   */
  private createStandardTexture(
    width: number,
    height: number,
    format: GPUTextureFormat
  ): TextureSet {
    const texture = this.device.createTexture({
      size: { width, height },
      format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    const view = texture.createView();

    return { texture, view };
  }

  /**
   * Destruye todas las texturas de post-processing
   */
  private destroyPostProcessTextures(): void {
    if (!this.postProcessTextures) return;

    const textures = this.postProcessTextures;
    
    textures.renderMSAA.texture.destroy();
    textures.resolved.texture.destroy();
    textures.blur.texture.destroy();
    textures.bloomExtract.texture.destroy();
    textures.bloomBlur1.texture.destroy();
    textures.bloomBlur2.texture.destroy();

    this.postProcessTextures = null;
    console.log('🧹 Texturas de post-processing destruidas');
  }

  /**
   * Actualiza las dimensiones del canvas y recrea texturas si es necesario
   */
  updateCanvasDimensions(canvasFormat: GPUTextureFormat): void {
    if (this.canvas.width === 0 || this.canvas.height === 0) {
      console.warn('⚠️ Canvas tiene dimensiones 0');
      return;
    }

    // getPostProcessTextures verifica dimensiones internamente
    this.getPostProcessTextures(canvasFormat);
  }

  /**
   * Obtiene el tamaño de MSAA configurado
   */
  getMSAASampleCount(): number {
    return this.sampleCount;
  }

  /**
   * Cambia el nivel de MSAA (requiere recrear texturas)
   */
  setMSAASampleCount(sampleCount: 2 | 4 | 8): void {
    if (this.sampleCount === sampleCount) return;
    
    this.sampleCount = sampleCount;
    console.log(`🔄 MSAA actualizado a ${sampleCount}x`);
    
    // Recrear texturas con nuevo MSAA
    if (this.postProcessTextures) {
      this.destroyPostProcessTextures();
      const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
      this.getPostProcessTextures(canvasFormat);
    }
  }

  /**
   * Limpia recursos
   */
  dispose(): void {
    this.destroyPostProcessTextures();
  }
}
