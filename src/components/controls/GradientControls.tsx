/**
 * GradientControls - Editor avanzado de gradientes multi-stop con presets
 */

'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, Save, Palette } from 'lucide-react';
import {
  useVectorStore,
  selectVisual,
  selectActions,
  selectGradientLibrary,
  type GradientPreset,
  type GradientStop,
} from '@/store/vectorStore';
import { BUILT_IN_GRADIENT_PRESETS } from '@/lib/gradient-presets';
import { normalizeAngle } from '@/lib/math-utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
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

export function GradientControls() {
  const visual = useVectorStore(selectVisual);
  const actions = useVectorStore(selectActions);
  const gradientLibrary = useVectorStore(selectGradientLibrary);

  const gradient = visual.gradient;
  const stops = useMemo(() => gradient?.stops ?? [], [gradient?.stops]);

  const [presetName, setPresetName] = useState('');

  const gradientCss = useMemo(
    () => buildGradientCSS(gradient?.type ?? 'linear', gradient?.angle ?? 45, stops),
    [gradient?.type, gradient?.angle, stops]
  );

  const handleStopColorChange = (stopId: string, color: string) => {
    const nextStops = stops.map((stop) => (stop.id === stopId ? { ...stop, color: color.toUpperCase() } : stop));
    actions.setGradientStops(nextStops);
  };

  const handleStopPositionChange = (stopId: string, positionPercent: number) => {
    const position = Math.min(1, Math.max(0, positionPercent / 100));
    const nextStops = stops.map((stop) => (stop.id === stopId ? { ...stop, position } : stop));
    actions.setGradientStops(nextStops);
  };

  const handleAddStop = () => {
    if (stops.length >= MAX_STOPS) return;

    const midpoint = 0.5;
    const referenceStop = stops.reduce((closest, stop) =>
      Math.abs(stop.position - midpoint) < Math.abs(closest.position - midpoint) ? stop : closest
    );

    const newStop: GradientStop = {
      id: makeStopId(),
      color: referenceStop?.color ?? '#FFFFFF',
      position: midpoint,
    };

    actions.setGradientStops([...stops, newStop]);
  };

  const handleRemoveStop = (stopId: string) => {
    if (stops.length <= MIN_STOPS) return;
    actions.setGradientStops(stops.filter((stop) => stop.id !== stopId));
  };

  const handleApplyPreset = (preset: GradientPreset) => {
    actions.applyGradientPreset(preset);
  };

  const handleSavePreset = () => {
    if (!gradient) return;

    const trimmedName = presetName.trim();
    const newPreset = actions.addCustomGradientPreset({
      name: trimmedName || `Gradiente ${gradientLibrary.customPresets.length + 1}`,
      type: gradient.type,
      angle: gradient.angle,
      stops: gradient.stops,
    });

    actions.setGradient({ presetId: newPreset.id, name: newPreset.name });
    setPresetName('');
  };

  const handleRemovePreset = (preset: GradientPreset) => {
    actions.removeCustomGradientPreset(preset.id);
    if (gradient?.presetId === preset.id) {
      actions.setGradient({ presetId: null, name: undefined });
    }
  };

  const isGradientEnabled = gradient?.enabled ?? false;
  const canAddStop = stops.length < MAX_STOPS;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Gradiente</h3>
        </div>
        <label className="flex items-center gap-2 text-xs font-mono">
          <span>{isGradientEnabled ? 'Activo' : 'Inactivo'}</span>
          <input
            type="checkbox"
            checked={isGradientEnabled}
            onChange={(e) => actions.setGradient({ enabled: e.target.checked })}
            className="cursor-pointer"
          />
        </label>
      </div>

      <div
        className="relative h-16 w-full rounded-md border border-border overflow-hidden"
        style={{ backgroundImage: gradientCss }}
      >
        {!isGradientEnabled && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center text-xs font-mono text-muted-foreground">
            Gradiente desactivado
          </div>
        )}
      </div>

      {isGradientEnabled && (
        <div className="space-y-4">
          {/* Controles Tipo/Aplicación/Ángulo ocultos - solo útiles para Fase 2 (Campo completo) */}

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-mono">Stops</Label>
                <Badge variant="secondary" className="text-[10px] font-mono uppercase">
                  {stops.length}/{MAX_STOPS}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddStop}
                disabled={!canAddStop}
                className="h-8 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-1" /> Añadir stop
              </Button>
            </div>

            <div className="space-y-2">
              {stops.map((stop) => (
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
                      <span className="text-xs font-mono uppercase text-muted-foreground">{stop.color}</span>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {(stop.position * 100).toFixed(0)}%
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveStop(stop.id)}
                        disabled={stops.length <= MIN_STOPS}
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

          <CollapsibleCard
            title="Presets recomendados"
            defaultExpanded={false}
            contentClassName="space-y-2"
          >
            {BUILT_IN_GRADIENT_PRESETS.map((preset) => {
              const presetCss = buildGradientCSS(preset.type, preset.angle, preset.stops);
              const isActive = gradient?.presetId === preset.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`group flex w-full items-center gap-3 rounded-md border bg-muted/20 p-2 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                    isActive ? 'border-primary/60 ring-2 ring-primary/30' : 'border-border/50'
                  }`}
                >
                  <div
                    className="h-8 w-10 flex-shrink-0 rounded-sm border border-border/50"
                    style={{ backgroundImage: presetCss }}
                  />
                  <div className="flex-1 text-left">
                    <p className="text-xs font-semibold text-foreground truncate">{preset.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {preset.type === 'linear' ? `${normalizeAngle(preset.angle)}°` : 'Radial'} · {preset.stops.length} stops
                    </p>
                  </div>
                </button>
              );
            })}
          </CollapsibleCard>

          <CollapsibleCard
            title="Tus gradientes"
            defaultExpanded={false}
            contentClassName="space-y-2"
          >
            <div className="space-y-2">
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Nombre del gradiente"
                className="text-xs font-mono w-full"
              />
              <Button
                size="sm"
                onClick={handleSavePreset}
                disabled={!stops.length || stops.length < MIN_STOPS}
                className="h-8 w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-1" /> Guardar
              </Button>
            </div>

            {gradientLibrary.customPresets.length > 0 ? (
              <div className="space-y-2">
                {gradientLibrary.customPresets.map((preset) => {
                  const presetCss = buildGradientCSS(preset.type, preset.angle, preset.stops);
                  const isActive = gradient?.presetId === preset.id;

                  return (
                    <div
                      key={preset.id}
                      className={`flex items-center gap-3 rounded-md border p-2 ${
                        isActive ? 'border-primary/60 bg-primary/5' : 'border-border/50'
                      }`}
                    >
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-3 text-left"
                        onClick={() => handleApplyPreset(preset)}
                      >
                        <div
                          className="h-12 w-14 flex-shrink-0 rounded-sm border border-border/50"
                          style={{ backgroundImage: presetCss }}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold">{preset.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {preset.type === 'linear' ? `${normalizeAngle(preset.angle)}°` : 'Radial'} · {preset.stops.length} stops
                          </span>
                        </div>
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemovePreset(preset)}
                        className="h-8 w-8 text-muted-foreground"
                        title="Eliminar gradiente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-mono">
                Aún no tienes gradientes guardados. Diseña uno y pulsa «Guardar».
              </p>
            )}
          </CollapsibleCard>
        </div>
      )}
    </section>
  );
}

export default GradientControls;
