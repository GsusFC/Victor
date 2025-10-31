/**
 * WebGPUEngine - Motor principal para renderizado de campos vectoriales
 * Singleton que maneja inicialización, buffers, pipelines y render loop
 */

import { normalizeAngle } from '@/lib/math-utils';
import type { AnimationType, VectorShape, WebGPUEngineConfig } from '@/types/engine';
import { vectorShader } from './shaders/render/vector.wgsl';
import { fadeShader } from './shaders/render/fade.wgsl';
import { postProcessShader } from './shaders/render/postprocess.wgsl';
import { blurShader } from './shaders/render/blur.wgsl';
import { bloomExtractShader } from './shaders/render/bloom-extract.wgsl';
import { bloomBlurShader } from './shaders/render/bloom-blur.wgsl';
import { bloomCombineShader } from './shaders/render/bloom-combine.wgsl';
import { ShapeLibrary, type ShapeName } from './ShapeLibrary';
import { TextureManager } from './core/TextureManager';
import { PipelineManager } from './core/PipelineManager';
import { UniformManager } from './core/UniformManager';
import {
  noneShader,
  smoothWavesShader,
  seaWavesShader,
  breathingSoftShader,
  flowFieldShader,
  rippleEffectShader,
  organicGrowthShader,
  fluidDynamicsShader,
  auroraShader,
  electricPulseShader,
  vortexShader,
  directionalFlowShader,
  stormShader,
  solarFlareShader,
  radiationShader,
  magneticFieldShader,
  chaosAttractorShader,
  plasmaBallShader,
  blackHoleShader,
  lightningStormShader,
  quantumFieldShader,
  tangenteClasicaShader,
  lissajousShader,
  geometricPatternShader,
  harmonicOscillatorShader,
  spirographShader,
  fibonacciShader,
  voronoiDiagramShader,
  mandalasShader,
  kaleidoscopeShader,
  dnaHelixShader,
  springMeshShader,
  createShaderWithWorkgroupSize,
} from './shaders/compute/animations.wgsl';

interface MouseUniform {
  x: number;
  y: number;
  active: boolean;
}



export class WebGPUEngine {
  private static instance: WebGPUEngine | null = null;

  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private canvas: HTMLCanvasElement | null = null;

  // Managers
  private textureManager: TextureManager | null = null;
  private pipelineManager: PipelineManager | null = null;
  private uniformManager: UniformManager | null = null;

  private renderPipeline: GPURenderPipeline | null = null;
  private computePipeline: GPUComputePipeline | null = null;
  private computePipelines: Map<AnimationType, GPUComputePipeline> = new Map();

  // Buffers
  private vectorBuffer: GPUBuffer | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private shapeBuffer: GPUBuffer | null = null; // Nuevo: geometría de la forma actual

  // Vector data cache (para exportación)
  private currentVectorData: Float32Array | null = null;

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

  // Advanced Bloom system
  private bloomExtractPipeline: GPURenderPipeline | null = null;
  private bloomBlurPipeline: GPURenderPipeline | null = null;
  private bloomCombinePipeline: GPURenderPipeline | null = null;
  private bloomExtractUniformBuffer: GPUBuffer | null = null;
  private bloomBlurUniformBuffer: GPUBuffer | null = null;
  private bloomCombineUniformBuffer: GPUBuffer | null = null;
  private bloomEnabled = false;
  private bloomQuality = 9;  // 5, 9, or 13 samples
  private bloomRadius = 1.5;
  private bloomThreshold = 0.7;
  private bloomIntensity = 0.5;

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

  // GPU Timing (profiling)
  private timingEnabled = false;
  private querySet: GPUQuerySet | null = null;
  private queryBuffer: GPUBuffer | null = null;
  private queryResolveBuffer: GPUBuffer | null = null;
  private lastTimingResults: { compute: number; render: number; postProcess: number } | null = null;

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

  private constructor() {}

  static getInstance(): WebGPUEngine {
    if (!WebGPUEngine.instance) {
      WebGPUEngine.instance = new WebGPUEngine();
    }
    return WebGPUEngine.instance;
  }

