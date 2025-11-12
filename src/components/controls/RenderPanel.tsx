/**
 * RenderPanel - Panel de control para modos de renderizado 2D/3D
 * Incluye controles de cámara 3D cuando está habilitado
 */

'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useVectorStore, selectCamera3D, selectActions } from '@/store/vectorStore';
import { CameraControls3D } from './CameraControls3D';
import { Box, Layers } from 'lucide-react';
import type { CameraPreset, ProjectionType } from '@/engine/Camera3D';

export function RenderPanel() {
  const camera3d = useVectorStore(selectCamera3D);
  const actions = useVectorStore(selectActions);

  const handleRotate = (azimuth: number, elevation: number) => {
    actions.setCamera3D({ azimuth, elevation });
  };

  const handleZoom = (distance: number) => {
    actions.setCamera3D({ distance });
  };

  const handleFovChange = (fov: number) => {
    actions.setCamera3D({ fov });
  };

  const handleProjectionChange = (projectionType: ProjectionType) => {
    actions.setCamera3D({ projectionType });
  };

  const handlePresetSelect = (preset: CameraPreset) => {
    // Los presets actualizan azimuth y elevation
    // Calculamos los valores basados en el preset
    let azimuth = camera3d.azimuth;
    let elevation = camera3d.elevation;

    switch (preset) {
      case 'front':
        azimuth = 0;
        elevation = 0;
        break;
      case 'back':
        azimuth = Math.PI;
        elevation = 0;
        break;
      case 'top':
        azimuth = 0;
        elevation = Math.PI / 2 - 0.01;
        break;
      case 'bottom':
        azimuth = 0;
        elevation = -Math.PI / 2 + 0.01;
        break;
      case 'left':
        azimuth = -Math.PI / 2;
        elevation = 0;
        break;
      case 'right':
        azimuth = Math.PI / 2;
        elevation = 0;
        break;
      case 'isometric':
        azimuth = Math.PI / 4; // 45 grados
        elevation = Math.atan(1 / Math.sqrt(2)); // ~35.26 grados
        break;
    }

    actions.setCamera3D({ azimuth, elevation });
  };

  const handleReset = () => {
    actions.resetCamera3D();
  };

  return (
    <section className="space-y-4">
      {/* Toggle 2D/3D */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-2">
          {camera3d.enabled ? (
            <Box className="w-4 h-4 text-primary" />
          ) : (
            <Layers className="w-4 h-4" />
          )}
          <Label htmlFor="render-mode" className="text-sm font-mono">
            {camera3d.enabled ? 'Modo 3D' : 'Modo 2D'}
          </Label>
        </div>
        <Switch
          id="render-mode"
          checked={camera3d.enabled}
          onCheckedChange={() => actions.toggleCamera3D()}
        />
      </div>

      {/* Descripción del modo actual */}
      <div className="text-xs text-muted-foreground">
        {camera3d.enabled ? (
          <p>
            Renderizado 3D activado. Usa los controles de cámara orbital para navegar la escena.
          </p>
        ) : (
          <p>
            Renderizado 2D tradicional. Activa el modo 3D para controles de cámara orbital.
          </p>
        )}
      </div>

      {/* Controles de cámara 3D (solo visible en modo 3D) */}
      {camera3d.enabled && (
        <div className="pt-2 border-t">
          <CameraControls3D
            azimuth={camera3d.azimuth}
            elevation={camera3d.elevation}
            distance={camera3d.distance}
            fov={camera3d.fov}
            projectionType={camera3d.projectionType}
            onRotate={handleRotate}
            onZoom={handleZoom}
            onFovChange={handleFovChange}
            onProjectionChange={handleProjectionChange}
            onPresetSelect={handlePresetSelect}
            onReset={handleReset}
          />
        </div>
      )}
    </section>
  );
}
