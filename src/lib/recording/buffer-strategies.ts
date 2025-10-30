/**
 * recording/buffer-strategies.ts - Estrategias para obtener buffer de diferentes grabadores
 * Implementa patrón Chain of Responsibility para intentar múltiples métodos
 */

/**
 * Interfaz para una estrategia de obtención de buffer
 */
export interface BufferStrategy {
  readonly name: string;
  tryGetBuffer(recorder: any): Promise<ArrayBuffer | Uint8Array | Blob[] | null>;
}

/**
 * Estrategia 1: Usar recorder.stop() directamente
 */
export class StopStrategy implements BufferStrategy {
  readonly name = 'stop()';

  async tryGetBuffer(recorder: any): Promise<ArrayBuffer | Uint8Array | Blob[] | null> {
    if (typeof recorder.stop !== 'function') {
      return null;
    }

    try {
      console.log(`💡 Intentando ${this.name}...`);
      const buffer = await recorder.stop();
      if (buffer) {
        console.log(`✅ ${this.name} exitoso`);
      }
      return buffer || null;
    } catch (error) {
      console.warn(`⚠️ ${this.name} falló:`, error);
      return null;
    }
  }
}

/**
 * Estrategia 2: Ejecutar flush() antes de stop() para asegurar que el encoder finalice
 */
export class FlushThenStopStrategy implements BufferStrategy {
  readonly name = 'flush() + stop()';

  async tryGetBuffer(recorder: any): Promise<ArrayBuffer | Uint8Array | Blob[] | null> {
    if (typeof recorder.flush !== 'function' || typeof recorder.stop !== 'function') {
      return null;
    }

    try {
      console.log(`💡 Intentando ${this.name}...`);
      await recorder.flush();
      const buffer = await recorder.stop();
      if (buffer) {
        console.log(`✅ ${this.name} exitoso`);
      }
      return buffer || null;
    } catch (error) {
      console.warn(`⚠️ ${this.name} falló:`, error);
      return null;
    }
  }
}

/**
 * Estrategia 3: Ejecutar render() explícitamente
 */
export class RenderStrategy implements BufferStrategy {
  readonly name = 'render()';

  async tryGetBuffer(recorder: any): Promise<ArrayBuffer | Uint8Array | Blob[] | null> {
    if (typeof recorder.render !== 'function') {
      return null;
    }

    try {
      console.log(`💡 Intentando ${this.name}...`);
      await recorder.render();
      console.log(`✅ ${this.name} completado`);
      // render() no retorna buffer, solo prepara los datos
      return null;
    } catch (error) {
      console.warn(`⚠️ ${this.name} falló:`, error);
      return null;
    }
  }
}

/**
 * Estrategia 4: Usar getBuffer() para obtener el buffer
 */
export class GetBufferStrategy implements BufferStrategy {
  readonly name = 'getBuffer()';

  async tryGetBuffer(recorder: any): Promise<ArrayBuffer | Uint8Array | Blob[] | null> {
    if (typeof recorder.getBuffer !== 'function') {
      return null;
    }

    try {
      console.log(`💡 Intentando ${this.name}...`);
      const buffer = recorder.getBuffer();
      if (buffer) {
        console.log(`✅ ${this.name} exitoso`);
      }
      return buffer || null;
    } catch (error) {
      console.warn(`⚠️ ${this.name} falló:`, error);
      return null;
    }
  }
}

/**
 * Estrategia 5: Usar finalize() para finalizar y obtener buffer
 */
export class FinalizeStrategy implements BufferStrategy {
  readonly name = 'finalize()';

  async tryGetBuffer(recorder: any): Promise<ArrayBuffer | Uint8Array | Blob[] | null> {
    if (typeof recorder.finalize !== 'function') {
      return null;
    }

    try {
      console.log(`💡 Intentando ${this.name}...`);
      const buffer = await recorder.finalize();
      if (buffer) {
        console.log(`✅ ${this.name} exitoso`);
      }
      return buffer || null;
    } catch (error) {
      console.warn(`⚠️ ${this.name} falló:`, error);
      return null;
    }
  }
}

/**
 * Ejecutor de cadena de estrategias
 * Intenta cada estrategia en orden hasta obtener un buffer válido
 */
export async function executeStrategyChain(
  recorder: any,
  strategies: BufferStrategy[]
): Promise<ArrayBuffer | Uint8Array | Blob[] | null> {
  for (const strategy of strategies) {
    const buffer = await strategy.tryGetBuffer(recorder);
    if (buffer) {
      return buffer;
    }
  }
  return null;
}

/**
 * Obtiene la cadena de estrategias recomendada para canvas-record
 */
export function getCanvasRecordStrategies(): BufferStrategy[] {
  return [
    new StopStrategy(),
    new FlushThenStopStrategy(),
    new RenderStrategy(), // render() no retorna buffer, pero prepara los datos
    new GetBufferStrategy(),
    new FinalizeStrategy(),
  ];
}
