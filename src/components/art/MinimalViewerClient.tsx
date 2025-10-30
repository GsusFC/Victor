/**
 * MinimalViewer - Experiencia ultra minimal de arte puro
 * Canvas con dimensiones fijas + controles discretos al hover
 */

'use client';

import { useRef, useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { VectorCanvas, VectorCanvasHandle } from '@/components/canvas/VectorCanvas';
import { useVectorStore } from '@/store/vectorStore';
import type { ArtPiece } from '@/types/art';
import { MinimalControls } from './MinimalControls';
import Link from 'next/link';

interface MinimalViewerProps {
  artPiece: ArtPiece;
}

export function MinimalViewer({ artPiece }: MinimalViewerProps) {
  const canvasHandleRef = useRef<VectorCanvasHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Aplicar la configuración SINCRÓNICAMENTE
  useLayoutEffect(() => {
    console.log('🎨 MinimalViewer: Aplicando configuración de la obra', artPiece.id);

    // Restaurar estado exacto con dimensiones fijas
    useVectorStore.setState({
      version: artPiece.config.version,
      visual: artPiece.config.visual,
      grid: artPiece.config.grid,
      animation: {
        ...artPiece.config.animation,
        paused: false, // Asegurar que está activa
      },
      canvas: {
        ...artPiece.config.canvas,
        // Las dimensiones están fijas en el canvas
      },
      gradients: artPiece.config.gradients,
    });
  }, [artPiece]);

  // Manejar Play/Pause
  const handleTogglePause = useCallback(() => {
    useVectorStore.setState((state) => ({
      animation: {
        ...state.animation,
        paused: !state.animation.paused,
      },
    }));
    setIsPaused((prev) => !prev);
  }, []);

  // Controlar hover
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = () => {
      setShowControls(true);
    };

    const handleMouseLeave = () => {
      setShowControls(false);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Manejar teclas (Spacebar para play/pause, ESC para salir)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePause();
      }
      if (e.code === 'Escape') {
        // Navegar a galería
        window.location.href = '/gallery';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTogglePause]);

  // Dimensiones fijas del canvas
  const canvasWidth = artPiece.config.canvas?.width || 1280;
  const canvasHeight = artPiece.config.canvas?.height || 720;

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden"
    >
      {/* Canvas con dimensiones fijas */}
      <div
        style={{
          width: canvasWidth,
          height: canvasHeight,
          position: 'relative',
        }}
      >
        <VectorCanvas
          ref={canvasHandleRef}
          initialTimeOffset={artPiece.captureTime || 0}
          vectorData={artPiece.vectorData}
          fixedDimensions={{
            width: canvasWidth,
            height: canvasHeight,
          }}
        />
      </div>

      {/* Controles discretos al hover */}
      <MinimalControls
        show={showControls}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
        artPieceId={artPiece.id}
      />

      {/* Link a info (discreto en esquina) */}
      <Link
        href={`/art/${artPiece.id}`}
        className="absolute bottom-4 right-4 text-white/40 hover:text-white/80 transition-colors"
        title="Ver detalles (i)"
      >
        <span className="text-xl">ℹ️</span>
      </Link>
    </div>
  );
}