  /**
   * Helper: Obtiene las texturas del TextureManager
   */
  private getTextures() {
    if (!this.textureManager) {
      throw new Error('TextureManager no inicializado');
    }
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    return this.textureManager.getPostProcessTextures(canvasFormat);
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

      // Inicializar TextureManager
      this.textureManager = new TextureManager(this.device, canvas);
      console.log('✅ TextureManager inicializado');

      // Inicializar UniformManager
      this.uniformManager = new UniformManager(this.device);
      this.uniformBuffer = this.uniformManager.getBuffer();
      console.log('✅ UniformManager inicializado');

      // Crear shader modules
      const renderShaderModule = this.device.createShaderModule({
        label: 'Vector Render Shader',
        code: vectorShader,
      });

      const fadeShaderModule = this.device.createShaderModule({
        label: 'Fade Shader',
        code: fadeShader,
      });

      const postProcessShaderModule = this.device.createShaderModule({
        label: 'Post-Process Shader',
        code: postProcessShader,
      });

      const blurShaderModule = this.device.createShaderModule({
        label: 'Blur Shader',
        code: blurShader,
      });

      const bloomExtractShaderModule = this.device.createShaderModule({
        label: 'Bloom Extract Shader',
        code: bloomExtractShader,
      });

      const bloomBlurShaderModule = this.device.createShaderModule({
        label: 'Bloom Blur Shader',
        code: bloomBlurShader,
      });

      const bloomCombineShaderModule = this.device.createShaderModule({
        label: 'Bloom Combine Shader',
        code: bloomCombineShader,
      });

      // Crear compute shader modules para cada animación
      const computeShaderModules = this.createComputeShaderModules();

      // Inicializar PipelineManager
      this.pipelineManager = new PipelineManager(this.device, canvasFormat);
      const pipelines = this.pipelineManager.getPipelines(
        renderShaderModule,
        fadeShaderModule,
        postProcessShaderModule,
        blurShaderModule,
        bloomExtractShaderModule,
        bloomBlurShaderModule,
        bloomCombineShaderModule,
        computeShaderModules
      );

      // Asignar pipelines
      this.renderPipeline = pipelines.render;
      this.computePipelines = pipelines.compute;
      this.computePipeline = this.computePipelines.get('smoothWaves') || null;
      this.fadePipeline = pipelines.fade;
      this.postProcessPipeline = pipelines.postProcess;
      this.blurPipeline = pipelines.blur;
      this.bloomExtractPipeline = pipelines.bloomExtract;
      this.bloomBlurPipeline = pipelines.bloomBlur;
      this.bloomCombinePipeline = pipelines.bloomCombine;

      // Obtener bind group layouts
      const layouts = this.pipelineManager.getBindGroupLayouts();
      this.computeBindGroupLayout = layouts.compute;

      // Crear uniform buffers para fade
      this.fadeUniformBuffer = this.device.createBuffer({
        label: 'Fade Uniform Buffer',
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      this.device.queue.writeBuffer(
        this.fadeUniformBuffer,
        0,
        new Float32Array([this.trailsDecay])
      );

      // Crear bind group para fade
      this.fadeBindGroup = this.device.createBindGroup({
        label: 'Fade Bind Group',
        layout: layouts.fade,
        entries: [
          {
            binding: 0,
            resource: { buffer: this.fadeUniformBuffer },
          },
        ],
      });

      // Crear uniform buffers para post-processing
      this.postProcessUniformBuffer = this.device.createBuffer({
        size: 16 * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      this.blurUniformBuffer = this.device.createBuffer({
        size: 4 * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      // Crear uniform buffers para bloom
      this.bloomExtractUniformBuffer = this.device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      this.bloomBlurUniformBuffer = this.device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      this.bloomCombineUniformBuffer = this.device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      console.log(`✅ PipelineManager inicializado (${this.computePipelines.size} animaciones)`);

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
   * Crea compute shader modules para todas las animaciones
   */
  private createComputeShaderModules(): Map<AnimationType, GPUShaderModule> {
    if (!this.device) return new Map();

    // Mapeo de tipos de animación a shaders (base templates)
    const animationShaderTemplates: Record<AnimationType, string> = {
      none: noneShader,
      // Naturales/Fluidas
      smoothWaves: smoothWavesShader,
      seaWaves: seaWavesShader,
      breathingSoft: breathingSoftShader,
      flowField: flowFieldShader,
      dnaHelix: dnaHelixShader,
      rippleEffect: rippleEffectShader,
      organicGrowth: organicGrowthShader,
      fluidDynamics: fluidDynamicsShader,
      aurora: auroraShader,
      // Energéticas
      electricPulse: electricPulseShader,
      vortex: vortexShader,
      directionalFlow: directionalFlowShader,
      storm: stormShader,
      solarFlare: solarFlareShader,
      radiation: radiationShader,
      magneticField: magneticFieldShader,
      chaosAttractor: chaosAttractorShader,
      plasmaBall: plasmaBallShader,
      blackHole: blackHoleShader,
      lightningStorm: lightningStormShader,
      quantumField: quantumFieldShader,
      // Geométricas
      tangenteClasica: tangenteClasicaShader,
      lissajous: lissajousShader,
      geometricPattern: geometricPatternShader,
      harmonicOscillator: harmonicOscillatorShader,
      spirograph: spirographShader,
      fibonacci: fibonacciShader,
      voronoiDiagram: voronoiDiagramShader,
      mandalas: mandalasShader,
      kaleidoscope: kaleidoscopeShader,
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

    // Crear shader modules
    const shaderModules = new Map<AnimationType, GPUShaderModule>();
    for (const [type, shaderCode] of Object.entries(animationShaders)) {
      const shaderModule = this.device.createShaderModule({
        label: `${type} Compute Shader`,
        code: shaderCode,
      });
      shaderModules.set(type as AnimationType, shaderModule);
    }

    return shaderModules;
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
   * Actualiza configuración de advanced bloom
   */
  setAdvancedBloom(config: {
    enabled?: boolean;
    quality?: 5 | 9 | 13;
    radius?: number;
    threshold?: number;
    intensity?: number;
  }): void {
    if (config.enabled !== undefined) {
      this.bloomEnabled = config.enabled;
    }
    if (config.quality !== undefined) {
      this.bloomQuality = config.quality;
    }
    if (config.radius !== undefined) {
      this.bloomRadius = config.radius;
    }
    if (config.threshold !== undefined) {
      this.bloomThreshold = config.threshold;
    }
    if (config.intensity !== undefined) {
      this.bloomIntensity = config.intensity;
    }

    // Actualizar uniform buffers si ya existen
    if (this.device) {
      // Extract uniforms: threshold + softKnee
      if (this.bloomExtractUniformBuffer) {
        this.device.queue.writeBuffer(
          this.bloomExtractUniformBuffer,
          0,
          new Float32Array([this.bloomThreshold, 0.5, 0.0, 0.0]) // threshold, softKnee, padding
        );
      }

      // Combine uniforms: intensity
      if (this.bloomCombineUniformBuffer) {
        this.device.queue.writeBuffer(
          this.bloomCombineUniformBuffer,
          0,
          new Float32Array([this.bloomIntensity, 0.0, 0.0, 0.0]) // intensity, padding
        );
      }
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
   * Recrea buffers cuando cambia la configuración
   */
  private recreateBuffers(): void {
    // Destruir buffers antiguos
    this.vectorBuffer?.destroy();
    this.shapeBuffer?.destroy();

    // Crear nuevos buffers
    this.vectorBuffer = this.createVectorBuffer(this.config.vectorCount);
    this.shapeBuffer = this.createShapeBuffer(this.config.vectorShape);

    // NOTA: uniformBuffer NO se recrea aquí porque es manejado por UniformManager
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
   * Actualiza las dimensiones del canvas y recrea texturas
   */
  updateCanvasDimensions(_width: number, _height: number): void {
    if (!this.canvas || !this.context || !this.device || !this.textureManager) return;

    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    this.textureManager.updateCanvasDimensions(canvasFormat);

    // Invalidar bind groups que usan las texturas
    this.postProcessBindGroupNeedsUpdate = true;
    this.postProcessBindGroup = null;
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
    if (!this.uniformManager) return;

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

    // Convertir color hex a RGB
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

    const rgb = hexToRgb(color);
    const mouseUniform = mousePosition ?? { x: 0, y: 0, active: false };
    const gradientStopsInput = gradient?.stops ?? [];
    const enabled = Boolean(gradient?.enabled) && gradientStopsInput.length > 0;

    // Factor dinámico de conversión píxel → ISO (Y va de -1 a 1)
    const canvasHeight = this.canvas?.height ?? 0;
    const pixelToISO = canvasHeight > 0 ? 2 / canvasHeight : 0.001;

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
      const angleRad = (currentAngle * Math.PI) / 180;
      linearDirX = Math.cos(angleRad);
      linearDirY = Math.sin(angleRad);

      const corners = [
        { x: -aspect, y: -1 },
        { x: aspect, y: -1 },
        { x: aspect, y: 1 },
        { x: -aspect, y: 1 },
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

      if (!Number.isFinite(linearMin) || !Number.isFinite(linearMax) || Math.abs(linearMax - linearMin) < 1e-4) {
        linearMin = -1;
        linearMax = 1;
      }

      if (radialMax < 1e-4) {
        radialMax = Math.SQRT2;
      }

      this.gradientFieldCache.scope = gradientScope;
      this.gradientFieldCache.type = currentType;
      this.gradientFieldCache.angle = currentAngle;
      this.gradientFieldCache.linearDirX = linearDirX;
      this.gradientFieldCache.linearDirY = linearDirY;
      this.gradientFieldCache.linearMin = linearMin;
      this.gradientFieldCache.linearMax = linearMax;
      this.gradientFieldCache.radialMax = radialMax;
    }

    // Delegar al UniformManager
    try {
      this.uniformManager.updateUniforms(
        {
          aspect,
          time,
          vectorLength: this.config.vectorLength,
          vectorWidth: this.config.vectorWidth,
          pixelToISO,
          zoom,
          speed,
          gradientStopCount: 0, // Se calculará en el manager
          param1,
          param2,
          param3,
          maxLength: param4,
          mouseX: mouseUniform.active ? mouseUniform.x : 0.0,
          mouseY: mouseUniform.active ? mouseUniform.y : 0.0,
          mouseActive: mouseUniform.active ? 1.0 : 0.0,
          colorR: rgb.r,
          colorG: rgb.g,
          colorB: rgb.b,
          gradientEnabled: enabled ? 1.0 : 0.0,
          gradientMode,
          gradientType: gradientTypeValue,
          linearDirX,
          linearDirY,
          linearMin,
          linearMax,
          radialMax,
          seed,
        },
        enabled ? gradientStopsInput : []
      );
    } catch (error) {
      console.error('❌ Error updating uniforms:', error);
      throw error;
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
   * Aplica advanced bloom multi-pass (extract → blur H → blur V → combine)
   * @param commandEncoder Command encoder para agregar render passes
   */
  private applyAdvancedBloom(commandEncoder: GPUCommandEncoder): void {
    if (
      !this.device ||
      !this.bloomExtractPipeline ||
      !this.bloomBlurPipeline ||
      !this.bloomCombinePipeline
    ) {
      return;
    }

    // Obtener texturas del TextureManager
    const textures = this.getTextures();

    // Pass 1: Extract bright colors
    const extractBindGroup = this.device.createBindGroup({
      layout: this.bloomExtractPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: textures.resolved.view }, // Input: rendered scene
        { binding: 1, resource: textures.sampler },
        { binding: 2, resource: { buffer: this.bloomExtractUniformBuffer! } },
      ],
    });

    const extractPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textures.bloomExtract.view,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    extractPass.setPipeline(this.bloomExtractPipeline);
    extractPass.setBindGroup(0, extractBindGroup);
    extractPass.draw(3, 1, 0, 0);
    extractPass.end();

    // Pass 2: Horizontal blur
    const horizontalBlurUniforms = new Float32Array([
      1.0, 0.0,                  // direction (horizontal)
      this.bloomRadius,          // radius
      this.bloomQuality,         // quality
    ]);
    this.device.queue.writeBuffer(this.bloomBlurUniformBuffer!, 0, horizontalBlurUniforms);

    const horizontalBlurBindGroup = this.device.createBindGroup({
      layout: this.bloomBlurPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: textures.bloomExtract.view }, // Input: bright pass
        { binding: 1, resource: textures.sampler },
        { binding: 2, resource: { buffer: this.bloomBlurUniformBuffer! } },
      ],
    });

    const horizontalBlurPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textures.bloomBlur1.view,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    horizontalBlurPass.setPipeline(this.bloomBlurPipeline);
    horizontalBlurPass.setBindGroup(0, horizontalBlurBindGroup);
    horizontalBlurPass.draw(3, 1, 0, 0);
    horizontalBlurPass.end();

    // Pass 3: Vertical blur
    const verticalBlurUniforms = new Float32Array([
      0.0, 1.0,                  // direction (vertical)
      this.bloomRadius,          // radius
      this.bloomQuality,         // quality
    ]);
    this.device.queue.writeBuffer(this.bloomBlurUniformBuffer!, 0, verticalBlurUniforms);

    const verticalBlurBindGroup = this.device.createBindGroup({
      layout: this.bloomBlurPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: textures.bloomBlur1.view }, // Input: horizontally blurred
        { binding: 1, resource: textures.sampler },
        { binding: 2, resource: { buffer: this.bloomBlurUniformBuffer! } },
      ],
    });

    const verticalBlurPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textures.bloomBlur2.view, // Output to bloomBlur2 (final blurred bloom)
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    verticalBlurPass.setPipeline(this.bloomBlurPipeline);
    verticalBlurPass.setBindGroup(0, verticalBlurBindGroup);
    verticalBlurPass.draw(3, 1, 0, 0);
    verticalBlurPass.end();

    // Pass 4: Combine bloom with original (write to blurTexture for final post-process)
    const combineBindGroup = this.device.createBindGroup({
      layout: this.bloomCombinePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: textures.resolved.view }, // Original scene
        { binding: 1, resource: textures.bloomBlur2.view }, // Blurred bloom
        { binding: 2, resource: textures.sampler },
        { binding: 3, resource: { buffer: this.bloomCombineUniformBuffer! } },
      ],
    });

    const combinePass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textures.blur.view, // Write combined result to blurTexture
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    combinePass.setPipeline(this.bloomCombinePipeline);
    combinePass.setBindGroup(0, combineBindGroup);
    combinePass.draw(3, 1, 0, 0);
    combinePass.end();

    // Ahora blurTexture contiene la imagen con bloom aplicado
    // El post-process final debe usar blurTexture en lugar de resolvedTexture
  }

  /**
   * Renderiza un frame
   */
  renderFrame(): void {
    if (!this.device || !this.context || !this.renderPipeline || !this.renderBindGroup) {
      console.warn('⚠️ renderFrame: Recursos no disponibles');
      return;
    }

    // Obtener texturas del TextureManager
    const textures = this.getTextures();

    const commandEncoder = this.device.createCommandEncoder();
    const canvasTextureView = this.context.getCurrentTexture().createView();

    // Determinar target de renderizado según post-processing
    const usePostProcess = this.postProcessEnabled && this.postProcessPipeline;
    const targetView = usePostProcess ? textures.renderMSAA.view : textures.renderMSAA.view;
    const resolveTarget = usePostProcess ? textures.resolved.view : canvasTextureView;

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

    // Si advanced bloom está activado, aplicar multi-pass bloom
    if (this.bloomEnabled && usePostProcess) {
      this.applyAdvancedBloom(commandEncoder);
    }

    // Si post-processing está activado, aplicar efectos
    if (usePostProcess && this.postProcessPipeline && this.postProcessUniformBuffer) {
      // Determinar qué textura usar como input:
      // Si bloom está activo, usar blurTexture (contiene bloom aplicado)
      // Si no, usar resolvedTexture (imagen original)
      const postProcessInputView = this.bloomEnabled ? textures.blur.view : textures.resolved.view;

      // Crear bind group solo si es necesario (cache optimization)
      // NOTA: El bind group debe recrearse si cambia la textura de input
      if (this.postProcessBindGroupNeedsUpdate || !this.postProcessBindGroup) {
        this.postProcessBindGroup = this.device.createBindGroup({
          layout: this.postProcessPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: this.postProcessUniformBuffer } },
            { binding: 1, resource: postProcessInputView },
            { binding: 2, resource: textures.sampler },
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
    this.textureManager?.dispose();
    this.pipelineManager?.dispose();
    this.uniformManager?.dispose();

    this.vectorBuffer = null;
    this.uniformBuffer = null;
    this.textureManager = null;
    this.pipelineManager = null;
    this.uniformManager = null;
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

  /**
   * Obtiene estadísticas de performance para debugging
   */
  getPerformanceStats(): {
    vectorCount: number;
    workgroupSize: number;
    postProcessingEnabled: boolean;
    trailsEnabled: boolean;
    currentAnimation: string;
    canvasSize: { width: number; height: number };
  } | null {
    if (!this.canvas) return null;

    return {
      vectorCount: this.config.vectorCount,
      workgroupSize: this.optimalWorkgroupSize,
      postProcessingEnabled: this.postProcessEnabled,
      trailsEnabled: this.trailsEnabled,
      currentAnimation: this.currentAnimationType,
      canvasSize: {
        width: this.canvas.width,
        height: this.canvas.height,
      },
    };
  }
}
