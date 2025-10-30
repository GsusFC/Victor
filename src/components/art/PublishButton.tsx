/**
 * PublishButton - Botón para publicar animación como obra de arte
 */

'use client';

import { useState } from 'react';
import { Share2, Check, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useVectorStore } from '@/store/vectorStore';
import type { VectorCanvasHandle } from '@/components/canvas/VectorCanvas';
import type { PublishArtResponse } from '@/types/art';
import { copyToClipboard } from '@/lib/art-utils';

interface PublishButtonProps {
  canvasHandleRef: React.RefObject<VectorCanvasHandle | null>;
}

export function PublishButton({ canvasHandleRef }: PublishButtonProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [artUrl, setArtUrl] = useState<string>('');
  const [artId, setArtId] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handlePublish = async () => {
    if (!canvasHandleRef.current) {
      alert('Canvas no disponible');
      return;
    }

    setIsPublishing(true);

    try {
      // Capturar snapshot del canvas, tiempo de animación y posiciones exactas
      const thumbnail = await canvasHandleRef.current.captureSnapshot();
      const captureTime = canvasHandleRef.current.getCurrentTime();
      const vectorDataRaw = canvasHandleRef.current.getVectorData();
      const vectorData = vectorDataRaw ? Array.from(vectorDataRaw) : undefined;

      // IMPORTANTE: Capturar estado ACTUAL en el momento del clic, no del render
      const state = useVectorStore.getState();
      const { version, visual, grid, animation, canvas, gradients } = state;

      // Capturar dimensiones REALES del canvas HTML (no del store)
      const canvasElement = canvasHandleRef.current.canvas;
      const realCanvasWidth = canvasElement?.width || canvas.width;
      const realCanvasHeight = canvasElement?.height || canvas.height;

      // LOG: Ver qué configuración estamos capturando
      console.log('📤 PublishButton: Capturando configuración para publicar');
      console.log('📤 Version:', version);
      console.log('📤 Visual:', JSON.stringify(visual, null, 2));
      console.log('📤 Grid:', JSON.stringify(grid, null, 2));
      console.log('📤 Animation:', JSON.stringify(animation, null, 2));
      console.log('📤 Canvas Store:', JSON.stringify(canvas, null, 2));
      console.log('📤 Canvas Real:', { width: realCanvasWidth, height: realCanvasHeight });
      console.log('📤 Gradients:', JSON.stringify(gradients, null, 2));
      console.log('📤 Capture Time:', captureTime);
      console.log('📤 Vector Data (primeros 20):', vectorData?.slice(0, 20));

      // Publicar a través del API
      // NOTA: NO guardamos vectorData para evitar conflictos
      // El sistema regenerará el grid normalmente con el seed guardado
      const response = await fetch('/api/art/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            version,
            visual,
            grid,
            animation,
            canvas: {
              ...canvas,
              width: realCanvasWidth,
              height: realCanvasHeight,
            },
            gradients,
          },
          thumbnail,
          captureTime,
          // vectorData omitido deliberadamente
        }),
      });

      const result: PublishArtResponse = await response.json();

      if (result.success && result.url && result.id) {
        setArtUrl(result.url);
        setArtId(result.id);
        setShowDialog(true);
      } else {
        alert(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error publishing art:', error);
      alert('Error al publicar la obra');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(artUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(artUrl, '_blank');
  };

  return (
    <>
      <Button
        onClick={handlePublish}
        disabled={isPublishing}
        className="w-full"
        size="lg"
      >
        <Share2 className="w-4 h-4 mr-2" />
        {isPublishing ? 'Publicando...' : 'Publicar como Arte'}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¡Obra publicada!</DialogTitle>
            <DialogDescription>
              Tu animación ha sido publicada y está disponible en la galería.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* ID de la obra */}
            <div>
              <p className="text-sm font-medium mb-1">ID de la obra:</p>
              <code className="block p-2 bg-muted rounded text-sm font-mono">
                {artId}
              </code>
            </div>

            {/* URL completa */}
            <div>
              <p className="text-sm font-medium mb-1">URL:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-xs font-mono truncate">
                  {artUrl}
                </code>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="flex-1"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Link
                  </>
                )}
              </Button>

              <Button
                onClick={handleOpenInNewTab}
                variant="default"
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver Obra
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
