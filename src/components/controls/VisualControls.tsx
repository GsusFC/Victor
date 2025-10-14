/**
 * VisualControls - Controles para apariencia visual
 */

'use client';

import { useVectorStore, selectVisual, selectActions } from '@/store/vectorStore';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { GradientControls } from './GradientControls';

export function VisualControls() {
  const visual = useVectorStore(selectVisual);
  const actions = useVectorStore(selectActions);

  return (
    <div className="space-y-4">
      <section className="space-y-4">
        <h3 className="font-semibold text-sm">Visual</h3>

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
      </section>

      <GradientControls />
    </div>
  );
}
