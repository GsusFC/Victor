/**
 * WebGPUEngine - Motor principal para renderizado de campos vectoriales
 * Singleton que maneja inicialización, buffers, pipelines y render loop
 */

import { normalizeAngle } from '@/lib/math-utils';
import { vectorShader } from './shaders/render/vector.wgsl';
import { ShapeLibrary, type ShapeName } from './ShapeLibrary';
import {
  noneShader,
  staticShader,
  staticAngleShader,
  randomStaticShader,
  randomLoopShader,
  smoothWavesShader,
  seaWavesShader,
  perlinFlowShader,
  centerPulseShader,
  heartbeatShader,
  mouseInteractionShader,
  directionalFlowShader,
  tangenteClasicaShader,
  lissajousShader,
  geometricPatternShader,
  flockingShader,
  vortexShader,
  helicalCurlShader,
} from './shaders/compute/animations.wgsl';

const MAX_GRADIENT_STOPS = 6;

type VectorShape = ShapeName;

interface MouseUniform {
  x: number;
  y: number;
  active: boolean;
}

export type AnimationType =
  | 'none'
  | 'static'
  | 'staticAngle'
  | 'randomStatic'
  | 'randomLoop'
  | 'smoothWaves'
  | 'seaWaves'
  | 'perlinFlow'
  | 'mouseInteraction'
  | 'centerPulse'
  | 'heartbeat'
  | 'directionalFlow'
  | 'tangenteClasica'
  | 'lissajous'
  | 'geometricPattern'
  | 'flocking'
  | 'vortex'
  | 'helicalCurl';

export interface WebGPUEngineConfig {
  vectorCount: number;
  vectorLength: number;
  vectorWidth: number;
  gridRows: number;
  gridCols: number;
  vectorShape: VectorShape;
}

export class WebGPUEngine {
  private static instance: WebGPUEngine | null = null;

  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private canvas: HTMLCanvasElement | null = null;

  private renderPipeline: GPURenderPipeline | null = null;
  private computePipeline: GPUComputePipeline | null = null;
  private computePipelines: Map<AnimationType, GPUComputePipeline> = new Map();

  // Buffers
  private vectorBuffer: GPUBuffer | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private shapeBuffer: GPUBuffer | null = null; // Nuevo: geometría de la forma actual

  // MSAA
  private msaaTexture: GPUTexture | null = null;
  private msaaTextureView: GPUTextureView | null = null;
  private readonly sampleCount = 4; // 4x MSAA

  // Bind groups
  private renderBindGroup: GPUBindGroup | null = null;
  private computeBindGroup: GPUBindGroup | null = null;
  private computeBindGroupLayout: GPUBindGroupLayout | null = null;

  // Shape system
  private shapeLibrary: ShapeLibrary = new ShapeLibrary();
  private currentShapeVertexCount: number = 6; // Por defecto 'line' tiene 6 vértices

  // Estado
  private isInitialized = false;
  private isInitializing = false;
  private currentAnimationType: AnimationType = 'smoothWaves';
  private config: WebGPUEngineConfig = {
    vectorCount: 100,
    vectorLength: 20,
    vectorWidth: 2,
    gridRows: 10,
    gridCols: 10,
    vectorShape: 'line',
  };

  // Buffer preallocado para uniforms (optimización de memoria)
  private uniformDataBuffer: Float32Array = new Float32Array(28 + MAX_GRADIENT_STOPS * 4); // 27 uniforms + 1 padding + 24 gradient stops

  // Cache para cálculos de gradiente de campo
  private gradientFieldCache = {
    scope: 'vector' as 'vector' | 'field',
    type: 'linear' as 'linear' | 'radial',
    angle: 0,
    linearDirX: 1,
    linearDirY: 0,
    linearMin: -1,
    linearMax: 1,
    radialMax: Math.SQRT2,
  };

  // Cache inteligente para gradient stops - evita procesamiento en cada frame
  private gradientStopsCache: {
    lastHash: string | null;
    cachedData: Float32Array;
    cachedCount: number;
  } = {
    lastHash: null,
    cachedData: new Float32Array(MAX_GRADIENT_STOPS * 4),
    cachedCount: 0,
  };

