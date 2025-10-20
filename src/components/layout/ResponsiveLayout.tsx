/**
 * ResponsiveLayout - Layout responsivo mobile-first
 * Grid CSS moderno con adaptación automática
 */

'use client';

import { ReactNode } from 'react';
import { useVectorStore, selectAnimation, selectActions } from '@/store/vectorStore';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { ConfigMenu } from '@/components/controls/ConfigMenu';

interface ResponsiveLayoutProps {
  leftSidebar: ReactNode;
  canvas: ReactNode;
  rightSidebar: ReactNode;
  readOnly?: boolean;
  title?: string;
  headerActions?: ReactNode;
  recordingControls?: ReactNode;
}

export function ResponsiveLayout({
  leftSidebar,
  canvas,
  rightSidebar,
  readOnly = false,
  title,
  headerActions,
  recordingControls,
}: ResponsiveLayoutProps) {
  const animation = useVectorStore(selectAnimation);
  const actions = useVectorStore(selectActions);

  const headerTitle = title || 'Victor - Vectores WebGPU';
  const headerBgClass = readOnly ? 'bg-muted/50' : 'bg-card';

  return (
    <div
      className="
        grid h-screen
        grid-rows-[auto_1fr]
        lg:grid-cols-[360px_1fr_360px]
        lg:grid-rows-[auto_1fr]
        bg-background
      "
    >
      {/* Header */}
      <header className={`col-span-full border-b ${headerBgClass} px-4 py-3 flex items-center justify-between`}>
        <h1 className="text-lg font-semibold">{headerTitle}</h1>
        <div className="flex items-center gap-3">
          {readOnly ? (
            // Modo solo lectura: mostrar actions personalizados
            headerActions
          ) : (
            // Modo edición: mostrar play/pause, grabación y status
            <>
              {/* Config Menu */}
              <ConfigMenu />

              {/* Separador */}
              <div className="h-4 w-px bg-border" />

              {/* Controles de grabación */}
              {recordingControls}

              {/* Separador */}
              {recordingControls && <div className="h-4 w-px bg-border" />}

              {/* Play/Pause */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => actions.togglePause()}
                className="h-8 w-8 p-0"
                title={animation.paused ? 'Reproducir' : 'Pausar'}
              >
                {animation.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>

              {/* Status */}
              <span className="hidden md:inline text-sm text-muted-foreground font-mono">
                GPU Powered
              </span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </>
          )}
        </div>
      </header>

      {/* Sidebar izquierda - Controles de animación */}
      <aside
        className="
          order-2 lg:order-1
          overflow-y-auto
          p-4
          border-r
          bg-card/50
        "
      >
        {leftSidebar}
      </aside>

      {/* Canvas central */}
      <main
        className="
          order-1 lg:order-2
          min-h-[50vh] lg:min-h-0
          flex items-center justify-center
          bg-black
          relative
        "
      >
        {canvas}
      </main>

      {/* Sidebar derecha - Propiedades */}
      <aside
        className="
          order-3
          overflow-y-auto
          p-4
          border-l
          bg-card/50
        "
      >
        {rightSidebar}
      </aside>
    </div>
  );
}
