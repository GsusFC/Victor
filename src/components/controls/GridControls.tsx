/**
 * GridControls - Controles para configuración del grid
 */

'use client';

import { useVectorStore, selectGrid, selectActions } from '@/store/vectorStore';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

export function GridControls() {
  const grid = useVectorStore(selectGrid);
  const actions = useVectorStore(selectActions);

  return (
    <section className="space-y-4">
      <h3 className="font-semibold text-sm">Grid</h3>

      {/* Filas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="grid-rows" className="text-xs font-mono">
            Filas
          </Label>
          <span className="text-xs font-mono text-muted-foreground">{grid.rows}</span>
        </div>
        <Slider
          id="grid-rows"
          min={5}
          max={120}
          step={1}
          value={[grid.rows]}
          onValueChange={([value]) => actions.setGrid({ rows: value })}
        />
      </div>

      {/* Columnas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="grid-cols" className="text-xs font-mono">
            Columnas
          </Label>
          <span className="text-xs font-mono text-muted-foreground">{grid.cols}</span>
        </div>
        <Slider
          id="grid-cols"
          min={5}
          max={120}
          step={1}
          value={[grid.cols]}
          onValueChange={([value]) => actions.setGrid({ cols: value })}
        />
      </div>

      {/* Espaciado (solo si mode es 'fixed') */}
      {grid.mode === 'fixed' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="grid-spacing" className="text-xs font-mono">
              Espaciado
            </Label>
            <span className="text-xs font-mono text-muted-foreground">{grid.spacing}</span>
          </div>
          <Slider
            id="grid-spacing"
            min={10}
            max={100}
            step={5}
            value={[grid.spacing]}
            onValueChange={([value]) => actions.setGrid({ spacing: value })}
          />
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground font-mono pt-2 border-t">
        Total: {grid.rows * grid.cols} vectores
      </div>
    </section>
  );
}
