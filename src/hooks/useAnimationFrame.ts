/**
 * useAnimationFrame - Hook para requestAnimationFrame con control de pausa
 * Mantiene el render loop activo durante pausa para interacciones (zoom, etc.)
 */

import { useEffect, useRef } from 'react';

export function useAnimationFrame(
  callback: (deltaTime: number, totalTime: number) => void,
  paused = false,
  initialTimeOffset = 0
) {
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);
  const timeOffsetRef = useRef<number>(initialTimeOffset);
  const pausedTimeRef = useRef<number>(0); // Tiempo acumulado durante pausa

  useEffect(() => {
    const animate = (time: number) => {
      // Inicializar tiempos en el primer frame
      if (previousTimeRef.current === undefined) {
        previousTimeRef.current = time;
        startTimeRef.current = time;
      }

      if (paused) {
        // Durante pausa: deltaTime = 0 (no avanza la animación)
        // Pero seguimos renderizando para permitir interacciones visuales
        callback(0, pausedTimeRef.current);
      } else {
        // Calcular delta time en segundos
        const deltaTime = (time - previousTimeRef.current) / 1000;

        // Calcular tiempo total desde el inicio + offset inicial
        const totalTime = (time - (startTimeRef.current || 0)) / 1000 + timeOffsetRef.current;

        // Actualizar tiempo pausado para cuando se pause de nuevo
        pausedTimeRef.current = totalTime;

        // Llamar al callback con tiempos reales
        callback(deltaTime, totalTime);
      }

      // Guardar tiempo actual para el siguiente frame
      previousTimeRef.current = time;

      // Solicitar siguiente frame (siempre activo, pausado o no)
      requestRef.current = requestAnimationFrame(animate);
    };

    // Iniciar loop
    requestRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [callback, paused]);

  // Actualizar offset si cambia
  useEffect(() => {
    timeOffsetRef.current = initialTimeOffset;
  }, [initialTimeOffset]);
}
