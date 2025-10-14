/**
 * ResponsiveLayout - Layout responsivo mobile-first
 * Grid CSS moderno con adaptación automática
 */

'use client';

import { ReactNode } from 'react';

interface ResponsiveLayoutProps {
  leftSidebar: ReactNode;
  canvas: ReactNode;
  rightSidebar: ReactNode;
}

export function ResponsiveLayout({ leftSidebar, canvas, rightSidebar }: ResponsiveLayoutProps) {
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
      <header className="col-span-full border-b bg-card px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Victor - Vectores WebGPU</h1>
        <div className="flex items-center gap-2">
          <span className="hidden md:inline text-sm text-muted-foreground font-mono">
            GPU Powered
          </span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
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
