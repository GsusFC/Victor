/**
 * WebGPUEngine - Motor principal para renderizado de campos vectoriales
 * Singleton que maneja inicialización, buffers, pipelines y render loop
 */

import { normalizeAngle } from '@/lib/math-utils';
import { vectorShader } from './shaders/render/vector.wgsl';
import { fadeShader } from './shaders/render/fade.wgsl';
import { postProcessShader } from './shaders/render/postprocess.wgsl';
import { blurShader } from './shaders/render/blur.wgsl';
import { ShapeLibrary, type ShapeName } from './ShapeLibrary';
import {
  noneShader,
  smoothWavesShader,
  seaWavesShader,
  breathingSoftShader,
  flockingShader,
  flowFieldShader,
  organicGrowthShader,
  electricPulseShader,
  vortexShader,
  directionalFlowShader,
  stormShader,
  solarFlareShader,
  radiationShader,
  magneticFieldShader,
  chaosAttractorShader,
  tangenteClasicaShader,
  lissajousShader,
  geometricPatternShader,
  harmonicOscillatorShader,
  spirographShader,
  springMeshShader,
  createShaderWithWorkgroupSize,
} from './shaders/compute/animations.wgsl';

const MAX_GRADIENT_STOPS = 12;

type VectorShape = ShapeName;

interface MouseUniform {
  x: number;
  y: number;
  active: boolean;
}

