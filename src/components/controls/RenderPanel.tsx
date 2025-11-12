/**
 * RenderPanel - Panel de controles de renderizado 2D/3D
 * Combina RenderModeToggle y CameraControls3D
 */

'use client';

import { useState, useEffect } from 'react';
import { RenderModeToggle } from './RenderModeToggle';
import { CameraControls3D } from './CameraControls3D';
import type { WebGPUEngine } from '@/engine/WebGPUEngine';
import type { Camera3D } from '@/engine/Camera3D';

interface RenderPanelProps {
  engine: WebGPUEngine | null;
  mode: '2D' | '3D';
  onModeChange: (mode: '2D' | '3D') => void;
}

export function RenderPanel({ engine, mode, onModeChange }: RenderPanelProps) {
  const [camera3D, setCamera3D] = useState<Camera3D | null>(null);

  // Sync camera with engine when mode changes
  useEffect(() => {
    if (!engine) {
      console.log('🔍 RenderPanel: Engine not available yet');
      return;
    }

    console.log('🔍 RenderPanel: Engine available, syncing mode');

    if (mode === '3D') {
      const cam = engine.getCamera3D();
      setCamera3D(cam);
    } else {
      setCamera3D(null);
    }
  }, [engine, mode]);

  const handleModeChange = (newMode: '2D' | '3D') => {
    console.log('🔍 RenderPanel: Mode change requested:', newMode, 'Engine:', !!engine);
    if (!engine) {
      console.warn('⚠️ RenderPanel: Cannot change mode, engine not available');
      return;
    }

    engine.setRenderMode(newMode);
    console.log('✅ RenderPanel: Mode changed to', newMode);
    onModeChange(newMode);

    // Update camera reference when switching to 3D
    if (newMode === '3D') {
      const cam = engine.getCamera3D();
      setCamera3D(cam);
      console.log('📷 RenderPanel: Camera3D obtained:', !!cam);
    } else {
      setCamera3D(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Render Mode Toggle */}
      <RenderModeToggle mode={mode} onChange={handleModeChange} disabled={!engine} />

      {/* 3D Camera Controls (only shown in 3D mode) */}
      {mode === '3D' && (
        <div className="pt-2 border-t">
          <CameraControls3D
            camera={camera3D}
            onUpdate={() => {
              // Apply camera changes immediately (no damping for UI controls)
              if (camera3D) {
                camera3D.applyTargetsImmediately();
              }
            }}
          />
        </div>
      )}

      {/* Info about mode */}
      {mode === '2D' && (
        <div className="p-3 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground">
            Modo 2D activo. Cambia a 3D para explorar el campo vectorial en tres dimensiones.
          </p>
        </div>
      )}
    </div>
  );
}
