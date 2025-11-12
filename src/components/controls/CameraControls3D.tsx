/**
 * CameraControls3D - Controles para la cámara 3D
 * Presets, FOV, zoom, etc.
 */

'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Camera, Compass, Eye, Box } from 'lucide-react';
import type { Camera3D } from '@/engine/Camera3D';

interface CameraControls3DProps {
  camera: Camera3D | null;
  onUpdate?: () => void;
}

export function CameraControls3D({ camera, onUpdate }: CameraControls3DProps) {
  // Track camera values in state to trigger re-renders
  const [fov, setFov] = useState(60);
  const [distance, setDistance] = useState(300);

  // Sync state with camera when camera changes
  useEffect(() => {
    if (camera) {
      setFov(camera.fov);
      setDistance(camera.distance);
    }
  }, [camera]);

  if (!camera) {
    return (
      <div className="text-sm text-muted-foreground">
        Cámara 3D no disponible
      </div>
    );
  }

  const handlePreset = (preset: 'top' | 'side' | 'isometric' | 'front' | 'corner') => {
    camera.setPreset(preset);
    setFov(camera.fov);
    setDistance(camera.distance);
    onUpdate?.();
  };

  const handleFOVChange = (value: number[]) => {
    const newFov = value[0];
    camera.fov = newFov;
    setFov(newFov);
    // FOV affects projection matrix, mark as dirty
    camera.applyTargetsImmediately();
    onUpdate?.();
  };

  const handleDistanceChange = (value: number[]) => {
    const newDistance = value[0];
    camera.distance = newDistance;
    camera.targetDistance = newDistance; // Also update target to prevent damping revert
    setDistance(newDistance);
    // Distance affects camera position
    camera.applyTargetsImmediately();
    onUpdate?.();
  };

  const handleReset = () => {
    camera.setPreset('isometric');
    camera.distance = 300;
    camera.fov = 60;
    camera.applyTargetsImmediately();
    setFov(60);
    setDistance(300);
    onUpdate?.();
  };

  return (
    <div className="space-y-4">
      {/* Camera Presets */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-2">
          <Compass className="w-3 h-3" />
          Presets de Cámara
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePreset('top')}
            className="h-8 text-xs"
          >
            Vista Superior
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePreset('side')}
            className="h-8 text-xs"
          >
            Vista Lateral
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePreset('isometric')}
            className="h-8 text-xs"
          >
            Isométrica
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePreset('front')}
            className="h-8 text-xs"
          >
            Vista Frontal
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePreset('corner')}
            className="h-8 text-xs col-span-2"
          >
            <Box className="w-3 h-3 mr-1" />
            Vista Esquina
          </Button>
        </div>
      </div>

      {/* FOV Slider */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-2">
          <Eye className="w-3 h-3" />
          Campo de Visión (FOV)
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[fov]}
            onValueChange={handleFOVChange}
            min={30}
            max={120}
            step={1}
            className="flex-1"
          />
          <span className="text-xs font-mono text-muted-foreground w-12 text-right">
            {Math.round(fov)}°
          </span>
        </div>
      </div>

      {/* Distance Slider */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-2">
          <Camera className="w-3 h-3" />
          Distancia
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[distance]}
            onValueChange={handleDistanceChange}
            min={100}
            max={1000}
            step={10}
            className="flex-1"
          />
          <span className="text-xs font-mono text-muted-foreground w-12 text-right">
            {Math.round(distance)}
          </span>
        </div>
      </div>

      {/* Reset Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={handleReset}
        className="w-full h-8 text-xs"
      >
        Resetear Cámara
      </Button>

      {/* Instructions */}
      <div className="p-3 bg-muted/50 rounded-md space-y-1">
        <p className="text-xs font-medium">Controles de Mouse:</p>
        <ul className="text-xs text-muted-foreground space-y-0.5">
          <li>• Click + Arrastrar: Orbitar</li>
          <li>• Click Derecho + Arrastrar: Pan</li>
          <li>• Scroll: Zoom</li>
        </ul>
      </div>
    </div>
  );
}
