/**
 * ArtViewer - Visualizador de arte en modo solo lectura
 */

'use client';

import { useRef, useLayoutEffect } from 'react';
import { VectorCanvas, VectorCanvasHandle } from '@/components/canvas/VectorCanvas';
import { useVectorStore } from '@/store/vectorStore';
import type { ArtPiece } from '@/types/art';
import { formatArtDate } from '@/lib/art-utils';

interface ArtViewerProps {
  artPiece: ArtPiece;
}

export function ArtViewer({ artPiece }: ArtViewerProps) {
  const canvasHandleRef = useRef<VectorCanvasHandle>(null);
  const recordingCallbackRef = useRef<(() => Promise<void>) | null>(null);

  // Aplicar la configuración SINCRÓNICAMENTE usando useLayoutEffect
  // Se ejecuta después del render pero ANTES de pintar en pantalla
  // y ANTES de que VectorCanvas se monte, garantizando el orden correcto
  useLayoutEffect(() => {
    console.log('🎨 ArtViewer: Aplicando configuración de la obra', artPiece.id);
    console.log('🎨 Animation type:', artPiece.config.animation?.type);
    console.log('🎨 Full config:', JSON.stringify(artPiece.config, null, 2));

    // Aplicar el estado COMPLETO (incluyendo version y gradients)
    useVectorStore.setState({
      version: artPiece.config.version,
      visual: artPiece.config.visual,
      grid: artPiece.config.grid,
      animation: artPiece.config.animation,
      canvas: artPiece.config.canvas,
      gradients: artPiece.config.gradients,
    });
  }, [artPiece]);

  return (
    <div className="w-full h-full flex flex-col bg-black">
      {/* Header con info de la obra */}
      <div className="flex-shrink-0 bg-zinc-900 border-b border-zinc-800 p-4">
        <h1 className="text-2xl font-bold text-white mb-1">{artPiece.title}</h1>
        <p className="text-sm text-zinc-400">
          Publicado: {formatArtDate(artPiece.createdAt)}
        </p>
        <p className="text-xs text-zinc-500 font-mono mt-1">ID: {artPiece.id}</p>
      </div>

      {/* Canvas en modo solo lectura */}
      <div className="flex-1 min-h-0">
        <VectorCanvas
          ref={canvasHandleRef}
          recordingCallbackRef={recordingCallbackRef}
        />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 bg-zinc-900 border-t border-zinc-800 p-3 text-center">
        <p className="text-xs text-zinc-500">
          Esta obra es inmutable y de solo lectura
        </p>
      </div>
    </div>
  );
}
