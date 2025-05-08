import { useState, useCallback, useEffect } from 'react';
import type { AspectRatio } from '@/components/vector/core/types';

interface UseContainerDimensionsProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  aspectRatio: AspectRatio;
}

/**
 * Hook para manejar las dimensiones del contenedor y clases CSS
 */
export const useContainerDimensions = ({ containerRef, aspectRatio }: UseContainerDimensionsProps) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  /**
   * Actualiza las dimensiones basándose en el tamaño del contenedor
   */
  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    
    const { clientWidth, clientHeight } = containerRef.current;
    setDimensions({ width: clientWidth, height: clientHeight });
  }, [containerRef]);

  /**
   * Obtiene las clases CSS para el contenedor según la relación de aspecto
   * Usamos dimensiones fijas para mantener proporciones exactas y mantener misma altura
   */
  const getContainerClasses = useCallback(() => {
    // Clases base que se aplican siempre - eliminado overflow-hidden para permitir que los vectores se extiendan fuera del contenedor
    const baseClasses = "relative transition-all duration-300 ease-in-out shadow-lg rounded-lg";
    
    // Centrado horizontal para todos los formatos
    const containerClasses = "mx-auto";
    
    // Dimensiones exactas para cada formato (altura fija de 600px)
    let dimensionClasses = "";
    
    switch (aspectRatio) {
      case '1:1':
        // Formato cuadrado - 600x600
        dimensionClasses = "h-[600px] w-[600px]";
        break;
      case '2:1':
        // Formato panorámico - 1200x600
        dimensionClasses = "h-[600px] w-[1200px]";
        break;
      case '16:9':
        // Formato widescreen - 1067x600 (16:9 = 1067px de ancho para 600px de alto)
        dimensionClasses = "h-[600px] w-[1067px]";
        break;
      case 'free':
        // Formato libre que ocupa completamente el contenedor
        dimensionClasses = "w-full h-full absolute top-0 left-0"; // Sin restricciones de tamaño
        break;
      default:
        // Por defecto usar 16:9
        dimensionClasses = "h-[600px] w-[1067px]";
        break;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[useContainerDimensions] Aplicando aspectRatio=${aspectRatio}, clases=${baseClasses} ${containerClasses} ${dimensionClasses}`);
    }
    return `${baseClasses} ${containerClasses} ${dimensionClasses}`;
  }, [aspectRatio]);

  // Configurar observer de redimensionamiento
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      updateDimensions();
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [containerRef, updateDimensions]);

  // Actualizar dimensiones iniciales
  useEffect(() => {
    updateDimensions();
  }, [updateDimensions]);

  return {
    dimensions,
    getContainerClasses,
    updateDimensions,
  };
};
