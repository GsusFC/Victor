/**
 * useVectorEngine - Hook principal que orquesta el motor WebGPU
 * Integra engine, store, animación y renderizado
 */

import { useEffect, useRef, RefObject, MutableRefObject } from 'react';
import { WebGPUEngine } from '@/engine/WebGPUEngine';
import { ISOCoordinates } from '@/engine/CoordinateSystem';
import { useVectorStore, selectGrid, selectAnimation, selectVisual, selectCanvas, type VectorShape } from '@/store/vectorStore';
import { useAnimationFrame } from './useAnimationFrame';

interface UseVectorEngineOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  recordingCallbackRef?: MutableRefObject<(() => Promise<void>) | null>;
  initialTimeOffset?: number;
  vectorData?: number[]; // Posiciones exactas del grid guardadas (opcional)
}

export function useVectorEngine(options: UseVectorEngineOptions | RefObject<HTMLCanvasElement | null>) {
  // Mantener compatibilidad con API anterior (canvasRef directo)
  const canvasRef = 'current' in options ? options : options.canvasRef;
  const recordingCallbackRef = 'current' in options ? undefined : options.recordingCallbackRef;
  const initialTimeOffset = 'current' in options ? 0 : (options.initialTimeOffset || 0);
  const savedVectorData = 'current' in options ? undefined : options.vectorData;
  const engineRef = useRef<WebGPUEngine | null>(null);
  const initializedRef = useRef(false);
  const mousePositionRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  // Selectors
  const grid = useVectorStore(selectGrid);
  const animation = useVectorStore(selectAnimation);
  const visual = useVectorStore(selectVisual);
  const canvasConfig = useVectorStore(selectCanvas);

  // Inicialización del engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('⏸️ useVectorEngine: Canvas no disponible');
      return;
    }

    // Esperar a que el canvas tenga dimensiones válidas
    if (canvas.width === 0 || canvas.height === 0) {
      console.log('⏸️ useVectorEngine: Canvas sin dimensiones, esperando...', canvas.width, 'x', canvas.height);
      return;
    }

    // Si ya está inicializado, no reinicializar
    if (initializedRef.current) {
      console.log('⏸️ useVectorEngine: Engine ya inicializado');
      return;
    }

    const initEngine = async () => {
      console.log('🚀 useVectorEngine: Iniciando engine...');
      const engine = WebGPUEngine.getInstance();
      const success = await engine.initialize(canvas);

      if (success) {
        engineRef.current = engine;
        initializedRef.current = true;
        console.log('✅ useVectorEngine: Engine inicializado');

        // Configuración inicial
        engine.updateConfig({
          vectorCount: grid.rows * grid.cols,
          vectorLength: visual.vectorLength,
          vectorWidth: visual.vectorWidth,
          gridRows: grid.rows,
          gridCols: grid.cols,
          vectorShape: visual.shape as VectorShape,
        });

        // Configurar trails
        engine.setTrails(visual.trails.enabled, visual.trails.opacity);

        // Generar grid inicial (usar posiciones guardadas si están disponibles)
        generateAndUpdateGrid(engine, canvas, savedVectorData);
      } else {
        console.error('❌ useVectorEngine: Falló la inicialización');
      }
    };

    initEngine();

    // Cleanup
    return () => {
      if (engineRef.current && initializedRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
        initializedRef.current = false;
        console.log('🧹 useVectorEngine: Engine destruido');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, canvasRef.current?.width, canvasRef.current?.height]);

  // Cambiar tipo de animación
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !engine.initialized) return;

    engine.setAnimationType(animation.type as any);
  }, [animation.type]);

  // Actualizar configuración cuando cambia el grid o visual
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !engine.initialized) return;

    engine.updateConfig({
      vectorCount: grid.rows * grid.cols,
      vectorLength: visual.vectorLength,
      vectorWidth: visual.vectorWidth,
      gridRows: grid.rows,
      gridCols: grid.cols,
      vectorShape: visual.shape as VectorShape,
    });

    // Actualizar forma si cambió
    engine.setShape(visual.shape as VectorShape);

    // Regenerar grid SOLO si NO hay datos guardados
    // (Si hay datos guardados, queremos mantener las posiciones exactas)
    if (!savedVectorData) {
      const canvas = canvasRef.current;
      if (canvas) {
        generateAndUpdateGrid(engine, canvas);
      }
    }
  }, [grid.rows, grid.cols, grid.spacing, grid.mode, visual.vectorLength, visual.vectorWidth, visual.shape, canvasRef, savedVectorData]);

  // Actualizar trails cuando cambia la configuración
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !engine.initialized) return;

    engine.setTrails(visual.trails.enabled, visual.trails.opacity);
  }, [visual.trails.enabled, visual.trails.opacity]);

  // Actualizar post-processing cuando cambia la configuración
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !engine.initialized) return;

    const pp = visual.postProcessing;
    engine.setPostProcessing({
      enabled: pp.enabled,
      bloom: pp.bloom,
      chromaticAberration: pp.chromaticAberration,
      vignette: pp.vignette,
      exposure: pp.exposure,
      contrast: pp.contrast,
      saturation: pp.saturation,
      brightness: pp.brightness,
    });
  }, [
    visual.postProcessing.enabled,
    visual.postProcessing.bloom,
    visual.postProcessing.chromaticAberration,
    visual.postProcessing.vignette,
    visual.postProcessing.exposure,
    visual.postProcessing.contrast,
    visual.postProcessing.saturation,
    visual.postProcessing.brightness,
  ]);

  // Tracking de mouse en coordenadas ISO
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerMove = (event: PointerEvent) => {
      const iso = ISOCoordinates.normalizeMousePosition(event as unknown as MouseEvent, canvas);
      mousePositionRef.current = { x: iso.x, y: iso.y, active: true };
    };

    const handlePointerLeave = () => {
      mousePositionRef.current = { ...mousePositionRef.current, active: false };
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [canvasRef]);

  // Loop de animación
  const frameCountRef = useRef(0);
  const currentTimeRef = useRef(0);

  useAnimationFrame(
    (deltaTime, totalTime) => {
      const engine = engineRef.current;
      if (!engine || !engine.initialized) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      // Guardar tiempo actual para exposición externa
      currentTimeRef.current = totalTime;

      // Log del primer frame
      if (frameCountRef.current === 0) {
        console.log('🎬 Primer frame renderizando...');
      }

      // Actualizar uniforms con zoom, speed, parámetros, color, gradiente y seed
      const aspect = canvas.width / canvas.height;
      engine.updateUniforms(
        aspect,
        totalTime,
        canvasConfig.zoom,
        animation.speed,
        animation.params,
        visual.color,
        visual.gradient,
        mousePositionRef.current,
        animation.seed
      );

      // Ejecutar compute shader (animación)
      engine.computeAnimation(deltaTime);

      // Renderizar frame
      engine.renderFrame();

      // Capturar frame si está grabando
      if (recordingCallbackRef?.current) {
        recordingCallbackRef.current().catch((err) => {
          console.error('❌ Error capturando frame para grabación:', err);
        });
      }

      frameCountRef.current++;

      // Log cada 60 frames para verificar que el loop está corriendo
      if (frameCountRef.current % 60 === 0) {
        console.log(`🎞️ Frame ${frameCountRef.current} renderizado (${totalTime.toFixed(2)}s)`);
      }
    },
    animation.paused,
    initialTimeOffset
  );

  return {
    engine: engineRef.current,
    initialized: initializedRef.current,
    getCurrentTime: () => currentTimeRef.current,
  };
}

