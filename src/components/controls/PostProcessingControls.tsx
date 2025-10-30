/**
 * PostProcessingControls - Controles para efectos de post-processing
 */

'use client';

import { useVectorStore, selectVisual, selectActions } from '@/store/vectorStore';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EffectCard } from './EffectCard';

export function PostProcessingControls() {
  const visual = useVectorStore(selectVisual);
  const actions = useVectorStore(selectActions);

  const pp = visual.postProcessing;

  // Safety check for backward compatibility
  if (!pp.advancedBloom) {
    return null;
  }

  const handleTogglePostProcessing = (enabled: boolean) => {
    actions.setPostProcessing({ enabled });
  };

  const handleBloomToggle = (enabled: boolean) => {
    actions.setPostProcessing({
      advancedBloom: { ...pp.advancedBloom, enabled },
    } as any);
  };

  const handleBloomParam = (param: string, value: number) => {
    actions.setPostProcessing({
      advancedBloom: { ...pp.advancedBloom, [param]: value },
    } as any);
  };

  const handleBloomQuality = (quality: 5 | 9 | 13) => {
    actions.setPostProcessing({
      advancedBloom: { ...pp.advancedBloom, quality },
    } as any);
  };

  const handleChromaticToggle = (enabled: boolean) => {
    actions.setPostProcessing({
      chromaticAberration: { ...pp.chromaticAberration, enabled },
    });
  };

  const handleChromaticParam = (param: string, value: number) => {
    actions.setPostProcessing({
      chromaticAberration: { ...pp.chromaticAberration, [param]: value },
    });
  };

  const handleColorParam = (param: 'exposure' | 'contrast' | 'saturation' | 'brightness', value: number) => {
    actions.setPostProcessing({ [param]: value });
  };

  return (
    <div className="space-y-4">
      {/* Master Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-xs font-mono">Post-Processing</Label>
        <input
          type="checkbox"
          checked={pp.enabled}
          onChange={(e) => handleTogglePostProcessing(e.target.checked)}
          className="w-4 h-4 cursor-pointer"
        />
      </div>

      {/* Tabs - Solo visible si está enabled */}
      {pp.enabled && (
        <Tabs defaultValue="effects" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="effects">Effects</TabsTrigger>
            <TabsTrigger value="color">Color</TabsTrigger>
          </TabsList>

          {/* Tab: Effects */}
          <TabsContent value="effects" className="space-y-4">
            {/* Bloom (ex-Advanced Bloom) */}
            <EffectCard title="Bloom" enabled={pp.advancedBloom.enabled} onToggle={handleBloomToggle}>
              {/* Quality */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono text-muted-foreground">Quality</Label>
                  <span className="text-xs font-mono">
                    {pp.advancedBloom.quality === 5 ? 'Fast' : pp.advancedBloom.quality === 9 ? 'Medium' : 'High'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[5, 9, 13].map((q) => (
                    <button
                      key={q}
                      onClick={() => handleBloomQuality(q as 5 | 9 | 13)}
                      className={`px-2 py-1 text-xs font-mono border rounded ${
                        pp.advancedBloom.quality === q
                          ? 'bg-cyan-500/30 border-cyan-500'
                          : 'bg-slate-800 border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      {q === 5 ? 'Fast' : q === 9 ? 'Med' : 'High'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intensity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono text-muted-foreground">Intensity</Label>
                  <span className="text-xs font-mono">{pp.advancedBloom.intensity.toFixed(2)}</span>
                </div>
                <Slider
                  min={0}
                  max={2}
                  step={0.1}
                  value={[pp.advancedBloom.intensity]}
                  onValueChange={([v]) => handleBloomParam('intensity', v)}
                />
              </div>

              {/* Threshold */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono text-muted-foreground">Threshold</Label>
                  <span className="text-xs font-mono">{pp.advancedBloom.threshold.toFixed(2)}</span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={[pp.advancedBloom.threshold]}
                  onValueChange={([v]) => handleBloomParam('threshold', v)}
                />
              </div>

              {/* Radius */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono text-muted-foreground">Radius</Label>
                  <span className="text-xs font-mono">{pp.advancedBloom.radius.toFixed(1)}</span>
                </div>
                <Slider
                  min={0.5}
                  max={5}
                  step={0.1}
                  value={[pp.advancedBloom.radius]}
                  onValueChange={([v]) => handleBloomParam('radius', v)}
                />
              </div>
            </EffectCard>

            {/* Chromatic Aberration */}
            <EffectCard
              title="Chromatic Aberration"
              enabled={pp.chromaticAberration.enabled}
              onToggle={handleChromaticToggle}
            >
              {/* Intensity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono text-muted-foreground">Intensity</Label>
                  <span className="text-xs font-mono">{pp.chromaticAberration.intensity.toFixed(2)}</span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={[pp.chromaticAberration.intensity]}
                  onValueChange={([v]) => handleChromaticParam('intensity', v)}
                />
              </div>

              {/* Offset */}
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
                  onValueChange={([v]) => handleChromaticParam('offset', v)}
                />
              </div>
            </EffectCard>
          </TabsContent>

          {/* Tab: Color */}
          <TabsContent value="color" className="space-y-4">
            <div className="space-y-4 p-4 border rounded-lg">
              {/* Exposure */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono">Exposure</Label>
                  <span className="text-xs font-mono">{pp.exposure.toFixed(2)}</span>
                </div>
                <Slider
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={[pp.exposure]}
                  onValueChange={([v]) => handleColorParam('exposure', v)}
                />
              </div>

              {/* Contrast */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono">Contrast</Label>
                  <span className="text-xs font-mono">{pp.contrast.toFixed(2)}</span>
                </div>
                <Slider
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={[pp.contrast]}
                  onValueChange={([v]) => handleColorParam('contrast', v)}
                />
              </div>

              {/* Saturation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono">Saturation</Label>
                  <span className="text-xs font-mono">{pp.saturation.toFixed(2)}</span>
                </div>
                <Slider
                  min={0}
                  max={2}
                  step={0.05}
                  value={[pp.saturation]}
                  onValueChange={([v]) => handleColorParam('saturation', v)}
                />
              </div>

              {/* Brightness */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono">Brightness</Label>
                  <span className="text-xs font-mono">{pp.brightness.toFixed(2)}</span>
                </div>
                <Slider
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={[pp.brightness]}
                  onValueChange={([v]) => handleColorParam('brightness', v)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
