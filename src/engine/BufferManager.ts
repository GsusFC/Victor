/**
 * BufferManager - Gestión unificada de buffers WebGPU
 * Maneja creación, actualización y pool de buffers reutilizables
 */

export interface BufferDescriptor {
  size: number;
  usage: GPUBufferUsageFlags;
  label?: string;
}

export class BufferManager {
  private device: GPUDevice;
  private buffers: Map<string, GPUBuffer> = new Map();
  private bufferPool: Map<string, GPUBuffer[]> = new Map();

  constructor(device: GPUDevice) {
    this.device = device;
  }

  /**
   * Crea o reutiliza un buffer del pool
   */
  createBuffer(descriptor: BufferDescriptor): GPUBuffer {
    const key = this.getBufferKey(descriptor);

    // Intentar reutilizar del pool
    const pooledBuffers = this.bufferPool.get(key);
    if (pooledBuffers && pooledBuffers.length > 0) {
      const buffer = pooledBuffers.pop()!;
      console.log(`♻️ Reutilizando buffer: ${descriptor.label || 'unnamed'}`);
      return buffer;
    }

    // Crear nuevo buffer
    const buffer = this.device.createBuffer({
      size: descriptor.size,
      usage: descriptor.usage,
      label: descriptor.label,
    });

    console.log(`✨ Buffer creado: ${descriptor.label || 'unnamed'} (${descriptor.size} bytes)`);
    return buffer;
  }

  /**
   * Crea buffer de vectores (4 floats por vector: baseX, baseY, angle, length)
   */
  createVectorBuffer(vectorCount: number, label?: string): GPUBuffer {
    const vectorSize = 4 * Float32Array.BYTES_PER_ELEMENT; // 16 bytes
    const size = vectorCount * vectorSize;

    return this.createBuffer({
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
      label: label || 'VectorBuffer',
    });
  }

  /**
   * Crea buffer de uniforms con alineación correcta
   */
  createUniformBuffer(sizeInFloats: number, label?: string): GPUBuffer {
    // WebGPU requiere alineación de 16 bytes para uniforms
    const alignedSize = Math.ceil(sizeInFloats / 4) * 4;
    const size = alignedSize * Float32Array.BYTES_PER_ELEMENT;

    return this.createBuffer({
      size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: label || 'UniformBuffer',
    });
  }

  /**
   * Actualiza datos de un buffer
   */
  updateBuffer(buffer: GPUBuffer, data: ArrayBuffer | ArrayBufferView, offset = 0): void {
    this.device.queue.writeBuffer(
      buffer,
      offset,
      data instanceof ArrayBuffer ? data : data.buffer,
      data instanceof ArrayBuffer ? 0 : data.byteOffset,
      data instanceof ArrayBuffer ? data.byteLength : data.byteLength
    );
  }

  /**
   * Registra un buffer para gestión (con label)
   */
  registerBuffer(label: string, buffer: GPUBuffer): void {
    this.buffers.set(label, buffer);
  }

  /**
   * Obtiene un buffer registrado por label
   */
  getBuffer(label: string): GPUBuffer | undefined {
    return this.buffers.get(label);
  }

  /**
   * Devuelve un buffer al pool para reutilización
   */
  recycleBuffer(descriptor: BufferDescriptor, buffer: GPUBuffer): void {
    const key = this.getBufferKey(descriptor);

    if (!this.bufferPool.has(key)) {
      this.bufferPool.set(key, []);
    }

    this.bufferPool.get(key)!.push(buffer);
  }

  /**
   * Destruye un buffer específico
   */
  destroyBuffer(label: string): void {
    const buffer = this.buffers.get(label);
    if (buffer) {
      buffer.destroy();
      this.buffers.delete(label);
      console.log(`🗑️ Buffer destruido: ${label}`);
    }
  }

  /**
   * Destruye todos los buffers gestionados
   */
  destroyAll(): void {
    // Destruir buffers registrados
    this.buffers.forEach((buffer, label) => {
      buffer.destroy();
      console.log(`🗑️ Buffer destruido: ${label}`);
    });
    this.buffers.clear();

    // Destruir buffers del pool
    this.bufferPool.forEach((buffers, key) => {
      buffers.forEach((buffer) => buffer.destroy());
      console.log(`🗑️ Pool destruido: ${key} (${buffers.length} buffers)`);
    });
    this.bufferPool.clear();
  }

  /**
   * Obtiene estadísticas de uso de memoria
   */
  getStats(): {
    registeredBuffers: number;
    pooledBuffers: number;
    totalPoolSize: number;
  } {
    let pooledBuffers = 0;
    this.bufferPool.forEach((buffers) => {
      pooledBuffers += buffers.length;
    });

    return {
      registeredBuffers: this.buffers.size,
      pooledBuffers,
      totalPoolSize: this.bufferPool.size,
    };
  }

  /**
   * Genera clave única para un descriptor de buffer
   */
  private getBufferKey(descriptor: BufferDescriptor): string {
    return `${descriptor.size}_${descriptor.usage}`;
  }
}
