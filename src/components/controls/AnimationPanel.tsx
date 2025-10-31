/**
 * AnimationPanel - Panel de control de animaciones con categorías
 */

'use client';

import { useVectorStore, selectAnimation, selectActions, getAnimationCategory, type AnimationCategory } from '@/store/vectorStore';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSliderConfigs, type SliderConfig } from '@/data/animation-slider-configs';

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
    { value: 'springMesh', label: 'Malla de resortes' },
  ],
  natural: [
    { value: 'smoothWaves', label: 'Olas suaves' },
    { value: 'seaWaves', label: 'Olas de mar' },
    { value: 'breathingSoft', label: 'Respiración suave' },
    { value: 'flowField', label: 'Campo de flujo' },
    { value: 'dnaHelix', label: 'DNA Helix' },
    { value: 'rippleEffect', label: 'Ondas Expansivas' },
    { value: 'organicGrowth', label: 'Crecimiento Orgánico' },
    { value: 'fluidDynamics', label: 'Dinámica de Fluidos' },
    { value: 'aurora', label: 'Aurora Boreal' },
  ],
  energetic: [
    { value: 'electricPulse', label: 'Pulso eléctrico' },
    { value: 'vortex', label: 'Vórtice' },
    { value: 'directionalFlow', label: 'Flujo direccional' },
    { value: 'storm', label: 'Tormenta' },
    { value: 'solarFlare', label: 'Explosión solar' },
    { value: 'radiation', label: 'Radiación' },
    { value: 'magneticField', label: 'Campo magnético' },
    { value: 'chaosAttractor', label: 'Atractor caótico' },
    { value: 'plasmaBall', label: 'Bola de Plasma' },
    { value: 'blackHole', label: 'Agujero Negro' },
    { value: 'lightningStorm', label: 'Tormenta de Rayos' },
    { value: 'quantumField', label: 'Campo Cuántico' },
  ],
  geometric: [
    { value: 'tangenteClasica', label: 'Tangente clásica' },
    { value: 'lissajous', label: 'Lissajous' },
    { value: 'geometricPattern', label: 'Patrón geométrico' },
    { value: 'harmonicOscillator', label: 'Oscilador armónico' },
    { value: 'spirograph', label: 'Espirógrafo' },
    { value: 'fibonacci', label: 'Espiral Fibonacci' },
    { value: 'voronoiDiagram', label: 'Diagrama Voronoi' },
    { value: 'mandalas', label: 'Mandalas' },
    { value: 'kaleidoscope', label: 'Caleidoscopio' },
  ],
};

function ParamSlider({
  config,
  value,
  onChange,
}: {
  config: SliderConfig;
  value: number | undefined;
  onChange: (param: SliderConfig['param'], value: number) => void;
}) {
  const defaultFormatter = (value: number) => value.toFixed(2);
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

  return (
    <section className="space-y-4">
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

      {/* Control de Seed - DEPRECADO TEMPORALMENTE */}
      {/* <div className="space-y-2 pt-2 border-t">
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
      </div> */}

      {/* Controles específicos por animación */}

      {/* Caso especial: tangenteClasica tiene un Select para dirección */}
      {animation.type === 'tangenteClasica' && (
        <>
          {getSliderConfigs('tangenteClasica')?.filter(c => c.param !== 'amplitude').map((config) => (
            <ParamSlider
              key={config.param}
              config={config}
              value={animation.params[config.param]}
              onChange={handleParamChange}
            />
          ))}
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
        </>
      )}

      {/* Todas las demás animaciones usan sliders estándar */}
      {animation.type !== 'tangenteClasica' && animation.type !== 'none' && getSliderConfigs(animation.type)?.map((config) => (
        <ParamSlider
          key={config.param}
          config={config}
          value={animation.params[config.param]}
          onChange={handleParamChange}
        />
      ))}


      <div className="text-xs text-muted-foreground font-mono pt-2 border-t flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${animation.paused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`} />
        {animation.paused ? 'Pausado' : 'Activo'}
      </div>
    </section>
  );
}
