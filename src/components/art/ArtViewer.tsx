/**
 * ArtViewer - Visualizador de arte en modo solo lectura
 */

'use client';

import { useRef, useLayoutEffect } from 'react';
import { VectorCanvas, VectorCanvasHandle } from '@/components/canvas/VectorCanvas';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { ReadOnlyAnimationPanel } from '@/components/controls/ReadOnlyAnimationPanel';
import { ReadOnlyGridControls } from '@/components/controls/ReadOnlyGridControls';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { useVectorStore } from '@/store/vectorStore';
import type { ArtPiece } from '@/types/art';
import { formatArtDate } from '@/lib/art-utils';
import Link from 'next/link';
import { ArrowLeft, Calendar, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    console.log('🎨 Capture time:', artPiece.captureTime);

    // Aplicar el estado COMPLETO (incluyendo version y gradients)
    // IMPORTANTE: Asegurar que la animación NO esté pausada
    useVectorStore.setState({
      version: artPiece.config.version,
      visual: artPiece.config.visual,
      grid: artPiece.config.grid,
      animation: {
        ...artPiece.config.animation,
        paused: false, // Forzar que la animación esté activa
      },
      canvas: artPiece.config.canvas,
      gradients: artPiece.config.gradients,
    });
  }, [artPiece]);

  return (
    <ResponsiveLayout
      readOnly={true}
      title={`Viewer: ${artPiece.title}`}
      headerActions={
        <Link href="/gallery">
          <Button size="sm" variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Galería</span>
          </Button>
        </Link>
      }
      leftSidebar={
        <div className="space-y-4">
          <CollapsibleCard title="Información" defaultExpanded={true}>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Publicado</div>
                  <div className="font-mono">{formatArtDate(artPiece.createdAt)}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Hash className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">ID</div>
                  <div className="font-mono text-xs">{artPiece.id}</div>
                </div>
              </div>
            </div>
          </CollapsibleCard>
          <CollapsibleCard title="Animación" defaultExpanded={true}>
            <ReadOnlyAnimationPanel />
          </CollapsibleCard>
          <CollapsibleCard title="Grid" defaultExpanded={true}>
            <ReadOnlyGridControls />
          </CollapsibleCard>
        </div>
      }
      canvas={
        <VectorCanvas
          ref={canvasHandleRef}
          recordingCallbackRef={recordingCallbackRef}
          initialTimeOffset={artPiece.captureTime || 0}
        />
      }
      rightSidebar={
        <div className="h-full flex items-center justify-center p-8">
          <div className="text-center space-y-3 text-muted-foreground">
            <p className="text-sm font-mono">Esta obra es inmutable</p>
            <p className="text-xs">Solo lectura</p>
          </div>
        </div>
      }
    />
  );
}
