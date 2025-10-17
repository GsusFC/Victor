/**
 * AnimationPanel - Panel de control de animaciones con categorías
 */

'use client';

import { useVectorStore, selectAnimation, selectActions, getAnimationCategory, type AnimationCategory } from '@/store/vectorStore';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Pause, Shuffle, Copy, Check } from 'lucide-react';
import { useState } from 'react';

// Categorías de animaciones
const categoryLabels: Record<AnimationCategory, string> = {
  natural: 'Naturales/Fluidas',
  energetic: 'Energéticas',
  geometric: 'Geométricas',
  experimental: 'Experimental',
};

// Animaciones organizadas por categoría
const animationsByCategory: Record<AnimationCategory, Array<{ value: string; label: string }>> = {
  experimental: [
    { value: 'none', label: 'Sin animación' },
  ],
  natural: [
    { value: 'smoothWaves', label: 'Olas suaves' },
    { value: 'seaWaves', label: 'Olas de mar' },
    { value: 'breathingSoft', label: 'Respiración suave' },
    { value: 'flocking', label: 'Flocking' },
  ],
  energetic: [
    { value: 'electricPulse', label: 'Pulso eléctrico' },
    { value: 'vortex', label: 'Vórtice' },
    { value: 'directionalFlow', label: 'Flujo direccional' },
    { value: 'storm', label: 'Tormenta' },
    { value: 'solarFlare', label: 'Explosión solar' },
    { value: 'radiation', label: 'Radiación' },
  ],
  geometric: [
    { value: 'tangenteClasica', label: 'Tangente clásica' },
    { value: 'lissajous', label: 'Lissajous' },
    { value: 'geometricPattern', label: 'Patrón geométrico' },
  ],
};

type SliderConfig = {
  label: string;
  param: 'frequency' | 'amplitude' | 'elasticity' | 'maxLength';
  min: number;
  max: number;
  step: number;
  suffix?: string;
  formatter?: (value: number) => string;
};

const defaultFormatter = (value: number) => value.toFixed(2);

function ParamSlider({
  config,
  value,
  onChange,
}: {
  config: SliderConfig;
  value: number | undefined;
  onChange: (param: SliderConfig['param'], value: number) => void;
}) {
  const display = config.formatter ? config.formatter(value ?? 0) : defaultFormatter(value ?? 0);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-mono">{config.label}</Label>
        <span className="text-xs font-mono text-muted-foreground">
          {display}
          {config.suffix ?? ''}
        </span>
      </div>
      <Slider
        min={config.min}
        max={config.max}
        step={config.step}
        value={[value ?? config.min]}
        onValueChange={([val]) => onChange(config.param, val)}
      />
    </div>
  );
}

