/**
 * VectorCanvas - Componente de canvas WebGPU responsivo
 */

'use client';

import { useRef, useEffect, forwardRef, useImperativeHandle, MutableRefObject } from 'react';
import { useVectorEngine } from '@/hooks/useVectorEngine';
import { useResponsiveCanvas } from '@/hooks/useResponsiveCanvas';
import { useVectorStore, selectCanvas } from '@/store/vectorStore';

export interface VectorCanvasHandle {
  canvas: HTMLCanvasElement | null;
  captureSnapshot: () => Promise<string>;
  captureTransparent: () => Promise<string>;
  getCurrentTime: () => number;
  getVectorData: () => Float32Array | null;
  getEngine: () => import('@/engine/WebGPUEngine').WebGPUEngine | null;
}

interface VectorCanvasProps {
  recordingCallbackRef?: MutableRefObject<(() => Promise<void>) | null>;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  initialTimeOffset?: number;
  vectorData?: number[];
  fixedDimensions?: { width: number; height: number };
}

export const VectorCanvas = forwardRef<VectorCanvasHandle, VectorCanvasProps>(
  ({ recordingCallbackRef, onCanvasReady, initialTimeOffset = 0, vectorData, fixedDimensions }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Hook del engine - ANTES de useImperativeHandle para tener getCurrentTime disponible
    const { engine, initialized, getCurrentTime: getTime } = useVectorEngine({
      canvasRef,
      recordingCallbackRef,
      initialTimeOffset,
      vectorData,
    });

    // Exponer canvas ref al padre con método de captura
    useImperativeHandle(ref, () => ({
      canvas: canvasRef.current,
      captureSnapshot: async () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          throw new Error('Canvas not available');
        }
        return canvas.toDataURL('image/png', 1.0);
      },
      captureTransparent: async () => {
        const canvas = canvasRef.current;
        if (!canvas || !engine) {
          throw new Error('Canvas or engine not available');
        }

        // Renderizar un frame con fondo transparente
        engine.renderTransparentFrame();

        // Esperar a que el frame se complete (GPU async)
        await new Promise(resolve => requestAnimationFrame(resolve));

        // Capturar el canvas con transparencia
        return canvas.toDataURL('image/png', 1.0);
      },
      getCurrentTime: () => getTime(),
      getVectorData: () => engine?.getVectorData() ?? null,
      getEngine: () => engine,
    }), [getTime, engine]);

    // Notificar al padre cuando el canvas esté listo
    useEffect(() => {
      if (onCanvasReady) {
        onCanvasReady(canvasRef.current);
      }
    }, [onCanvasReady]);

  // Hook de tamaño responsivo (sin límite de altura máxima)
  // Si hay dimensiones fijas, usarlas directamente (para galería minimalista)
  const responsiveDimensions = useResponsiveCanvas(containerRef, 400, 4000);
  const { width, height } = fixedDimensions ?? responsiveDimensions;

    // Canvas config y actions del store
    const canvasConfig = useVectorStore(selectCanvas);
    const setCanvas = useVectorStore((state) => state.actions.setCanvas);

    // Actualizar dimensiones del canvas cuando cambia el tamaño
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      console.log('📐 VectorCanvas: Actualizando dimensiones del canvas:', width, 'x', height);
      canvas.width = width;
      canvas.height = height;
    }, [width, height]);

    // Notificar al padre cuando el canvas está disponible
    useEffect(() => {
      if (!onCanvasReady) return;
      onCanvasReady(canvasRef.current);

      return () => {
        // No restablecemos a null durante desmontajes intermedios (StrictMode)
        // para evitar que la grabación se cancele inesperadamente.
      };
    }, [onCanvasReady]);

    // Zoom con rueda del ratón (2D) o control de cámara (3D)
    useEffect(() => {
      const container = containerRef.current;
      if (!container || !engine) return;

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();

        const renderMode = engine.getRenderMode();

        if (renderMode === '3D') {
          // 3D mode: zoom camera
          const camera = engine.getCamera3D();
          if (camera) {
            const zoomDelta = e.deltaY * 0.5;
            camera.zoom(zoomDelta);
          }
        } else {
          // 2D mode: zoom canvas
          const zoomDelta = -e.deltaY * 0.001;
          const newZoom = Math.max(0.1, Math.min(5, canvasConfig.zoom + zoomDelta));
          setCanvas({ zoom: newZoom });
        }
      };

      container.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }, [canvasConfig.zoom, setCanvas, engine]);

    // Mouse controls for 3D camera (orbit and pan)
    useEffect(() => {
      const container = containerRef.current;
      if (!container || !engine) return;

      let isDragging = false;
      let isRightDragging = false;
      let lastX = 0;
      let lastY = 0;

      const handleMouseDown = (e: MouseEvent) => {
        const renderMode = engine.getRenderMode();
        if (renderMode !== '3D') return;

        if (e.button === 0) {
          // Left button: orbit
          isDragging = true;
          lastX = e.clientX;
          lastY = e.clientY;
        } else if (e.button === 2) {
          // Right button: pan
          isRightDragging = true;
          lastX = e.clientX;
          lastY = e.clientY;
          e.preventDefault();
        }
      };

      const handleMouseMove = (e: MouseEvent) => {
        const renderMode = engine.getRenderMode();
        if (renderMode !== '3D') return;

        const camera = engine.getCamera3D();
        if (!camera) return;

        if (isDragging) {
          // Orbit
          const deltaX = e.clientX - lastX;
          const deltaY = e.clientY - lastY;

          camera.orbit(deltaX * 0.5, deltaY * 0.5);

          lastX = e.clientX;
          lastY = e.clientY;
        } else if (isRightDragging) {
          // Pan
          const deltaX = e.clientX - lastX;
          const deltaY = e.clientY - lastY;

          camera.pan(deltaX * 0.5, deltaY * 0.5);

          lastX = e.clientX;
          lastY = e.clientY;
        }
      };

      const handleMouseUp = () => {
        isDragging = false;
        isRightDragging = false;
      };

      const handleContextMenu = (e: MouseEvent) => {
        const renderMode = engine.getRenderMode();
        if (renderMode === '3D') {
          e.preventDefault();
        }
      };

      container.addEventListener('mousedown', handleMouseDown);
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('mouseleave', handleMouseUp);
      container.addEventListener('contextmenu', handleContextMenu);

      return () => {
        container.removeEventListener('mousedown', handleMouseDown);
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('mouseleave', handleMouseUp);
        container.removeEventListener('contextmenu', handleContextMenu);
      };
    }, [engine]);

    // Actualizar MSAA texture cuando cambien las dimensiones
    useEffect(() => {
      if (!engine || !initialized) return;
      engine.updateCanvasDimensions(width, height);
    }, [engine, initialized, width, height]);

    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: canvasConfig.backgroundColor }}
      >
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full"
          style={{
            display: 'block',
            imageRendering: 'auto',
          }}
        />

        {/* Indicador de carga */}
        {!initialized && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-center">
              <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm font-mono">Inicializando WebGPU...</p>
            </div>
          </div>
        )}
      </div>
    );
});

VectorCanvas.displayName = 'VectorCanvas';
