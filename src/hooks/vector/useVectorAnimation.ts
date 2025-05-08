import { useRef } from 'react';
import Victor from 'victor';
import type { ExtendedVectorItem } from '@/components/vector/core/vectorTypes';
import type { VectorSettings } from '@/components/vector/core/types';

interface Dimensions {
  width: number;
  height: number;
}

/**
 * Hook para manejar la lógica de animación de vectores
 */
export const useVectorAnimation = (settings: VectorSettings) => {
  const lastPulseTimeRef = useRef<number>(0);

  /**
   * Calcula el ángulo objetivo para un vector basado en su posición y configuración
   */
  const calculateTargetAngle = (
    vector: ExtendedVectorItem,
    mousePosition: Victor | null,
    dimensions: Dimensions,
    timestamp: number
  ): number => {
    const { animationType } = settings;

    // Si hay interacción con el ratón y está activada la atracción, pero no para Lissajous ni Geometrico
    if (mousePosition && settings.mouseAttraction && animationType !== 'lissajous' && animationType !== 'geometrico') {
      const vectorPosition = new Victor(vector.baseX, vector.baseY);
      const direction = mousePosition.clone().subtract(vectorPosition);
      return direction.angle() * (180 / Math.PI);
    }

    // Calcular ángulo según tipo de animación
    switch (animationType) {
      case 'smoothWaves': {
        const waveFreq = settings.seaWaveFrequency || 0.005;
        const waveAmp = settings.seaWaveAmplitude || 45;
        return Math.sin(timestamp * waveFreq + vector.baseX * 0.01) * waveAmp;
      }

      case 'seaWaves': {
        const baseAngle = Math.sin(timestamp * 0.001 + vector.baseX * 0.01) * 45;
        const ripple = Math.sin(timestamp * 0.002 + vector.baseY * 0.01) * 15;
        return baseAngle + ripple;
      }

      case 'perlinFlow': {
        // Simulación simple de ruido Perlin
        const noiseX = Math.sin(timestamp * 0.001 + vector.baseX * 0.02);
        const noiseY = Math.cos(timestamp * 0.001 + vector.baseY * 0.02);
        return Math.atan2(noiseY, noiseX) * (180 / Math.PI);
      }

      case 'mouseInteraction': {
        if (mousePosition) {
          const vectorPos = new Victor(vector.baseX, vector.baseY);
          const direction = mousePosition.clone().subtract(vectorPos);
          return direction.angle() * (180 / Math.PI);
        }
        return vector.currentAngle;
      }

      case 'pinwheels': {
        const rotationSpeed = 0.1;
        return (timestamp * rotationSpeed + (vector.r + vector.c) * 45) % 360;
      }

      case 'oceanCurrents': {
        const flowSpeed = 0.05;
        const flowAngle = Math.sin(timestamp * flowSpeed + vector.baseY * 0.01) * 90;
        return flowAngle + (vector.c * 10);
      }

      case 'jitter': {
        const jitterAmount = 15;
        return vector.currentAngle + (Math.random() * 2 - 1) * jitterAmount;
      }

      case 'centerPulse': {
        const pulseInterval = settings.pulseInterval || 2000;
        const pulseDuration = settings.pulseDuration || 1000;
        const timeSinceLastPulse = timestamp - lastPulseTimeRef.current;

        if (timeSinceLastPulse >= pulseInterval) {
          lastPulseTimeRef.current = timestamp;
        }

        if (timeSinceLastPulse < pulseDuration) {
          const center = new Victor(dimensions.width / 2, dimensions.height / 2);
          const vectorPos = new Victor(vector.baseX, vector.baseY);
          const direction = vectorPos.clone().subtract(center);
          return direction.angle() * (180 / Math.PI);
        }

        return vector.currentAngle;
      }

      case 'rippleEffect': {
        const center = new Victor(dimensions.width / 2, dimensions.height / 2);
        const vectorPos = new Victor(vector.baseX, vector.baseY);
        const distance = vectorPos.distance(center);
        const waveSpeed = 0.002;
        return Math.sin(timestamp * waveSpeed - distance * 0.1) * 180;
      }

      case 'expandingWave': {
        const center = new Victor(dimensions.width / 2, dimensions.height / 2);
        const vectorPos = new Victor(vector.baseX, vector.baseY);
        const distance = vectorPos.distance(center);
        const waveSpeed = 0.001;
        const waveLength = 0.05;
        return Math.sin(timestamp * waveSpeed + distance * waveLength) * 180;
      }

      case 'cellularAutomata': {
        // Simulación simple de autómata celular
        const neighborSum = (vector.r + vector.c) % 4;
        const timeStep = Math.floor(timestamp / 1000);
        return (neighborSum * 90 + timeStep * 45) % 360;
      }

      case 'flocking': {
        // Comportamiento simple de bandada
        const flockAngle = (vector.flockId * 72 + timestamp * 0.1) % 360;
        const individualVariation = Math.sin(timestamp * 0.002 + vector.baseX * 0.01) * 30;
        return flockAngle + individualVariation;
      }

      case 'geometricPattern': {
        // Implementación del patrón geométrico
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        const dx = vector.baseX - centerX;
        const dy = vector.baseY - centerY;
        const angleToCenter = Math.atan2(dy, dx);
        let tangentialAngle = angleToCenter + Math.PI / 2; // Perpendicular a la línea que va al centro
        const rotationSpeed = 0.3 * settings.animationSpeedFactor;
        tangentialAngle += timestamp * 0.001 * rotationSpeed; // Factor de tiempo normalizado
        return tangentialAngle * (180 / Math.PI);
      }
      
      case 'geometrico': {
        // Versión simplificada basada en patrón geométrico
        if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
          return vector.currentAngle || 0;
        }
          
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        
        // Cálculo directo del ángulo polar
        const theta = Math.atan2(vector.baseY - centerY, vector.baseX - centerX);
        
        // Añadir 90 grados para hacerlo tangencial
        const baseAngle = theta + Math.PI/2;
        
        // Factor de velocidad con valor predeterminado seguro
        const speedFactor = settings.animationSpeedFactor || 1;
        
        // Componente temporal para rotación
        const timeComponent = timestamp * 0.001 * 0.3 * speedFactor;
        
        // Ángulo final en grados
        const finalAngle = (baseAngle + timeComponent) * (180 / Math.PI);
        
        // Verificación final por seguridad
        return isNaN(finalAngle) ? vector.currentAngle || 0 : finalAngle;
      }
      
      case 'tangenteClasica': {
        // Implementación exacta del algoritmo original del HTML
        if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
          return vector.currentAngle || 0;
        }
          
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        
        // Cálculo idéntico al algoritmo original en el HTML
        const dx = vector.baseX - centerX;
        const dy = vector.baseY - centerY;
        const angleToCenter = Math.atan2(dy, dx);
        let tangentialAngle = angleToCenter + Math.PI / 2; // Perpendicular a la línea hacia el centro
        
        // Velocidad de rotación fija (0.3) como en el original
        const rotationSpeed = 0.3;
        tangentialAngle += timestamp * 0.001 * rotationSpeed;
        
        // Convertir a grados tal como se hace en el algoritmo original
        return tangentialAngle * (180 / Math.PI);
      }

      case 'lissajous': {
        // Figuras de Lissajous claramente distintivas
        const paramA = settings.lissajousParamA || 3;
        const paramB = settings.lissajousParamB || 2;
        const frequency = settings.lissajousFrequency || 0.001;
        const delta = settings.lissajousDelta || Math.PI / 2; // 90 grados por defecto

        // Verificar que las dimensiones son válidas para evitar NaN
        if (!dimensions || !dimensions.width || !dimensions.height) {
          return vector.currentAngle || 0; // Retornar ángulo actual si no hay dimensiones válidas
        }

        // Centro de la figura de Lissajous
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;

        // Tamaño de la figura (proporcional al canvas)
        const figureSize = Math.min(dimensions.width, dimensions.height) * 0.4;

        // Parámetro temporal que avanza con velocidad proporcional a la frecuencia
        const t = timestamp * frequency;

        // Calculamos el punto objetivo de la curva de Lissajous
        const targetX = centerX + figureSize * Math.sin(paramA * t + delta);
        const targetY = centerY + figureSize * Math.sin(paramB * t);

        // Vector desde la posición actual hacia el punto objetivo
        const vectorToTargetX = targetX - vector.baseX;
        const vectorToTargetY = targetY - vector.baseY;

        // Ángulo hacia el objetivo (en grados)
        return Math.atan2(vectorToTargetY, vectorToTargetX) * (180 / Math.PI);
      }

      case 'geometricPattern': {
        // Patrón geométrico basado en formas poligonales
        const complexity = settings.geometricPatternComplexity || 3;
        const rotationSpeed = settings.geometricPatternRotationSpeed || 0.5;

        
        // Verificar que las dimensiones son válidas para evitar NaN
        if (!dimensions || !dimensions.width || !dimensions.height) {
          return vector.currentAngle || 0; // Retornar ángulo actual si no hay dimensiones válidas
        }
        
        // Calcular la posición relativa al centro (normalizando a [-1, 1])
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        const relX = (vector.baseX - centerX) / (dimensions.width / 2 || 1); // Evitar división por cero
        const relY = (vector.baseY - centerY) / (dimensions.height / 2 || 1); // Evitar división por cero
        
        // Convertir a coordenadas polares
        const radius = Math.sqrt(relX * relX + relY * relY) || 0; // Protección contra NaN
        const theta = Math.atan2(relY, relX) || 0; // Protección contra NaN
        
        // NUEVO: Crear patrones de polígonos regulares
        // El número de lados del polígono depende de la complejidad
        const sides = complexity + 2; // Mínimo un triángulo (complejidad=1 -> 3 lados)
        
        // Calcular el ángulo del lado del polígono más cercano
        const sectorAngle = (2 * Math.PI) / sides;
        const sectorNumber = Math.floor((theta + Math.PI) / sectorAngle);
        const sectorMidAngle = sectorNumber * sectorAngle - Math.PI + (sectorAngle / 2);
        
        // No necesitamos calcular la distancia angular al sector para este patrón
        
        // Ángulo base: perpendicular a los lados del polígono
        let angle = (sectorMidAngle + Math.PI/2) * (180 / Math.PI);
        
        // Añadir rotación global
        angle += timestamp * rotationSpeed * 0.01;
        
        // Añadir efecto pulsante basado en la distancia al centro
        const pulseEffect = 30 * Math.sin(timestamp * 0.002) * radius;
        angle += pulseEffect;
        
        // Asegurar que el valor es numérico
        return isNaN(angle) ? (vector.currentAngle || 0) : (angle % 360);
      }
      
      case 'vortex': {
        // Efecto remolino/vórtice claramente distinto a los demás patrones
        const vortexStrength = settings.vortexStrength || 0.3;
        const vortexInwardFactor = settings.vortexInwardFactor || 0.5; // Factor de atracción hacia el centro
        
        // Verificar que las dimensiones son válidas para evitar NaN
        if (!dimensions || !dimensions.width || !dimensions.height) {
          return vector.currentAngle || 0; // Retornar ángulo actual si no hay dimensiones válidas
        }
        
        // Obtener el centro del vórtice (por defecto el centro del canvas)
        const vortexCenterXPercent = (settings.vortexCenterX !== undefined && !isNaN(settings.vortexCenterX)) ? settings.vortexCenterX : 50;
        const vortexCenterYPercent = (settings.vortexCenterY !== undefined && !isNaN(settings.vortexCenterY)) ? settings.vortexCenterY : 50;
        
        // Convertir porcentajes a coordenadas reales
        const vortexCenterX = (vortexCenterXPercent / 100) * dimensions.width;
        const vortexCenterY = (vortexCenterYPercent / 100) * dimensions.height;
        
        // Calcular la distancia al centro del vórtice
        const dx = vector.baseX - vortexCenterX;
        const dy = vector.baseY - vortexCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy) || 0.1; // Protección contra NaN/división por cero
        
        // NUEVO: Calcular ángulo hacia el centro del vórtice
        const angleToCenter = Math.atan2(dy, dx);
        
        // Ángulo tangencial (perpendicular al radio - modo clásico de vórtice)
        const tangentialAngle = angleToCenter + Math.PI / 2;
        
        // NUEVO: Combinar ángulo tangencial con un componente que apunta hacia el centro
        // El vortexInwardFactor controla cuánto los vectores apuntan hacia el centro vs. tangencialmente
        const combinedAngle = tangentialAngle - vortexInwardFactor * (angleToCenter + Math.PI);
        
        // La velocidad de rotación disminuye con la distancia al cuadrado (más natural para un vórtice)
        const maxDimension = Math.max(dimensions.width || 1, dimensions.height || 1);
        const normalizedDistance = distance / maxDimension;
        const speedFactor = Math.pow(Math.max(0.1, 1 - normalizedDistance), 2);
        
        // Aplicar efecto de rotación incrementado por la fuerza del vórtice
        const rotationAmount = timestamp * 0.015 * vortexStrength * speedFactor;
        
        // Convertir a grados y normalizar
        const finalAngle = (combinedAngle * (180 / Math.PI) + rotationAmount) % 360;
        return isNaN(finalAngle) ? (vector.currentAngle || 0) : finalAngle;
      }
      
      case 'followPath': {
        // Seguir un camino con patrón de onda sinusoidal claro y distintivo
        const pathSpeed = settings.followPathSpeed || 0.5;
        const pathComplexity = settings.followPathComplexity || 2;
        const pathVariation = settings.followPathVariation || 0.3;
        
        // Verificar que las dimensiones son válidas para evitar NaN
        if (!dimensions || !dimensions.width || !dimensions.height) {
          return vector.currentAngle || 0; // Retornar ángulo actual si no hay dimensiones válidas
        }
        
        // NUEVO: Definir un camino global como una serie de ondas sinusoidales
        // La posición y punto de referencia dependen de la posición en el eje X
        const pathCenterY = dimensions.height / 2;
        const pathAmplitude = dimensions.height * 0.25;
        
        // Frecuencia del camino basada en la complejidad
        // Mayor complejidad = más ondulaciones en el camino
        const waveFrequency = (pathComplexity / 100) * Math.PI * 2;
        
        // Calcular la posición Y del camino en este punto X
        const pathPhase = timestamp * 0.001 * pathSpeed;
        const pathY = pathCenterY + pathAmplitude * Math.sin(vector.baseX * waveFrequency + pathPhase);
        
        // Calcular la distancia vertical al camino
        const distanceToPathY = Math.abs(vector.baseY - pathY);
        
        // Umbral de influencia: cuanto más cerca estemos del camino, más nos afecta
        const influenceThreshold = dimensions.height * 0.3;
        const influenceFactor = Math.max(0, 1 - (distanceToPathY / influenceThreshold));
        
        // Si estamos cerca del camino, seguimos la dirección de la tangente del camino
        if (influenceFactor > 0) {
          // Calcular la pendiente del camino en este punto (derivada de la función seno)
          const pathSlope = pathAmplitude * waveFrequency * Math.cos(vector.baseX * waveFrequency + pathPhase);
          
          // Convertir pendiente a ángulo (en grados)
          const pathDirection = Math.atan(pathSlope) * (180 / Math.PI);
          
          // Ajustar dirección según la posición respecto al camino (arriba/abajo)
          const verticalCorrection = vector.baseY < pathY ? 180 : 0;
          
          // Añadir variación basada en la distancia y configuración
          const variationAmount = 40 * pathVariation * (1 - influenceFactor) * Math.sin(timestamp * 0.002);
          
          // Combinar dirección base del camino, corrección vertical y variación
          const finalAngle = (pathDirection + verticalCorrection + variationAmount) % 360;
          return isNaN(finalAngle) ? (vector.currentAngle || 0) : finalAngle;
        } else {
          // Si estamos lejos del camino, comportamiento más libre
          // Rotación lenta basada en la posición
          const positionFactor = (vector.baseX / dimensions.width) * (vector.baseY / dimensions.height);
          const rotationAmount = timestamp * 0.0005 * (1 + positionFactor * 2);
          return (vector.currentAngle + rotationAmount) % 360;
        }
      }
      
      case 'lissajous': {
        // Figuras de Lissajous claramente distintivas
        const paramA = settings.lissajousParamA || 3;
        const paramB = settings.lissajousParamB || 2;
        const frequency = settings.lissajousFrequency || 0.001;
        const delta = settings.lissajousDelta || Math.PI / 2; // 90 grados por defecto
        
        // Verificar que las dimensiones son válidas para evitar NaN
        if (!dimensions || !dimensions.width || !dimensions.height) {
          return vector.currentAngle || 0; // Retornar ángulo actual si no hay dimensiones válidas
        }
        
        // NUEVO: Implementar verdaderas curvas de Lissajous
        // En lugar de calcular el ángulo basado en la posición actual del vector,
        // calculamos la posición objetivo donde debería estar y apuntamos hacia allí
        
        // Centro de la figura de Lissajous
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        
        // Tamaño de la figura (proporcional al canvas)
        const figureSize = Math.min(dimensions.width, dimensions.height) * 0.4;
        
        // Parámetro t avanza con el tiempo, pero es diferente para cada vector
        // basado en su distancia al centro y ángulo
        const normalizedX = (vector.baseX - centerX) / (centerX || 1);
        const normalizedY = (vector.baseY - centerY) / (centerY || 1);
        const radius = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
        const angle = Math.atan2(normalizedY, normalizedX);
        
        // Parámetro temporal que avanza con velocidad proporcional a la frecuencia
        const t = timestamp * frequency;
        
        // Posición objetivo según las ecuaciones paramétricas de Lissajous
        // En vez de usar la posición actual para calcular el t, usamos el tiempo global
        // pero calculamos diferentes puntos objetivo para cada sector del canvas
        
        // Dividimos el círculo en sectores y asignamos diferentes fases
        const numSectors = 4;
        const sectorIndex = Math.floor((angle + Math.PI) / (2 * Math.PI / numSectors));
        const sectorPhase = sectorIndex * Math.PI / 2;
        
        // Calculamos el punto objetivo de la curva de Lissajous
        const targetX = centerX + figureSize * Math.sin(paramA * (t + sectorPhase) + delta);
        const targetY = centerY + figureSize * Math.sin(paramB * (t + sectorPhase));
        
        // Vector desde la posición actual hacia el punto objetivo
        const vectorToTargetX = targetX - vector.baseX;
        const vectorToTargetY = targetY - vector.baseY;
        
        // Ángulo hacia el objetivo (en grados)
        const angleToTarget = Math.atan2(vectorToTargetY, vectorToTargetX) * (180 / Math.PI);
        
        // Mezclar el ángulo hacia el objetivo con una rotación
        // basada en la distancia para crear un patrón más dinámico
        const distanceFactor = Math.min(1, radius * 2); // Normalizado entre 0 y 1
        const rotationComponent = (t * 100) % 360 * distanceFactor;
        
        // Combinación ponderada: cerca del objetivo seguimos la dirección del objetivo,
        // lejos añadimos más rotación
        const finalAngle = angleToTarget + rotationComponent * (1 - Math.max(0, 1 - distanceFactor));
        
        // Asegurar que el valor es numérico
        return isNaN(finalAngle) ? (vector.currentAngle || 0) : finalAngle;
      }

      default:
        return vector.currentAngle;
    }
  };

  return {
    calculateTargetAngle,
    lastPulseTimeRef,
  };
};
