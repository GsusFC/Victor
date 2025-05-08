'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useVectorStore } from '@/lib/store';
import { isValidAnimationType } from "../vector/core/types";
import { exportDialogState } from '@/hooks/vector/useExportDialog';
import { FavoritesButton } from '../vector/FavoritesButton';
import "@/styles/animation-controls.css";

export function AnimationControlsUnified() {
  // Acceder a los settings y acciones del store
  const settings = useVectorStore((state) => state.settings);
  const { 
    setAnimationType, 
    updateSetting,
    resetSettings
  } = useVectorStore((state) => state.actions);
  
  // Manejadores para animación
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
    <div className="space-y-2 font-mono">
      <Card className="border-input">
        <CardContent className="p-0">
          <Accordion type="multiple" defaultValue={["animation-type", "animation-params", "actions"]} className="font-mono">
            {/* Sección: Tipo de Animación */}
            <AccordionItem value="animation-type">
              <AccordionTrigger className="text-xs font-mono uppercase hover:bg-muted">
                Tipo de Animación
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
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
                      { value: 'waterfall', label: 'Cascada' },
                      { value: 'geometricPattern', label: 'Patrón Geométrico' },
                      { value: 'followPath', label: 'Seguir Camino' },
                      { value: 'lissajous', label: 'Lissajous' }
                    ].map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>

                  <div className="space-y-4">
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
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* Sección: Parámetros Específicos según tipo de animación */}
            <AccordionItem value="animation-params">
              <AccordionTrigger className="text-xs font-mono uppercase hover:bg-muted">
                Parámetros Específicos
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {/* Parámetros específicos según tipo de animación */}
                  {settings.currentAnimationType === 'seaWaves' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">FRECUENCIA</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="0.001" 
                            max="0.1" 
                            step="0.001" 
                            value={settings.seaWaveFrequency}
                            onChange={(e) => updateSetting('seaWaveFrequency', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                          />
                          <span className="text-xs w-8 text-right">{settings.seaWaveFrequency.toFixed(3)}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">AMPLITUD</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="1" 
                            max="90" 
                            step="1" 
                            value={settings.seaWaveAmplitude}
                            onChange={(e) => updateSetting('seaWaveAmplitude', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                          />
                          <span className="text-xs w-8 text-right">{settings.seaWaveAmplitude}°</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Parámetros para pulso */}
                  {settings.currentAnimationType === 'centerPulse' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">INTERVALO DE PULSO</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="500" 
                            max="5000" 
                            step="100" 
                            value={settings.pulseInterval}
                            onChange={(e) => updateSetting('pulseInterval', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                          />
                          <span className="text-xs w-12 text-right">{settings.pulseInterval}ms</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">DURACIÓN DEL PULSO</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="100" 
                            max="2000" 
                            step="50" 
                            value={settings.pulseDuration}
                            onChange={(e) => updateSetting('pulseDuration', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                          />
                          <span className="text-xs w-12 text-right">{settings.pulseDuration}ms</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Parámetros Lissajous */}
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
                          <span className="text-xs w-14 text-right">{settings.lissajousFrequency.toFixed(4)}</span>
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

                  {/* Parámetro ratón */}
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

                  {/* Parámetros Patrón Geométrico */}
                  {settings.currentAnimationType === 'geometricPattern' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">TAMAÑO</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            step="0.1" 
                            value={settings.geometricPatternSize || 3}
                            onChange={(e) => updateSetting('geometricPatternSize', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                          />
                          <span className="text-xs w-8 text-right">{(settings.geometricPatternSize || 3).toFixed(1)}</span>
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
                            value={settings.geometricPatternComplexity || 3}
                            onChange={(e) => updateSetting('geometricPatternComplexity', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                          />
                          <span className="text-xs w-8 text-right">{settings.geometricPatternComplexity || 3}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">VELOCIDAD DE ROTACIÓN</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="0.1" 
                            max="3" 
                            step="0.1" 
                            value={settings.geometricPatternRotationSpeed || 0.5}
                            onChange={(e) => updateSetting('geometricPatternRotationSpeed', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                          />
                          <span className="text-xs w-8 text-right">{(settings.geometricPatternRotationSpeed || 0.5).toFixed(1)}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Parámetros específicos para animación Cascada (waterfall) */}
                  {settings.currentAnimationType === 'waterfall' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">TURBULENCIA</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="0" 
                            max="30" 
                            step="1" 
                            value={settings.waterfallTurbulence ?? 15}
                            onChange={(e) => updateSetting('waterfallTurbulence', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                          />
                          <span className="text-xs w-8 text-right">{settings.waterfallTurbulence ?? 15}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">VELOCIDAD TURBULENCIA</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="0.001" 
                            max="0.01" 
                            step="0.001" 
                            value={settings.waterfallTurbulenceSpeed ?? 0.003}
                            onChange={(e) => updateSetting('waterfallTurbulenceSpeed', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                          />
                          <span className="text-xs w-8 text-right">{(settings.waterfallTurbulenceSpeed ?? 0.003).toFixed(3)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">FACTOR DE CASCADA</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="0.05" 
                            max="0.5" 
                            step="0.05" 
                            value={settings.waterfallOffsetFactor ?? 0.2}
                            onChange={(e) => updateSetting('waterfallOffsetFactor', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                          />
                          <span className="text-xs w-8 text-right">{(settings.waterfallOffsetFactor ?? 0.2).toFixed(2)}</span>
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
                            value={settings.waterfallMaxStretch ?? 1.5}
                            onChange={(e) => updateSetting('waterfallMaxStretch', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                          />
                          <span className="text-xs w-8 text-right">{(settings.waterfallMaxStretch ?? 1.5).toFixed(1)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">FUERZA DE GRAVEDAD</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="0.1" 
                            max="1" 
                            step="0.1" 
                            value={settings.waterfallGravityStrength ?? 0.5}
                            onChange={(e) => updateSetting('waterfallGravityStrength', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                          />
                          <span className="text-xs w-8 text-right">{(settings.waterfallGravityStrength ?? 0.5).toFixed(1)}</span>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Si no hay parámetros específicos para el tipo actual */}
                  {!['seaWaves', 'centerPulse', 'lissajous', 'mouseInteraction', 'geometricPattern', 'waterfall'].includes(settings.currentAnimationType) && (
                    <div className="text-xs text-muted-foreground py-2">
                      No hay parámetros adicionales para este tipo de animación.
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* Sección eliminada: Favoritos ahora usa un modal */}

            {/* Acciones */}
            <AccordionItem value="actions">
              <AccordionTrigger className="text-xs font-mono uppercase hover:bg-muted">
                Acciones
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <button 
                    onClick={() => exportDialogState.openDialog()}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs py-2 px-3 font-mono uppercase flex items-center justify-center"
                  >
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Exportar Código
                  </button>
                  
                  <FavoritesButton />
                  
                  <button 
                    onClick={() => resetSettings()}
                    className="w-full bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs py-2 px-3 font-mono uppercase flex items-center justify-center"
                  >
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reiniciar Ajustes
                  </button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
