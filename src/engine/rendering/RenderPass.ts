/**
 * RenderPass - Abstracción de render passes WebGPU
 * Responsabilidades:
 * - Configurar render passes
 * - Manejar attachments (color, depth, MSAA)
 * - Clear/load operations
 * - Viewport y scissor rect
 */

export interface RenderPassConfig {
  label: string;
  colorView: GPUTextureView;
  colorResolveTarget?: GPUTextureView;
  depthView?: GPUTextureView;
  clearColor?: GPUColor;
  loadOp?: 'clear' | 'load';
  storeOp?: 'store' | 'discard';
  viewport?: {
    x: number;
    y: number;
    width: number;
    height: number;
    minDepth: number;
    maxDepth: number;
  };
  scissorRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class RenderPass {
  private config: RenderPassConfig;
  private descriptor: GPURenderPassDescriptor;

  constructor(config: RenderPassConfig) {
    this.config = config;
    this.descriptor = this.createDescriptor();
  }

  private createDescriptor(): GPURenderPassDescriptor {
    const loadOp = this.config.loadOp || 'clear';
    const storeOp = this.config.storeOp || 'store';
    const clearColor = this.config.clearColor || { r: 0, g: 0, b: 0, a: 1 };

    const colorAttachment: GPURenderPassColorAttachment = {
      view: this.config.colorView,
      resolveTarget: this.config.colorResolveTarget,
      clearValue: clearColor,
      loadOp,
      storeOp,
    };

    const descriptor: GPURenderPassDescriptor = {
      label: this.config.label,
      colorAttachments: [colorAttachment],
    };

    if (this.config.depthView) {
      descriptor.depthStencilAttachment = {
        view: this.config.depthView,
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      };
    }

    return descriptor;
  }

  getDescriptor(): GPURenderPassDescriptor {
    return this.descriptor;
  }

  execute(
    commandEncoder: GPUCommandEncoder,
    callback: (passEncoder: GPURenderPassEncoder) => void
  ): void {
    const passEncoder = commandEncoder.beginRenderPass(this.descriptor);

    if (this.config.viewport) {
      const vp = this.config.viewport;
      passEncoder.setViewport(vp.x, vp.y, vp.width, vp.height, vp.minDepth, vp.maxDepth);
    }

    if (this.config.scissorRect) {
      const sr = this.config.scissorRect;
      passEncoder.setScissorRect(sr.x, sr.y, sr.width, sr.height);
    }

    callback(passEncoder);
    passEncoder.end();
  }

  updateColorView(view: GPUTextureView, resolveTarget?: GPUTextureView): void {
    this.config.colorView = view;
    this.config.colorResolveTarget = resolveTarget;
    this.descriptor = this.createDescriptor();
  }

  setClearColor(color: GPUColor): void {
    this.config.clearColor = color;
    this.descriptor = this.createDescriptor();
  }

  getConfig(): RenderPassConfig {
    return { ...this.config };
  }
}

export class RenderPassBuilder {
  private config: Partial<RenderPassConfig> = {};

  label(label: string): this {
    this.config.label = label;
    return this;
  }

  colorView(view: GPUTextureView): this {
    this.config.colorView = view;
    return this;
  }

  colorResolveTarget(view: GPUTextureView | undefined): this {
    this.config.colorResolveTarget = view;
    return this;
  }

  depthView(view: GPUTextureView | undefined): this {
    this.config.depthView = view;
    return this;
  }

  clearColor(r: number, g: number, b: number, a = 1): this {
    this.config.clearColor = { r, g, b, a };
    return this;
  }

  loadOp(op: 'clear' | 'load'): this {
    this.config.loadOp = op;
    return this;
  }

  storeOp(op: 'store' | 'discard'): this {
    this.config.storeOp = op;
    return this;
  }

  viewport(x: number, y: number, width: number, height: number, minDepth = 0, maxDepth = 1): this {
    this.config.viewport = { x, y, width, height, minDepth, maxDepth };
    return this;
  }

  scissorRect(x: number, y: number, width: number, height: number): this {
    this.config.scissorRect = { x, y, width, height };
    return this;
  }

  build(): RenderPass {
    if (!this.config.label) {
      this.config.label = 'Unnamed Render Pass';
    }
    if (!this.config.colorView) {
      throw new Error('colorView es requerido');
    }

    return new RenderPass(this.config as RenderPassConfig);
  }
}
