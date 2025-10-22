/**
 * Home - Página principal de Victor WebGPU
 * Reescrita desde cero con arquitectura moderna
 */

'use client';

import { useRef, useState, useEffect } from 'react';
import { VectorCanvas, VectorCanvasHandle } from '@/components/canvas/VectorCanvas';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { AnimationPanel } from '@/components/controls/AnimationPanel';
import { GridControls } from '@/components/controls/GridControls';
import { VisualControls } from '@/components/controls/VisualControls';
import { HeaderRecordingControls } from '@/components/controls/HeaderRecordingControls';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { PostProcessingControls } from '@/components/controls/PostProcessingControls';
import { FPSCounter } from '@/components/debug/FPSCounter';
import { PerformanceOverlay } from '@/components/debug/PerformanceOverlay';
// import { PublishButton } from '@/components/art/PublishButton';
// import Link from 'next/link';
// import { Palette } from 'lucide-react';

export default function Home() {
  const canvasHandleRef = useRef<VectorCanvasHandle>(null);
  const recordingCallbackRef = useRef<(() => Promise<void>) | null>(null);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const [showFPS, setShowFPS] = useState(true);  // FPS counter visible by default
  const [showPerfOverlay, setShowPerfOverlay] = useState(false);  // Performance overlay (press P)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle when not typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'p' || e.key === 'P') {
        setShowPerfOverlay((prev) => !prev);
      }
      if (e.key === 'f' || e.key === 'F') {
        setShowFPS((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <>
      <FPSCounter visible={showFPS && !showPerfOverlay} position="top-right" />
      <PerformanceOverlay
        visible={showPerfOverlay}
        engine={canvasHandleRef.current?.getEngine() ?? null}
        position="top-left"
      />
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
          <CollapsibleCard title="Post-Processing" defaultExpanded={false}>
            <PostProcessingControls />
          </CollapsibleCard>
          {/* Sistema de grabación movido al header */}
          {/* Sistema de publicación deprecado temporalmente */}
        </div>
      }
      recordingControls={
        <HeaderRecordingControls
          canvas={canvasElement}
          onRecordingCallbackChange={(callback) => {
            recordingCallbackRef.current = callback;
          }}
        />
      }
      />
    </>
  );
}
