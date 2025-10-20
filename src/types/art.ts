/**
 * Types para el sistema de galería de arte
 */

import { VectorState } from '@/store/vectorStore';

export interface ArtPiece {
  id: string;              // nanoid único (8 chars)
  title: string;           // Título de la obra
  createdAt: number;       // timestamp
  config: VectorState;     // Configuración completa del vector
  thumbnail?: string;      // Base64 del snapshot (opcional)
  captureTime?: number;    // Tiempo de animación cuando se capturó (para reproducibilidad exacta)
  vectorData?: number[];   // Posiciones exactas de los vectores [baseX, baseY, angle, length] (NEW)
}

export interface ArtIndex {
  ids: string[];           // Array de IDs publicados
  updatedAt: number;       // Última actualización del índice
}

export interface PublishArtRequest {
  title?: string;          // Título opcional (se genera si no se provee)
  config: VectorState;     // Configuración a publicar
  thumbnail?: string;      // Snapshot opcional
  captureTime?: number;    // Tiempo de animación al capturar
  vectorData?: number[];   // Posiciones exactas de los vectores (NEW)
}

export interface PublishArtResponse {
  success: boolean;
  id?: string;             // ID generado
  url?: string;            // URL completa de la obra
  error?: string;          // Mensaje de error si falla
}
