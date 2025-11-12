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
import { RenderPanel } from '@/components/controls/RenderPanel';
import { Animation3DSelector } from '@/components/controls/Animation3DSelector';
import { FPSCounter } from '@/components/debug/FPSCounter';
import { PerformanceOverlay } from '@/components/debug/PerformanceOverlay';
import { PublishButton } from '@/components/art/PublishButton';
import Link from 'next/link';
import { Palette } from 'lucide-react';

export default function Home() {
  const canvasHandleRef = useRef<VectorCanvasHandle>(null);
  const recordingCallbackRef = useRef<(() => Promise<void>) | null>(null);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const [engine, setEngine] = useState<import('@/engine/WebGPUEngine').WebGPUEngine | null>(null);
  const [renderMode, setRenderMode] = useState<'2D' | '3D'>('2D');
  const [showFPS, setShowFPS] = useState(false);  // FPS counter hidden by default (press F)
  const [showPerfOverlay, setShowPerfOverlay] = useState(false);  // Performance overlay hidden (press P)

  // Poll for engine availability
  useEffect(() => {
    const checkEngine = () => {
      if (canvasHandleRef.current) {
        const eng = canvasHandleRef.current.getEngine();
        if (eng && eng !== engine) {
          console.log('✅ page.tsx: Engine detected and set to state');
          setEngine(eng);
        }
      }
    };

    // Check immediately
    checkEngine();

    // Poll every 100ms until engine is available
    if (!engine) {
      const interval = setInterval(checkEngine, 100);
      return () => clearInterval(interval);
    }
  }, [engine]);

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
        recordingControls={
          <HeaderRecordingControls
            canvas={canvasElement}
            canvasRef={canvasHandleRef as React.RefObject<VectorCanvasHandle>}
            onRecordingCallbackChange={(callback) => {
              recordingCallbackRef.current = callback;
            }}
          />
        }
        leftSidebar={
          <div className="space-y-4">
            <CollapsibleCard title="Render" defaultExpanded={true}>
              <RenderPanel
                engine={engine}
                mode={renderMode}
                onModeChange={setRenderMode}
              />
            </CollapsibleCard>

            {/* 2D Controls */}
            {renderMode === '2D' && (
              <>
                <CollapsibleCard title="Animación" defaultExpanded={true}>
                  <AnimationPanel />
                </CollapsibleCard>
                <CollapsibleCard title="Grid" defaultExpanded={true}>
                  <GridControls />
                </CollapsibleCard>
              </>
            )}

            {/* 3D Controls */}
            {renderMode === '3D' && (
              <>
                <CollapsibleCard title="Animaciones 3D" defaultExpanded={true}>
                  <Animation3DSelector engine={engine} />
                </CollapsibleCard>
                <CollapsibleCard title="Grid 3D" defaultExpanded={true}>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      El grid 3D usa 10×10×10 vectores espaciados uniformemente en el espacio tridimensional.
                    </p>
                  </div>
                </CollapsibleCard>
              </>
            )}
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
          <CollapsibleCard title="📤 Publicar Arte" defaultExpanded={true}>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-mono">
                Comparte tu animación como obra inmutable con un link único
              </p>
              <PublishButton canvasHandleRef={canvasHandleRef} />
              <Link
                href="/gallery"
                className="inline-flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Palette className="w-4 h-4" />
                Ver Galería
              </Link>
            </div>
          </CollapsibleCard>
        </div>
      }
      />
    </>
  );
}
