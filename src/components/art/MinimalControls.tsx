/**
 * MinimalControls - Controles discretos al hover
 * Play/Pause + Info
 */

'use client';

import { Play, Pause, Info } from 'lucide-react';
import Link from 'next/link';

interface MinimalControlsProps {
  show: boolean;
  isPaused: boolean;
  onTogglePause: () => void;
  artPieceId: string;
}

export function MinimalControls({
  show,
  isPaused,
  onTogglePause,
  artPieceId,
}: MinimalControlsProps) {
  return (
    <div
      className={`
        absolute bottom-6 left-1/2 transform -translate-x-1/2
        flex items-center gap-4
        bg-black/60 backdrop-blur-sm
        px-6 py-3 rounded-lg
        transition-opacity duration-300
        ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}
    >
      {/* Play/Pause Button */}
      <button
        onClick={onTogglePause}
        className="text-white hover:text-cyan-400 transition-colors"
        title={isPaused ? 'Play (Spacebar)' : 'Pause (Spacebar)'}
      >
        {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-white/20" />

      {/* Info Link */}
      <Link
        href={`/art/${artPieceId}`}
        className="text-white hover:text-cyan-400 transition-colors"
        title="Ver detalles"
      >
        <Info className="w-5 h-5" />
      </Link>

      {/* Hint text */}
      <span className="text-xs text-white/50 font-mono ml-2">ESC: salir</span>
    </div>
  );
}
