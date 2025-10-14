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
}

interface VectorCanvasProps {
  recordingCallbackRef?: MutableRefObject<(() => Promise<void>) | null>;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

export const VectorCanvas = forwardRef<VectorCanvasHandle, VectorCanvasProps>(
  ({ recordingCallbackRef, onCanvasReady }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Exponer canvas ref al padre
    useImperativeHandle(ref, () => ({
      canvas: canvasRef.current,
    }));

    // Notificar al padre cuando el canvas esté listo
    useEffect(() => {
      if (onCanvasReady) {
        onCanvasReady(canvasRef.current);
      }
    }, [onCanvasReady]);

    // Hook de tamaño responsivo (sin límite de altura máxima)
    const { width, height } = useResponsiveCanvas(containerRef, 400, 4000);

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

    // Zoom con rueda del ratón
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();

        // Calcular nuevo zoom (deltaY negativo = zoom in, positivo = zoom out)
        const zoomDelta = -e.deltaY * 0.001;
        const newZoom = Math.max(0.1, Math.min(5, canvasConfig.zoom + zoomDelta));

        setCanvas({ zoom: newZoom });
      };

      container.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }, [canvasConfig.zoom, setCanvas]);

    // Hook del engine - DESPUÉS de que se establezcan las dimensiones
    const { engine, initialized } = useVectorEngine({
      canvasRef,
      recordingCallbackRef,
    });

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
