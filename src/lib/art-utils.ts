/**
 * Utilidades para el sistema de galería de arte
 */

import { nanoid } from 'nanoid';
import type { AnimationType } from '@/store/vectorStore';

/**
 * Genera un ID único corto para una obra de arte
 */
export function generateArtId(): string {
  return nanoid(8); // 8 caracteres: ~2 billones de combinaciones
}

/**
 * Genera un título descriptivo basado en la configuración
 */
export function generateArtTitle(animationType: AnimationType): string {
  const titles: Record<AnimationType, string[]> = {
    none: ['Quietud', 'Silencio', 'Estático'],
    // Naturales/Fluidas
    smoothWaves: ['Olas Suaves', 'Flujo Tranquilo', 'Ondulación'],
    seaWaves: ['Mar en Movimiento', 'Olas del Océano', 'Marea'],
    breathingSoft: ['Respiración', 'Hélice Suave', 'Torsión Orgánica'],
    flowField: ['Campo de Flujo', 'Corrientes Perlin', 'Deriva'],
    dnaHelix: ['Hélice ADN', 'Espiral Doble', 'Molécula Viva'],
    rippleEffect: ['Ondas Expansivas', 'Perturbación', 'Interferencia Circular'],
    organicGrowth: ['Crecimiento Orgánico', 'Reacción-Difusión', 'Patrón Vivo'],
    fluidDynamics: ['Dinámica de Fluidos', 'Turbulencia', 'Flujo Viscoso'],
    aurora: ['Aurora Boreal', 'Cortinas de Luz', 'Fenómeno Polar'],
    // Energéticas
    electricPulse: ['Pulso Eléctrico', 'Energía', 'Expansión Radial'],
    vortex: ['Vórtice', 'Remolino', 'Espiral Centrípeta'],
    directionalFlow: ['Corriente Direccional', 'Flujo Guiado', 'Vector'],
    storm: ['Tormenta', 'Caos Controlado', 'Turbulencia'],
    solarFlare: ['Erupción Solar', 'Llamarada', 'Eyección'],
    radiation: ['Radiación', 'Ondas Expansivas', 'Interferencia'],
    magneticField: ['Campo Magnético', 'Polos', 'Líneas de Fuerza'],
    chaosAttractor: ['Atractor Caótico', 'Clifford', 'Flujo Extraño'],
    plasmaBall: ['Bola de Plasma', 'Rayos', 'Núcleo Energético'],
    blackHole: ['Agujero Negro', 'Singularidad', 'Espacio-Tiempo'],
    lightningStorm: ['Tormenta Eléctrica', 'Relámpagos', 'Descarga Fractal'],
    quantumField: ['Campo Cuántico', 'Superposición', 'Fluctuaciones'],
    // Geométricas
    tangenteClasica: ['Tangente', 'Espiral', 'Rotación'],
    lissajous: ['Lissajous', 'Armonía', 'Resonancia'],
    geometricPattern: ['Patrón Geométrico', 'Estructura', 'Simetría'],
    harmonicOscillator: ['Oscilador Armónico', 'Resonancia 2D', 'Interferencia'],
    spirograph: ['Espirógrafo', 'Epitrocoide', 'Curvas Cíclicas'],
    fibonacci: ['Espiral de Fibonacci', 'Phyllotaxis', 'Proporción Áurea'],
    voronoiDiagram: ['Diagrama de Voronoi', 'Teselación', 'Partición del Espacio'],
    mandalas: ['Mandalas', 'Simetría Radial', 'Patrón Sagrado'],
    kaleidoscope: ['Caleidoscopio', 'Reflejo Espejo', 'Simetría Múltiple'],
    // Experimentales
    springMesh: ['Malla Elástica', 'Red de Resortes', 'Tejido Dinámico'],
  };

  const options = titles[animationType] || ['Obra Sin Título'];
  const randomIndex = Math.floor(Math.random() * options.length);

  return options[randomIndex];
}

/**
 * Captura un snapshot del canvas como base64
 */
export async function captureCanvasSnapshot(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Capturar como PNG con calidad máxima
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      resolve(dataUrl);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Convierte una fecha timestamp a formato legible
 */
export function formatArtDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Genera la URL completa de una obra de arte
 */
export function getArtUrl(id: string): string {
  if (typeof window === 'undefined') {
    return `/art/${id}`;
  }
  return `${window.location.origin}/art/${id}`;
}

/**
 * Copia texto al portapapeles
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}
