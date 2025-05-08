'use client';

import React from 'react';
import { useVectorStore } from '@/lib/store';
import { Pause, Play } from 'lucide-react';

export function PauseResumeControl() {
  // Obtener estado de pausa y acción para cambiarla
  const isPaused = useVectorStore((state) => state.settings.isPaused);
  const { togglePause } = useVectorStore((state) => state.actions);

  // No usamos un div contenedor ya que esto se integrará en AspectRatioControl
  return (
    <button
      onClick={() => {
        console.log(`[PauseResumeControl] Botón ${isPaused ? 'reanudar' : 'pausar'} clickeado!`);
        togglePause();
      }}
      className={`pointer-events-auto px-2 py-1 text-xs rounded-none font-mono transition-colors duration-200 flex items-center
                ${isPaused 
                  ? 'bg-muted dark:bg-muted text-foreground dark:text-foreground border border-input dark:border-input'
                  : 'bg-background dark:bg-background text-muted-foreground dark:text-muted-foreground border border-transparent hover:border-border dark:hover:border-muted'
                }`}
      title={isPaused ? 'Reanudar animación' : 'Pausar animación'}
    >
      {isPaused ? (
        <>
          <Play className="w-3 h-3 mr-1" />
          <span>Reanudar</span>
        </>
      ) : (
        <>
          <Pause className="w-3 h-3 mr-1" />
          <span>Pausar</span>
        </>
      )}
    </button>
  );
}

export default PauseResumeControl;