/**
 * Genera grid de vectores y actualiza el buffer del engine
 * @param savedData - Posiciones exactas guardadas (opcional). Si se provee, se usa directamente
 */
function generateAndUpdateGrid(
  engine: WebGPUEngine,
  canvas: HTMLCanvasElement,
  savedData?: number[]
) {
  const grid = useVectorStore.getState().grid;
  const visual = useVectorStore.getState().visual;

  const vectorCount = grid.rows * grid.cols;

  // Si hay datos guardados, usarlos directamente
  if (savedData && savedData.length === vectorCount * 4) {
    console.log('📍 Usando posiciones EXACTAS guardadas del grid');
    const vectorData = new Float32Array(savedData);
    engine.updateVectorBuffer(vectorData);
    return;
  }

  // Si no hay datos guardados, generar el grid normalmente
  const aspect = canvas.width / canvas.height;
  const pixelToISO = canvas.height > 0 ? 2 / canvas.height : 0.001;

  // Generar posiciones del grid
  const positions =
    grid.mode === 'fixed'
      ? ISOCoordinates.generateGrid(grid.rows, grid.cols, aspect, grid.spacing * pixelToISO)
      : ISOCoordinates.generateUniformGrid(grid.rows, grid.cols, aspect);

  // Crear array de datos de vectores
  // Formato: [baseX, baseY, angle, length] por cada vector
  const vectorData = new Float32Array(vectorCount * 4);

  positions.forEach((pos, i) => {
    const idx = i * 4;
    vectorData[idx + 0] = pos.x; // baseX
    vectorData[idx + 1] = pos.y; // baseY
    vectorData[idx + 2] = 0; // angle inicial
    vectorData[idx + 3] = visual.vectorLength * pixelToISO; // length en coordenadas ISO
  });

  // Actualizar buffer
  engine.updateVectorBuffer(vectorData);
}
