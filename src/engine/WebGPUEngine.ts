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
import { ShapeLibrary } from './ShapeLibrary';
import { Camera3D } from './Camera3D';
import { CoordinateSystem3D } from './CoordinateSystem3D';
import { ShapeLibrary3D } from './ShapeLibrary3D';
import { vector3DShader } from './shaders/render/vector3d.wgsl';
import { get3DAnimationShader } from './shaders/compute/animations3d.wgsl';
import type { RenderMode } from './types/engine';
import { TextureManager } from './core/TextureManager';
import { PipelineManager } from './core/PipelineManager';
import { UniformManager } from './core/UniformManager';
import { ComputePass } from './rendering/ComputePass';
import { RenderPass } from './rendering/RenderPass';
import {
  BLOOM_DEFAULTS,
  TRAILS_DEFAULTS,
  WEBGPU_DEFAULTS,
} from './constants';
import { validateAnimationParams } from './animation-configs';
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
  interferenceWavesShader,
  particleFlowShader,
  animatedFractalsShader,
  crystallizationShader,
  shockWavesShader,
  gravityFieldShader,
  coupledOscillatorsShader,
  dynamicMazeShader,
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
  private canvasFormat: GPUTextureFormat | null = null;

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
  private camera3DBuffer: GPUBuffer | null = null; // Buffer para matrices de cámara 3D
  private camera3DEnabled: boolean = false;

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
  private trailsEnabled = false;
  private trailsDecay: number = TRAILS_DEFAULTS.DECAY;

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
  private bloomQuality: number = BLOOM_DEFAULTS.QUALITY;
  private bloomRadius: number = BLOOM_DEFAULTS.RADIUS;
  private bloomThreshold: number = BLOOM_DEFAULTS.THRESHOLD;
  private bloomIntensity: number = BLOOM_DEFAULTS.INTENSITY;

  // Bloom bind groups cache
  private bloomExtractBindGroup: GPUBindGroup | null = null;
  private bloomHorizontalBlurBindGroup: GPUBindGroup | null = null;
  private bloomVerticalBlurBindGroup: GPUBindGroup | null = null;
  private bloomCombineBindGroup: GPUBindGroup | null = null;
  private bloomBindGroupsNeedUpdate = true;

  // Estado
  private isInitialized = false;
  private isInitializing = false;
  private currentAnimationType: AnimationType = 'smoothWaves';
  private optimalWorkgroupSize: number = WEBGPU_DEFAULTS.OPTIMAL_WORKGROUP_SIZE;
  private config: WebGPUEngineConfig = {
    vectorCount: 100,
    vectorLength: 20,
    vectorWidth: 2,
    gridRows: 10,
    gridCols: 10,
    vectorShape: 'line',
  };

  // 3D System
  private renderMode: RenderMode = '2D';
  private camera3D: Camera3D | null = null;
  private coordinateSystem3D: CoordinateSystem3D | null = null;
  private shapeLibrary3D: ShapeLibrary3D = new ShapeLibrary3D();

  // 3D Buffers
  private vector3DBuffer: GPUBuffer | null = null;
  private vector3DCount: number = 0; // Actual count of 3D vectors (from grid)
  private shape3DBuffer: GPUBuffer | null = null;

  // 3D Pipelines
  private render3DPipeline: GPURenderPipeline | null = null;
  private compute3DPipeline: GPUComputePipeline | null = null;
  private compute3DPipelines: Map<string, GPUComputePipeline> = new Map();

  // 3D Shape
  private currentShape3DVertexCount: number = 2; // Line by default

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
    if (!this.textureManager || !this.canvasFormat) {
      throw new Error('TextureManager o canvasFormat no inicializado');
    }
    return this.textureManager.getPostProcessTextures(this.canvasFormat);
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

      // Cachear canvas format para evitar llamadas repetidas
      this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: this.canvasFormat,
        alphaMode: 'premultiplied',
      });
      console.log(`✅ Contexto configurado (format: ${this.canvasFormat})`);

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
      this.pipelineManager = new PipelineManager(this.device, this.canvasFormat);
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
      const fadeData = new Float32Array([this.trailsDecay]);
      this.device.queue.writeBuffer(
        this.fadeUniformBuffer,
        0,
        new Uint8Array(fadeData.buffer, fadeData.byteOffset, fadeData.byteLength)
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

      // Inicializar sistema 3D
      await this.initialize3DSystem();
      console.log('✅ Sistema 3D inicializado');

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
   * Initialize 3D rendering system
   */
  private async initialize3DSystem(): Promise<void> {
    if (!this.device || !this.canvas) return;

    // Initialize Camera3D
    const aspect = this.canvas.width / this.canvas.height;

    // Calculate optimal distance for the grid (will be set after grid creation)
    this.camera3D = new Camera3D({
      distance: 500, // Temporary, will be updated after grid
      fov: 60,
      aspect,
      near: 1.0,
      far: 3000,
    });
    this.camera3D.setPreset('isometric');

    // Initialize CoordinateSystem3D
    const grid3DSize = 15; // 15x15x15 = 3375 vectors (close to 3540)
    this.coordinateSystem3D = new CoordinateSystem3D({
      rows: grid3DSize,
      cols: grid3DSize,
      layers: grid3DSize,
      spacing: 20, // Reduced spacing for denser grid
      aspect,
    });

    // Update camera distance based on grid size
    const optimalDistance = this.coordinateSystem3D.getOptimalCameraDistance(this.camera3D.fov);
    this.camera3D.distance = optimalDistance;
    this.camera3D.applyTargetsImmediately();
    console.log(`📷 Camera distance set to ${optimalDistance.toFixed(1)} for grid ${grid3DSize}x${grid3DSize}x${grid3DSize}`);

    // Create 3D vector buffer with grid size (not config.vectorCount)
    this.vector3DCount = this.coordinateSystem3D.getCount();
    console.log(`🎯 3D System: Creating buffer for ${this.vector3DCount} vectors (${grid3DSize}³ grid)`);

    this.vector3DBuffer = this.createVector3DBuffer(this.vector3DCount);
    if (!this.vector3DBuffer) {
      console.error('❌ Failed to create 3D vector buffer');
      return;
    }
    console.log(`✅ 3D vector buffer created successfully`);

    // Camera uniforms are now in the shared uniform buffer (managed by UniformManager)
    // Offsets 32-55 reserved for: viewProjMatrix (32-47), cameraPos (48-50), renderMode (51)

    // Create 3D shape buffer
    const shape = this.shapeLibrary3D.getShape('line');
    if (shape) {
      this.shape3DBuffer = this.device.createBuffer({
        label: '3D Shape Vertex Buffer',
        size: shape.vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      this.device.queue.writeBuffer(
        this.shape3DBuffer,
        0,
        shape.vertices.buffer,
        shape.vertices.byteOffset,
        shape.vertices.byteLength
      );
      this.currentShape3DVertexCount = shape.vertexCount;
    }

    // Create 3D shader modules
    const render3DShaderModule = this.device.createShaderModule({
      label: '3D Vector Render Shader',
      code: vector3DShader,
    });

    const compute3DShaderModule = this.device.createShaderModule({
      label: '3D Smooth Waves Compute Shader',
      code: get3DAnimationShader('smoothWaves3D'),
    });

    // Create 3D render pipeline
    this.render3DPipeline = this.device.createRenderPipeline({
      label: '3D Vector Render Pipeline',
      layout: 'auto',
      vertex: {
        module: render3DShaderModule,
        entryPoint: 'vertexMain',
        buffers: [
          {
            arrayStride: 12, // 3 floats (x, y, z)
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: 'float32x3',
              },
            ],
          },
        ],
      },
      fragment: {
        module: render3DShaderModule,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: this.canvasFormat || 'bgra8unorm',
          },
        ],
      },
      primitive: {
        topology: 'line-list',
        cullMode: 'none',
      },
      multisample: {
        count: 4,
      },
    });

    // Create 3D compute pipeline
    this.compute3DPipeline = this.device.createComputePipeline({
      label: '3D Compute Pipeline',
      layout: 'auto',
      compute: {
        module: compute3DShaderModule,
        entryPoint: 'computeMain',
      },
    });

    // Store in map for animation switching
    this.compute3DPipelines.set('smoothWaves3D', this.compute3DPipeline);

    // Create other 3D animation pipelines
    const vortex3DModule = this.device.createShaderModule({
      code: get3DAnimationShader('vortex3D'),
    });
    const vortex3DPipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: vortex3DModule, entryPoint: 'computeMain' },
    });
    this.compute3DPipelines.set('vortex3D', vortex3DPipeline);

    const spherical3DModule = this.device.createShaderModule({
      code: get3DAnimationShader('sphericalWaves3D'),
    });
    const spherical3DPipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: spherical3DModule, entryPoint: 'computeMain' },
    });
    this.compute3DPipelines.set('sphericalWaves3D', spherical3DPipeline);
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
      particleFlow: particleFlowShader,
      crystallization: crystallizationShader,
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
      shockWaves: shockWavesShader,
      interferenceWaves: interferenceWavesShader,
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
      animatedFractals: animatedFractalsShader,
      // Experimentales
      springMesh: springMeshShader,
      gravityField: gravityFieldShader,
      coupledOscillators: coupledOscillatorsShader,
      dynamicMaze: dynamicMazeShader,
      // 3D Animations (placeholders, not used in 2D pipeline)
      smoothWaves3D: noneShader,
      vortex3D: noneShader,
      sphericalWaves3D: noneShader,
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
    // Check if it's a 3D animation
    const is3DAnimation = type.endsWith('3D');

    if (is3DAnimation) {
      // Use 3D pipeline
      const pipeline3D = this.compute3DPipelines.get(type);
      if (pipeline3D) {
        this.compute3DPipeline = pipeline3D;
        this.currentAnimationType = type;
        console.log(`🎨 Animación 3D cambiada a: ${type}`, {
          pipelineExists: !!pipeline3D,
          vectorCount: this.vector3DCount,
          renderMode: this.renderMode,
        });

        // IMPORTANT: Set reasonable default parameters for 3D animations if they are 0
        // 3D shaders need non-zero param1/param2 to produce visible motion
        // param1 is typically frequency/strength, param2 is amplitude
        console.warn(`⚠️ NOTA: Si los vectores 3D no se mueven, asegúrate de que los parámetros param1 y param2 tengan valores > 0 (ej: param1=20, param2=1)`);
      } else {
        console.warn(`⚠️ Animación 3D ${type} no encontrada. Pipelines disponibles:`, Array.from(this.compute3DPipelines.keys()));
      }
    } else {
      // Use 2D pipeline
      const pipeline = this.computePipelines.get(type);
      if (pipeline) {
        this.computePipeline = pipeline;
        this.currentAnimationType = type;
        console.log(`🎨 Animación cambiada a: ${type}`);
      } else {
        console.warn(`⚠️ Animación ${type} no encontrada`);
      }
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
    this.trailsDecay = enabled
      ? TRAILS_DEFAULTS.OPACITY_TO_DECAY_MAX - opacity * TRAILS_DEFAULTS.OPACITY_RANGE
      : 1.0;

      // Actualizar uniform buffer si ya existe
      if (this.fadeUniformBuffer && this.device) {
        const fadeData = new Float32Array([this.trailsDecay]);
        this.device.queue.writeBuffer(
          this.fadeUniformBuffer,
          0,
          new Uint8Array(fadeData.buffer, fadeData.byteOffset, fadeData.byteLength)
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

      this.device.queue.writeBuffer(
        this.postProcessUniformBuffer,
        0,
        new Uint8Array(uniforms.buffer, uniforms.byteOffset, uniforms.byteLength)
      );
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
        const extractData = new Float32Array([this.bloomThreshold, 0.5, 0.0, 0.0]);
        this.device.queue.writeBuffer(
          this.bloomExtractUniformBuffer,
          0,
          new Uint8Array(extractData.buffer, extractData.byteOffset, extractData.byteLength)
        );
      }

      // Combine uniforms: intensity
      if (this.bloomCombineUniformBuffer) {
        const combineData = new Float32Array([this.bloomIntensity, 0.0, 0.0, 0.0]);
        this.device.queue.writeBuffer(
          this.bloomCombineUniformBuffer,
          0,
          new Uint8Array(combineData.buffer, combineData.byteOffset, combineData.byteLength)
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
   * Create 3D vector buffer
   */
  private createVector3DBuffer(count: number): GPUBuffer | null {
    if (!this.device || !this.coordinateSystem3D) return null;

    // Each 3D vector: [baseX, baseY, baseZ, dirX, dirY, dirZ, length, _padding]
    // Total: 8 floats per vector (32 bytes)
    const vectorSize = 8 * Float32Array.BYTES_PER_ELEMENT;
    const bufferSize = count * vectorSize;

    const buffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: false,
    });

    // Initialize with grid positions
    const positions = this.coordinateSystem3D.getPositions();
    const vectorData = new Float32Array(count * 8);

    for (let i = 0; i < Math.min(count, positions.length); i++) {
      const pos = positions[i];
      const offset = i * 8;

      // Base position
      vectorData[offset + 0] = pos.x;
      vectorData[offset + 1] = pos.y;
      vectorData[offset + 2] = pos.z;

      // Initial direction (pointing up)
      vectorData[offset + 3] = 0.0;
      vectorData[offset + 4] = 1.0;
      vectorData[offset + 5] = 0.0;

      // Length
      vectorData[offset + 6] = 1.0;

      // Padding
      vectorData[offset + 7] = 0.0;
    }

    this.device.queue.writeBuffer(
      buffer,
      0,
      vectorData.buffer,
      vectorData.byteOffset,
      vectorData.byteLength
    );

    console.log(`✅ 3D Vector buffer created: ${count} vectors`);

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
    if (!this.canvas || !this.context || !this.device || !this.textureManager || !this.canvasFormat) return;

    console.log(`🔄 Actualizando dimensiones del canvas: ${_width}x${_height}`);
    this.textureManager.updateCanvasDimensions(this.canvasFormat);

    // Invalidar TODOS los bind groups que usan las texturas
    this.postProcessBindGroupNeedsUpdate = true;
    this.bloomBindGroupsNeedUpdate = true;

    // Limpiar bind groups para forzar recreación
    this.postProcessBindGroup = null;
    this.blurBindGroup = null;
    this.bloomExtractBindGroup = null;
    this.bloomHorizontalBlurBindGroup = null;
    this.bloomVerticalBlurBindGroup = null;
    this.bloomCombineBindGroup = null;

    console.log('✅ Bind groups invalidados, se recrearán en el siguiente frame');
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
    this.device.queue.writeBuffer(
      this.vectorBuffer,
      0,
      new Uint8Array(sortedData.buffer, sortedData.byteOffset, sortedData.byteLength)
    );

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

    // Obtener parámetros validados usando configuración centralizada
    const validated = validateAnimationParams(this.currentAnimationType, params);
    const param1 = validated.frequency;
    const param2 = validated.amplitude;
    const param3 = validated.elasticity;
    const param4 = validated.maxLength;

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
    // Route to 3D compute if in 3D mode
    if (this.renderMode === '3D') {
      this.computeAnimation3D();
      return;
    }

    // 2D compute (original code)
    if (!this.device || !this.computePipeline || !this.computeBindGroup) return;

    // Calcular workgroups usando el tamaño óptimo calculado
    const workgroupCount = Math.ceil(this.config.vectorCount / this.optimalWorkgroupSize);

    const computePass = new ComputePass({
      label: 'Vector Animation Compute Pass',
      pipeline: this.computePipeline,
      bindGroups: [this.computeBindGroup],
      workgroupSizeX: workgroupCount,
    });

    const commandEncoder = this.device.createCommandEncoder();
    computePass.execute(commandEncoder);
    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Compute animation in 3D mode
   */
  private computeAnimation3D(): void {
    if (!this.device || !this.compute3DPipeline || !this.vector3DBuffer || !this.uniformBuffer) {
      console.warn('⚠️ computeAnimation3D: Missing resources', {
        device: !!this.device,
        pipeline: !!this.compute3DPipeline,
        vectorBuffer: !!this.vector3DBuffer,
        uniformBuffer: !!this.uniformBuffer,
      });
      return;
    }

    // Validate vector count
    if (this.vector3DCount === 0) {
      console.error('❌ computeAnimation3D: vector3DCount is 0');
      return;
    }

    // Create compute bind group for 3D (recreate each frame to avoid device mismatch)
    const compute3DBindGroup = this.device.createBindGroup({
      layout: this.compute3DPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.vector3DBuffer } },
      ],
    });

    // Calculate workgroups (use 3D vector count, not 2D config)
    const workgroupCount = Math.ceil(this.vector3DCount / this.optimalWorkgroupSize);

    const computePass = new ComputePass({
      label: '3D Vector Animation Compute Pass',
      pipeline: this.compute3DPipeline,
      bindGroups: [compute3DBindGroup],
      workgroupSizeX: workgroupCount,
    });

    const commandEncoder = this.device.createCommandEncoder();
    computePass.execute(commandEncoder);
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

    // Crear bind groups solo si es necesario
    if (this.bloomBindGroupsNeedUpdate || !this.bloomExtractBindGroup) {
      this.bloomExtractBindGroup = this.device.createBindGroup({
        label: 'Bloom Extract Bind Group',
        layout: this.bloomExtractPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: textures.resolved.view }, // Input: rendered scene
          { binding: 1, resource: textures.sampler },
          { binding: 2, resource: { buffer: this.bloomExtractUniformBuffer! } },
        ],
      });
    }

    // Pass 1: Extract bright colors
    const extractRenderPass = new RenderPass({
      label: 'Bloom Extract Pass',
      colorView: textures.bloomExtract.view,
      clearColor: { r: 0, g: 0, b: 0, a: 1 },
    });

    extractRenderPass.execute(commandEncoder, (passEncoder) => {
      passEncoder.setPipeline(this.bloomExtractPipeline!);
      passEncoder.setBindGroup(0, this.bloomExtractBindGroup!);
      passEncoder.draw(3, 1, 0, 0);
    });

    // Pass 2: Horizontal blur
    const horizontalBlurUniforms = new Float32Array([
      1.0, 0.0,                  // direction (horizontal)
      this.bloomRadius,          // radius
      this.bloomQuality,         // quality
    ]);
    this.device.queue.writeBuffer(
      this.bloomBlurUniformBuffer!,
      0,
      new Uint8Array(horizontalBlurUniforms.buffer, horizontalBlurUniforms.byteOffset, horizontalBlurUniforms.byteLength)
    );

    if (this.bloomBindGroupsNeedUpdate || !this.bloomHorizontalBlurBindGroup) {
      this.bloomHorizontalBlurBindGroup = this.device.createBindGroup({
        label: 'Bloom Horizontal Blur Bind Group',
        layout: this.bloomBlurPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: textures.bloomExtract.view }, // Input: bright pass
          { binding: 1, resource: textures.sampler },
          { binding: 2, resource: { buffer: this.bloomBlurUniformBuffer! } },
        ],
      });
    }

    const horizontalBlurRenderPass = new RenderPass({
      label: 'Bloom Horizontal Blur Pass',
      colorView: textures.bloomBlur1.view,
      clearColor: { r: 0, g: 0, b: 0, a: 1 },
    });

    horizontalBlurRenderPass.execute(commandEncoder, (passEncoder) => {
      passEncoder.setPipeline(this.bloomBlurPipeline!);
      passEncoder.setBindGroup(0, this.bloomHorizontalBlurBindGroup!);
      passEncoder.draw(3, 1, 0, 0);
    });

    // Pass 3: Vertical blur
    const verticalBlurUniforms = new Float32Array([
      0.0, 1.0,                  // direction (vertical)
      this.bloomRadius,          // radius
      this.bloomQuality,         // quality
    ]);
    this.device.queue.writeBuffer(
      this.bloomBlurUniformBuffer!,
      0,
      new Uint8Array(verticalBlurUniforms.buffer, verticalBlurUniforms.byteOffset, verticalBlurUniforms.byteLength)
    );

    if (this.bloomBindGroupsNeedUpdate || !this.bloomVerticalBlurBindGroup) {
      this.bloomVerticalBlurBindGroup = this.device.createBindGroup({
        label: 'Bloom Vertical Blur Bind Group',
        layout: this.bloomBlurPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: textures.bloomBlur1.view }, // Input: horizontally blurred
          { binding: 1, resource: textures.sampler },
          { binding: 2, resource: { buffer: this.bloomBlurUniformBuffer! } },
        ],
      });
    }

    const verticalBlurRenderPass = new RenderPass({
      label: 'Bloom Vertical Blur Pass',
      colorView: textures.bloomBlur2.view, // Output to bloomBlur2 (final blurred bloom)
      clearColor: { r: 0, g: 0, b: 0, a: 1 },
    });

    verticalBlurRenderPass.execute(commandEncoder, (passEncoder) => {
      passEncoder.setPipeline(this.bloomBlurPipeline!);
      passEncoder.setBindGroup(0, this.bloomVerticalBlurBindGroup!);
      passEncoder.draw(3, 1, 0, 0);
    });

    // Pass 4: Combine bloom with original (write to blurTexture for final post-process)
    if (this.bloomBindGroupsNeedUpdate || !this.bloomCombineBindGroup) {
      this.bloomCombineBindGroup = this.device.createBindGroup({
        label: 'Bloom Combine Bind Group',
        layout: this.bloomCombinePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: textures.resolved.view }, // Original scene
          { binding: 1, resource: textures.bloomBlur2.view }, // Blurred bloom
          { binding: 2, resource: textures.sampler },
          { binding: 3, resource: { buffer: this.bloomCombineUniformBuffer! } },
        ],
      });
      this.bloomBindGroupsNeedUpdate = false; // Reset flag after creating all bind groups
    }

    const combineRenderPass = new RenderPass({
      label: 'Bloom Combine Pass',
      colorView: textures.blur.view, // Write combined result to blurTexture
      clearColor: { r: 0, g: 0, b: 0, a: 1 },
    });

    combineRenderPass.execute(commandEncoder, (passEncoder) => {
      passEncoder.setPipeline(this.bloomCombinePipeline!);
      passEncoder.setBindGroup(0, this.bloomCombineBindGroup!);
      passEncoder.draw(3, 1, 0, 0);
    });

    // Ahora blurTexture contiene la imagen con bloom aplicado
    // El post-process final debe usar blurTexture en lugar de resolvedTexture
  }

  /**
   * Renderiza un frame
   */
  renderFrame(): void {
    // Route to 3D rendering if in 3D mode
    if (this.renderMode === '3D') {
      this.renderFrame3D();
      return;
    }

    // 2D rendering (original code)
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
      const fadeRenderPass = new RenderPass({
        label: 'Fade Pass',
        colorView: targetView,
        loadOp: 'load',
      });

      fadeRenderPass.execute(commandEncoder, (passEncoder) => {
        passEncoder.setPipeline(this.fadePipeline!);
        passEncoder.setBindGroup(0, this.fadeBindGroup!);
        passEncoder.draw(3, 1, 0, 0);
      });
    }

    // Render pass principal (vectores)
    if (!targetView) {
      console.warn('⚠️ Target view no disponible');
      return;
    }

    const mainRenderPass = new RenderPass({
      label: 'Main Vector Render Pass',
      colorView: targetView,
      colorResolveTarget: resolveTarget,
      clearColor: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
      loadOp: this.trailsEnabled ? 'load' : 'clear',
    });

    mainRenderPass.execute(commandEncoder, (passEncoder) => {
      passEncoder.setPipeline(this.renderPipeline!);
      passEncoder.setBindGroup(0, this.renderBindGroup!);

      if (this.shapeBuffer) {
        passEncoder.setVertexBuffer(0, this.shapeBuffer);
      }

      passEncoder.draw(this.currentShapeVertexCount, this.config.vectorCount, 0, 0);
    });

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
          label: 'Post Process Bind Group',
          layout: this.postProcessPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: this.postProcessUniformBuffer } },
            { binding: 1, resource: postProcessInputView },
            { binding: 2, resource: textures.sampler },
          ],
        });
        this.postProcessBindGroupNeedsUpdate = false;
      }

      const postProcessRenderPass = new RenderPass({
        label: 'Post Process Pass',
        colorView: canvasTextureView,
        clearColor: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear',
      });

      postProcessRenderPass.execute(commandEncoder, (passEncoder) => {
        passEncoder.setPipeline(this.postProcessPipeline!);
        passEncoder.setBindGroup(0, this.postProcessBindGroup!);
        passEncoder.draw(3, 1, 0, 0); // Fullscreen quad
      });
    }

    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Renderiza un frame único con transparencia (para captura de imagen)
   * Renderiza directamente al canvas con fondo transparente
   */
  renderTransparentFrame(): void {
    if (!this.device || !this.context || !this.renderPipeline || !this.renderBindGroup) {
      console.warn('⚠️ renderTransparentFrame: Recursos no disponibles');
      return;
    }

    const textures = this.getTextures();
    const commandEncoder = this.device.createCommandEncoder();
    const canvasTextureView = this.context.getCurrentTexture().createView();

    // Para captura transparente: renderizar directamente al canvas sin post-processing
    // Esto asegura que el alpha channel se preserve
    const targetView = textures.renderMSAA.view;
    const resolveTarget = canvasTextureView;

    // Render pass con fondo TRANSPARENTE
    const mainRenderPass = new RenderPass({
      label: 'Transparent Capture Pass',
      colorView: targetView,
      colorResolveTarget: resolveTarget,
      clearColor: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 }, // Alpha = 0 = transparente
      loadOp: 'clear',
    });

    mainRenderPass.execute(commandEncoder, (passEncoder) => {
      passEncoder.setPipeline(this.renderPipeline!);
      passEncoder.setBindGroup(0, this.renderBindGroup!);

      if (this.shapeBuffer) {
        passEncoder.setVertexBuffer(0, this.shapeBuffer);
      }

      passEncoder.draw(this.currentShapeVertexCount, this.config.vectorCount, 0, 0);
    });

    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Render frame in 3D mode
   */
  private renderFrame3D(): void {
    if (
      !this.device ||
      !this.context ||
      !this.render3DPipeline ||
      !this.vector3DBuffer ||
      !this.shape3DBuffer ||
      !this.camera3D ||
      !this.uniformManager
    ) {
      console.warn('⚠️ renderFrame3D: 3D resources not available');
      return;
    }

    // Update camera
    this.camera3D.update(16); // ~60fps

    // Update camera uniforms in the shared uniform buffer (offsets 32-55)
    const viewProjMatrix = this.camera3D.getViewProjectionMatrix();
    this.uniformManager.updateCamera3D(
      viewProjMatrix.data,
      this.camera3D.position,
      '3D'
    );

    // NOTE: computeAnimation3D() is called in the main render loop (computeAnimation method)
    // to avoid duplicate execution. Do NOT call it here.

    // Create bind group for 3D rendering (recreate each frame to avoid device mismatch)
    if (!this.uniformBuffer || !this.vector3DBuffer) {
      console.warn('⚠️ renderFrame3D: buffers not available');
      return;
    }

    const render3DBindGroup = this.device.createBindGroup({
      layout: this.render3DPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.vector3DBuffer } },
      ],
    });

    const commandEncoder = this.device.createCommandEncoder();
    const canvasTextureView = this.context.getCurrentTexture().createView();

    // Get textures for MSAA
    const textures = this.getTextures();

    // Simple 3D render pass (no depth for now, no post-processing)
    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textures.renderMSAA.view,
          resolveTarget: canvasTextureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.render3DPipeline);
    passEncoder.setBindGroup(0, render3DBindGroup);
    passEncoder.setVertexBuffer(0, this.shape3DBuffer);

    // Draw instanced vectors (use 3D vector count, not 2D config)
    passEncoder.draw(
      this.currentShape3DVertexCount,
      this.vector3DCount,
      0,
      0
    );

    passEncoder.end();
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

  // ============================================
  // 3D MODE PUBLIC API
  // ============================================

  /**
   * Set render mode (2D or 3D)
   */
  setRenderMode(mode: RenderMode): void {
    this.renderMode = mode;
    console.log(`🎨 Render mode changed to: ${mode}`);

    // Clear canvas when switching modes to remove residual render data
    if (this.context && this.device) {
      try {
        const commandEncoder = this.device.createCommandEncoder();
        const canvasTextureView = this.context.getCurrentTexture().createView();

        const clearPass = commandEncoder.beginRenderPass({
          colorAttachments: [
            {
              view: canvasTextureView,
              clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
              loadOp: 'clear',
              storeOp: 'store',
            },
          ],
        });
        clearPass.end();
        this.device.queue.submit([commandEncoder.finish()]);
        console.log(`🧹 Canvas cleared for mode: ${mode}`);
      } catch (error) {
        console.warn('⚠️ Failed to clear canvas on mode switch:', error);
      }
    }
  }

  /**
   * Get current render mode
   */
  getRenderMode(): RenderMode {
    return this.renderMode;
  }

  /**
   * Get Camera3D instance (for UI controls)
   */
  getCamera3D(): Camera3D | null {
    return this.camera3D;
  }

  /**
   * Update camera (called from event handlers)
   */
  updateCamera3D(deltaTime: number): void {
    if (this.camera3D) {
      this.camera3D.update(deltaTime);
    }
  }

  /**
   * Update camera aspect ratio on canvas resize
   */
  updateCameraAspect(aspect: number): void {
    if (this.camera3D) {
      this.camera3D.setAspect(aspect);
    }
  }
}
