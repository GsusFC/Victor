/**
 * Animation3DSelector - Selector de animaciones 3D
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Waves, Rotate3D, CircleDot } from 'lucide-react';
import type { WebGPUEngine } from '@/engine/WebGPUEngine';

interface Animation3DSelector {
  engine: WebGPUEngine | null;
}

type Animation3DType = 'smoothWaves3D' | 'vortex3D' | 'sphericalWaves3D';

const ANIMATIONS_3D = [
  {
    id: 'smoothWaves3D' as Animation3DType,
    name: 'Smooth Waves 3D',
    description: 'Ondas suaves en espacio 3D',
    icon: Waves,
  },
  {
    id: 'vortex3D' as Animation3DType,
    name: 'Vortex 3D',
    description: 'Vórtice con espiral ascendente',
    icon: Rotate3D,
  },
  {
    id: 'sphericalWaves3D' as Animation3DType,
    name: 'Spherical Waves 3D',
    description: 'Ondas esféricas radiales',
    icon: CircleDot,
  },
];

export function Animation3DSelector({ engine }: Animation3DSelector) {
  const [selectedAnimation, setSelectedAnimation] = useState<Animation3DType>('smoothWaves3D');

  // Sync with engine on mount
  useEffect(() => {
    if (!engine) return;

    // Set initial animation
    handleAnimationChange('smoothWaves3D');
  }, [engine]);

  const handleAnimationChange = (animationId: Animation3DType) => {
    if (!engine) {
      console.warn('⚠️ Animation3DSelector: Engine not available');
      return;
    }

    console.log('🎬 Animation3DSelector: Changing to', animationId);

    // Note: We need to cast to the broader AnimationType that includes 3D animations
    engine.setAnimationType(animationId as any);
    setSelectedAnimation(animationId);

    console.log('✅ Animation3DSelector: Animation changed to', animationId);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Selecciona una animación 3D del campo vectorial
      </p>

      <div className="grid gap-2">
        {ANIMATIONS_3D.map((animation) => {
          const Icon = animation.icon;
          const isSelected = selectedAnimation === animation.id;

          return (
            <Button
              key={animation.id}
              variant={isSelected ? 'default' : 'outline'}
              className="justify-start h-auto py-3 px-3"
              onClick={() => handleAnimationChange(animation.id)}
            >
              <div className="flex items-start gap-3 w-full">
                <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{animation.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {animation.description}
                  </div>
                </div>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Info box */}
      <div className="p-3 bg-muted/50 rounded-md">
        <p className="text-xs text-muted-foreground">
          Las animaciones 3D calculan direcciones de vectores en espacio tridimensional usando compute shaders.
        </p>
      </div>
    </div>
  );
}
