/**
 * PipelineManager - Gestiona creación y caching de pipelines WebGPU
 * Responsabilidades:
 * - Crear render pipeline principal
 * - Crear compute pipelines para 30+ animaciones
 * - Caching de pipelines para reutilización
 * - Bind group layouts compartidos
 * - Workgroup size optimization
 */

import type { AnimationType } from '@/types/engine';

export interface PipelineSet {
  render: GPURenderPipeline;
  compute: Map<AnimationType, GPUComputePipeline>;
  fade: GPURenderPipeline;
  postProcess: GPURenderPipeline;
  blur: GPURenderPipeline;
  bloomExtract: GPURenderPipeline;
  bloomBlur: GPURenderPipeline;
  bloomCombine: GPURenderPipeline;
}

export interface BindGroupLayouts {
  render: GPUBindGroupLayout;
  compute: GPUBindGroupLayout;
  fade: GPUBindGroupLayout;
  postProcess: GPUBindGroupLayout;
  bloomExtract: GPUBindGroupLayout;
  bloomBlur: GPUBindGroupLayout;
  bloomCombine: GPUBindGroupLayout;
}

export class PipelineManager {
  private device: GPUDevice;
  private canvasFormat: GPUTextureFormat;
  private sampleCount: number = 4;
  
  private pipelines: PipelineSet | null = null;
  private bindGroupLayouts: BindGroupLayouts | null = null;
  private optimalWorkgroupSize: number = 64;

  constructor(device: GPUDevice, canvasFormat: GPUTextureFormat) {
    this.device = device;
    this.canvasFormat = canvasFormat;
    this.optimalWorkgroupSize = this.calculateOptimalWorkgroupSize();
  }

  /**
   * Obtiene todos los pipelines
   * Crea si no existen
   */
  getPipelines(
    renderShaderModule: GPUShaderModule,
    fadeShaderModule: GPUShaderModule,
    postProcessShaderModule: GPUShaderModule,
    blurShaderModule: GPUShaderModule,
    bloomExtractShaderModule: GPUShaderModule,
    bloomBlurShaderModule: GPUShaderModule,
    bloomCombineShaderModule: GPUShaderModule,
    computeShaderModules: Map<AnimationType, GPUShaderModule>
  ): PipelineSet {
    if (this.pipelines) {
      return this.pipelines;
    }

    this.pipelines = this.createPipelines(
      renderShaderModule,
      fadeShaderModule,
      postProcessShaderModule,
      blurShaderModule,
      bloomExtractShaderModule,
      bloomBlurShaderModule,
      bloomCombineShaderModule,
      computeShaderModules
    );

    return this.pipelines;
  }

  /**
   * Obtiene los bind group layouts
   */
  getBindGroupLayouts(): BindGroupLayouts {
    if (this.bindGroupLayouts) {
      return this.bindGroupLayouts;
    }

    this.bindGroupLayouts = this.createBindGroupLayouts();
    return this.bindGroupLayouts;
  }

  /**
   * Crea todos los pipelines
   */
  private createPipelines(
    renderShaderModule: GPUShaderModule,
    fadeShaderModule: GPUShaderModule,
    postProcessShaderModule: GPUShaderModule,
    blurShaderModule: GPUShaderModule,
    bloomExtractShaderModule: GPUShaderModule,
    bloomBlurShaderModule: GPUShaderModule,
    bloomCombineShaderModule: GPUShaderModule,
    computeShaderModules: Map<AnimationType, GPUShaderModule>
  ): PipelineSet {
    console.log('🔧 Creando pipelines WebGPU...');

    const layouts = this.getBindGroupLayouts();

    // Render pipeline
    const render = this.createRenderPipeline(renderShaderModule, layouts.render);

    // Compute pipelines
    const compute = this.createComputePipelines(computeShaderModules, layouts.compute);

    // Fade pipeline (para trails)
    const fade = this.createFadePipeline(fadeShaderModule, layouts.fade);

    // Post-process pipelines
    const postProcess = this.createPostProcessPipeline(postProcessShaderModule, layouts.postProcess);
    const blur = this.createBlurPipeline(blurShaderModule, layouts.postProcess);

    // Advanced bloom pipelines
    const bloomExtract = this.createBloomExtractPipeline(bloomExtractShaderModule, layouts.bloomExtract);
    const bloomBlur = this.createBloomBlurPipeline(bloomBlurShaderModule, layouts.bloomBlur);
    const bloomCombine = this.createBloomCombinePipeline(bloomCombineShaderModule, layouts.bloomCombine);

    console.log(`✅ Pipelines creados (render + fade + post-process + bloom + ${compute.size} compute)`);

    return {
      render,
      compute,
      fade,
      postProcess,
      blur,
      bloomExtract,
      bloomBlur,
      bloomCombine,
    };
  }

