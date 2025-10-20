/**
 * GradientEditorDialog - Modal para crear/editar gradientes personalizados
 * Reutiliza la lógica de edición de stops del antiguo GradientControls
 */

'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import {
  useVectorStore,
  selectVisual,
  selectActions,
  selectGradientLibrary,
  type GradientStop,
} from '@/store/vectorStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const MIN_STOPS = 2;
const MAX_STOPS = 6;

const makeStopId = () => `stop-${Math.random().toString(36).slice(2, 10)}`;

const buildGradientCSS = (type: 'linear' | 'radial', angle: number, stops: GradientStop[]): string => {
  if (!stops.length) {
    return 'linear-gradient(90deg, #ffffff 0%, #000000 100%)';
  }

  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  const stopsString = sortedStops
    .map((stop) => `${stop.color} ${(stop.position * 100).toFixed(0)}%`)
    .join(', ');

  return type === 'radial'
    ? `radial-gradient(circle, ${stopsString})`
    : `linear-gradient(${angle}deg, ${stopsString})`;
};

interface GradientEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GradientEditorDialog({ open, onOpenChange }: GradientEditorDialogProps) {
  const visual = useVectorStore(selectVisual);
  const actions = useVectorStore(selectActions);
  const gradientLibrary = useVectorStore(selectGradientLibrary);

  const gradient = visual.gradient;
  const [presetName, setPresetName] = useState('');

  // Trabajar con stops locales mientras se edita
  const [editingStops, setEditingStops] = useState<GradientStop[]>(gradient?.stops ?? [
    { id: makeStopId(), color: '#FFFFFF', position: 0 },
    { id: makeStopId(), color: '#00FFFF', position: 1 },
  ]);

  // Actualizar stops locales cuando cambia el gradiente activo
  useMemo(() => {
    if (gradient?.stops) {
      setEditingStops(gradient.stops);
    }
  }, [gradient?.stops]);

  const gradientCss = buildGradientCSS(gradient?.type ?? 'linear', gradient?.angle ?? 45, editingStops);

  const handleStopColorChange = (stopId: string, color: string) => {
    const nextStops = editingStops.map((stop) =>
      stop.id === stopId ? { ...stop, color: color.toUpperCase() } : stop
    );
    setEditingStops(nextStops);
  };

  const handleStopPositionChange = (stopId: string, positionPercent: number) => {
    const position = Math.min(1, Math.max(0, positionPercent / 100));
    const nextStops = editingStops.map((stop) =>
      stop.id === stopId ? { ...stop, position } : stop
    );
    setEditingStops(nextStops);
  };

  const handleAddStop = () => {
    if (editingStops.length >= MAX_STOPS) return;

    const midpoint = 0.5;
    const referenceStop = editingStops.reduce((closest, stop) =>
      Math.abs(stop.position - midpoint) < Math.abs(closest.position - midpoint) ? stop : closest
    );

    const newStop: GradientStop = {
      id: makeStopId(),
      color: referenceStop?.color ?? '#FFFFFF',
      position: midpoint,
    };

    setEditingStops([...editingStops, newStop]);
  };

  const handleRemoveStop = (stopId: string) => {
    if (editingStops.length <= MIN_STOPS) return;
    setEditingStops(editingStops.filter((stop) => stop.id !== stopId));
  };

  const handleSavePreset = () => {
    if (!gradient) return;

    const trimmedName = presetName.trim();
    const newPreset = actions.addCustomGradientPreset({
      name: trimmedName || `Gradiente ${gradientLibrary.customPresets.length + 1}`,
      type: gradient.type,
      angle: gradient.angle,
      stops: editingStops,
    });

    // Aplicar el nuevo preset
    actions.applyGradientPreset(newPreset);

    // Cerrar modal y limpiar
    setPresetName('');
    onOpenChange(false);
  };

  const canAddStop = editingStops.length < MAX_STOPS;
  const canSave = editingStops.length >= MIN_STOPS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Gradiente Personalizado</DialogTitle>
          <DialogDescription>
            Diseña tu gradiente ajustando colores y posiciones de los stops
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview */}
          <div
            className="relative h-20 w-full rounded-md border border-border overflow-hidden"
            style={{ backgroundImage: gradientCss }}
          />

          {/* Nombre del preset */}
          <div className="space-y-2">
            <Label htmlFor="preset-name" className="text-xs font-mono">
              Nombre del gradiente
            </Label>
            <Input
              id="preset-name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder={`Gradiente ${gradientLibrary.customPresets.length + 1}`}
              className="text-xs font-mono"
            />
          </div>

          {/* Stops editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-mono">Stops de Color</Label>
              <Badge variant="secondary" className="text-[10px] font-mono uppercase">
                {editingStops.length}/{MAX_STOPS}
              </Badge>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleAddStop}
              disabled={!canAddStop}
              className="h-8 w-full"
            >
              <Plus className="w-4 h-4 mr-1" /> Añadir stop
            </Button>

            <div className="space-y-2">
              {editingStops.map((stop) => (
                <div
                  key={stop.id}
                  className="rounded-md border border-border/60 bg-muted/20 p-3 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={stop.color}
                        onChange={(e) => handleStopColorChange(stop.id, e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <span className="text-xs font-mono uppercase text-muted-foreground w-16">
                        {stop.color}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">
                        {(stop.position * 100).toFixed(0)}%
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveStop(stop.id)}
                        disabled={editingStops.length <= MIN_STOPS}
                        className="h-8 w-8 text-muted-foreground"
                        title="Eliminar stop"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[Math.round(stop.position * 100)]}
                    onValueChange={([value]) => handleStopPositionChange(stop.id, value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSavePreset}
              disabled={!canSave}
              className="flex-1 gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