export type AnimationType =
  | 'none'
  // Naturales/Fluidas
  | 'smoothWaves'
  | 'seaWaves'
  | 'breathingSoft'
  | 'flocking'
  | 'flowField'
  | 'organicGrowth'
  // Energéticas
  | 'electricPulse'
  | 'vortex'
  | 'directionalFlow'
  | 'storm'
  | 'solarFlare'
  | 'radiation'
  | 'magneticField'
  | 'chaosAttractor'
  // Geométricas
  | 'tangenteClasica'
  | 'lissajous'
  | 'geometricPattern'
  | 'harmonicOscillator'
  | 'spirograph'
  // Experimentales
  | 'springMesh';

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

  // Vector data cache (para exportación)
  private currentVectorData: Float32Array | null = null;

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

  // Trails/Fade system
  private fadePipeline: GPURenderPipeline | null = null;
  private fadeBindGroup: GPUBindGroup | null = null;
  private fadeUniformBuffer: GPUBuffer | null = null;

  // Post-Processing system
  private postProcessEnabled = false;
  private postProcessPipeline: GPURenderPipeline | null = null;
  private postProcessBindGroup: GPUBindGroup | null = null;  // Cache for post-process bind group
  private postProcessUniformBuffer: GPUBuffer | null = null;
  private blurPipeline: GPURenderPipeline | null = null;
  private blurBindGroup: GPUBindGroup | null = null;
  private blurUniformBuffer: GPUBuffer | null = null;
  private postProcessBindGroupNeedsUpdate = true;  // Flag to track when bind group needs recreation

  // Render-to-texture (ping-pong textures)
  private renderTexture: GPUTexture | null = null;  // MSAA texture para renderizar vectores
  private renderTextureView: GPUTextureView | null = null;
  private resolvedTexture: GPUTexture | null = null;  // Non-MSAA texture para samplear en post-process
  private resolvedTextureView: GPUTextureView | null = null;
  private blurTexture: GPUTexture | null = null;
  private blurTextureView: GPUTextureView | null = null;
  private sampler: GPUSampler | null = null;

  // Estado
  private isInitialized = false;
  private isInitializing = false;
  private currentAnimationType: AnimationType = 'smoothWaves';
  private trailsEnabled = false;
  private trailsDecay = 0.95; // Factor de decay para trails
  private optimalWorkgroupSize = 64;  // Default, will be calculated based on device limits
  private config: WebGPUEngineConfig = {
    vectorCount: 100,
    vectorLength: 20,
    vectorWidth: 2,
    gridRows: 10,
    gridCols: 10,
    vectorShape: 'line',
  };

  // Buffer preallocado para uniforms (optimización de memoria)
  // 27 uniforms base + seed + 4 padding (para alinear a 16 bytes) + 48 gradient stops (12 stops * 4 floats) = 32 + 48 = 80 floats
  private uniformDataBuffer: Float32Array = new Float32Array(32 + MAX_GRADIENT_STOPS * 4);
  private lastUniformData: Float32Array = new Float32Array(32 + MAX_GRADIENT_STOPS * 4);
  private uniformsDirty = true;  // Flag to track if uniforms changed

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
    hasLoggedOnce: false,
    lastLoggedHash: '',
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

      // Calculate optimal workgroup size based on device limits
      this.optimalWorkgroupSize = this.calculateOptimalWorkgroupSize();
      console.log(`📊 Optimal workgroup size: ${this.optimalWorkgroupSize}`);

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

      // Crear texturas para post-processing
      this.createPostProcessTextures(canvas.width, canvas.height, canvasFormat);

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

    // Mapeo de tipos de animación a shaders (base templates)
    const animationShaderTemplates: Record<AnimationType, string> = {
      none: noneShader,
      // Naturales/Fluidas
      smoothWaves: smoothWavesShader,
      seaWaves: seaWavesShader,
      breathingSoft: breathingSoftShader,
      flocking: flockingShader,
      flowField: flowFieldShader,
      organicGrowth: organicGrowthShader,
      // Energéticas
      electricPulse: electricPulseShader,
      vortex: vortexShader,
      directionalFlow: directionalFlowShader,
      storm: stormShader,
      solarFlare: solarFlareShader,
      radiation: radiationShader,
      magneticField: magneticFieldShader,
      chaosAttractor: chaosAttractorShader,
      // Geométricas
      tangenteClasica: tangenteClasicaShader,
      lissajous: lissajousShader,
      geometricPattern: geometricPatternShader,
      harmonicOscillator: harmonicOscillatorShader,
      spirograph: spirographShader,
      // Experimentales
      springMesh: springMeshShader,
    };

    // Apply dynamic workgroup size to all shaders
    const animationShaders: Record<AnimationType, string> = Object.fromEntries(
      Object.entries(animationShaderTemplates).map(([key, shader]) => [
        key,
        createShaderWithWorkgroupSize(shader, this.optimalWorkgroupSize),
      ])
    ) as Record<AnimationType, string>;

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

    // Crear fade pipeline para trails
    const fadeShaderModule = this.device.createShaderModule({
      label: 'Fade Shader',
      code: fadeShader,
    });

    // Crear uniform buffer para fade (solo 1 float: decay)
    this.fadeUniformBuffer = this.device.createBuffer({
      label: 'Fade Uniform Buffer',
      size: 16, // 1 float + padding a 16 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Inicializar con decay por defecto
    this.device.queue.writeBuffer(
      this.fadeUniformBuffer,
      0,
      new Float32Array([this.trailsDecay])
    );

    // Crear bind group layout para fade
    const fadeBindGroupLayout = this.device.createBindGroupLayout({
      label: 'Fade Bind Group Layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    // Crear bind group para fade
    this.fadeBindGroup = this.device.createBindGroup({
      label: 'Fade Bind Group',
      layout: fadeBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.fadeUniformBuffer },
        },
      ],
    });

    // Crear fade pipeline
    const fadePipelineLayout = this.device.createPipelineLayout({
      label: 'Fade Pipeline Layout',
      bindGroupLayouts: [fadeBindGroupLayout],
    });

    this.fadePipeline = this.device.createRenderPipeline({
      label: 'Fade Render Pipeline',
      layout: fadePipelineLayout,
      vertex: {
        module: fadeShaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: fadeShaderModule,
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
        count: this.sampleCount, // Debe coincidir con MSAA del render principal
      },
    });

    // ============================================
    // POST-PROCESSING PIPELINES
    // ============================================

    // Crear sampler para texturas
    this.sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });

    // Post-process shader module
    const postProcessShaderModule = this.device.createShaderModule({
      label: 'Post-Process Shader',
      code: postProcessShader,
    });

    // Post-process bind group layout
    const postProcessBindGroupLayout = this.device.createBindGroupLayout({
      label: 'Post-Process Bind Group Layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      ],
    });

    const postProcessPipelineLayout = this.device.createPipelineLayout({
      label: 'Post-Process Pipeline Layout',
      bindGroupLayouts: [postProcessBindGroupLayout],
    });

    this.postProcessPipeline = this.device.createRenderPipeline({
      label: 'Post-Process Pipeline',
      layout: postProcessPipelineLayout,
      vertex: {
        module: postProcessShaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: postProcessShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: canvasFormat }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Blur shader module
    const blurShaderModule = this.device.createShaderModule({
      label: 'Blur Shader',
      code: blurShader,
    });

    // Blur usa el mismo layout que post-process
    this.blurPipeline = this.device.createRenderPipeline({
      label: 'Blur Pipeline',
      layout: postProcessPipelineLayout,
      vertex: {
        module: blurShaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: blurShaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format: canvasFormat }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Crear uniform buffers para post-processing
    this.postProcessUniformBuffer = this.device.createBuffer({
      size: 16 * Float32Array.BYTES_PER_ELEMENT, // 16 floats para todos los parámetros
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.blurUniformBuffer = this.device.createBuffer({
      size: 4 * Float32Array.BYTES_PER_ELEMENT, // vec2 + 2 floats
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    console.log(`✅ Pipelines creadas (render + fade + post-process + blur + ${this.computePipelines.size} compute)`);
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
   * Actualiza configuración de trails
   */
  setTrails(enabled: boolean, opacity: number = 0.6): void {
    this.trailsEnabled = enabled;
    // Convertir opacidad de trails a decay factor
    // opacity es inverso a longitud de trails:
    // opacity 1.0 (UI) -> fade rápido -> decay 0.80 (fade del 20% por frame) -> trails cortos
    // opacity 0.1 (UI) -> fade lento -> decay 0.98 (fade del 2% por frame) -> trails largos
    // Fórmula: a mayor opacity en UI, mayor fade (menor decay)
    this.trailsDecay = enabled ? 0.98 - opacity * 0.18 : 1.0;

    // Actualizar uniform buffer si ya existe
    if (this.fadeUniformBuffer && this.device) {
      this.device.queue.writeBuffer(
        this.fadeUniformBuffer,
        0,
        new Float32Array([this.trailsDecay])
      );
    }
  }

  /**
   * Actualiza configuración de post-processing
   */
  setPostProcessing(config: {
    enabled?: boolean;
    bloom?: { enabled?: boolean; intensity?: number; threshold?: number; radius?: number };
    chromaticAberration?: { enabled?: boolean; intensity?: number; offset?: number };
    vignette?: { enabled?: boolean; intensity?: number; softness?: number };
    exposure?: number;
    contrast?: number;
    saturation?: number;
    brightness?: number;
  }): void {
    if (config.enabled !== undefined) {
      this.postProcessEnabled = config.enabled;
    }

    // Actualizar uniform buffer con la configuración
    if (this.postProcessUniformBuffer && this.device) {
      const uniforms = new Float32Array(16);

      // Bloom (floats 0-3)
      uniforms[0] = config.bloom?.enabled ? 1.0 : 0.0;
      uniforms[1] = config.bloom?.intensity ?? 0.5;
      uniforms[2] = config.bloom?.threshold ?? 0.7;
      uniforms[3] = config.bloom?.radius ?? 3.0;

      // Chromatic Aberration (floats 4-6)
      uniforms[4] = config.chromaticAberration?.enabled ? 1.0 : 0.0;
      uniforms[5] = config.chromaticAberration?.intensity ?? 0.5;
      uniforms[6] = config.chromaticAberration?.offset ?? 0.01;

      // Vignette (floats 7-9)
      uniforms[7] = config.vignette?.enabled ? 1.0 : 0.0;
      uniforms[8] = config.vignette?.intensity ?? 0.6;
      uniforms[9] = config.vignette?.softness ?? 0.4;

      // Tone Mapping & Color (floats 10-14)
      uniforms[10] = config.exposure ?? 1.0;
      uniforms[11] = config.contrast ?? 1.0;
      uniforms[12] = config.saturation ?? 1.0;
      uniforms[13] = config.brightness ?? 1.0;
      uniforms[14] = 0.0; // padding

      this.device.queue.writeBuffer(this.postProcessUniformBuffer, 0, uniforms);
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

    // Uniforms: 27 floats base + seed + 4 padding + MAX_GRADIENT_STOPS * 4 (vec4 por stop) = 80 floats = 320 bytes
    // WebGPU requiere arrays alineados a 16 bytes, por eso usamos 4 floats de padding (32 floats totales antes del array)
    const uniformFloats = 32 + MAX_GRADIENT_STOPS * 4; // 80 floats (32 base + 12 stops * 4)
    const uniformBytes = uniformFloats * Float32Array.BYTES_PER_ELEMENT; // 320 bytes
    const paddedSize = Math.ceil(uniformBytes / 16) * 16; // Ya está alineado = 320 bytes

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
   * Crea texturas para post-processing (render-to-texture)
   */
  private createPostProcessTextures(width: number, height: number, format: GPUTextureFormat): void {
    if (!this.device) return;

    // Destruir texturas anteriores si existen
    if (this.renderTexture) {
      this.renderTexture.destroy();
    }
    if (this.resolvedTexture) {
      this.resolvedTexture.destroy();
    }
    if (this.blurTexture) {
      this.blurTexture.destroy();
    }

    // Crear render texture MSAA (donde renderizamos los vectores con antialiasing)
    this.renderTexture = this.device.createTexture({
      size: { width, height },
      sampleCount: this.sampleCount,  // MSAA (4x)
      format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,  // Solo render, no se puede samplear MSAA directamente
    });

    this.renderTextureView = this.renderTexture.createView();

    // Crear textura resuelta (non-MSAA) para muestreo en post-process
    // Esta textura recibe el resolve del MSAA y se puede samplear
    this.resolvedTexture = this.device.createTexture({
      size: { width, height },
      format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    this.resolvedTextureView = this.resolvedTexture.createView();

    // Crear blur texture (para ping-pong de blur)
    this.blurTexture = this.device.createTexture({
      size: { width, height },
      format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    this.blurTextureView = this.blurTexture.createView();

    // Invalidate bind group cache since textures changed
    this.postProcessBindGroupNeedsUpdate = true;
    this.postProcessBindGroup = null;

    console.log(`✅ Post-process textures creadas: ${width}x${height} (MSAA + resolved)`);
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
    this.createPostProcessTextures(width, height, canvasFormat);
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

    // Verificar si el buffer tiene el tamaño correcto
    const requiredSize = data.byteLength;
    const currentSize = this.vectorBuffer.size;

    if (requiredSize > currentSize) {
      console.warn(`⚠️ Buffer demasiado pequeño (${currentSize} bytes, necesita ${requiredSize} bytes). Recreando...`);
      this.config.vectorCount = vectorCount;
      this.recreateBuffers();
      this.createBindGroups();
      if (!this.vectorBuffer) {
        console.error('❌ No se pudo recrear el buffer');
        return;
      }
    }

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

    // Guardar copia para exportación (datos ANTES de ordenar, para mantener posiciones originales)
    this.currentVectorData = new Float32Array(data);
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
    mousePosition?: MouseUniform,
    seed: number = 12345
  ): void {
    if (!this.device || !this.uniformBuffer) return;

    // Valores por defecto según tipo de animación
    const defaults = (type: AnimationType) => {
      switch (type) {
        case 'none':
          return { frequency: 0, amplitude: 0, elasticity: 0, maxLength: 60 };
        // Naturales/Fluidas
        case 'smoothWaves':
          return { frequency: 0.02, amplitude: 20, elasticity: 0.5, maxLength: 90 };
        case 'seaWaves':
          return { frequency: 0.02, amplitude: 35, elasticity: 0.8, maxLength: 110 };
        case 'breathingSoft':
          return { frequency: 1.1, amplitude: 60, elasticity: 0.4, maxLength: 150 };
        case 'flocking':
          return { frequency: 0.15, amplitude: 0.8, elasticity: 0.4, maxLength: 95 };
        // Energéticas
        case 'electricPulse':
          return { frequency: 0.02, amplitude: 28, elasticity: 0.6, maxLength: 120 };
        case 'vortex':
          return { frequency: 1.2, amplitude: 0.45, elasticity: 1.2, maxLength: 130 };
        case 'directionalFlow':
          return { frequency: 45, amplitude: 25, elasticity: 0.6, maxLength: 90 };
        case 'storm':
          return { frequency: 1.5, amplitude: 1.0, elasticity: 1.2, maxLength: 140 };
        case 'solarFlare':
          return { frequency: 1.8, amplitude: 0.5, elasticity: 45, maxLength: 150 };
        case 'radiation':
          return { frequency: 1.0, amplitude: 4, elasticity: 0.5, maxLength: 120 };
        // Geométricas
        case 'tangenteClasica':
          return { frequency: 0.6, amplitude: 1, elasticity: 0.5, maxLength: 110 };
        case 'lissajous':
          return { frequency: 2.0, amplitude: 3.0, elasticity: 120, maxLength: 90 };
        case 'geometricPattern':
          return { frequency: 4, amplitude: 45, elasticity: 0.5, maxLength: 80 };
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
      case 'directionalFlow': {
        param3 = Math.max(0, Math.min(1, param3));
        break;
      }
      case 'tangenteClasica': {
        param2 = param2 >= 0 ? 1 : -1;
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
      case 'breathingSoft': {
        param1 = Math.max(0.05, param1);
        param2 = Math.max(0, Math.min(360, param2));
        param3 = Math.max(0, Math.min(1, param3));
        break;
      }
      case 'storm': {
        param1 = Math.max(0.1, Math.min(3, param1));  // chaos: 0.1-3.0
        param2 = Math.max(0, Math.min(2, param2));    // vorticity: 0-2.0
        param3 = Math.max(0.1, param3);               // pulseSpeed: min 0.1
        break;
      }
      case 'solarFlare': {
        param1 = Math.max(0.5, Math.min(3, param1));  // flareIntensity: 0.5-3.0
        param2 = param2;                               // rotationSpeed: sin restricción
        param3 = param3;                               // ejectionAngle: sin restricción
        break;
      }
      case 'radiation': {
        param1 = Math.max(0.1, param1);                // waveSpeed: min 0.1
        param2 = Math.max(1, Math.min(8, param2));    // numSources: 1-8
        param3 = Math.max(0, Math.min(1, param3));    // interference: 0-1
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

    // Usar param4 directamente sin forzar máximo (permite acortar vectores)
    const maxLengthPx = param4;

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
    uniformData[27] = seed; // Seed para PRNG
    uniformData[28] = 0.0; // Padding 1
    uniformData[29] = 0.0; // Padding 2
    uniformData[30] = 0.0; // Padding 3 (alinear array a 128 bytes = múltiplo de 16)
    uniformData[31] = 0.0; // Padding 4

    uniformData.set(gradientStopData, 32);

    // Differential update: only write to GPU if data changed (optimization)
    let hasChanged = this.uniformsDirty;
    if (!hasChanged) {
      // Quick comparison: check if any value differs
      for (let i = 0; i < uniformData.length; i++) {
        if (uniformData[i] !== this.lastUniformData[i]) {
          hasChanged = true;
          break;
        }
      }
    }

    if (hasChanged) {
      this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
      // Copy current data to last for next comparison
      this.lastUniformData.set(uniformData);
      this.uniformsDirty = false;
    }
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

    // Calcular workgroups usando el tamaño óptimo calculado
    const workgroupCount = Math.ceil(this.config.vectorCount / this.optimalWorkgroupSize);
    computePass.dispatchWorkgroups(workgroupCount);

    computePass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Renderiza un frame
   */
  renderFrame(): void {
    if (!this.device || !this.context || !this.renderPipeline || !this.renderBindGroup) {
      console.warn('⚠️ renderFrame: Recursos no disponibles');
      return;
    }

    const commandEncoder = this.device.createCommandEncoder();
    const canvasTextureView = this.context.getCurrentTexture().createView();

    // Determinar target de renderizado según post-processing
    const usePostProcess = this.postProcessEnabled && this.renderTextureView && this.resolvedTextureView && this.postProcessPipeline;
    const targetView = usePostProcess ? this.renderTextureView : this.msaaTextureView;
    const resolveTarget = usePostProcess ? this.resolvedTextureView : canvasTextureView;

    // Si trails están activados, primero aplicar fade
    if (this.trailsEnabled && this.fadePipeline && this.fadeBindGroup && targetView) {
      const fadePass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: targetView,
            loadOp: 'load',
            storeOp: 'store',
          },
        ],
      });

      fadePass.setPipeline(this.fadePipeline);
      fadePass.setBindGroup(0, this.fadeBindGroup);
      fadePass.draw(3, 1, 0, 0);
      fadePass.end();
    }

    // Render pass principal (vectores)
    if (!targetView) {
      console.warn('⚠️ Target view no disponible');
      return;
    }

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: targetView,
          ...(resolveTarget && { resolveTarget }),
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: this.trailsEnabled ? 'load' : 'clear',
          storeOp: 'store',
        },
      ],
    });

    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, this.renderBindGroup);

    if (this.shapeBuffer) {
      renderPass.setVertexBuffer(0, this.shapeBuffer);
    }

    renderPass.draw(this.currentShapeVertexCount, this.config.vectorCount, 0, 0);
    renderPass.end();

    // Si post-processing está activado, aplicar efectos
    if (usePostProcess && this.postProcessPipeline && this.postProcessUniformBuffer && this.resolvedTexture && this.sampler) {
      // Crear bind group solo si es necesario (cache optimization)
      if (this.postProcessBindGroupNeedsUpdate || !this.postProcessBindGroup) {
        this.postProcessBindGroup = this.device.createBindGroup({
          layout: this.postProcessPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: this.postProcessUniformBuffer } },
            { binding: 1, resource: this.resolvedTextureView! },
            { binding: 2, resource: this.sampler },
          ],
        });
        this.postProcessBindGroupNeedsUpdate = false;
      }

      const postProcessPass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: canvasTextureView,
            clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      });

      postProcessPass.setPipeline(this.postProcessPipeline);
      postProcessPass.setBindGroup(0, this.postProcessBindGroup);
      postProcessPass.draw(3, 1, 0, 0); // Fullscreen quad
      postProcessPass.end();
    }

    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Calcula el tamaño óptimo de workgroup basado en los límites del device
   */
  private calculateOptimalWorkgroupSize(): number {
    if (!this.device) return 64;  // Fallback

    const limits = this.device.limits;
    const maxWorkgroupSizeX = limits.maxComputeWorkgroupSizeX;
    const maxInvocationsPerWorkgroup = limits.maxComputeInvocationsPerWorkgroup;

    // Start with largest power of 2 that fits within limits
    let size = 256;  // Typical good size for desktop GPUs

    // Ensure we don't exceed device limits
    size = Math.min(size, maxWorkgroupSizeX, maxInvocationsPerWorkgroup);

    // Round down to nearest power of 2 for optimal performance
    size = Math.pow(2, Math.floor(Math.log2(size)));

    // Minimum of 32 (very small workgroups are inefficient)
    size = Math.max(32, size);

    return size;
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

  /**
   * Obtiene el vector data actual (para exportación/publicación)
   * @returns Float32Array con formato [baseX, baseY, angle, length] por cada vector, o null
   */
  getVectorData(): Float32Array | null {
    return this.currentVectorData;
  }
}
