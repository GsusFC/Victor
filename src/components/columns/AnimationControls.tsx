import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVectorStore } from '@/lib/store';
import { isValidAnimationType } from "../vector/core/types";
import "@/styles/animation-controls.css";

export function AnimationControls() {
  const settings = useVectorStore((state) => state.settings);
  const { 
    setAnimationType, 
    updateSetting 
  } = useVectorStore((state) => state.actions);
  
  // Manejadores de eventos
  const handleAnimationTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (isValidAnimationType(value)) {
      setAnimationType(value);
    }
  };
  
  const handleAnimationSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    updateSetting('animationSpeedFactor', value);
  };
  
  const handleEasingFactorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    updateSetting('easingFactor', value);
  };
  return (
    <div className="space-y-2 font-mono animation-controls">
      <Card className="border-input">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-mono font-medium tracking-wide">TIPO DE ANIMACIÓN</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <select 
            value={settings.currentAnimationType}
            onChange={handleAnimationTypeChange}
            className="w-full bg-muted text-foreground text-xs p-2 border border-input rounded-none focus:outline-none focus:ring-1 focus:ring-ring font-mono"
          >
            {[
              { value: 'smoothWaves', label: 'Ondas Suaves' },
              { value: 'seaWaves', label: 'Olas Marinas' },
              { value: 'perlinFlow', label: 'Flujo Perlin' },
              { value: 'mouseInteraction', label: 'Seguir Ratón' },
              { value: 'pinwheels', label: 'Molinetes' },
              { value: 'oceanCurrents', label: 'Corrientes' },
              { value: 'jitter', label: 'Vibraciones' },
              { value: 'centerPulse', label: 'Pulso Central' },
              { value: 'rippleEffect', label: 'Ondulaciones' },
              { value: 'expandingWave', label: 'Onda Expansiva' },
              { value: 'cellularAutomata', label: 'Autómata Celular' },
              { value: 'flocking', label: 'Bandadas' },
              { value: 'vortex', label: 'Vórtice' },
              { value: 'geometricPattern', label: 'Patrón Geométrico' },
              { value: 'followPath', label: 'Seguir Camino' },
              { value: 'lissajous', label: 'Lissajous' },
              { value: 'waterfall', label: 'Cascada' }
            ].map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">VELOCIDAD</label>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="0.1" 
                  max="3" 
                  step="0.1" 
                  value={settings.animationSpeedFactor}
                  onChange={handleAnimationSpeedChange}
                  className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                />
                <span className="text-xs w-8 text-right">{settings.animationSpeedFactor.toFixed(1)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">ELASTICIDAD</label>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="0.01" 
                  max="1" 
                  step="0.01" 
                  value={settings.easingFactor}
                  onChange={handleEasingFactorChange}
                  className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                />
                <span className="text-xs w-8 text-right">{settings.easingFactor.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {['vortex', 'geometricPattern', 'followPath', 'lissajous', 'waterfall', 'mouseInteraction'].includes(settings.currentAnimationType) && settings.currentAnimationType !== 'geometrico' && (
        <Card className="border-input">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs">PARÁMETROS ESPECÍFICOS</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="space-y-4">
              {/* Controles para Vórtice */}
              {settings.currentAnimationType === 'vortex' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">INTENSIDAD DEL VÓRTICE</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="0.1" 
                      max="2" 
                      step="0.1" 
                      value={settings.vortexStrength}
                      onChange={(e) => updateSetting('vortexStrength', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.vortexStrength.toFixed(1)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">POSICIÓN X DEL CENTRO (%)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="1" 
                      value={settings.vortexCenterX}
                      onChange={(e) => updateSetting('vortexCenterX', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.vortexCenterX}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">POSICIÓN Y DEL CENTRO (%)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="1" 
                      value={settings.vortexCenterY}
                      onChange={(e) => updateSetting('vortexCenterY', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.vortexCenterY}</span>
                  </div>
                </div>
              </>
            )}

            {/* Controles para Patrón Geométrico */}
            {settings.currentAnimationType === 'geometricPattern' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">TAMAÑO DEL PATRÓN</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="5" 
                      max="50" 
                      step="1" 
                      value={settings.geometricPatternSize}
                      onChange={(e) => updateSetting('geometricPatternSize', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.geometricPatternSize}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">COMPLEJIDAD</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      step="1" 
                      value={settings.geometricPatternComplexity}
                      onChange={(e) => updateSetting('geometricPatternComplexity', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.geometricPatternComplexity}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">VELOCIDAD DE ROTACIÓN</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="0.1" 
                      max="2" 
                      step="0.1" 
                      value={settings.geometricPatternRotationSpeed}
                      onChange={(e) => updateSetting('geometricPatternRotationSpeed', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.geometricPatternRotationSpeed.toFixed(1)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Controles para Seguir Camino */}
            {settings.currentAnimationType === 'followPath' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">VELOCIDAD DEL CAMINO</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="0.1" 
                      max="2" 
                      step="0.1" 
                      value={settings.followPathSpeed}
                      onChange={(e) => updateSetting('followPathSpeed', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.followPathSpeed.toFixed(1)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">COMPLEJIDAD DEL CAMINO</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      step="1" 
                      value={settings.followPathComplexity}
                      onChange={(e) => updateSetting('followPathComplexity', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.followPathComplexity}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">VARIACIÓN</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.1" 
                      value={settings.followPathVariation}
                      onChange={(e) => updateSetting('followPathVariation', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.followPathVariation.toFixed(1)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Controles para Lissajous */}
            {settings.currentAnimationType === 'lissajous' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">PARÁMETRO A</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      step="1" 
                      value={settings.lissajousParamA}
                      onChange={(e) => updateSetting('lissajousParamA', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.lissajousParamA}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">PARÁMETRO B</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      step="1" 
                      value={settings.lissajousParamB}
                      onChange={(e) => updateSetting('lissajousParamB', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.lissajousParamB}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">FRECUENCIA</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="0.0001" 
                      max="0.005" 
                      step="0.0001" 
                      value={settings.lissajousFrequency}
                      onChange={(e) => updateSetting('lissajousFrequency', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.lissajousFrequency.toFixed(4)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">DIFERENCIA DE FASE (GRADOS)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="0" 
                      max="360" 
                      step="5" 
                      value={Math.round((settings.lissajousDelta * 180 / Math.PI))}
                      onChange={(e) => {
                        const degrees = parseInt(e.target.value);
                        const radians = degrees * Math.PI / 180;
                        updateSetting('lissajousDelta', radians);
                      }}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{Math.round((settings.lissajousDelta * 180 / Math.PI))}°</span>
                  </div>
                </div>
              </>
            )}

            {/* Mantener el control original para otras animaciones */}
            {settings.currentAnimationType === 'waterfall' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">TURBULENCIA</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="0" 
                      max="50" 
                      step="1" 
                      value={settings.waterfallTurbulence}
                      onChange={(e) => updateSetting('waterfallTurbulence', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.waterfallTurbulence}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">VELOCIDAD DE TURBULENCIA</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="0.0001" 
                      max="0.01" 
                      step="0.0001" 
                      value={settings.waterfallTurbulenceSpeed}
                      onChange={(e) => updateSetting('waterfallTurbulenceSpeed', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.waterfallTurbulenceSpeed.toFixed(4)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">FACTOR DE DESFASE</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={settings.waterfallOffsetFactor}
                      onChange={(e) => updateSetting('waterfallOffsetFactor', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.waterfallOffsetFactor.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">CICLO DE GRAVEDAD (MS)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="500" 
                      max="5000" 
                      step="100" 
                      value={settings.waterfallGravityCycle}
                      onChange={(e) => updateSetting('waterfallGravityCycle', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.waterfallGravityCycle}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">INTENSIDAD DE GRAVEDAD</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={settings.waterfallGravityStrength}
                      onChange={(e) => updateSetting('waterfallGravityStrength', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.waterfallGravityStrength.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">ESTIRAMIENTO MÁXIMO</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="1" 
                      max="3" 
                      step="0.1" 
                      value={settings.waterfallMaxStretch}
                      onChange={(e) => updateSetting('waterfallMaxStretch', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.waterfallMaxStretch.toFixed(1)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">INTENSIDAD DE DERIVA</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={settings.waterfallDriftStrength}
                      onChange={(e) => updateSetting('waterfallDriftStrength', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                    />
                    <span className="text-xs w-8 text-right">{settings.waterfallDriftStrength.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
            
            {settings.currentAnimationType === 'mouseInteraction' && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">RADIO DE INFLUENCIA</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="5" 
                    max="50" 
                    value={settings.mouseAttractionRadius}
                    onChange={(e) => updateSetting('mouseAttractionRadius', parseInt(e.target.value))}
                    className="w-full bg-muted text-foreground text-xs p-2 border border-input rounded-none focus:outline-none focus:ring-1 focus:ring-muted-foreground font-mono" 
                  />
                  <span className="text-xs">%</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