  /**
   * Crea render pipeline
   */
  private createRenderPipeline(
    shaderModule: GPUShaderModule,
    bindGroupLayout: GPUBindGroupLayout
  ): GPURenderPipeline {
    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Vector Render Pipeline Layout',
      bindGroupLayouts: [bindGroupLayout],
    });

    return this.device.createRenderPipeline({
      label: 'Vector Render Pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
        buffers: [
          {
            arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
            stepMode: 'vertex',
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: 'float32x2',
              },
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: this.canvasFormat,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
            },
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
      },
      multisample: {
        count: this.sampleCount,
      },
    });
  }

  /**
   * Crea compute pipelines para animaciones
   */
  private createComputePipelines(
    shaderModules: Map<AnimationType, GPUShaderModule>,
    bindGroupLayout: GPUBindGroupLayout
  ): Map<AnimationType, GPUComputePipeline> {
    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Vector Compute Pipeline Layout',
      bindGroupLayouts: [bindGroupLayout],
    });

    const pipelines = new Map<AnimationType, GPUComputePipeline>();

    for (const [type, module] of shaderModules) {
      const pipeline = this.device.createComputePipeline({
        label: `${type} Compute Pipeline`,
        layout: pipelineLayout,
        compute: {
          module,
          entryPoint: 'computeMain',
        },
      });

      pipelines.set(type, pipeline);
    }

    return pipelines;
  }

  /**
   * Crea fade pipeline (para trails)
   */
  private createFadePipeline(
    shaderModule: GPUShaderModule,
    bindGroupLayout: GPUBindGroupLayout
  ): GPURenderPipeline {
    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Fade Pipeline Layout',
      bindGroupLayouts: [bindGroupLayout],
    });

    return this.device.createRenderPipeline({
      label: 'Fade Render Pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: this.canvasFormat,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
            },
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
      },
      multisample: {
        count: this.sampleCount,
      },
    });
  }

  /**
   * Crea post-process pipeline
   */
  private createPostProcessPipeline(
    shaderModule: GPUShaderModule,
    bindGroupLayout: GPUBindGroupLayout
  ): GPURenderPipeline {
    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Post-Process Pipeline Layout',
      bindGroupLayouts: [bindGroupLayout],
    });

    return this.device.createRenderPipeline({
      label: 'Post-Process Pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.canvasFormat }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  /**
   * Crea blur pipeline
   */
  private createBlurPipeline(
    shaderModule: GPUShaderModule,
    bindGroupLayout: GPUBindGroupLayout
  ): GPURenderPipeline {
    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Blur Pipeline Layout',
      bindGroupLayouts: [bindGroupLayout],
    });

    return this.device.createRenderPipeline({
      label: 'Blur Pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.canvasFormat }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  /**
   * Crea bloom extract pipeline
   */
  private createBloomExtractPipeline(
    shaderModule: GPUShaderModule,
    bindGroupLayout: GPUBindGroupLayout
  ): GPURenderPipeline {
    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Bloom Extract Pipeline Layout',
      bindGroupLayouts: [bindGroupLayout],
    });

    return this.device.createRenderPipeline({
      label: 'Bloom Extract Pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.canvasFormat }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  /**
   * Crea bloom blur pipeline
   */
  private createBloomBlurPipeline(
    shaderModule: GPUShaderModule,
    bindGroupLayout: GPUBindGroupLayout
  ): GPURenderPipeline {
    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Bloom Blur Pipeline Layout',
      bindGroupLayouts: [bindGroupLayout],
    });

    return this.device.createRenderPipeline({
      label: 'Bloom Blur Pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.canvasFormat }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  /**
   * Crea bloom combine pipeline
   */
  private createBloomCombinePipeline(
    shaderModule: GPUShaderModule,
    bindGroupLayout: GPUBindGroupLayout
  ): GPURenderPipeline {
    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Bloom Combine Pipeline Layout',
      bindGroupLayouts: [bindGroupLayout],
    });

    return this.device.createRenderPipeline({
      label: 'Bloom Combine Pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: this.canvasFormat }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  /**
   * Crea todos los bind group layouts
   */
  private createBindGroupLayouts(): BindGroupLayouts {
    const render = this.device.createBindGroupLayout({
      label: 'Vector Render Bind Group Layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: 'read-only-storage' },
        },
      ],
    });

    const compute = this.device.createBindGroupLayout({
      label: 'Vector Compute Bind Group Layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' },
        },
      ],
    });

    const fade = this.device.createBindGroupLayout({
      label: 'Fade Bind Group Layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    const postProcess = this.device.createBindGroupLayout({
      label: 'Post-Process Bind Group Layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      ],
    });

    const bloomExtract = this.device.createBindGroupLayout({
      label: 'Bloom Extract Bind Group Layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    const bloomBlur = this.device.createBindGroupLayout({
      label: 'Bloom Blur Bind Group Layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    const bloomCombine = this.device.createBindGroupLayout({
      label: 'Bloom Combine Bind Group Layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    return {
      render,
      compute,
      fade,
      postProcess,
      bloomExtract,
      bloomBlur,
      bloomCombine,
    };
  }

  /**
   * Calcula el tamaño óptimo de workgroup
   */
  private calculateOptimalWorkgroupSize(): number {
    if (!this.device) return 64;

    const limits = this.device.limits;
    let size = 256;

    size = Math.min(size, limits.maxComputeWorkgroupSizeX, limits.maxComputeInvocationsPerWorkgroup);
    size = Math.pow(2, Math.floor(Math.log2(size)));
    size = Math.max(32, size);

    return size;
  }

  /**
   * Obtiene el workgroup size óptimo
   */
  getOptimalWorkgroupSize(): number {
    return this.optimalWorkgroupSize;
  }

  /**
   * Limpia recursos
   */
  dispose(): void {
    this.pipelines = null;
    this.bindGroupLayouts = null;
  }
}
