import type { VectorItem } from './types';

/**
 * Tipo extendido para vectores que incluye propiedades de animación
 */
export interface ExtendedVectorItem extends VectorItem {
  targetAngle?: number;
  previousAngle?: number; // Almacena el ángulo anterior para calcular velocidad angular
  layer: number;
  activationTime: number;
  lengthFactor?: number; // Factor de longitud dinámico calculado en la animación
  widthFactor?: number; // Factor de grosor dinámico calculado en la animación
}