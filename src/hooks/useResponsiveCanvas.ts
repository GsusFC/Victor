/**
 * useResponsiveCanvas - Hook para dimensiones responsivas del canvas
 * Detecta el tamaño del contenedor y calcula dimensiones óptimas
 */

import { useEffect, useState, RefObject } from 'react';

export interface CanvasSize {
  width: number;
  height: number;
  aspectRatio: number;
}

export function useResponsiveCanvas(
  containerRef: RefObject<HTMLElement | null>,
  minHeight = 400,
  maxHeight = 800
): CanvasSize {
  const [size, setSize] = useState<CanvasSize>({
    width: 800,
    height: 600,
    aspectRatio: 800 / 600,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ensureEven = (value: number) => {
      const int = Math.max(2, Math.floor(value));
      return int % 2 === 0 ? int : int - 1;
    };

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      // Calcular altura óptima manteniendo aspect ratio
      let height = Math.min(containerHeight, maxHeight);
      height = Math.max(height, minHeight);

      // Calcular ancho basado en el contenedor
      const width = containerWidth;

      const evenWidth = ensureEven(width);
      const evenHeight = ensureEven(height);

      // Si el contenedor es muy estrecho, ajustar aspect ratio
      const aspectRatio = evenWidth / evenHeight;

      setSize({
        width: evenWidth,
        height: evenHeight,
        aspectRatio,
      });
    };

    // Actualizar tamaño inicial
    updateSize();

    // Observer para cambios de tamaño
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(container);

    // Listener adicional para resize de ventana
    window.addEventListener('resize', updateSize);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [containerRef, minHeight, maxHeight]);

  return size;
}
