/**
 * RenderModeToggle - Toggle para cambiar entre modo 2D y 3D
 */

'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Box, Layers } from 'lucide-react';

interface RenderModeToggleProps {
  mode: '2D' | '3D';
  onChange: (mode: '2D' | '3D') => void;
  disabled?: boolean;
}

export function RenderModeToggle({ mode, onChange, disabled = false }: RenderModeToggleProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
        Modo de Render
      </label>
      <Tabs value={mode} onValueChange={(value) => onChange(value as '2D' | '3D')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="2D" className="flex items-center gap-2" disabled={disabled}>
            <Layers className="w-4 h-4" />
            2D
          </TabsTrigger>
          <TabsTrigger value="3D" className="flex items-center gap-2" disabled={disabled}>
            <Box className="w-4 h-4" />
            3D
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {disabled && (
        <p className="text-xs text-muted-foreground">
          Inicializando motor WebGPU...
        </p>
      )}
    </div>
  );
}
