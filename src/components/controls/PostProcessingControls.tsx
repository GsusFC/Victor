/**
 * PostProcessingControls - Controles para efectos de post-processing
 */

'use client';

import { useVectorStore, selectVisual, selectActions } from '@/store/vectorStore';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

export function PostProcessingControls() {
  const visual = useVectorStore(selectVisual);
  const actions = useVectorStore(selectActions);

  const pp = visual.postProcessing;

  const handleTogglePostProcessing = (enabled: boolean) => {
    actions.setPostProcessing({ enabled });
  };

  const handleToggleEffect = (effect: 'bloom' | 'chromaticAberration' | 'vignette', enabled: boolean) => {
    actions.setPostProcessing({
      [effect]: { ...pp[effect], enabled },
    });
  };

  const handleEffectParam = (
    effect: 'bloom' | 'chromaticAberration' | 'vignette',
    param: string,
    value: number
  ) => {
    actions.setPostProcessing({
      [effect]: { ...pp[effect], [param]: value },
    });
  };

  const handleToneParam = (param: 'exposure' | 'contrast' | 'saturation' | 'brightness', value: number) => {
    actions.setPostProcessing({ [param]: value });
  };

  const applyPreset = (preset: 'none' | 'cyberpunk' | 'vintage' | 'neon' | 'minimal') => {
    switch (preset) {
      case 'none':
        actions.setPostProcessing({ enabled: false });
        break;
      case 'cyberpunk':
        actions.setPostProcessing({
          enabled: true,
          bloom: { enabled: true, intensity: 0.8, threshold: 0.5, radius: 5 },
          chromaticAberration: { enabled: true, intensity: 0.7, offset: 0.015 },
          vignette: { enabled: true, intensity: 0.7, softness: 0.3 },
          exposure: 1.1,
          contrast: 1.3,
          saturation: 1.4,
          brightness: 0.95,
        });
        break;
      case 'vintage':
        actions.setPostProcessing({
          enabled: true,
          bloom: { enabled: false, intensity: 0.3, threshold: 0.8, radius: 2 },
          chromaticAberration: { enabled: true, intensity: 0.3, offset: 0.008 },
          vignette: { enabled: true, intensity: 0.8, softness: 0.6 },
          exposure: 0.9,
          contrast: 0.85,
          saturation: 0.7,
          brightness: 1.05,
        });
        break;
      case 'neon':
        actions.setPostProcessing({
          enabled: true,
          bloom: { enabled: true, intensity: 1.2, threshold: 0.4, radius: 8 },
          chromaticAberration: { enabled: false, intensity: 0.5, offset: 0.01 },
          vignette: { enabled: false, intensity: 0.6, softness: 0.4 },
          exposure: 1.3,
          contrast: 1.2,
          saturation: 1.6,
          brightness: 1.1,
        });
        break;
      case 'minimal':
        actions.setPostProcessing({
          enabled: true,
          bloom: { enabled: false, intensity: 0.5, threshold: 0.7, radius: 3 },
          chromaticAberration: { enabled: false, intensity: 0.5, offset: 0.01 },
          vignette: { enabled: false, intensity: 0.6, softness: 0.4 },
          exposure: 1.0,
          contrast: 1.05,
          saturation: 1.0,
          brightness: 1.0,
        });
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle principal */}
      <div className="flex items-center justify-between">
        <Label className="text-xs font-mono">Post-Processing</Label>
        <input
          type="checkbox"
          checked={pp.enabled}
          onChange={(e) => handleTogglePostProcessing(e.target.checked)}
          className="w-4 h-4 cursor-pointer"
        />
      </div>

      {pp.enabled && (
        <>
          {/* Presets rápidos */}
          <div className="space-y-2">
            <Label className="text-xs font-mono text-muted-foreground">Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => applyPreset('cyberpunk')}
                className="px-2 py-1 text-xs font-mono bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded"
              >
                Cyberpunk
              </button>
              <button
                onClick={() => applyPreset('vintage')}
                className="px-2 py-1 text-xs font-mono bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 rounded"
              >
                Vintage
              </button>
              <button
                onClick={() => applyPreset('neon')}
                className="px-2 py-1 text-xs font-mono bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/50 rounded"
              >
                Neon Dreams
              </button>
              <button
                onClick={() => applyPreset('minimal')}
                className="px-2 py-1 text-xs font-mono bg-slate-500/20 hover:bg-slate-500/30 border border-slate-500/50 rounded"
              >
                Minimal
              </button>
            </div>
          </div>

          <div className="border-t pt-3 space-y-4">
            {/* Bloom */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-mono">Bloom</Label>
                <input
                  type="checkbox"
                  checked={pp.bloom.enabled}
                  onChange={(e) => handleToggleEffect('bloom', e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
              </div>

              {pp.bloom.enabled && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-mono text-muted-foreground">Intensidad</Label>
                      <span className="text-xs font-mono">{pp.bloom.intensity.toFixed(2)}</span>
                    </div>
                    <Slider
                      min={0}
                      max={2}
                      step={0.1}
                      value={[pp.bloom.intensity]}
                      onValueChange={([v]) => handleEffectParam('bloom', 'intensity', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-mono text-muted-foreground">Threshold</Label>
                      <span className="text-xs font-mono">{pp.bloom.threshold.toFixed(2)}</span>
                    </div>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={[pp.bloom.threshold]}
                      onValueChange={([v]) => handleEffectParam('bloom', 'threshold', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-mono text-muted-foreground">Radio</Label>
                      <span className="text-xs font-mono">{pp.bloom.radius.toFixed(0)}</span>
                    </div>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[pp.bloom.radius]}
                      onValueChange={([v]) => handleEffectParam('bloom', 'radius', v)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Chromatic Aberration */}
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-mono">Chromatic Aberration</Label>
                <input
                  type="checkbox"
                  checked={pp.chromaticAberration.enabled}
                  onChange={(e) => handleToggleEffect('chromaticAberration', e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
              </div>

              {pp.chromaticAberration.enabled && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-mono text-muted-foreground">Intensidad</Label>
                      <span className="text-xs font-mono">{pp.chromaticAberration.intensity.toFixed(2)}</span>
                    </div>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={[pp.chromaticAberration.intensity]}
                      onValueChange={([v]) => handleEffectParam('chromaticAberration', 'intensity', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-mono text-muted-foreground">Offset</Label>
                      <span className="text-xs font-mono">{pp.chromaticAberration.offset.toFixed(3)}</span>
                    </div>
                    <Slider
                      min={0}
                      max={0.05}
                      step={0.001}
                      value={[pp.chromaticAberration.offset]}
                      onValueChange={([v]) => handleEffectParam('chromaticAberration', 'offset', v)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Vignette */}
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-mono">Vignette</Label>
                <input
                  type="checkbox"
                  checked={pp.vignette.enabled}
                  onChange={(e) => handleToggleEffect('vignette', e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
              </div>

              {pp.vignette.enabled && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-mono text-muted-foreground">Intensidad</Label>
                      <span className="text-xs font-mono">{pp.vignette.intensity.toFixed(2)}</span>
                    </div>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={[pp.vignette.intensity]}
                      onValueChange={([v]) => handleEffectParam('vignette', 'intensity', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-mono text-muted-foreground">Softness</Label>
                      <span className="text-xs font-mono">{pp.vignette.softness.toFixed(2)}</span>
                    </div>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={[pp.vignette.softness]}
                      onValueChange={([v]) => handleEffectParam('vignette', 'softness', v)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Tone Mapping & Color */}
            <div className="space-y-3 border-t pt-3">
              <Label className="text-xs font-mono">Tone Mapping</Label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono text-muted-foreground">Exposure</Label>
                  <span className="text-xs font-mono">{pp.exposure.toFixed(2)}</span>
                </div>
                <Slider
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={[pp.exposure]}
                  onValueChange={([v]) => handleToneParam('exposure', v)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono text-muted-foreground">Contraste</Label>
                  <span className="text-xs font-mono">{pp.contrast.toFixed(2)}</span>
                </div>
                <Slider
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={[pp.contrast]}
                  onValueChange={([v]) => handleToneParam('contrast', v)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono text-muted-foreground">Saturación</Label>
                  <span className="text-xs font-mono">{pp.saturation.toFixed(2)}</span>
                </div>
                <Slider
                  min={0}
                  max={2}
                  step={0.05}
                  value={[pp.saturation]}
                  onValueChange={([v]) => handleToneParam('saturation', v)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono text-muted-foreground">Brillo</Label>
                  <span className="text-xs font-mono">{pp.brightness.toFixed(2)}</span>
                </div>
                <Slider
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={[pp.brightness]}
                  onValueChange={([v]) => handleToneParam('brightness', v)}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
