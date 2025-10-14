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
    static: ['Serenidad', 'Contemplación', 'Equilibrio'],
    staticAngle: ['Dirección', 'Orientación', 'Camino'],
    randomStatic: ['Caos Ordenado', 'Dispersión', 'Aleatorio'],
    randomLoop: ['Ciclo Caótico', 'Variación Continua', 'Mutación'],
    smoothWaves: ['Olas Suaves', 'Flujo Tranquilo', 'Ondulación'],
    seaWaves: ['Mar en Movimiento', 'Olas del Océano', 'Marea'],
    perlinFlow: ['Flujo Orgánico', 'Corriente Natural', 'Deriva'],
    mouseInteraction: ['Interacción', 'Respuesta', 'Conexión'],
    centerPulse: ['Pulso Central', 'Latido', 'Expansión'],
    heartbeat: ['Corazón', 'Vida', 'Ritmo Vital'],
    directionalFlow: ['Corriente Direccional', 'Flujo Guiado', 'Vector'],
    tangenteClasica: ['Tangente', 'Espiral', 'Rotación'],
    lissajous: ['Lissajous', 'Armonía', 'Resonancia'],
    geometricPattern: ['Patrón Geométrico', 'Estructura', 'Simetría'],
    flocking: ['Bandada', 'Cohesión', 'Movimiento Colectivo'],
    vortex: ['Vórtice', 'Remolino', 'Espiral Centrípeta'],
    helicalCurl: ['Hélice', 'Espiral Tridimensional', 'Torsión'],
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
