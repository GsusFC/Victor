/**
 * AnimationPanel - Panel de control de animaciones
 */

'use client';

import { useVectorStore, selectAnimation, selectActions } from '@/store/vectorStore';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';

const animationOptions = [
  { value: 'none', label: 'Sin animación' },
  { value: 'static', label: 'Estático' },
  { value: 'staticAngle', label: 'Ángulo fijo' },
  { value: 'randomStatic', label: 'Ángulo aleatorio' },
  { value: 'randomLoop', label: 'Aleatorio cíclico' },
  { value: 'smoothWaves', label: 'Olas suaves' },
  { value: 'seaWaves', label: 'Olas de mar' },
  { value: 'perlinFlow', label: 'Flujo Perlin' },
  { value: 'mouseInteraction', label: 'Interacción mouse' },
  { value: 'centerPulse', label: 'Pulso radial' },
  { value: 'heartbeat', label: 'Latido' },
  { value: 'directionalFlow', label: 'Flujo direccional' },
  { value: 'tangenteClasica', label: 'Tangente clásica' },
  { value: 'lissajous', label: 'Lissajous' },
  { value: 'geometricPattern', label: 'Patrón geométrico' },
  { value: 'flocking', label: 'Flocking' },
  { value: 'vortex', label: 'Vórtice' },
  { value: 'helicalCurl', label: 'Curl helicoidal' },
] as const;

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

  const handleParamChange = (param: 'frequency' | 'amplitude' | 'elasticity' | 'maxLength', value: number) => {
    actions.setAnimationParam(param, value);
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

      <div className="space-y-2">
        <Label htmlFor="animation-type" className="text-xs font-mono">
          Tipo
        </Label>
        <Select value={animation.type} onValueChange={(value) => actions.setAnimationType(value as any)}>
          <SelectTrigger id="animation-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {animationOptions.map((option) => (
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

      {animation.type === 'staticAngle' && (
        <ParamSlider
          config={{ label: 'Ángulo', param: 'frequency', min: -180, max: 180, step: 1, suffix: '°', formatter: (v) => v.toFixed(0) }}
          value={animation.params.frequency}
          onChange={handleParamChange}
        />
      )}

      {animation.type === 'randomStatic' && (
        <>
          <ParamSlider
            config={{ label: 'Escala ruido', param: 'frequency', min: 0.1, max: 2, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Rango angular', param: 'amplitude', min: 0, max: 360, step: 5, suffix: '°', formatter: (v) => v.toFixed(0) }}
            value={animation.params.amplitude}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Variación longitud', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter }}
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

      {animation.type === 'randomLoop' && (
        <>
          <ParamSlider
            config={{ label: 'Intervalo (s)', param: 'frequency', min: 0.2, max: 6, step: 0.1, formatter: defaultFormatter }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Rango angular', param: 'amplitude', min: 0, max: 360, step: 5, suffix: '°', formatter: (v) => v.toFixed(0) }}
            value={animation.params.amplitude}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Suavizado', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter }}
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

      {animation.type === 'perlinFlow' && (
        <>
          <ParamSlider
            config={{ label: 'Escala ruido', param: 'frequency', min: 0.005, max: 0.08, step: 0.001, formatter: defaultFormatter }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Intensidad', param: 'amplitude', min: 5, max: 80, step: 5, formatter: (v) => v.toFixed(0) }}
            value={animation.params.amplitude}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Elasticidad', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.elasticity}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Longitud máx.', param: 'maxLength', min: 40, max: 220, step: 5, suffix: ' px', formatter: (v) => v.toFixed(0) }}
            value={animation.params.maxLength}
            onChange={handleParamChange}
          />
        </>
      )}

      {animation.type === 'mouseInteraction' && (
        <>
          <ParamSlider
            config={{ label: 'Radio (px)', param: 'frequency', min: 20, max: 400, step: 5, formatter: (v) => v.toFixed(0) }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Intensidad', param: 'amplitude', min: 10, max: 200, step: 5, formatter: (v) => v.toFixed(0) }}
            value={animation.params.amplitude}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Mezcla tangencial', param: 'elasticity', min: 0, max: 1, step: 0.05, formatter: defaultFormatter }}
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

      {animation.type === 'centerPulse' && (
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

      {animation.type === 'heartbeat' && (
        <>
          <ParamSlider
            config={{ label: 'Frecuencia latido', param: 'frequency', min: 0.005, max: 0.04, step: 0.001, formatter: defaultFormatter }}
            value={animation.params.frequency}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Intensidad', param: 'amplitude', min: 10, max: 80, step: 5, formatter: (v) => v.toFixed(0) }}
            value={animation.params.amplitude}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Efecto distancia', param: 'elasticity', min: 0, max: 1.5, step: 0.05, formatter: defaultFormatter }}
            value={animation.params.elasticity}
            onChange={handleParamChange}
          />
          <ParamSlider
            config={{ label: 'Longitud máx.', param: 'maxLength', min: 40, max: 240, step: 5, suffix: ' px', formatter: (v) => v.toFixed(0) }}
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

      {animation.type === 'helicalCurl' && (
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

      <div className="text-xs text-muted-foreground font-mono pt-2 border-t flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${animation.paused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`} />
        {animation.paused ? 'Pausado' : 'Activo'}
      </div>
    </section>
  );
}