  private constructor() {}

  static getInstance(): WebGPUEngine {
    if (!WebGPUEngine.instance) {
      WebGPUEngine.instance = new WebGPUEngine();
    }
    return WebGPUEngine.instance;
  }

  /**
   * Inicializa WebGPU con el canvas proporcionado
   */
  async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
    // Si ya está inicializado, no reinicializar
    if (this.isInitialized && this.device) {
      console.log('⏭️ WebGPUEngine ya inicializado, saltando...');
      return true;
    }

    // Si está inicializando, esperar a que termine
    if (this.isInitializing) {
      console.log('⏳ WebGPUEngine ya está inicializando, esperando...');
      // Esperar hasta que termine la inicialización
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return this.isInitialized;
    }

    // Marcar como inicializando
    this.isInitializing = true;

    try {
      console.log('🔧 Iniciando WebGPUEngine...');
      console.log('📐 Canvas dimensions:', canvas.width, 'x', canvas.height);

      this.canvas = canvas;

      // Verificar dimensiones del canvas
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error(`Canvas tiene dimensiones inválidas: ${canvas.width}x${canvas.height}`);
      }

      // Verificar soporte WebGPU
      if (!navigator.gpu) {
        throw new Error('WebGPU no está soportado en este navegador');
      }
      console.log('✅ navigator.gpu disponible');

      // Obtener adaptador
      this.adapter = await navigator.gpu.requestAdapter();
      if (!this.adapter) {
        throw new Error('No se pudo obtener un adaptador WebGPU');
      }
      console.log('✅ Adaptador WebGPU obtenido');

      // Obtener device
      this.device = await this.adapter.requestDevice();
      if (!this.device) {
        throw new Error('No se pudo obtener un dispositivo WebGPU');
      }
      console.log('✅ Dispositivo WebGPU obtenido');

      // Configurar context
      this.context = canvas.getContext('webgpu');
      if (!this.context) {
        throw new Error('No se pudo obtener el contexto WebGPU del canvas');
      }
      console.log('✅ Contexto WebGPU obtenido');

