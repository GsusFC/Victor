/**
 * animation-period.ts - Cálculo automático de períodos de animación
 * Detecta si una animación es periódica y calcula su período
 */

import type { AnimationType } from '@/types/engine';

/**
 * Calcula el máximo común divisor
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Calcula el mínimo común múltiplo
 */
function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(Math.round(a), Math.round(b));
}

/**
 * Calcula el período de una animación en segundos
 * Retorna null si la animación no es periódica
 */
export function calculateAnimationPeriod(
  type: AnimationType,
  params: Record<string, number>,
  speed: number
): number | null {
  // Asegurar que speed no es 0
  if (speed <= 0) return null;

  switch (type) {
    // ============================================
    // NATURALES/FLUIDAS
    // ============================================

    case 'smoothWaves': {
      const frequency = params.frequency || 0.02;
      // T = 2π / (frequency × speed × 0.001)
      const period = (2 * Math.PI) / (Math.abs(frequency) * speed * 0.001);
      return isFinite(period) && period > 0 ? period : null;
    }

    case 'seaWaves': {
      // 3 ondas con diferentes frecuencias: 0.001, 0.002, 0.0008
      const freq1 = 0.001;
      const freq2 = 0.002;
      const freq3 = 0.0008;

      const period1 = (2 * Math.PI) / (freq1 * speed);
      const period2 = (2 * Math.PI) / (freq2 * speed);
      const period3 = (2 * Math.PI) / (freq3 * speed);

      // El período total es el MCM de los tres períodos
      const lcm12 = lcm(period1, period2);
      const lcmTotal = lcm(lcm12, period3);

      return isFinite(lcmTotal) && lcmTotal > 0 ? lcmTotal : null;
    }

    case 'breathingSoft': {
      const swirlFreq = Math.max(params.frequency || 1.1, 0.05);
      // T = 2π / (swirlFreq × speed)
      const period = (2 * Math.PI) / (swirlFreq * speed);
      return isFinite(period) && period > 0 ? period : null;
    }

    case 'flowField': {
      // Ruido Perlin que evoluciona - NO periódica
      return null;
    }

    // ============================================
    // ENERGÉTICAS
    // ============================================

    case 'electricPulse': {
      // 3 pulsos: 0.003, ~ 0.0051, ~ 0.0069 Hz
      const period = (2 * Math.PI) / (0.003 * speed);
      return isFinite(period) && period > 0 ? period : null;
    }

    case 'vortex': {
      const strength = params.frequency || 1.2;
      // T = 2π / (strength × speed)
      const period = (2 * Math.PI) / (Math.abs(strength) * speed);
      return isFinite(period) && period > 0 ? period : null;
    }

    case 'directionalFlow': {
      // Flujo continuo sin ciclo
      return null;
    }

    case 'storm': {
      // Usa rand_time() - ruido pseudoaleatorio - NO periódica
      return null;
    }

    case 'solarFlare': {
      // 3 ondas de eyección: 1.5, 2.3, 1.1 Hz
      const freq1 = 1.5;
      const freq2 = 2.3;
      const freq3 = 1.1;

      const period1 = (2 * Math.PI) / (freq1 * speed);
      const period2 = (2 * Math.PI) / (freq2 * speed);
      const period3 = (2 * Math.PI) / (freq3 * speed);

      const lcm12 = lcm(period1, period2);
      const lcmTotal = lcm(lcm12, period3);

      return isFinite(lcmTotal) && lcmTotal > 0 ? lcmTotal : null;
    }

    case 'radiation': {
      // Múltiples fuentes orbitales - periódica basada en waveSpeed
      const waveSpeed = Math.max(params.frequency || 0.1, 0.01);
      const period = (2 * Math.PI) / (waveSpeed * speed * 2.0);
      return isFinite(period) && period > 0 ? period : null;
    }

    case 'magneticField': {
      // Múltiples polos que orbitan
      const orbitalSpeed = Math.max(params.frequency || 0.1, 0.01);
      const period = (2 * Math.PI) / (orbitalSpeed * speed * 0.5);
      return isFinite(period) && period > 0 ? period : null;
    }

    case 'chaosAttractor': {
      // Atractor de Clifford - CAÓTICO, no periódico
      return null;
    }

    // ============================================
    // GEOMÉTRICAS
    // ============================================

    case 'tangenteClasica': {
      const rotationSpeed = params.frequency || 0.6;
      // T = 2π / (rotationSpeed × speed)
      const period = (2 * Math.PI) / (Math.abs(rotationSpeed) * speed);
      return isFinite(period) && period > 0 ? period : null;
    }

    case 'lissajous': {
      const xFreq = Math.max(params.frequency || 2.0, 0.1);
      const yFreq = Math.max(params.amplitude || 3.0, 0.1);

      // Los períodos individuales
      const periodX = (2 * Math.PI) / (xFreq * speed);
      const periodY = (2 * Math.PI) / (yFreq * speed);

      // El período total es el MCM
      const lcmTotal = lcm(periodX, periodY);
      return isFinite(lcmTotal) && lcmTotal > 0 ? lcmTotal : null;
    }

    case 'geometricPattern': {
      const patternFreq = Math.max(params.frequency || 4, 0.1);
      // Período basado en la frecuencia del patrón
      const period = (2 * Math.PI) / (patternFreq * speed);
      return isFinite(period) && period > 0 ? period : null;
    }

    case 'harmonicOscillator': {
      const baseFreq = Math.max(params.frequency || 2.0, 0.1);
      // T = 2π / (baseFreq × speed)
      const period = (2 * Math.PI) / (baseFreq * speed);
      return isFinite(period) && period > 0 ? period : null;
    }

    case 'spirograph': {
      // Períodos complejos debido a múltiples velocidades
      const innerSpeed = Math.max(params.amplitude || 0.5, 0.01);
      const outerSpeed = Math.max(params.elasticity || 0.2, 0.01);

      const periodInner = (2 * Math.PI) / (innerSpeed * speed);
      const periodOuter = (2 * Math.PI) / (outerSpeed * speed);

      const lcmTotal = lcm(periodInner, periodOuter);
      return isFinite(lcmTotal) && lcmTotal > 0 ? lcmTotal : null;
    }

    // ============================================
    // EXPERIMENTALES
    // ============================================

    case 'springMesh': {
      // Malla de resortes con perturbaciones
      const perturbFreq = Math.max(params.elasticity || 0.1, 0.01);
      const period = (2 * Math.PI) / (perturbFreq * speed);
      return isFinite(period) && period > 0 ? period : null;
    }

    case 'none':
    default:
      // Sin animación
      return null;
  }
}

/**
 * Obtiene la categoría de periodicidad de una animación
 */
export function getPeriodicityCategory(
  type: AnimationType,
  params: Record<string, number>,
  speed: number
): 'periodic' | 'non-periodic' | 'static' {
  const period = calculateAnimationPeriod(type, params, speed);

  if (period === null) {
    return type === 'none' ? 'static' : 'non-periodic';
  }

  return 'periodic';
}

/**
 * Formatea el período en formato legible
 */
export function formatPeriod(seconds: number): string {
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(0)}ms`;
  } else if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  } else {
    return `${(seconds / 60).toFixed(1)}m`;
  }
}
