/**
 * Home - Página principal de Victor WebGPU
 * Reescrita desde cero con arquitectura moderna
 */

'use client';

import { useRef, useState } from 'react';
import { VectorCanvas, VectorCanvasHandle } from '@/components/canvas/VectorCanvas';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { AnimationPanel } from '@/components/controls/AnimationPanel';
import { GridControls } from '@/components/controls/GridControls';
import { VisualControls } from '@/components/controls/VisualControls';
import { RecordingPanel } from '@/components/controls/RecordingPanel';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { PublishButton } from '@/components/art/PublishButton';
import Link from 'next/link';
import { Palette } from 'lucide-react';

export default function Home() {
  const canvasHandleRef = useRef<VectorCanvasHandle>(null);
  const recordingCallbackRef = useRef<(() => Promise<void>) | null>(null);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);

  return (
    <ResponsiveLayout
      leftSidebar={
        <div className="space-y-4">
          <CollapsibleCard title="Animación" defaultExpanded={true}>
            <AnimationPanel />
          </CollapsibleCard>
          <CollapsibleCard title="Grid" defaultExpanded={true}>
            <GridControls />
          </CollapsibleCard>
        </div>
      }
      canvas={
        <VectorCanvas
          ref={canvasHandleRef}
          recordingCallbackRef={recordingCallbackRef}
          onCanvasReady={setCanvasElement}
        />
      }
      rightSidebar={
        <div className="space-y-4">
          <CollapsibleCard title="Visual" defaultExpanded={true}>
            <VisualControls />
          </CollapsibleCard>
          <CollapsibleCard title="Grabación" defaultExpanded={false}>
            <RecordingPanel
              canvas={canvasElement}
              onRecordingCallbackChange={(callback) => {
                recordingCallbackRef.current = callback;
              }}
            />
          </CollapsibleCard>
          <CollapsibleCard title="Publicar Arte" defaultExpanded={false}>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Publica tu animación como una obra de arte inmutable con un link único para compartir.
              </p>
              <PublishButton canvasHandleRef={canvasHandleRef} />
              <Link
                href="/gallery"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                <Palette className="w-4 h-4" />
                Ver Galería
              </Link>
            </div>
          </CollapsibleCard>
        </div>
      }
    />
  );
}
