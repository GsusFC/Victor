/**
 * ArtViewer - Visualizador de arte en modo solo lectura
 */

'use client';

import { useRef } from 'react';
import { VectorCanvas, VectorCanvasHandle } from '@/components/canvas/VectorCanvas';
import { useVectorStore } from '@/store/vectorStore';
import type { ArtPiece } from '@/types/art';
import { formatArtDate } from '@/lib/art-utils';
import { useEffect } from 'react';

interface ArtViewerProps {
  artPiece: ArtPiece;
}

export function ArtViewer({ artPiece }: ArtViewerProps) {
  const canvasHandleRef = useRef<VectorCanvasHandle>(null);
  const recordingCallbackRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    // Aplicar toda la configuración de la obra de una vez usando setState
    useVectorStore.setState({
      visual: artPiece.config.visual,
      grid: artPiece.config.grid,
      animation: artPiece.config.animation,
      canvas: artPiece.config.canvas,
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
