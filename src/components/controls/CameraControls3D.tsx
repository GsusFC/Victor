/**
 * CameraControls3D - Panel de control para cámara 3D orbital
 * Permite ajustar posición, rotación, proyección y presets
 */

'use client';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, Camera, Move3D } from 'lucide-react';
import type { CameraPreset, ProjectionType } from '@/engine/Camera3D';

interface CameraControls3DProps {
  // Estado de la cámara
  azimuth: number; // radianes
  elevation: number; // radianes
  distance: number;
  fov: number;
  projectionType: ProjectionType;

  // Callbacks
  onRotate: (azimuth: number, elevation: number) => void;
  onZoom: (distance: number) => void;
  onFovChange: (fov: number) => void;
  onProjectionChange: (type: ProjectionType) => void;
  onPresetSelect: (preset: CameraPreset) => void;
  onReset: () => void;
}

const CAMERA_PRESETS: Array<{ value: CameraPreset; label: string }> = [
  { value: 'front', label: 'Frontal' },
  { value: 'back', label: 'Trasera' },
  { value: 'top', label: 'Superior' },
  { value: 'bottom', label: 'Inferior' },
  { value: 'left', label: 'Izquierda' },
  { value: 'right', label: 'Derecha' },
  { value: 'isometric', label: 'Isométrica' },
];

export function CameraControls3D({
  azimuth,
  elevation,
  distance,
  fov,
  projectionType,
  onRotate,
  onZoom,
  onFovChange,
  onProjectionChange,
  onPresetSelect,
  onReset,
}: CameraControls3DProps) {
  // Convertir radianes a grados para display
  const azimuthDeg = (azimuth * 180) / Math.PI;
  const elevationDeg = (elevation * 180) / Math.PI;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4" />
          <span className="text-sm font-mono">Cámara 3D</span>
        </div>
        <Button onClick={onReset} size="sm" variant="ghost" className="h-6 w-6 p-0" title="Resetear cámara">
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>

      {/* Presets */}
      <div className="space-y-1">
        <Label className="text-xs">Vista</Label>
        <Select onValueChange={(value) => onPresetSelect(value as CameraPreset)}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Seleccionar preset" />
          </SelectTrigger>
          <SelectContent>
            {CAMERA_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tipo de proyección */}
      <div className="space-y-1">
        <Label className="text-xs">Proyección</Label>
        <Select value={projectionType} onValueChange={(value) => onProjectionChange(value as ProjectionType)}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="perspective">Perspectiva</SelectItem>
            <SelectItem value="orthographic">Ortográfica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Controles orbitales */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Move3D className="w-3 h-3" />
          <span className="font-mono">Controles Orbitales</span>
        </div>

        {/* Azimuth (rotación horizontal) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-mono">Azimuth</Label>
            <span className="text-xs font-mono text-muted-foreground">{azimuthDeg.toFixed(0)}°</span>
          </div>
          <Slider
            min={-180}
            max={180}
            step={1}
            value={[azimuthDeg]}
            onValueChange={([value]) => onRotate((value * Math.PI) / 180, elevation)}
          />
        </div>

        {/* Elevation (rotación vertical) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-mono">Elevación</Label>
            <span className="text-xs font-mono text-muted-foreground">{elevationDeg.toFixed(0)}°</span>
          </div>
          <Slider
            min={-89}
            max={89}
            step={1}
            value={[elevationDeg]}
            onValueChange={([value]) => onRotate(azimuth, (value * Math.PI) / 180)}
          />
        </div>

        {/* Distance (zoom) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-mono">Distancia</Label>
            <span className="text-xs font-mono text-muted-foreground">{distance.toFixed(1)}</span>
          </div>
          <Slider
            min={2}
            max={50}
            step={0.5}
            value={[distance]}
            onValueChange={([value]) => onZoom(value)}
          />
        </div>
      </div>

      {/* FOV (solo para perspectiva) */}
      {projectionType === 'perspective' && (
        <div className="space-y-1 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-mono">Campo de visión (FOV)</Label>
            <span className="text-xs font-mono text-muted-foreground">{fov.toFixed(0)}°</span>
          </div>
          <Slider min={20} max={120} step={5} value={[fov]} onValueChange={([value]) => onFovChange(value)} />
        </div>
      )}

      {/* Información */}
      <div className="text-xs text-muted-foreground font-mono pt-2 border-t">
        <div className="flex items-center justify-between">
          <span>Posición</span>
          <span>
            Azimuth: {azimuthDeg.toFixed(0)}°, Elev: {elevationDeg.toFixed(0)}°
          </span>
        </div>
      </div>
    </div>
  );
}
