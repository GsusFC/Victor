/**
 * ComputePass - Abstracción de compute passes WebGPU
 * Responsabilidades:
 * - Configurar compute passes
 * - Dispatch automático con workgroup optimization
 * - Bind groups management
 */

export interface ComputePassConfig {
  label: string;
  pipeline: GPUComputePipeline;
  bindGroups: GPUBindGroup[];
  workgroupSizeX: number;
  workgroupSizeY?: number;
  workgroupSizeZ?: number;
}

export class ComputePass {
  private config: ComputePassConfig;

  constructor(config: ComputePassConfig) {
    this.config = config;
  }

  execute(commandEncoder: GPUCommandEncoder): void {
    const passEncoder = commandEncoder.beginComputePass({
      label: this.config.label,
    });

    passEncoder.setPipeline(this.config.pipeline);

    this.config.bindGroups.forEach((bindGroup, index) => {
      passEncoder.setBindGroup(index, bindGroup);
    });

    passEncoder.dispatchWorkgroups(
      this.config.workgroupSizeX,
      this.config.workgroupSizeY || 1,
      this.config.workgroupSizeZ || 1
    );

    passEncoder.end();
  }

  executeIndirect(commandEncoder: GPUCommandEncoder, indirectBuffer: GPUBuffer, indirectOffset: number): void {
    const passEncoder = commandEncoder.beginComputePass({
      label: this.config.label,
    });

    passEncoder.setPipeline(this.config.pipeline);

    this.config.bindGroups.forEach((bindGroup, index) => {
      passEncoder.setBindGroup(index, bindGroup);
    });

    passEncoder.dispatchWorkgroupsIndirect(indirectBuffer, indirectOffset);
    passEncoder.end();
  }

  setBindGroups(bindGroups: GPUBindGroup[]): void {
    this.config.bindGroups = bindGroups;
  }

  setWorkgroupSize(x: number, y = 1, z = 1): void {
    this.config.workgroupSizeX = x;
    this.config.workgroupSizeY = y;
    this.config.workgroupSizeZ = z;
  }

  getConfig(): ComputePassConfig {
    return { ...this.config };
  }
}

export class ComputePassBuilder {
  private config: Partial<ComputePassConfig> = {};

  label(label: string): this {
    this.config.label = label;
    return this;
  }

  pipeline(pipeline: GPUComputePipeline): this {
    this.config.pipeline = pipeline;
    return this;
  }

  bindGroups(bindGroups: GPUBindGroup[]): this {
    this.config.bindGroups = bindGroups;
    return this;
  }

  addBindGroup(bindGroup: GPUBindGroup): this {
    if (!this.config.bindGroups) {
      this.config.bindGroups = [];
    }
    this.config.bindGroups.push(bindGroup);
    return this;
  }

  workgroupSize(x: number, y = 1, z = 1): this {
    this.config.workgroupSizeX = x;
    this.config.workgroupSizeY = y;
    this.config.workgroupSizeZ = z;
    return this;
  }

  build(): ComputePass {
    if (!this.config.label) {
      this.config.label = 'Unnamed Compute Pass';
    }
    if (!this.config.pipeline) {
      throw new Error('pipeline es requerido');
    }
    if (!this.config.bindGroups) {
      this.config.bindGroups = [];
    }
    if (!this.config.workgroupSizeX) {
      this.config.workgroupSizeX = 1;
    }

    return new ComputePass(this.config as ComputePassConfig);
  }
}
