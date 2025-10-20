/**
 * VisualControls - Controles para apariencia visual
 */

'use client';

import { useVectorStore, selectVisual, selectActions } from '@/store/vectorStore';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { GradientGrid } from './GradientGrid';

export function VisualControls() {
  const visual = useVectorStore(selectVisual);
  const actions = useVectorStore(selectActions);

  return (
    <div className="space-y-4">
      <section className="space-y-4">
        {/* Modo de renderizado */}
        <div className="space-y-2">
          <Label htmlFor="render-mode" className="text-xs font-mono">
            Modo
          </Label>
          <Select value={visual.renderMode} onValueChange={(value) => actions.setVisual('renderMode', value as any)}>
            <SelectTrigger id="render-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vector">Vectores</SelectItem>
              <SelectItem value="particle">Partículas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Forma del vector */}
        <div className="space-y-2">
          <Label htmlFor="vector-shape" className="text-xs font-mono">
            Forma
          </Label>
          <Select value={visual.shape} onValueChange={(value) => actions.setVisual('shape', value as any)}>
            <SelectTrigger id="vector-shape">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Línea</SelectItem>
              <SelectItem value="triangle">Triángulo</SelectItem>
              <SelectItem value="arc">Arco</SelectItem>
              <SelectItem value="circle">Círculo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Longitud */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="vector-length" className="text-xs font-mono">
              Longitud
            </Label>
            <span className="text-xs font-mono text-muted-foreground">{visual.vectorLength}</span>
          </div>
          <Slider
            id="vector-length"
            min={0.5}
            max={1920}
            step={5}
            value={[visual.vectorLength]}
            onValueChange={([value]) => actions.setVisual('vectorLength', value)}
          />
        </div>

        {/* Grosor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="vector-width" className="text-xs font-mono">
              Grosor
            </Label>
            <span className="text-xs font-mono text-muted-foreground">{visual.vectorWidth}</span>
          </div>
          <Slider
            id="vector-width"
            min={0.5}
            max={10}
            step={0.5}
            value={[visual.vectorWidth]}
            onValueChange={([value]) => actions.setVisual('vectorWidth', value)}
          />
        </div>

        {/* Color base */}
        <div className="space-y-2">
          <Label htmlFor="vector-color" className="text-xs font-mono">
            Color base
          </Label>
          <div className="flex gap-2">
            <Input
              id="vector-color"
              type="color"
              value={visual.color}
              onChange={(e) => actions.setVisual('color', e.target.value)}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={visual.color}
              onChange={(e) => actions.setVisual('color', e.target.value)}
              className="flex-1 font-mono text-xs"
              placeholder="#FFFFFF"
            />
          </div>
        </div>

        {/* Gradientes */}
        <div className="space-y-3 pt-3 border-t">
          <Label className="text-xs font-mono">Gradientes</Label>
          <GradientGrid />
        </div>

        {/* Trails (Estelas) */}
        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-mono">Trails (Estelas)</Label>
            <input
              type="checkbox"
              checked={visual.trails.enabled}
              onChange={(e) => actions.setTrails({ enabled: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
            />
          </div>

          {visual.trails.enabled && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="trail-length" className="text-xs font-mono">
                    Longitud
                  </Label>
                  <span className="text-xs font-mono text-muted-foreground">{visual.trails.length}</span>
                </div>
                <Slider
                  id="trail-length"
                  min={2}
                  max={20}
                  step={1}
                  value={[visual.trails.length]}
                  onValueChange={([value]) => actions.setTrails({ length: value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="trail-opacity" className="text-xs font-mono">
                    Opacidad
                  </Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {Math.round(visual.trails.opacity * 100)}%
                  </span>
                </div>
                <Slider
                  id="trail-opacity"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={[visual.trails.opacity]}
                  onValueChange={([value]) => actions.setTrails({ opacity: value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trail-fade" className="text-xs font-mono">
                  Modo de desvanecimiento
                </Label>
                <Select
                  value={visual.trails.fadeMode}
                  onValueChange={(value: 'linear' | 'exponential') => actions.setTrails({ fadeMode: value })}
                >
                  <SelectTrigger id="trail-fade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">Lineal</SelectItem>
                    <SelectItem value="exponential">Exponencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