      const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: canvasFormat,
        alphaMode: 'premultiplied',
      });
      console.log(`✅ Contexto configurado (format: ${canvasFormat})`);

      // Crear texture MSAA para antialiasing
      this.createMSAATexture(canvas.width, canvas.height, canvasFormat);

      // Crear pipelines
      await this.createPipelines(canvasFormat);

      console.log('✅ WebGPU inicializado correctamente');
      this.isInitialized = true;
      this.isInitializing = false;
      return true;
    } catch (error) {
      console.error('❌ Error inicializando WebGPU:', error);
      this.isInitialized = false;
      this.isInitializing = false;
      return false;
    }
  }

  /**
   * Crea render pipeline y compute pipeline
   */
  private async createPipelines(canvasFormat: GPUTextureFormat): Promise<void> {
    if (!this.device) return;

    // Crear shader module de render
    const renderShaderModule = this.device.createShaderModule({
      label: 'Vector Render Shader',
      code: vectorShader,
    });

    // Mapeo de tipos de animación a shaders
    const animationShaders: Record<AnimationType, string> = {
      none: noneShader,
      static: staticShader,
      staticAngle: staticAngleShader,
      randomStatic: randomStaticShader,
      randomLoop: randomLoopShader,
      smoothWaves: smoothWavesShader,
      seaWaves: seaWavesShader,
      perlinFlow: perlinFlowShader,
      mouseInteraction: mouseInteractionShader,
      centerPulse: centerPulseShader,
      heartbeat: heartbeatShader,
      directionalFlow: directionalFlowShader,
      tangenteClasica: tangenteClasicaShader,
      lissajous: lissajousShader,
      geometricPattern: geometricPatternShader,
      flocking: flockingShader,
      vortex: vortexShader,
      helicalCurl: helicalCurlShader,
    };

    // Layout de bind group para render (vertex shader necesita read-only)
    const renderBindGroupLayout = this.device.createBindGroupLayout({
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
          buffer: { type: 'read-only-storage' }, // Vertex shader DEBE ser read-only
        },
      ],
    });

    // Layout de bind group para compute (puede ser read-write)
    this.computeBindGroupLayout = this.device.createBindGroupLayout({
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
          buffer: { type: 'storage' }, // Compute puede ser read-write
        },
      ],
    });

    // Render pipeline layout
    const renderPipelineLayout = this.device.createPipelineLayout({
      label: 'Vector Render Pipeline Layout',
      bindGroupLayouts: [renderBindGroupLayout],
    });

    // Compute pipeline layout
    const computePipelineLayout = this.device.createPipelineLayout({
      label: 'Vector Compute Pipeline Layout',
      bindGroupLayouts: [this.computeBindGroupLayout],
    });

    // Render pipeline con MSAA 4x
    this.renderPipeline = this.device.createRenderPipeline({
      label: 'Vector Render Pipeline',
      layout: renderPipelineLayout,
      vertex: {
        module: renderShaderModule,
        entryPoint: 'vertexMain',
        buffers: [
          {
            // Shape vertex buffer (binding 0)
            arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT, // vec2f = 8 bytes
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
        module: renderShaderModule,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: canvasFormat,
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
        count: this.sampleCount, // 4x MSAA para bordes suaves
      },
    });

    // Crear compute pipelines para cada tipo de animación
    for (const [type, shaderCode] of Object.entries(animationShaders)) {
      const shaderModule = this.device.createShaderModule({
        label: `${type} Compute Shader`,
        code: shaderCode,
      });

      const pipeline = this.device.createComputePipeline({
        label: `${type} Compute Pipeline`,
        layout: computePipelineLayout,
        compute: {
          module: shaderModule,
          entryPoint: 'computeMain',
        },
      });

      this.computePipelines.set(type as AnimationType, pipeline);
    }

    // Setear el pipeline activo inicial
    this.computePipeline = this.computePipelines.get('smoothWaves') || null;

    console.log(`✅ Pipelines creadas (render + ${this.computePipelines.size} compute)`);
  }

  /**
   * Cambia el tipo de animación
   */
  setAnimationType(type: AnimationType): void {
    const pipeline = this.computePipelines.get(type);
    if (pipeline) {
      this.computePipeline = pipeline;
      this.currentAnimationType = type;
      console.log(`🎨 Animación cambiada a: ${type}`);
    } else {
      console.warn(`⚠️ Animación ${type} no encontrada`);
    }
  }

  /**
   * Actualiza la configuración del engine
   */
  updateConfig(config: Partial<WebGPUEngineConfig>): void {
    const needsBufferRecreation = config.vectorCount && config.vectorCount !== this.config.vectorCount;

    this.config = { ...this.config, ...config };

    // Recrear buffers si cambió el número de vectores
    if (needsBufferRecreation) {
      this.recreateBuffers();
      this.createBindGroups();
    } else if (!this.vectorBuffer || !this.uniformBuffer) {
      // Crear buffers iniciales si no existen
      this.recreateBuffers();
      this.createBindGroups();
    }
  }

  /**
   * Crea buffer de vectores con la capacidad especificada
   */
  private createVectorBuffer(count: number): GPUBuffer | null {
    if (!this.device) return null;

    // Cada vector: [baseX, baseY, angle, length]
    const vectorSize = 4 * Float32Array.BYTES_PER_ELEMENT;
    const bufferSize = count * vectorSize;

    return this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
      mappedAtCreation: false,
    });
  }

  /**
   * Crea buffer de uniforms
   */
  private createUniformBuffer(): GPUBuffer | null {
    if (!this.device) return null;

    // Uniforms: 27 floats base + 1 padding + MAX_GRADIENT_STOPS * 4 (vec4 por stop) = 52 floats = 208 bytes
    // WebGPU requiere buffers uniformes alineados a 16 bytes
    const uniformFloats = 28 + MAX_GRADIENT_STOPS * 4; // 52 floats
    const uniformBytes = uniformFloats * Float32Array.BYTES_PER_ELEMENT; // 208 bytes
    const paddedSize = Math.ceil(uniformBytes / 16) * 16; // Redondear a múltiplo de 16 = 208 bytes

    return this.device.createBuffer({
      size: paddedSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: false,
    });
  }

  /**
   * Crea buffer de geometría de forma
   */
  private createShapeBuffer(shapeName: VectorShape): GPUBuffer | null {
    if (!this.device) return null;

    const shapeGeometry = this.shapeLibrary.getShape(shapeName);
    const bufferSize = shapeGeometry.vertices.byteLength;

    const buffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: false,
    });

    // Escribir datos de geometría
    this.device.queue.writeBuffer(buffer, 0, shapeGeometry.vertices);

    // Actualizar contador de vértices
    this.currentShapeVertexCount = shapeGeometry.vertexCount;

    console.log(`✅ Shape buffer creado: ${shapeName} (${shapeGeometry.vertexCount} vértices)`);

    return buffer;
  }

  /**
   * Crea texture MSAA para antialiasing
   */
  private createMSAATexture(width: number, height: number, format: GPUTextureFormat): void {
    if (!this.device) return;

    // Destruir texture anterior si existe
    if (this.msaaTexture) {
      this.msaaTexture.destroy();
    }

    // Crear nueva texture MSAA
    this.msaaTexture = this.device.createTexture({
      size: { width, height },
      sampleCount: this.sampleCount,
      format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.msaaTextureView = this.msaaTexture.createView();
    console.log(`✅ MSAA texture creada: ${width}x${height} (${this.sampleCount}x samples)`);
  }

  /**
   * Recrea buffers cuando cambia la configuración
   */
  private recreateBuffers(): void {
    // Destruir buffers antiguos
    this.vectorBuffer?.destroy();
    this.uniformBuffer?.destroy();
    this.shapeBuffer?.destroy();

    // Crear nuevos buffers
    this.vectorBuffer = this.createVectorBuffer(this.config.vectorCount);
    this.uniformBuffer = this.createUniformBuffer();
    this.shapeBuffer = this.createShapeBuffer(this.config.vectorShape);
  }

  /**
   * Cambia la forma de los vectores
   */
  setShape(shapeName: VectorShape): void {
    if (!this.device) {
      console.warn('⚠️ Cannot set shape: device not initialized');
      return;
    }

    this.config.vectorShape = shapeName;

    // Destruir buffer antiguo y crear nuevo
    this.shapeBuffer?.destroy();
    this.shapeBuffer = this.createShapeBuffer(shapeName);

    // Recrear bind groups con el nuevo buffer
    this.createBindGroups();

    console.log(`🔄 Forma cambiada a: ${shapeName}`);
  }

  /**
   * Crea bind groups para render y compute
   */
  private createBindGroups(): void {
    if (!this.device || !this.renderPipeline || !this.computePipeline || !this.vectorBuffer || !this.uniformBuffer) {
      return;
    }

    // Bind group para render (read-only storage)
    this.renderBindGroup = this.device.createBindGroup({
      label: 'Vector Render Bind Group',
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.vectorBuffer },
        },
      ],
    });

    // Bind group para compute (read-write storage)
    this.computeBindGroup = this.device.createBindGroup({
      label: 'Vector Compute Bind Group',
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.vectorBuffer },
        },
      ],
    });

    console.log('✅ Bind groups creados (render + compute)');
  }

  /**
   * Actualiza las dimensiones del canvas y recrea la texture MSAA
   */
  updateCanvasDimensions(width: number, height: number): void {
    if (!this.canvas || !this.context || !this.device) return;

    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    this.createMSAATexture(width, height, canvasFormat);
  }

  /**
   * Actualiza datos del buffer de vectores con ordenamiento por profundidad
   */
  updateVectorBuffer(data: Float32Array): void {
    if (!this.device || !this.vectorBuffer) {
      console.warn('⚠️ No se puede actualizar vector buffer: device o buffer no disponibles');
      return;
    }

    const vectorCount = data.length / 4;

    // Crear array de índices con sus posiciones Y para ordenar
    const vectorIndices = new Array(vectorCount);
    for (let i = 0; i < vectorCount; i++) {
      vectorIndices[i] = {
        index: i,
        y: data[i * 4 + 1], // baseY está en el índice 1 de cada vector
      };
    }

    // Ordenar por Y ascendente (menor Y = más arriba = dibuja primero = aparece detrás)
    vectorIndices.sort((a, b) => a.y - b.y);

    // Crear nuevo buffer ordenado
    const sortedData = new Float32Array(data.length);
    for (let i = 0; i < vectorCount; i++) {
      const srcIdx = vectorIndices[i].index * 4;
      const dstIdx = i * 4;
      sortedData[dstIdx + 0] = data[srcIdx + 0]; // baseX
      sortedData[dstIdx + 1] = data[srcIdx + 1]; // baseY
      sortedData[dstIdx + 2] = data[srcIdx + 2]; // angle
      sortedData[dstIdx + 3] = data[srcIdx + 3]; // length
    }

    console.log(`📝 Actualizando vector buffer con ${vectorCount} vectores (ordenados por profundidad)`);
    this.device.queue.writeBuffer(this.vectorBuffer, 0, sortedData);
  }

  /**
   * Procesa gradient stops con cache inteligente para evitar procesamiento en cada frame
   */
  private getProcessedGradientStops(
    stops: any[],
    enabled: boolean,
    hexToRgb: (hex: string) => { r: number; g: number; b: number },
    clamp01: (value: number) => number
  ): { gradientStopData: Float32Array; gradientStopCount: number } {
    // Si no hay stops, retornar cache vacío
    if (stops.length === 0) {
      this.gradientStopsCache.lastHash = '';
      this.gradientStopsCache.cachedCount = 0;
      return {
        gradientStopData: this.gradientStopsCache.cachedData,
        gradientStopCount: 0,
      };
    }

    // Crear hash ultrarrápido de los stops
    const hash = stops
      .map((s) => `${s.color}|${(s.position ?? 0).toFixed(3)}`)
      .join(',');

    // Si el hash es el mismo, retornar datos cacheados (sin procesamiento)
    if (hash === this.gradientStopsCache.lastHash) {
      return {
        gradientStopData: this.gradientStopsCache.cachedData,
        gradientStopCount: this.gradientStopsCache.cachedCount,
      };
    }

    // Hash cambió, procesar stops
    const sortedStops = [...stops]
      .sort((a, b) => {
        const posA = a.position ?? 0;
        const posB = b.position ?? 0;
        return posA - posB;
      })
      .slice(0, MAX_GRADIENT_STOPS);

    // Reutilizar Float32Array existente
    const data = this.gradientStopsCache.cachedData;
    data.fill(0); // Limpiar datos anteriores

    sortedStops.forEach((stop, index) => {
      const stopRgb = hexToRgb(stop.color);
      const position = clamp01(
        stop.position ?? index / Math.max(1, sortedStops.length - 1)
      );
      const offset = index * 4;
      data[offset + 0] = stopRgb.r;
      data[offset + 1] = stopRgb.g;
      data[offset + 2] = stopRgb.b;
      data[offset + 3] = position;
    });

    // Actualizar cache
    this.gradientStopsCache.lastHash = hash;
    this.gradientStopsCache.cachedCount = sortedStops.length;

    return {
      gradientStopData: data,
      gradientStopCount: sortedStops.length,
    };
  }

  /**
   * Actualiza uniforms
   */
  updateUniforms(
    aspect: number,
    time: number,
    zoom: number = 1.0,
    speed: number = 1.0,
    params: Record<string, number> = {},
    color: string = '#FFFFFF',
    gradient?: {
      enabled?: boolean;
      stops?: Array<{ color: string; position: number }>;
      scope?: 'vector' | 'field';
      type?: 'linear' | 'radial';
      angle?: number;
    },
    mousePosition?: MouseUniform
  ): void {
    if (!this.device || !this.uniformBuffer) return;

    // Valores por defecto según tipo de animación
    const defaults = (type: AnimationType) => {
      switch (type) {
        case 'none':
          return { frequency: 0, amplitude: 0, elasticity: 0, maxLength: 60 };
        case 'static':
          return { frequency: 0, amplitude: 0, elasticity: 0, maxLength: 60 };
        case 'staticAngle':
          return { frequency: 45, amplitude: 0, elasticity: 0, maxLength: 60 };
        case 'randomStatic':
          return { frequency: 0.6, amplitude: 180, elasticity: 0.3, maxLength: 80 };
        case 'randomLoop':
          return { frequency: 2.5, amplitude: 160, elasticity: 0.4, maxLength: 90 };
        case 'directionalFlow':
          return { frequency: 45, amplitude: 25, elasticity: 0.6, maxLength: 90 };
        case 'tangenteClasica':
          return { frequency: 0.6, amplitude: 1, elasticity: 0.5, maxLength: 110 };
        case 'lissajous':
          return { frequency: 2.0, amplitude: 3.0, elasticity: 120, maxLength: 90 };
        case 'geometricPattern':
          return { frequency: 4, amplitude: 45, elasticity: 0.5, maxLength: 80 };
        case 'flocking':
          return { frequency: 0.15, amplitude: 0.8, elasticity: 0.4, maxLength: 95 };
        case 'vortex':
          return { frequency: 1.2, amplitude: 0.45, elasticity: 1.2, maxLength: 130 };
        case 'helicalCurl':
          return { frequency: 1.1, amplitude: 60, elasticity: 0.4, maxLength: 150 };
        case 'mouseInteraction':
          return { frequency: 160, amplitude: 60, elasticity: 0.5, maxLength: 90 };
        case 'seaWaves':
          return { frequency: 0.02, amplitude: 35, elasticity: 0.8, maxLength: 110 };
        case 'perlinFlow':
          return { frequency: 0.015, amplitude: 30, elasticity: 0.45, maxLength: 100 };
        case 'centerPulse':
          return { frequency: 0.02, amplitude: 28, elasticity: 0.6, maxLength: 120 };
        case 'heartbeat':
          return { frequency: 0.015, amplitude: 40, elasticity: 0.7, maxLength: 110 };
        case 'smoothWaves':
          return { frequency: 0.02, amplitude: 20, elasticity: 0.5, maxLength: 90 };
        default:
          return { frequency: 0, amplitude: 0, elasticity: 0, maxLength: 60 };
      }
    };

    const baseDefaults = defaults(this.currentAnimationType);
    let param1 = params.frequency ?? baseDefaults.frequency;
    let param2 = params.amplitude ?? baseDefaults.amplitude;
    let param3 = params.elasticity ?? baseDefaults.elasticity;
    const param4 = params.maxLength ?? baseDefaults.maxLength;

    // Ajustes específicos según animación
    switch (this.currentAnimationType) {
      case 'mouseInteraction': {
        // radius e intensidad en píxeles
        param1 = Math.max(10, param1);
        param2 = Math.max(10, param2);
        param3 = Math.max(0, Math.min(1, param3));
        break;
      }
      case 'directionalFlow': {
        param3 = Math.max(0, Math.min(1, param3));
        break;
      }
      case 'tangenteClasica': {
        param2 = param2 >= 0 ? 1 : -1;
        param3 = Math.max(0, Math.min(1, param3));
        break;
      }
      case 'staticAngle': {
        param1 = ((param1 % 360) + 360) % 360;
        break;
      }
      case 'randomStatic': {
        param1 = Math.max(0.01, param1);
        param2 = Math.max(0, param2);
        param3 = Math.max(0, Math.min(1, param3));
        break;
      }
      case 'randomLoop': {
        param1 = Math.max(0.1, param1);
        param2 = Math.max(0, param2);
        param3 = Math.max(0, Math.min(1, param3));
        break;
      }
      case 'geometricPattern': {
        param3 = Math.max(0, Math.min(1, param3));
        break;
      }
      case 'flocking': {
        param1 = Math.max(0.01, param1);
        param2 = Math.max(0, Math.min(2, param2));
        param3 = Math.max(0, Math.min(1, param3));
        break;
      }
      case 'vortex': {
        param2 = Math.max(0, Math.min(1, param2));
        param3 = Math.max(0.01, param3);
        break;
      }
      case 'helicalCurl': {
        param1 = Math.max(0.05, param1);
        param2 = Math.max(0, Math.min(360, param2));
        param3 = Math.max(0, Math.min(1, param3));
        break;
      }
      default:
        break;
    }

    // Convertir color hex a RGB (0-1)
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255,
          }
        : { r: 1, g: 1, b: 1 };
    };

    const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

    const rgb = hexToRgb(color);

    const mouseUniform = mousePosition ?? { x: 0, y: 0, active: false };

    const gradientStopsInput = gradient?.stops ?? [];
    const enabled = Boolean(gradient?.enabled) && gradientStopsInput.length > 0;

    // Procesar gradient stops con cache inteligente
    const { gradientStopData, gradientStopCount } = this.getProcessedGradientStops(
      enabled ? gradientStopsInput : [],
      enabled,
      hexToRgb,
      clamp01
    );

    // Factor dinámico de conversión píxel → ISO (Y va de -1 a 1)
    const canvasHeight = this.canvas?.height ?? 0;
    const pixelToISO = canvasHeight > 0 ? 2 / canvasHeight : 0.001;

    const maxLengthPx = Math.max(param4, this.config.vectorLength);

    const gradientScope = gradient?.scope ?? 'vector';
    const gradientMode = gradientScope === 'field' ? 1 : 0;
    const gradientTypeValue = gradient?.type === 'radial' ? 1 : 0;

    const currentAngle = normalizeAngle(gradient?.angle ?? 0);
    const currentType = gradient?.type ?? 'linear';

    // Solo recalcular corners si cambió el scope, tipo o ángulo del gradiente
    const needsRecalc =
      this.gradientFieldCache.scope !== gradientScope ||
      this.gradientFieldCache.type !== currentType ||
      this.gradientFieldCache.angle !== currentAngle;

    let linearDirX = this.gradientFieldCache.linearDirX;
    let linearDirY = this.gradientFieldCache.linearDirY;
    let linearMin = this.gradientFieldCache.linearMin;
    let linearMax = this.gradientFieldCache.linearMax;
    let radialMax = this.gradientFieldCache.radialMax;

    if (gradientMode === 1 && needsRecalc) {
      // Convertir ángulo CSS a radianes (0° = derecha, 90° = arriba, 180° = izquierda, 270° = abajo)
      const angleRad = (currentAngle * Math.PI) / 180;
      linearDirX = Math.cos(angleRad);
      linearDirY = Math.sin(angleRad);

      // Corners en espacio ISO: X va de [-aspect, aspect], Y va de [-1, 1]
      const corners = [
        { x: -aspect, y: -1 },  // Esquina inferior izquierda
        { x: aspect, y: -1 },   // Esquina inferior derecha
        { x: aspect, y: 1 },    // Esquina superior derecha
        { x: -aspect, y: 1 },   // Esquina superior izquierda
      ];

      linearMin = Number.POSITIVE_INFINITY;
      linearMax = Number.NEGATIVE_INFINITY;
      radialMax = 0;

      corners.forEach((corner) => {
        const dot = corner.x * linearDirX + corner.y * linearDirY;
        if (dot < linearMin) linearMin = dot;
        if (dot > linearMax) linearMax = dot;

        const radius = Math.hypot(corner.x, corner.y);
        if (radius > radialMax) radialMax = radius;
      });

      // Seguridad: evitar divisiones por cero
      if (!Number.isFinite(linearMin) || !Number.isFinite(linearMax) || Math.abs(linearMax - linearMin) < 1e-4) {
        linearMin = -1;
        linearMax = 1;
      }

      if (radialMax < 1e-4) {
        radialMax = Math.SQRT2;
      }

      // Actualizar cache
      this.gradientFieldCache.scope = gradientScope;
      this.gradientFieldCache.type = currentType;
      this.gradientFieldCache.angle = currentAngle;
      this.gradientFieldCache.linearDirX = linearDirX;
      this.gradientFieldCache.linearDirY = linearDirY;
      this.gradientFieldCache.linearMin = linearMin;
      this.gradientFieldCache.linearMax = linearMax;
      this.gradientFieldCache.radialMax = radialMax;
    }

    // Reutilizar buffer preallocado en lugar de crear uno nuevo cada frame
    const uniformData = this.uniformDataBuffer;
    uniformData[0] = aspect;
    uniformData[1] = time;
    uniformData[2] = this.config.vectorLength;
    uniformData[3] = this.config.vectorWidth;
    uniformData[4] = pixelToISO;
    uniformData[5] = zoom;
    uniformData[6] = speed;
    uniformData[7] = gradientStopCount;
    uniformData[8] = param1;
    uniformData[9] = param2;
    uniformData[10] = param3;
    uniformData[11] = maxLengthPx;
    uniformData[12] = mouseUniform.active ? mouseUniform.x : 0.0;
    uniformData[13] = mouseUniform.active ? mouseUniform.y : 0.0;
    uniformData[14] = mouseUniform.active ? 1.0 : 0.0;
    uniformData[15] = rgb.r;
    uniformData[16] = rgb.g;
    uniformData[17] = rgb.b;
    uniformData[18] = enabled ? 1.0 : 0.0;
    uniformData[19] = 0.0; // Reserved (antes shapeIndex, ya no se usa)
    uniformData[20] = gradientMode;
    uniformData[21] = gradientTypeValue;
    uniformData[22] = linearDirX;
    uniformData[23] = linearDirY;
    uniformData[24] = linearMin;
    uniformData[25] = linearMax;
    uniformData[26] = radialMax;
    uniformData[27] = 0.0; // Padding para alinear gradientStops a 16 bytes

    uniformData.set(gradientStopData, 28);

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
  }

  /**
   * Ejecuta compute shader para animación
   */
  computeAnimation(_deltaTime: number): void {
    if (!this.device || !this.computePipeline || !this.computeBindGroup) return;

    const commandEncoder = this.device.createCommandEncoder();
    const computePass = commandEncoder.beginComputePass();

    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, this.computeBindGroup);

    // Calcular workgroups (asumiendo workgroup size de 64)
    const workgroupCount = Math.ceil(this.config.vectorCount / 64);
    computePass.dispatchWorkgroups(workgroupCount);

    computePass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Renderiza un frame
   */
  renderFrame(): void {
    if (!this.device || !this.context || !this.renderPipeline || !this.renderBindGroup || !this.msaaTextureView) {
      console.warn('⚠️ renderFrame: Recursos no disponibles');
      return;
    }

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    // Render pass con MSAA
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.msaaTextureView, // Renderizar a texture MSAA
          resolveTarget: textureView,  // Resolver a texture del canvas
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, this.renderBindGroup);

    // Establecer shape buffer como vertex buffer
    if (this.shapeBuffer) {
      renderPass.setVertexBuffer(0, this.shapeBuffer);
    }

    // Dibujar vectores con geometry instancing
    renderPass.draw(this.currentShapeVertexCount, this.config.vectorCount, 0, 0);

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Limpia recursos WebGPU
   */
  destroy(): void {
    this.vectorBuffer?.destroy();
    this.uniformBuffer?.destroy();

    this.vectorBuffer = null;
    this.uniformBuffer = null;
    this.renderPipeline = null;
    this.computePipeline = null;
    this.device = null;
    this.adapter = null;
    this.context = null;
    this.canvas = null;

    this.isInitialized = false;
    console.log('🧹 WebGPUEngine destruido');
  }

  /**
   * Getters
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  get deviceInfo(): string | null {
    return this.adapter?.info ? JSON.stringify(this.adapter.info) : null;
  }
}
