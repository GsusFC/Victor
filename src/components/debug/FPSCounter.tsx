/**
 * FPSCounter - Lightweight FPS display component
 * Shows current, min, max, and average FPS
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { PerformanceMonitor, type FPSStats } from '@/lib/performance-monitor';

interface FPSCounterProps {
  visible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function FPSCounter({ visible = true, position = 'top-right' }: FPSCounterProps) {
  const [stats, setStats] = useState<FPSStats>({
    current: 0,
    min: 0,
    max: 0,
    avg: 0,
    frameTime: 0,
  });

  const monitorRef = useRef<PerformanceMonitor | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) return;

    // Initialize monitor
    if (!monitorRef.current) {
      monitorRef.current = new PerformanceMonitor();
    }

    // Update loop
    const update = () => {
      if (monitorRef.current) {
        const newStats = monitorRef.current.update();
        setStats(newStats);
      }
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [visible]);

  if (!visible) return null;

  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  // Color coding for FPS
  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 bg-black/80 backdrop-blur-sm border border-zinc-700 rounded-lg px-3 py-2 font-mono text-xs`}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">FPS:</span>
          <span className={`font-bold text-lg ${getFPSColor(stats.current)}`}>
            {stats.current}
          </span>
        </div>
        <div className="flex gap-3 text-[10px]">
          <span className="text-zinc-500">
            Min: <span className="text-zinc-300">{stats.min}</span>
          </span>
          <span className="text-zinc-500">
            Max: <span className="text-zinc-300">{stats.max}</span>
          </span>
          <span className="text-zinc-500">
            Avg: <span className="text-zinc-300">{stats.avg}</span>
          </span>
        </div>
        <div className="text-[10px] text-zinc-500 border-t border-zinc-700 pt-1 mt-1">
          Frame: <span className="text-zinc-300">{stats.frameTime}ms</span>
        </div>
      </div>
    </div>
  );
}
