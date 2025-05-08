'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useVectorStore } from '@/lib/store';
import { LineCap } from '@/lib/types';
import { isValidVectorShape } from "../vector/core/types";
import { RotationOriginControl } from '@/components/vector/ui/RotationOriginControl';
import "@/styles/vector-properties.css";

export function VectorPropertiesUnified() {
  // Acceder a los settings y acciones del store
  const settings = useVectorStore((state) => state.settings);
  const { 
    updateSetting,
    setVectorShape,
    setLineCap,
  } = useVectorStore((state) => state.actions);
  
  // Manejadores para grid y dimensiones
  const handleGridRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 3 && value <= 50) {
      updateSetting('gridRows', value);
    }
  };
  
  const handleSpacingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 10 && value <= 100) {
      updateSetting('vectorSpacing', value);
    }
  };
  
  // Manejadores para propiedades de vectores
  const handleVectorShapeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (isValidVectorShape(value)) {
      setVectorShape(value);
    } else {
      console.warn(`Invalid vector shape value received: ${value}`);
      setVectorShape('line'); 
    }
  };
  
  const handleVectorLineCapChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLineCap(e.target.value as LineCap);
  };
  
  const handleVectorColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSetting('vectorColor', e.target.value);
  };
  
  const handleVectorLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1) {
      updateSetting('vectorLength', value);
    }
  };
  
  return (
    <div className="space-y-2 font-mono">
      <Card className="border-input">
        <CardContent className="p-0">
          <Accordion type="multiple" defaultValue={["grid", "vector-appearance", "transformations"]} className="font-mono">
            {/* Sección: Grid y Dimensiones */}
            <AccordionItem value="grid">
              <AccordionTrigger className="text-xs font-mono uppercase hover:bg-muted">
                Grid y Dimensiones
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-muted-foreground font-mono uppercase">Filas 
                        <span className="ml-1 text-xs opacity-60">(3-50)</span>
                      </label>
                      <span className="text-xs font-mono">
                        {settings.gridRows || 10}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="number" 
                        min="3" 
                        max="50" 
                        value={settings.gridRows || 10}
                        onChange={handleGridRowsChange}
                        className="w-full bg-muted text-foreground text-xs p-1 pl-2 pr-1 border border-input focus:outline-none focus:ring-1 focus:ring-primary appearance-auto" 
                        title="Ajusta el número de filas en la cuadrícula de vectores (entre 3 y 50)"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-mono opacity-70">Filas en el canvas</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-muted-foreground font-mono uppercase">Espaciado
                        <span className="ml-1 text-xs opacity-60">(10-100px)</span>
                      </label>
                      <span className="text-xs font-mono">
                        {settings.vectorSpacing || 30}px
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="number" 
                        min="10" 
                        max="100" 
                        value={settings.vectorSpacing || 30}
                        onChange={handleSpacingChange}
                        className="w-full bg-muted text-foreground text-xs p-1 pl-2 pr-1 border border-input focus:outline-none focus:ring-1 focus:ring-primary appearance-auto" 
                        title="Ajusta el espaciado entre vectores (entre 10 y 100 píxeles)"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-mono opacity-70">Separación entre vectores</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-muted-foreground font-mono uppercase">Color de Fondo</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={settings.backgroundColor}
                        onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                        className="w-10 h-10 bg-muted p-1 border border-input rounded-none"
                        title="Selecciona un color para el fondo"
                      />
                      <input 
                        type="text" 
                        value={settings.backgroundColor}
                        onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                        className="w-full bg-muted text-foreground text-xs p-2 border border-input rounded-none focus:outline-none focus:ring-1 focus:ring-muted-foreground font-mono"
                        placeholder="#000000" 
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* Sección: Apariencia de Vectores */}
            <AccordionItem value="vector-appearance">
              <AccordionTrigger className="text-xs font-mono uppercase hover:bg-muted">
                Apariencia de Vectores
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-mono uppercase">Forma</label>
                    <select 
                      value={settings.vectorShape}
                      onChange={handleVectorShapeChange}
                      className="w-full bg-muted text-foreground text-xs p-2 border border-input rounded-none focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                    >
                      <option value="line">Línea</option>
                      <option value="arrow">Flecha</option>
                      <option value="dot">Punto</option>
                      <option value="triangle">Triángulo</option>
                      <option value="semicircle">Semicírculo</option>
                      <option value="curve">Curva</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-mono uppercase">Tipo de Trazo</label>
                    <select 
                      value={settings.strokeLinecap}
                      onChange={handleVectorLineCapChange}
                      className="w-full bg-muted text-foreground text-xs p-2 border border-input rounded-none focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                    >
                      <option value="round">Redondeado</option>
                      <option value="square">Cuadrado</option>
                      <option value="butt">Recto</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-mono uppercase">Color</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={settings.vectorColor}
                        onChange={handleVectorColorChange}
                        className="w-10 h-10 bg-muted p-1 border border-input rounded-none"
                        title="Selecciona un color para los vectores"
                      />
                      <input 
                        type="text" 
                        value={settings.vectorColor}
                        onChange={handleVectorColorChange}
                        className="w-full bg-muted text-foreground text-xs p-2 border border-input rounded-none focus:outline-none focus:ring-1 focus:ring-muted-foreground font-mono"
                        placeholder="#FFFFFF" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-mono uppercase">Longitud</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range" 
                        min="1" 
                        max="200" 
                        value={settings.vectorLength || 20}
                        onChange={handleVectorLengthChange}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        title="Ajusta la longitud de cada vector"
                      />
                      <input 
                        type="number" 
                        min="1" 
                        value={settings.vectorLength || 20}
                        onChange={handleVectorLengthChange}
                        className="w-16 bg-muted text-foreground text-xs p-1 pl-2 pr-1 border border-input focus:outline-none font-mono appearance-auto"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-mono opacity-70">Longitud de cada vector</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-muted-foreground font-mono uppercase">Grosor</label>
                      <span className="text-xs font-mono">
                        {settings.vectorStrokeWidth || 1}px
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="range"
                        min="0.1" 
                        max="30" 
                        step="0.5"
                        value={settings.vectorStrokeWidth || 1}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          updateSetting('vectorStrokeWidth', value);
                          updateSetting('vectorWidth', value);
                        }}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        title="Ajusta el grosor del trazo de cada vector"
                      />
                      <input 
                        type="number" 
                        min="0.1" 
                        step="0.5"
                        value={settings.vectorStrokeWidth || 1}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 1;
                          updateSetting('vectorStrokeWidth', value);
                          updateSetting('vectorWidth', value);
                        }}
                        className="w-16 bg-muted text-foreground text-xs p-1 pl-2 pr-1 border border-input focus:outline-none font-mono appearance-auto"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-mono opacity-70">Grosor del trazo de cada vector</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* Sección: Transformaciones */}
            <AccordionItem value="transformations">
              <AccordionTrigger className="text-xs font-mono uppercase hover:bg-muted">
                Transformaciones
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <RotationOriginControl />
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground font-mono uppercase">Grosor Dinámico</label>
                      <div className="relative inline-block w-8 h-4">
                        <input
                          type="checkbox"
                          checked={settings.dynamicLengthEnabled}
                          onChange={(e) => updateSetting('dynamicLengthEnabled', e.target.checked)}
                          className="opacity-0 w-0 h-0 absolute"
                          id="dynamic-length-toggle"
                        />
                        <label
                          htmlFor="dynamic-length-toggle"
                          className={`block overflow-hidden h-4 rounded-full ${
                            settings.dynamicLengthEnabled ? 'bg-primary' : 'bg-muted'
                          } cursor-pointer transition-colors duration-200`}
                        >
                          <span
                            className={`block bg-white rounded-full h-3 w-3 transform transition-transform duration-200 ease-in-out ${
                              settings.dynamicLengthEnabled ? 'translate-x-4' : 'translate-x-0.5'
                            } m-0.5`}
                          ></span>
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-mono opacity-70">
                      Los vectores varían su grosor según su velocidad de movimiento, creando un efecto de pincelada dinámica
                    </p>
                    
                    {settings.dynamicLengthEnabled && (
                      <div className="mt-3 space-y-2">
                        <label className="text-xs text-muted-foreground">INTENSIDAD</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="0.1" 
                            max="2" 
                            step="0.1" 
                            value={settings.dynamicLengthIntensity}
                            onChange={(e) => updateSetting('dynamicLengthIntensity', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-input [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-input" 
                          />
                          <span className="text-xs w-8 text-right">{settings.dynamicLengthIntensity.toFixed(1)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