export function AnimationPanel() {
  const animation = useVectorStore(selectAnimation);
  const actions = useVectorStore(selectActions);
  const [copiedSeed, setCopiedSeed] = useState(false);

  const currentCategory = getAnimationCategory(animation.type);
  const availableAnimations = animationsByCategory[currentCategory] || [];

  const handleCategoryChange = (category: AnimationCategory) => {
    // Al cambiar de categoría, seleccionar la primera animación de esa categoría
    const firstAnimation = animationsByCategory[category]?.[0]?.value;
    if (firstAnimation) {
      actions.setAnimationType(firstAnimation as any);
    }
  };

  const handleParamChange = (param: 'frequency' | 'amplitude' | 'elasticity' | 'maxLength', value: number) => {
    actions.setAnimationParam(param, value);
  };

  const handleCopySeed = async () => {
    try {
      await navigator.clipboard.writeText(animation.seed.toString());
      setCopiedSeed(true);
      setTimeout(() => setCopiedSeed(false), 2000);
    } catch (err) {
      console.error('Error copying seed:', err);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Animación</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => actions.togglePause()}
          className="h-8 w-8 p-0"
        >
          {animation.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </Button>
      </div>

      {/* Selector de categoría */}
      <div className="space-y-2">
        <Label htmlFor="animation-category" className="text-xs font-mono">
          Categoría
        </Label>
        <Select value={currentCategory} onValueChange={(value) => handleCategoryChange(value as AnimationCategory)}>
          <SelectTrigger id="animation-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(categoryLabels) as AnimationCategory[]).map((category) => (
              <SelectItem key={category} value={category}>
                {categoryLabels[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selector de animación dentro de la categoría */}
      <div className="space-y-2">
        <Label htmlFor="animation-type" className="text-xs font-mono">
          Tipo
        </Label>
        <Select value={animation.type} onValueChange={(value) => actions.setAnimationType(value as any)}>
          <SelectTrigger id="animation-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableAnimations.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="animation-speed" className="text-xs font-mono">
            Velocidad
          </Label>
          <span className="text-xs font-mono text-muted-foreground">{animation.speed.toFixed(1)}x</span>
        </div>
        <Slider
          id="animation-speed"
          min={0.1}
          max={5}
          step={0.1}
          value={[animation.speed]}
          onValueChange={([value]) => actions.setAnimation({ speed: value })}
        />
      </div>

      {/* Control de Seed */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center justify-between">
          <Label htmlFor="animation-seed" className="text-xs font-mono">
            Seed (Reproducibilidad)
          </Label>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopySeed}
              className="h-6 w-6 p-0"
              title="Copiar seed"
            >
              {copiedSeed ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => actions.generateNewSeed()}
              className="h-6 w-6 p-0"
              title="Generar nueva seed"
            >
              <Shuffle className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            id="animation-seed"
            type="number"
            value={animation.seed}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!isNaN(value)) {
                actions.setSeed(value);
              }
            }}
            className="font-mono text-xs h-8"
            placeholder="123456"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            id="auto-seed"
            checked={animation.autoSeed}
            onChange={() => actions.toggleAutoSeed()}
            className="w-3 h-3 cursor-pointer"
          />
          <label htmlFor="auto-seed" className="cursor-pointer font-mono">
            Auto-seed (nueva al cambiar animación)
          </label>
        </div>
      </div>

      {/* Controles específicos por animación */}
      {animation.type === 'smoothWaves' && (
        <>
          <ParamSlider
            config={{ label: 'Frecuencia', param: 'frequency', min: 0.001, max: 0.1, step: 0.001, formatter: defaultFormatter }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Amplitud', param: 'amplitude', min: 5, max: 100, step: 5, suffix: '°', formatter: (v) => v.toFixed(0) }}
            value={animation.params.amplitude}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Elasticidad', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.elasticity}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Longitud máx.', param: 'maxLength', min: 20, max: 220, step: 5, suffix: ' px', formatter: (v) => v.toFixed(0) }}
            value={animation.params.maxLength}
            onChange={handleParamChange}
          />
        </>
      )}

      {animation.type === 'seaWaves' && (
        <>
          <ParamSlider
            config={{ label: 'Frecuencia base', param: 'frequency', min: 0.001, max: 0.05, step: 0.001, formatter: defaultFormatter }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Amplitud', param: 'amplitude', min: 10, max: 80, step: 5, suffix: '°', formatter: (v) => v.toFixed(0) }}
            value={animation.params.amplitude}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Elasticidad', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.elasticity}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Longitud máx.', param: 'maxLength', min: 40, max: 260, step: 5, suffix: ' px', formatter: (v) => v.toFixed(0) }}
            value={animation.params.maxLength}
            onChange={handleParamChange}
          />
        </>
      )}

      {animation.type === 'breathingSoft' && (
        <>
          <ParamSlider
            config={{ label: 'Frecuencia giro', param: 'frequency', min: 0.1, max: 3, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Pitch helicoidal', param: 'amplitude', min: 0, max: 180, step: 5, suffix: '°', formatter: (v) => v.toFixed(0) }}
            value={animation.params.amplitude}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Mezcla axial', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.elasticity}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Longitud máx.', param: 'maxLength', min: 40, max: 300, step: 5, suffix: ' px', formatter: (v) => v.toFixed(0) }}
            value={animation.params.maxLength}
            onChange={handleParamChange}
          />
        </>
      )}

      {animation.type === 'flocking' && (
        <>
          <ParamSlider
            config={{ label: 'Radio percepción', param: 'frequency', min: 0.02, max: 0.5, step: 0.01, formatter: defaultFormatter }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Alineación', param: 'amplitude', min: 0, max: 2, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.amplitude}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Cohesión', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.elasticity}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Longitud máx.', param: 'maxLength', min: 20, max: 220, step: 5, suffix: ' px', formatter: (v) => v.toFixed(0) }}
            value={animation.params.maxLength}
            onChange={handleParamChange}
          />
        </>
      )}

      {animation.type === 'electricPulse' && (
        <>
          <ParamSlider
            config={{ label: 'Velocidad pulso', param: 'frequency', min: 0.005, max: 0.05, step: 0.001, formatter: defaultFormatter }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Intensidad', param: 'amplitude', min: 5, max: 60, step: 5, formatter: (v) => v.toFixed(0) }}
            value={animation.params.amplitude}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Elasticidad', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.elasticity}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Longitud máx.', param: 'maxLength', min: 40, max: 260, step: 5, suffix: ' px', formatter: (v) => v.toFixed(0) }}
            value={animation.params.maxLength}
            onChange={handleParamChange}
          />
        </>
      )}

      {animation.type === 'vortex' && (
        <>
          <ParamSlider
            config={{ label: 'Intensidad remolino', param: 'frequency', min: 0, max: 3, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Atracción centro', param: 'amplitude', min: 0, max: 1, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.amplitude}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Caída radial', param: 'elasticity', min: 0.1, max: 3, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.elasticity}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Longitud máx.', param: 'maxLength', min: 40, max: 280, step: 5, suffix: ' px', formatter: (v) => v.toFixed(0) }}
            value={animation.params.maxLength}
            onChange={handleParamChange}
          />
        </>
      )}

      {animation.type === 'directionalFlow' && (
        <>
          <ParamSlider
            config={{ label: 'Ángulo base', param: 'frequency', min: 0, max: 360, step: 1, suffix: '°', formatter: (v) => v.toFixed(0) }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Turbulencia', param: 'amplitude', min: 0, max: 90, step: 1, suffix: '°', formatter: (v) => v.toFixed(0) }}
            value={animation.params.amplitude}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Mezcla ruido', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.elasticity}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Longitud máx.', param: 'maxLength', min: 20, max: 260, step: 5, suffix: ' px', formatter: (v) => v.toFixed(0) }}
            value={animation.params.maxLength}
            onChange={handleParamChange}
          />
        </>
      )}

      {animation.type === 'storm' && (
        <>
          <ParamSlider
            config={{ label: 'Caos', param: 'frequency', min: 0.1, max: 3, step: 0.1, formatter: defaultFormatter }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Vorticidad', param: 'amplitude', min: 0, max: 2, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.amplitude}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Velocidad pulsos', param: 'elasticity', min: 0.1, max: 3, step: 0.1, formatter: defaultFormatter }}
            value={animation.params.elasticity}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Longitud máx.', param: 'maxLength', min: 40, max: 280, step: 5, suffix: ' px', formatter: (v) => v.toFixed(0) }}
            value={animation.params.maxLength}
            onChange={handleParamChange}
          />
        </>
      )}

      {animation.type === 'solarFlare' && (
        <>
          <ParamSlider
            config={{ label: 'Intensidad eyecciones', param: 'frequency', min: 0.5, max: 3, step: 0.1, formatter: defaultFormatter }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Rotación solar', param: 'amplitude', min: -2, max: 2, step: 0.1, formatter: defaultFormatter }}
            value={animation.params.amplitude}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Ángulo apertura', param: 'elasticity', min: 0, max: 90, step: 5, suffix: '°', formatter: (v) => v.toFixed(0) }}
            value={animation.params.elasticity}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Longitud máx.', param: 'maxLength', min: 40, max: 300, step: 5, suffix: ' px', formatter: (v) => v.toFixed(0) }}
            value={animation.params.maxLength}
            onChange={handleParamChange}
          />
        </>
      )}

      {animation.type === 'radiation' && (
        <>
          <ParamSlider
            config={{ label: 'Velocidad ondas', param: 'frequency', min: 0.1, max: 3, step: 0.1, formatter: defaultFormatter }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Número fuentes', param: 'amplitude', min: 1, max: 8, step: 1, formatter: (v) => v.toFixed(0) }}
            value={animation.params.amplitude}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Interferencia', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.elasticity}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Longitud máx.', param: 'maxLength', min: 40, max: 280, step: 5, suffix: ' px', formatter: (v) => v.toFixed(0) }}
            value={animation.params.maxLength}
            onChange={handleParamChange}
          />
        </>
      )}

      {animation.type === 'tangenteClasica' && (
        <>
          <ParamSlider
            config={{ label: 'Velocidad rotación', param: 'frequency', min: 0, max: 2, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <div className="space-y-2">
            <Label className="text-xs font-mono">Dirección</Label>
            <Select
              value={(animation.params.amplitude ?? 1) >= 0 ? 'clockwise' : 'counter'}
              onValueChange={(value) => actions.setAnimationParam('amplitude', value === 'clockwise' ? 1 : -1)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clockwise">Horario</SelectItem>
                <SelectItem value="counter">Antihorario</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ParamSlider
            config={{ label: 'Mezcla radial', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.elasticity}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Longitud máx.', param: 'maxLength', min: 40, max: 260, step: 5, suffix: ' px', formatter: (v) => v.toFixed(0) }}
            value={animation.params.maxLength}
            onChange={handleParamChange}
          />
        </>
      )}

      {animation.type === 'lissajous' && (
        <>
          <ParamSlider
            config={{ label: 'Frecuencia X', param: 'frequency', min: 0.5, max: 8, step: 0.1, formatter: defaultFormatter }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Frecuencia Y', param: 'amplitude', min: 0.5, max: 8, step: 0.1, formatter: defaultFormatter }}
            value={animation.params.amplitude}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Amplitud', param: 'elasticity', min: 10, max: 180, step: 5, suffix: '°', formatter: (v) => v.toFixed(0) }}
            value={animation.params.elasticity}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Longitud máx.', param: 'maxLength', min: 20, max: 220, step: 5, suffix: ' px', formatter: (v) => v.toFixed(0) }}
            value={animation.params.maxLength}
            onChange={handleParamChange}
          />
        </>
      )}

      {animation.type === 'geometricPattern' && (
        <>
          <ParamSlider
            config={{ label: 'Frecuencia patrón', param: 'frequency', min: 0.5, max: 10, step: 0.1, formatter: defaultFormatter }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Torsión', param: 'amplitude', min: 0, max: 180, step: 5, suffix: '°', formatter: (v) => v.toFixed(0) }}
            value={animation.params.amplitude}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Mezcla radial', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.elasticity}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Longitud máx.', param: 'maxLength', min: 20, max: 200, step: 5, suffix: ' px', formatter: (v) => v.toFixed(0) }}
            value={animation.params.maxLength}
            onChange={handleParamChange}
          />
        </>
      )}

      <div className="text-xs text-muted-foreground font-mono pt-2 border-t flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${animation.paused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`} />
        {animation.paused ? 'Pausado' : 'Activo'}
      </div>
    </section>
  );
}
