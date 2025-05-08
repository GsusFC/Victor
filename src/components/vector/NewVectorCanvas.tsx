'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useVectorStore } from '@/lib/store';
import Victor from 'victor';
import type { VectorSettings } from '@/components/vector/core/types';
import type { ExtendedVectorItem } from '@/components/vector/core/vectorTypes';
import { AspectRatioControl } from './ui/AspectRatioControl';
import { useContainerDimensions } from '@/hooks/vector/useContainerDimensions';

/**
 * Componente de canvas de vectores optimizado que evita problemas de renderizado infinito.
 * Usa un enfoque con un estado local independiente de Zustand para la animación.
 */
const NewVectorCanvas: React.FC = () => {
  // Referencias para dimensiones y canvas
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number, y: number } | null>(null);
  const lastPulseTimeRef = useRef<number>(0);
  
  // Leer settings del store
  const settings = useVectorStore((state) => state.settings);
  const settingsRef = useRef<VectorSettings>(settings);
  
  // Acciones que usaremos ocasionalmente (no en cada frame)
  const { setSvgLines, setCalculatedValues, setLastPulseTime } = useVectorStore(
    (state) => state.actions
  );
  
  // Acceder a togglePause desde actions
  const togglePause = useVectorStore((state) => state.actions.togglePause);
  
  // Estado local (independiente de Zustand)
  const [vectorItems, setVectorItems] = useState<ExtendedVectorItem[]>([]);
  
  // Usando hook de dimensiones para gestionar relaciones de aspecto
  const { dimensions, getContainerClasses } = useContainerDimensions({
    containerRef,
    aspectRatio: settings.aspectRatio
  });
  
  // Memoizar las clases CSS del contenedor para evitar cálculos innecesarios
  const containerClasses = useMemo(() => getContainerClasses(), [getContainerClasses]);
  
  // Actualizar referencia de settings cuando cambien
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  
  // Guardamos los valores previos para evitar recalcular cuando no sea necesario
  const prevConfigRef = useRef({
    width: dimensions.width,
    height: dimensions.height,
    vectorSpacing: settings.vectorSpacing,
    gridRows: settings.gridRows,
    aspectRatio: settings.aspectRatio
  });

  // Efecto para inicializar vectores - usando la técnica de un solo effect con referencias
  useEffect(() => {
    // Verificar si alguna dependencia importante ha cambiado
    const hasDimensionsChanged = dimensions.width !== prevConfigRef.current.width ||
                                 dimensions.height !== prevConfigRef.current.height;
    
    const hasConfigChanged = settings.vectorSpacing !== prevConfigRef.current.vectorSpacing ||
                             settings.gridRows !== prevConfigRef.current.gridRows ||
                             settings.aspectRatio !== prevConfigRef.current.aspectRatio;
    
    // Solo reinicializar si cambió algo importante
    if (!hasDimensionsChanged && !hasConfigChanged) {
      return;
    }
    
    // Actualizar la referencia
    prevConfigRef.current = {
      width: dimensions.width,
      height: dimensions.height,
      vectorSpacing: settings.vectorSpacing,
      gridRows: settings.gridRows,
      aspectRatio: settings.aspectRatio
    };
    
    // Inicializar vectores
    const initializeVectors = () => {
      // Solo inicializar si tenemos dimensiones válidas
      if (dimensions.width <= 0 || dimensions.height <= 0) return;
      
      // Constantes para la configuración (leemos directo de settings)
      const configSpacing = settings.vectorSpacing;
      const gridRows = settings.gridRows;
      const aspectRatio = settings.aspectRatio;
      
      // Resultado: número de filas y columnas y espaciado ajustado
      let rows = gridRows;
      let cols;
      
      // Calcular número de columnas y espaciado ajustado según la relación de aspecto
      let adjustedSpacing;
      
      // Añadir un margen de protección más agresivo, basado en la longitud completa del vector
      // Se usa la longitud completa del vector + un 20% adicional para garantizar que nunca se corten
      const securityMargin = Math.max(configSpacing, settings.vectorLength * 1.2);
      
      switch (aspectRatio) {
        case '1:1': { // Formato cuadrado
          // Para mantener proporción cuadrada, usar mismo número de columnas que filas
          cols = rows;
          
          // Recalcular espacio disponible considerando margen de seguridad a ambos lados
          const availableSpace = Math.min(dimensions.width, dimensions.height) - (securityMargin * 2);
          
          // Calcular factor para mantener densidad visual adecuada y evitar cortes
          const spacingFactor = availableSpace / (configSpacing * rows);
          adjustedSpacing = configSpacing * spacingFactor;
          break;
        }
        case '2:1': { // Formato panorámico
          // Para mantener 2:1 necesitamos el doble de columnas que filas
          cols = rows * 2;
          
          // Recalcular espacio disponible considerando margen de seguridad
          const availableWidth = dimensions.width - (securityMargin * 2);
          
          // Calcular factor para mantener densidad visual adecuada y evitar cortes
          const spacingFactor = availableWidth / (configSpacing * cols);
          adjustedSpacing = configSpacing * spacingFactor;
          break;
        }
        case '16:9': { // Formato widescreen
          // Calcular proporción exacta 16:9
          cols = Math.round((rows * 16) / 9);
          
          // Recalcular espacio disponible considerando margen de seguridad
          const availableWidth = dimensions.width - (securityMargin * 2);
          
          // Calcular factor para mantener densidad visual adecuada y evitar cortes
          const spacingFactor = availableWidth / (configSpacing * cols);
          adjustedSpacing = configSpacing * spacingFactor;
          break;
        }
        default: { // Formato libre
          // Restar margen de seguridad al ancho y alto disponibles
          const availableWidth = dimensions.width - (securityMargin * 2);
          const availableHeight = dimensions.height - (securityMargin * 2);
          
          // Calcular filas y columnas basadas en las dimensiones disponibles
          // manteniendo la proporción del espaciado original
          cols = Math.max(2, Math.floor(availableWidth / configSpacing));
          
          // Ajustar el número de filas para aprovechar la altura disponible
          // en lugar de usar un valor fijo
          const calculatedRows = Math.max(2, Math.floor(availableHeight / configSpacing));
          if (calculatedRows !== rows) {
            // Actualizar filas si es diferente al valor predeterminado
            rows = calculatedRows;
          }
          
          // Ajustar el espaciado para distribuir uniformemente en el espacio disponible
          const horizontalSpacing = availableWidth / cols;
          const verticalSpacing = availableHeight / rows;
          
          // Usar el menor de los dos espaciados para mantener uniformidad
          adjustedSpacing = Math.min(horizontalSpacing, verticalSpacing);
          break;
        }
      }
      
      const newVectors: ExtendedVectorItem[] = [];
      
      // Usar el espaciado ajustado para los cálculos de posición
      const baseSpacing = adjustedSpacing;
      
      // Calcular los offsets para centrar la cuadrícula
      const totalWidthNeeded = cols * baseSpacing;
      const totalHeightNeeded = rows * baseSpacing;
      const offsetX = (dimensions.width - totalWidthNeeded) / 2;
      const offsetY = (dimensions.height - totalHeightNeeded) / 2;
      
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          // Calcular posición usando el espaciado base y los offsets para centrado
          const baseX = offsetX + x * baseSpacing;
          const baseY = offsetY + y * baseSpacing;
          
          newVectors.push({
            id: `vector-${x}-${y}`,
            baseX: baseX + baseSpacing / 2, // Centrar vector en su celda
            baseY: baseY + baseSpacing / 2,
            currentAngle: 0,
            previousAngle: 0,
            lengthFactor: 1.0,
            layer: 0,
            activationTime: 0,
            r: y,                // Fila
            c: x,                // Columna
            flockId: 0,          // ID de grupo para animaciones de bandada
            shape: settingsRef.current.vectorShape  // Forma visual del vector
          });
        }
      }
      
      // Actualizar estado local
      setVectorItems(newVectors);
      
      // Actualizar valores calculados
      setCalculatedValues(cols, adjustedSpacing * cols, adjustedSpacing * rows);
      
      // Sincronizar con store
      setSvgLines(newVectors);
    };
    
    // Ejecutar la inicialización
    initializeVectors();
    
    // Configurar event listener para resize
    const handleResize = () => {
      // Verificamos si las dimensiones han cambiado significativamente
      if (Math.abs(dimensions.width - prevConfigRef.current.width) > 5 ||
          Math.abs(dimensions.height - prevConfigRef.current.height) > 5) {
        // Actualizamos referencia y reinicializamos
        prevConfigRef.current.width = dimensions.width;
        prevConfigRef.current.height = dimensions.height;
        initializeVectors();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    
  // Este array de dependencias es estable y no cambiará su tamaño
  }, [dimensions, settings, setVectorItems, setCalculatedValues, setSvgLines]);
  
  // Listener para eventos del ratón
  // Optimizado con useCallback para evitar recrear la función en cada renderizado
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  }, []);
  
  // Manejar eventos de tecla para controlar la animación
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Pausar/reanudar con barra espaciadora
    if (e.code === 'Space' && !e.repeat) {
      // Solo si no se está escribiendo en inputs (ignora cuando el foco está en elementos de texto)
      const activeElement = document.activeElement;
      const isTextField = activeElement && 
        (activeElement.tagName === 'INPUT' || 
         activeElement.tagName === 'TEXTAREA' || 
         (activeElement as HTMLElement).isContentEditable);
      
      if (!isTextField) {
        e.preventDefault(); // Evitar scroll u otros comportamientos por defecto
        // Pausar/reanudar la animación
        togglePause();
        console.log(`[KeyboardControl] ${settingsRef.current.isPaused ? 'Pausado' : 'Reanudado'} con barra espaciadora`);
      }
    }
  }, [togglePause]);

  // Efecto para añadir/quitar event listener
  useEffect(() => {    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown); // Agregar listener de teclado
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown); // Quitar listener al desmontar
    };
  }, [handleMouseMove, handleKeyDown]); // Dependencia de la función memoizada
  
  // Variable para controlar la frecuencia de actualización del estado global
  const lastUpdateTimeRef = useRef<number>(0);

  // Efecto para gestionar la animación con optimizaciones de rendimiento
  useEffect(() => {
    // Función de animación
    const animate = () => {
      if (vectorItems.length === 0) return;
      
      // Capturar el timestamp actual para animaciones basadas en tiempo
      const timestamp = Date.now();
      
      // Usar settingsRef para acceder a settings sin causar re-renders
      const isPaused = settingsRef.current.isPaused;
      const { 
        animationType, easingFactor,
        dynamicLengthEnabled, dynamicLengthIntensity,
        seaWaveFrequency, seaWaveAmplitude, pulseInterval, pulseDuration,
        geometricPatternComplexity, geometricPatternRotationSpeed
      } = settingsRef.current;
      
      // Si la animación está pausada, no actualizamos nada
      if (isPaused) {
        // Programar el siguiente frame aunque estemos pausados
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // Creamos una nueva matriz de elementos en lugar de mutar los existentes
      const updatedItems = vectorItems.map(item => ({ ...item })); // Clonamos cada objeto
      
      // Actualizar ángulos de los vectores - ahora cada item es un nuevo objeto
      updatedItems.forEach(item => {
        // Calcular ángulo objetivo basado en el tipo de animación
        let targetAngle = item.currentAngle; // Por defecto mantener el ángulo actual
        
        // Convertir posición del mouse a Victor si está disponible
        let mousePosition: Victor | null = null;
        if (mouseRef.current) {
          mousePosition = new Victor(mouseRef.current.x, mouseRef.current.y);
        }
        
        // Calcular ángulo según tipo de animación
        switch (animationType) {
          case 'smoothWaves': {
            const waveFreq = seaWaveFrequency || 0.005;
            const waveAmp = seaWaveAmplitude || 45;
            targetAngle = Math.sin(timestamp * waveFreq + item.baseX * 0.01) * waveAmp;
            break;
          }
          
          case 'seaWaves': {
            const baseAngle = Math.sin(timestamp * 0.001 + item.baseX * 0.01) * 45;
            const ripple = Math.sin(timestamp * 0.002 + item.baseY * 0.01) * 15;
            targetAngle = baseAngle + ripple;
            break;
          }
          
          case 'perlinFlow': {
            // Simulación simple de ruido Perlin
            const noiseX = Math.sin(timestamp * 0.001 + item.baseX * 0.02);
            const noiseY = Math.cos(timestamp * 0.001 + item.baseY * 0.02);
            targetAngle = Math.atan2(noiseY, noiseX) * (180 / Math.PI);
            break;
          }
          
          case 'mouseInteraction': {
            if (mousePosition) {
              const vectorPos = new Victor(item.baseX, item.baseY);
              const direction = mousePosition.clone().subtract(vectorPos);
              targetAngle = direction.angle() * (180 / Math.PI);
            }
            break;
          }
          
          case 'pinwheels': {
            const rotationSpeed = 0.1;
            targetAngle = (timestamp * rotationSpeed + (item.r + item.c) * 45) % 360;
            break;
          }
          
          case 'oceanCurrents': {
            const flowSpeed = 0.05;
            const flowAngle = Math.sin(timestamp * flowSpeed + item.baseY * 0.01) * 90;
            targetAngle = flowAngle + (item.c * 10);
            break;
          }
          
          case 'jitter': {
            const jitterAmount = 15;
            targetAngle = item.currentAngle + (Math.random() * 2 - 1) * jitterAmount;
            break;
          }
          
          case 'centerPulse': {
            // Valores por defecto más apropiados para visualizar claramente el pulso
            const pulseIntervalValue = pulseInterval || 3000; // Intervalo entre pulsos (3 segundos)
            const pulseDurationValue = pulseDuration || 800;  // Duración del pulso (0.8 segundos)
            
            // Calcular tiempo desde el último pulso
            const timeSinceLastPulse = timestamp - lastPulseTimeRef.current;
            
            // Resetear el pulso cuando se cumple el intervalo
            // Esta lógica garantiza que el pulso se repita periódicamente
            if (timeSinceLastPulse >= pulseIntervalValue) {
              console.log("¡Pulso central activado!");
              lastPulseTimeRef.current = timestamp;
              setLastPulseTime(timestamp);
            }
            
            // Calculamos el centro del canvas
            const center = new Victor(dimensions.width / 2, dimensions.height / 2);
            const vectorPos = new Victor(item.baseX, item.baseY);
            const direction = vectorPos.clone().subtract(center);
            
            // Ángulo desde el centro hacia el vector (dirección radial hacia afuera)
            const radialOutwardAngle = direction.angle() * (180 / Math.PI) + 180;
            
            // Ángulo tangencial (perpendicular al radial)
            const tangentialAngle = radialOutwardAngle + 90;
            
            // Distancia al centro (usada para efecto de propagación)
            const distanceToCenter = direction.length();
            const maxDistance = Math.sqrt(dimensions.width * dimensions.width + dimensions.height * dimensions.height) / 2;
            const normalizedDistance = distanceToCenter / maxDistance; // 0.0 a 1.0
            
            // Cuando estamos dentro de la duración del pulso
            if (timeSinceLastPulse < pulseDurationValue) {
              // Efecto de propagación: vectores más cercanos al centro reaccionan primero
              // Velocidad de propagación: ajustar la velocidad de la onda
              const propagationSpeed = 0.8; // Velocidad de la onda expansiva
              
              // Tiempo de retraso basado en la distancia al centro
              const delay = normalizedDistance / propagationSpeed * pulseDurationValue;
              
              // Si la onda ya alcanzó este vector
              if (timeSinceLastPulse >= delay) {
                // Momento exacto cuando la onda pasa por este vector
                const wavePassProgress = (timeSinceLastPulse - delay) / (pulseDurationValue * 0.3);
                
                // Afecta solo al comienzo del paso de la onda (0.0 a 1.0, limitado a 1.0)
                const waveEffect = Math.min(1.0, wavePassProgress);
                
                // Efecto de la onda: rotar hacia afuera y luego regresar
                if (waveEffect < 1.0) {
                  // Durante el paso de la onda, apuntar radialmente hacia afuera
                  targetAngle = radialOutwardAngle;
                } else {
                  // Después del paso inmediato, volver a un movimiento suave
                  const idleRotation = Math.sin(timestamp * 0.0005 + item.baseX * 0.01) * 20;
                  const positionVariation = (item.r + item.c) % 4 * 45;
                  targetAngle = tangentialAngle + idleRotation + positionVariation * 0.2;
                }
              } else {
                // Si la onda aún no ha llegado, mantener un movimiento suave
                const idleRotation = Math.sin(timestamp * 0.0005 + item.baseX * 0.01) * 10;
                targetAngle = tangentialAngle + idleRotation;
              }
              
            } else {
              // Cuando no hay pulso, aplicamos una rotación suave
              // Calcular un ángulo que varíe con el tiempo (para evitar estaticidad)
              const idleRotation = Math.sin(timestamp * 0.0005 + item.baseX * 0.01) * 20;
              const positionVariation = (item.r + item.c) % 4 * 45;
              targetAngle = tangentialAngle + idleRotation + positionVariation * 0.2;
            }
            
            // Efecto de oscilación adicional para todos los vectores justo después del pulso
            if (timeSinceLastPulse >= pulseDurationValue && timeSinceLastPulse < pulseDurationValue + 300) {
              const afterEffect = (timeSinceLastPulse - pulseDurationValue) / 300;
              const wobbleIntensity = 25 * (1 - afterEffect);
              const wobbleFrequency = 5;
              const wobble = Math.sin(afterEffect * Math.PI * wobbleFrequency) * wobbleIntensity;
              targetAngle += wobble;
            }
            
            break;
          }
          
          case 'rippleEffect': {
            const center = new Victor(dimensions.width / 2, dimensions.height / 2);
            const vectorPos = new Victor(item.baseX, item.baseY);
            const distance = vectorPos.distance(center);
            const waveSpeed = 0.002;
            targetAngle = Math.sin(timestamp * waveSpeed - distance * 0.1) * 180;
            break;
          }
          
          case 'expandingWave': {
            const center = new Victor(dimensions.width / 2, dimensions.height / 2);
            const vectorPos = new Victor(item.baseX, item.baseY);
            const distance = vectorPos.distance(center);
            const waveSpeed = 0.001;
            const waveLength = 0.05;
            targetAngle = Math.sin(timestamp * waveSpeed + distance * waveLength) * 180;
            break;
          }
          
          case 'cellularAutomata': {
            // Simulación simple de autómata celular
            const neighborSum = (item.r + item.c) % 4;
            const timeStep = Math.floor(timestamp / 1000);
            targetAngle = (neighborSum * 90 + timeStep * 45) % 360;
            break;
          }
          
          case 'flocking': {
            // Comportamiento simple de bandada
            const flockAngle = (item.flockId * 72 + timestamp * 0.1) % 360;
            const individualVariation = Math.sin(timestamp * 0.002 + item.baseX * 0.01) * 30;
            targetAngle = flockAngle + individualVariation;
            break;
          }
          
          case 'geometricPattern': {
            // Patrón geométrico basado en posiciones relativas
            const complexity = geometricPatternComplexity || 3;
            const rotationSpeed = geometricPatternRotationSpeed || 0.5;
            
            // Calcular la posición relativa al centro (normalizando a [-1, 1])
            const centerX = dimensions.width / 2;
            const centerY = dimensions.height / 2;
            const relX = (item.baseX - centerX) / (dimensions.width / 2 || 1); // Evitar división por cero
            const relY = (item.baseY - centerY) / (dimensions.height / 2 || 1); // Evitar división por cero
            
            // Convertir a coordenadas polares
            const radius = Math.sqrt(relX * relX + relY * relY);
            const theta = Math.atan2(relY, relX);
            
            // Patrón basado en ondas polares
            targetAngle = (theta * (180 / Math.PI)) + 
                         (Math.cos(complexity * theta + timestamp * 0.001 * rotationSpeed) * 90 * radius);
            break;
          }
          
          case 'geometrico': {
            // Versión simplificada del patrón geométrico - usamos la misma base pero solo con los controles básicos
            const centerX = dimensions.width / 2;
            const centerY = dimensions.height / 2;
            
            // Solo si tenemos dimensiones válidas
            if (centerX > 0 && centerY > 0) {
              // Convertir a ángulo polar - calculamos directamente el ángulo sin calcular el radio
              const theta = Math.atan2(item.baseY - centerY, item.baseX - centerX);
              
              // Añadir 90 grados (π/2) para hacerlo tangencial
              const baseAngle = theta + Math.PI/2;
              
              // Aplicar rotación basada en el tiempo usando el factor de velocidad
              const speedFactor = settingsRef.current.animationSpeedFactor || 1;
              const timeComponent = timestamp * 0.001 * 0.3 * speedFactor;
              
              // Calcular ángulo final
              targetAngle = (baseAngle + timeComponent) * (180 / Math.PI);
            } else {
              // Si no tenemos dimensiones, mantener el ángulo actual
              targetAngle = item.currentAngle || 0;
            }
            break;
          }
          
          case 'tangenteClasica': {
            // Implementación exacta del algoritmo original del HTML
            const centerX = dimensions.width / 2;
            const centerY = dimensions.height / 2;
            
            // Asegurarnos de tener dimensiones válidas
            if (!centerX || !centerY) {
              targetAngle = item.currentAngle || 0;
              break;
            }
            
            // Cálculo exactamente igual al del HTML original
            const dx = item.baseX - centerX;
            const dy = item.baseY - centerY;
            const angleToCenter = Math.atan2(dy, dx);
            let tangentialAngle = angleToCenter + Math.PI / 2; // Perpendicular a la línea hacia el centro
            
            // Velocidad de rotación fija como en el original (0.3)
            const rotationSpeed = 0.3;
            tangentialAngle += timestamp * 0.001 * rotationSpeed;
            
            // Convertir a grados como en el algoritmo original
            targetAngle = tangentialAngle * (180 / Math.PI);
            break;
          }
          
          case 'waterfall': {
            // Recuperar los parámetros de configuración para waterfall
            const { 
              waterfallTurbulence = 15, 
              waterfallTurbulenceSpeed = 0.003, 
              waterfallOffsetFactor = 0.2,
              waterfallGravityCycle = 2000,
              waterfallGravityStrength = 0.5,
              waterfallMaxStretch = 1.5,
              waterfallDriftStrength = 0.2
            } = settingsRef.current;
            
            // Ángulo base: 90 grados - caída vertical hacia abajo
            const baseAngle = 90;
            
            // Aplicar turbulencia sinusoidal horizontal
            // - Usamos la posición X como desfase para crear un efecto ondulatorio
            // - Utilizamos la posición Y para crear desfase en la cascada (más rápido abajo)
            const horizontalOffset = Math.sin(
              timestamp * waterfallTurbulenceSpeed + 
              item.baseX * 0.05 + 
              item.baseY * waterfallOffsetFactor
            ) * waterfallTurbulence;
            
            // Efecto de gravedad pulsante - crea un efecto de aceleración periódica
            // Esto afecta el factor de longitud para que los vectores se estiren más o menos
            const gravityCycle = (timestamp % waterfallGravityCycle) / waterfallGravityCycle;
            const gravityEffect = Math.sin(gravityCycle * Math.PI) * waterfallGravityStrength;
            
            // Deriva lateral basada en la posición - sutil efecto de corrientes laterales
            const driftOffset = Math.sin(item.baseX * 0.01) * waterfallDriftStrength * 20;
            
            // Calcular ángulo final
            targetAngle = baseAngle + horizontalOffset + driftOffset;
            
            // Modificar el factor de longitud para simular estiramiento por gravedad
            // Solo modificamos la longitud si el ángulo está cerca de la vertical (90° ±30°)
            const angleDeviation = Math.abs((targetAngle % 360) - 90);
            if (angleDeviation < 30) {
              // Normalizar la desviación a un valor entre 0 y 1 (0 = perfectamente vertical)
              const normalizedDeviation = 1 - (angleDeviation / 30);
              
              // Calcular factor de estiramiento basado en gravedad y ciclo
              // - Mayor gravedad = mayor estiramiento
              // - Mayor cercanía a vertical = mayor estiramiento
              const stretchFactor = 1 + (gravityEffect * normalizedDeviation * waterfallMaxStretch);
              
              // Aplicar el factor de longitud al vector
              // Esto se usará en el renderizado para estirar el vector
              item.lengthFactor = stretchFactor;
            } else {
              // Para vectores que no están cerca de la vertical, usar longitud normal
              item.lengthFactor = 1.0;
            }
            
            break;
          }
          
          // Otras animaciones se pueden añadir aquí
          default:
            // Si no se especifica un tipo de animación, usar mouseInteraction
            if (mousePosition) {
              const vectorPos = new Victor(item.baseX, item.baseY);
              const direction = mousePosition.clone().subtract(vectorPos);
              targetAngle = direction.angle() * (180 / Math.PI);
            }
            break;
        }
        
        // Calcular diferencia de ángulo
        let angleDiff = targetAngle - item.currentAngle;
        // Normalizar diferencia para la ruta más corta (-180 a 180)
        while (angleDiff <= -180) angleDiff += 360;
        while (angleDiff > 180) angleDiff -= 360;
        
        // Guardar ángulo anterior - ahora es seguro ya que trabajamos con copias
        item.previousAngle = item.currentAngle;
        
        // Aplicar easing
        item.currentAngle = (item.currentAngle + angleDiff * easingFactor) % 360;
        
        // Calcular grosor dinámico basado en velocidad angular con efecto amplificado
        if (dynamicLengthEnabled && item.previousAngle !== undefined) {
          // Calcular velocidad angular con valor absoluto
          const angularVelocity = Math.abs(item.currentAngle - item.previousAngle);
          
          // Definir un valor mínimo para garantizar que siempre haya algo de efecto visible
          const minEffect = 0.05; 
          
          // Calcular el factor objetivo con amplificación (dividir por 2 en vez de 10)
          const targetWidthFactor = 1.0 + Math.max(minEffect, angularVelocity * dynamicLengthIntensity / 2);
          
          // Aplicar suavizado para que los cambios no sean instantáneos
          const prevWidthFactor = item.widthFactor || 1.0;
          item.widthFactor = prevWidthFactor + (targetWidthFactor - prevWidthFactor) * 0.3; // Transición suave
          
          // Mantener longitud constante
          item.lengthFactor = 1.0;
        } else {
          // Reiniciar ambos factores cuando la funcionalidad está desactivada
          item.widthFactor = 1.0;
          item.lengthFactor = 1.0;
        }
      });
      
      // Actualizar estado local SOLO cuando todos los cálculos estén hechos
      setVectorItems(updatedItems);
      
      // Implementamos throttling basado en tiempo en lugar de aleatorio
      // para mejorar la previsibilidad y el rendimiento
      const currentTime = performance.now();
      if (currentTime - lastUpdateTimeRef.current > 100) { // 100ms = 10 actualizaciones por segundo
        setSvgLines([...updatedItems]);
        lastUpdateTimeRef.current = currentTime;
      }
      
      // Continuar animación si no está pausada
      if (!isPaused) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    // Iniciar animación
    if (!settingsRef.current.isPaused) {
      animationRef.current = requestAnimationFrame(animate);
    }
    
    // Limpieza
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [vectorItems, setSvgLines, dimensions.width, dimensions.height, setLastPulseTime]);
  
  // Renderizado
  return (
    <div 
      className={containerClasses} 
      ref={containerRef}
      style={{ 
        backgroundColor: settingsRef.current.backgroundColor || '#000000',
        transition: 'background-color 0.3s ease'
      }}
    >
      <svg 
        ref={svgRef}
        viewBox={`-50 -50 ${(dimensions.width || 1067) + 100} ${(dimensions.height || 600) + 100}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        style={{ overflow: 'visible' }}
      >
        <rect 
          x="0" 
          y="0" 
          width={dimensions.width || 1067} 
          height={dimensions.height || 600} 
          fill={settingsRef.current.backgroundColor || '#000000'}
          data-component-name="NewVectorCanvas"
        />
        <defs>
          <style>
            {`/* Estilos eliminados para permitir colores personalizados de vectores */`}
          </style>
        </defs>
        <g>
          {vectorItems.map(item => {
            const { currentAngle, baseX, baseY, lengthFactor = 1.0, widthFactor = 1.0 } = item;
            
            // Calcular extremos del vector basados en el ángulo
            // No necesitamos calcular ángulos en radianes ya que todas las rotaciones ahora se aplican via SVG
            const actualLength = settingsRef.current.vectorLength * lengthFactor;
            
            // Calcular offset de rotación relativo en el espacio del vector (siempre horizontal)
            // Este enfoque unifica cómo se aplica la rotación para todos los tipos de vectores
            let rotationOffsetX = 0; // Valor por defecto para 'start'
            
            switch (settingsRef.current.rotationOrigin) {
              case 'center':
                // Punto medio del vector
                rotationOffsetX = actualLength / 2;
                break;
              case 'end':
                // Punto final del vector
                rotationOffsetX = actualLength;
                break;
              case 'start':
              default:
                // Punto inicial (predeterminado)
                rotationOffsetX = 0;
                break;
            }
            
            // Renderizar según la forma seleccionada
            switch (settingsRef.current.vectorShape) {
              case 'arrow':
                // Implementación flecha utilizando sistema unificado de rotación
                return (
                  <g key={item.id} transform={`translate(${baseX}, ${baseY}) rotate(${currentAngle}, ${rotationOffsetX}, 0)`}>
                    <line 
                      x1={0} 
                      y1={0} 
                      x2={actualLength - 5} 
                      y2={0} 
                      stroke={settingsRef.current.vectorColor}
                      strokeWidth={settingsRef.current.vectorWidth * widthFactor}
                      strokeLinecap={settingsRef.current.vectorLineCap}
                    />
                    <polygon 
                      points={`${actualLength},0 ${actualLength - 5},-2.5 ${actualLength - 5},2.5`}
                      fill={settingsRef.current.vectorColor}
                    />
                  </g>
                );
                
              case 'dot':
                // Implementación punto utilizando sistema unificado de rotación
                return (
                  <g key={item.id} transform={`translate(${baseX}, ${baseY}) rotate(${currentAngle}, ${rotationOffsetX}, 0)`}>
                    <circle
                      cx={actualLength/2}
                      cy={0}
                      r={settingsRef.current.vectorWidth * 2 * widthFactor}
                      fill={settingsRef.current.vectorColor}
                    />
                  </g>
                );
              
              case 'triangle':
                // Punto en reposo (sin rotación)
                const tipX = actualLength; // Solo en el eje X para que la rotación funcione 
                const angle1 = Math.PI * 0.8; // 144 grados
                const angle2 = -Math.PI * 0.8; // -144 grados
                const p1X = actualLength * 0.4 * Math.cos(angle1);
                const p1Y = actualLength * 0.4 * Math.sin(angle1);
                const p2X = actualLength * 0.4 * Math.cos(angle2);
                const p2Y = actualLength * 0.4 * Math.sin(angle2);
                
                // Construir polígono en posición horizontal y luego rotar usando el sistema unificado
                return (
                  <g key={item.id} transform={`translate(${baseX}, ${baseY}) rotate(${currentAngle}, ${rotationOffsetX}, 0)`}>
                    <polygon
                      points={`${tipX},0 ${p1X},${p1Y} ${p2X},${p2Y}`}
                      fill={settingsRef.current.vectorColor}
                    />
                  </g>
                );
                
              case 'semicircle':
                // Implementación semicircunferencia con el sistema unificado de rotación
                const radius = actualLength / 2;
                // Semicircunferencia centrada en el origen y rotada apropiadamente
                const semicirclePath = `
                  M 0 0
                  A ${radius} ${radius} 0 0 1 ${actualLength} 0
                `;
                return (
                  <g key={item.id} transform={`translate(${baseX}, ${baseY}) rotate(${currentAngle}, ${rotationOffsetX}, 0)`}>
                    <path
                      d={semicirclePath}
                      fill="none"
                      stroke={settingsRef.current.vectorColor}
                      strokeWidth={settingsRef.current.vectorWidth * widthFactor}
                      strokeLinecap={settingsRef.current.vectorLineCap}
                    />
                  </g>
                );
                
              case 'curve':
                // Implementar curva con transformación para rotación usando el sistema unificado
                // Definir curva en posición horizontal (0 grados) y luego rotar
                const curveHeight = actualLength * 0.3; // Altura de la curva = 30% de la longitud
                
                // Definir la curva relativa a (0,0) y luego trasladar y rotar
                const curvePath = `
                  M 0 0
                  Q ${actualLength/2} ${-curveHeight} ${actualLength} 0
                `;
                
                return (
                  <g key={item.id} transform={`translate(${baseX}, ${baseY}) rotate(${currentAngle}, ${rotationOffsetX}, 0)`}>
                    <path
                      d={curvePath}
                      fill="none"
                      stroke={settingsRef.current.vectorColor}
                      strokeWidth={settingsRef.current.vectorWidth * widthFactor}
                      strokeLinecap={settingsRef.current.vectorLineCap}
                    />
                  </g>
                );
                
              default:
                // Línea por defecto utilizando el sistema unificado de rotación
                return (
                  <g key={item.id} transform={`translate(${baseX}, ${baseY}) rotate(${currentAngle}, ${rotationOffsetX}, 0)`}>
                    <line
                      x1={0}
                      y1={0}
                      x2={actualLength} // Siempre horizontal, la rotación lo gira
                      y2={0}
                      stroke={settingsRef.current.vectorColor}
                      strokeWidth={settingsRef.current.vectorWidth * widthFactor}
                      strokeLinecap={settingsRef.current.vectorLineCap}
                    />
                  </g>
                );
            }
          })}
        </g>
      </svg>
      <AspectRatioControl />
    </div>
  );
};

// Exportamos usando React.memo para evitar renderizados innecesarios
// cuando las props no cambian o cuando no son significativas para este componente
export default React.memo(NewVectorCanvas);