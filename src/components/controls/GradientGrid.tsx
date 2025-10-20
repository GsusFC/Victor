/**
 * GradientGrid - Grid compacto de gradientes con acceso rápido
 * UI minimalista: solo cuadrados, sin texto ni información adicional
 */

'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  useVectorStore,
  selectVisual,
  selectActions,
  selectGradientLibrary,
  type GradientPreset,
} from '@/store/vectorStore';
import { BUILT_IN_GRADIENT_PRESETS } from '@/lib/gradient-presets';
import { GradientEditorDialog } from './GradientEditorDialog';

const buildGradientCSS = (preset: GradientPreset): string => {
  const sortedStops = [...preset.stops].sort((a, b) => a.position - b.position);
  const stopsString = sortedStops
    .map((stop) => `${stop.color} ${(stop.position * 100).toFixed(0)}%`)
    .join(', ');

  return preset.type === 'radial'
    ? `radial-gradient(circle, ${stopsString})`
    : `linear-gradient(${preset.angle}deg, ${stopsString})`;
};

export function GradientGrid() {
  const visual = useVectorStore(selectVisual);
  const actions = useVectorStore(selectActions);
  const gradientLibrary = useVectorStore(selectGradientLibrary);
  const [showEditor, setShowEditor] = useState(false);
  const [hoveredPresetId, setHoveredPresetId] = useState<string | null>(null);

  const allPresets = [...BUILT_IN_GRADIENT_PRESETS, ...gradientLibrary.customPresets];
  const activePresetId = visual.gradient?.presetId;

  const handleApplyPreset = (preset: GradientPreset) => {
    actions.applyGradientPreset(preset);
    // Auto-enable gradient cuando se selecciona
    if (!visual.gradient?.enabled) {
      actions.setGradient({ enabled: true });
    }
  };

  const handleDeleteCustomPreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevenir que se aplique el preset al hacer click en delete
    actions.removeCustomGradientPreset(presetId);

    // Si era el preset activo, desactivar gradiente
    if (activePresetId === presetId) {
      actions.setGradient({ enabled: false, presetId: null });
    }
  };

  const isCustomPreset = (presetId: string) => {
    return gradientLibrary.customPresets.some((p) => p.id === presetId);
  };

  return (
    <div className="space-y-2">
      {/* Grid de gradientes */}
      <div className="grid grid-cols-4 gap-2">
        {allPresets.map((preset) => {
          const isActive = activePresetId === preset.id;
          const isHovered = hoveredPresetId === preset.id;
          const isCustom = isCustomPreset(preset.id);

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              onMouseEnter={() => setHoveredPresetId(preset.id)}
              onMouseLeave={() => setHoveredPresetId(null)}
              className={`
                relative h-12 w-full rounded-md border-2 transition-all
                ${isActive
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-border/50 hover:border-primary/50'
                }
              `}
              style={{ backgroundImage: buildGradientCSS(preset) }}
              title={preset.name}
            >
              {/* Botón de eliminar (solo custom presets y solo en hover) */}
              {isCustom && isHovered && (
                <div
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive flex items-center justify-center cursor-pointer hover:bg-destructive/90 transition-colors"
                  onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
                >
                  <X className="w-3 h-3 text-destructive-foreground" />
                </div>
              )}
            </button>
          );
        })}

        {/* Botón "+" para crear nuevo gradiente */}
        <button
          type="button"
          onClick={() => setShowEditor(true)}
          className="
            h-12 w-full rounded-md border-2 border-dashed border-border/50
            hover:border-primary/50 hover:bg-muted/30
            flex items-center justify-center
            transition-all
          "
          title="Crear nuevo gradiente"
        >
          <Plus className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Dialog de edición */}
      <GradientEditorDialog
        open={showEditor}
        onOpenChange={setShowEditor}
      />
    </div>
  );
}
