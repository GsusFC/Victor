/**
 * useVectorEngine - Hook principal que orquesta el motor WebGPU
 * Integra engine, store, animación y renderizado
 */

import { useEffect, useRef, RefObject, MutableRefObject } from 'react';
import { WebGPUEngine } from '@/engine/WebGPUEngine';
import { ISOCoordinates } from '@/engine/CoordinateSystem';
import { useVectorStore, selectGrid, selectAnimation, selectVisual, selectCanvas } from '@/store/vectorStore';
import type { VectorShape } from '@/types/engine';
import { useAnimationFrame } from './useAnimationFrame';

// ✅ OPTIMIZACIÓN: Animaciones que requieren mouse tracking
// Movido fuera del componente para evitar recreación en cada render
const MOUSE_ANIMATIONS = new Set([
  'flowField',
  'magneticField',
  'blackHole',
  'vortex',
  'electricPulse',
  'plasmaBall',
]);

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

        // Generar grid inicial
        generateAndUpdateGrid(engine, canvas);
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

  // ✅ OPTIMIZACIÓN: Consolidar todos los updates del engine en un solo useEffect
  // Reduce overhead de múltiples re-renders y hace el código más mantenible
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !engine.initialized) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Update animation type
    engine.setAnimationType(animation.type as any);

    // 2. Update configuration
    engine.updateConfig({
      vectorCount: grid.rows * grid.cols,
      vectorLength: visual.vectorLength,
      vectorWidth: visual.vectorWidth,
      gridRows: grid.rows,
      gridCols: grid.cols,
      vectorShape: visual.shape as VectorShape,
    });

    // 3. Update shape
    engine.setShape(visual.shape as VectorShape);

    // 4. Update trails
    engine.setTrails(visual.trails.enabled, visual.trails.opacity);

    // 5. Update post-processing
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

    // 6. Update advanced bloom (if available)
    const bloom = visual.postProcessing.advancedBloom;
    if (bloom) {
      engine.setAdvancedBloom({
        enabled: bloom.enabled,
        quality: bloom.quality,
        radius: bloom.radius,
        threshold: bloom.threshold,
        intensity: bloom.intensity,
      });
    }

    // 7. Regenerar grid solo si cambió algo relevante
    generateAndUpdateGrid(engine, canvas);
  }, [
    animation.type,
    grid.rows,
    grid.cols,
    grid.spacing,
    grid.mode,
    visual.vectorLength,
    visual.vectorWidth,
    visual.shape,
    visual.trails.enabled,
    visual.trails.opacity,
    visual.postProcessing,
    canvasRef,
  ]);

  // ✅ OPTIMIZACIÓN: Mouse tracking condicional - solo cuando la animación lo necesita
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Solo trackear mouse si la animación actual lo usa
    const needsMouse = MOUSE_ANIMATIONS.has(animation.type);
    if (!needsMouse) {
      // Resetear posición cuando no se necesita
      mousePositionRef.current = { x: 0, y: 0, active: false };
      return;
    }

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
  }, [canvasRef, animation.type]);

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

      // ✅ OPTIMIZACIÓN: Logs solo en development para evitar overhead en producción
      const isDev = process.env.NODE_ENV === 'development';

      // Log del primer frame
      if (isDev && frameCountRef.current === 0) {
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

      // Ejecutar compute shader SOLO si no está pausado
      // Durante pausa: deltaTime = 0, por lo que no hay cambios en animación
      if (deltaTime > 0) {
        engine.computeAnimation(deltaTime);
      }

      // Renderizar frame SIEMPRE (pausado o no)
      // Esto permite que el zoom y otras interacciones se vean actualizadas
      engine.renderFrame();

      // Capturar frame si está grabando
      if (recordingCallbackRef?.current) {
        recordingCallbackRef.current().catch((err) => {
          console.error('❌ Error capturando frame para grabación:', err);
        });
      }

      frameCountRef.current++;

      // Log cada 60 frames solo en development
      if (isDev && frameCountRef.current % 60 === 0) {
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
 * Siempre regenera el grid normalmente (sin datos guardados)
 * El seed garantiza reproducibilidad a través de las animaciones
 */
function generateAndUpdateGrid(
  engine: WebGPUEngine,
  canvas: HTMLCanvasElement
) {
  const grid = useVectorStore.getState().grid;
  const visual = useVectorStore.getState().visual;

  const vectorCount = grid.rows * grid.cols;
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
