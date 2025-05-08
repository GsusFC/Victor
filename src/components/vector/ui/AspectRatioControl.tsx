'use client';

import React from 'react';
import { useVectorStore } from '@/lib/store';
import { type AspectRatio } from '@/components/vector/core/types';
import PauseResumeControl from './PauseResumeControl';

// Componente para controlar la relación de aspecto del canvas
export function AspectRatioControl() {
  // Seleccionar cada parte del estado por separado para optimización
  const aspectRatio = useVectorStore((state) => state.settings.aspectRatio);
  // Obtener la acción específica para modificar el aspect ratio
  const setAspectRatio = useVectorStore((state) => state.actions.setAspectRatio);

  // Opciones de relación de aspecto
  // Usar 'as const' para inferir los tipos literales correctos
  const aspectRatioOptions = [
    { value: '1:1', label: '1:1', title: 'Cuadrado', icon: (
      <svg className="w-3 h-3 mr-1" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <rect x="4" y="4" width="12" height="12" />
      </svg>
    ) },
    { value: '16:9', label: '16:9', title: 'Pantalla ancha', icon: (
      <svg className="w-4 h-3 mr-1" viewBox="0 0 20 12" fill="currentColor" aria-hidden="true">
        <rect x="1" y="1" width="18" height="10" rx="1" ry="1" />
      </svg>
    ) },
    { value: '2:1', label: '2:1', title: 'Panorámica', icon: (
      <svg className="w-5 h-3 mr-1" viewBox="0 0 20 10" fill="currentColor" aria-hidden="true">
        <rect x="1" y="2" width="18" height="6" rx="1" ry="1" />
      </svg>
    ) },
    { value: 'free', label: 'Libre', title: 'Tamaño libre', icon: (
      <svg className="w-3 h-3 mr-1" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 4 L16 16 M16 4 L4 16" />
      </svg>
    ) }
  ] as const; // <-- Aserción 'as const'

  // Manejar cambio de relación de aspecto
  // El tipo del parámetro ahora es inferido correctamente desde las opciones tipadas
  const handleAspectRatioChange = (newAspectRatio: AspectRatio) => {
    console.log('[AspectRatioControl] handleAspectRatioChange - Nuevo ratio:', newAspectRatio);
    setAspectRatio(newAspectRatio);
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center justify-center space-x-2 bg-background/90 dark:bg-background/80 p-2 rounded-none shadow-none z-50 border border-border dark:border-muted">
      <span className="text-xs text-muted-foreground dark:text-muted-foreground font-mono">Formato:</span>
      <div className="flex space-x-1">
        {aspectRatioOptions.map(option => (
          <button
            key={option.value}
            onClick={() => {
              console.log(`[AspectRatioControl] Botón ${option.value} clickeado!`); // Log directo
              handleAspectRatioChange(option.value);
            }}
            className={`pointer-events-auto px-2 py-1 text-xs rounded-none font-mono transition-colors duration-200 flex items-center ${
              aspectRatio === option.value 
                ? 'bg-muted dark:bg-muted text-foreground dark:text-foreground border border-input dark:border-input'
                : 'bg-background dark:bg-background text-muted-foreground dark:text-muted-foreground border border-transparent hover:border-border dark:hover:border-muted'
            }`}
            title={option.title}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
      
      {/* Separador vertical */}
      <div className="h-full w-px bg-border dark:bg-muted mx-2"></div>
      
      {/* Control de pausa integrado */}
      <PauseResumeControl />
    </div>
  );
}
