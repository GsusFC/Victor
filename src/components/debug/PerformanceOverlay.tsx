/**
 * PerformanceOverlay - Comprehensive performance monitoring component
 * Shows FPS, engine stats, and system information
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { PerformanceMonitor, type FPSStats } from '@/lib/performance-monitor';
import type { WebGPUEngine } from '@/engine/WebGPUEngine';

interface PerformanceOverlayProps {
  visible?: boolean;
  engine: WebGPUEngine | null;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

interface EngineStats {
  vectorCount: number;
  workgroupSize: number;
  postProcessingEnabled: boolean;
  trailsEnabled: boolean;
  currentAnimation: string;
  canvasSize: { width: number; height: number };
}

export function PerformanceOverlay({
  visible = false,
  engine,
  position = 'top-left',
}: PerformanceOverlayProps) {
  const [fpsStats, setFpsStats] = useState<FPSStats>({
    current: 0,
    min: 0,
    max: 0,
    avg: 0,
    frameTime: 0,
  });

  const [engineStats, setEngineStats] = useState<EngineStats | null>(null);

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
        const newFpsStats = monitorRef.current.update();
        setFpsStats(newFpsStats);
      }

      // Update engine stats every frame
      if (engine) {
        const stats = engine.getPerformanceStats();
        if (stats) {
          setEngineStats(stats);
        }
      }

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [visible, engine]);

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
      className={`fixed ${positionClasses[position]} z-50 bg-black/90 backdrop-blur-sm border border-zinc-700 rounded-lg px-4 py-3 font-mono text-xs min-w-[280px]`}
    >
      <div className="flex flex-col gap-3">
        {/* FPS Section */}
        <div className="border-b border-zinc-700 pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-zinc-400 font-semibold">PERFORMANCE</span>
            <span className={`font-bold text-xl ${getFPSColor(fpsStats.current)}`}>
              {fpsStats.current} FPS
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="text-zinc-500">
              Min: <span className="text-zinc-300">{fpsStats.min}</span>
            </div>
            <div className="text-zinc-500">
              Max: <span className="text-zinc-300">{fpsStats.max}</span>
            </div>
            <div className="text-zinc-500">
              Avg: <span className="text-zinc-300">{fpsStats.avg}</span>
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Frame: <span className="text-zinc-300">{fpsStats.frameTime.toFixed(2)}ms</span>
          </div>
        </div>

        {/* Engine Stats Section */}
        {engineStats && (
          <div className="space-y-1">
            <div className="text-zinc-400 font-semibold mb-1">ENGINE</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
              <div className="text-zinc-500">
                Vectors: <span className="text-zinc-300">{engineStats.vectorCount}</span>
              </div>
              <div className="text-zinc-500">
                Workgroup: <span className="text-zinc-300">{engineStats.workgroupSize}</span>
              </div>
              <div className="text-zinc-500">
                Canvas:{' '}
                <span className="text-zinc-300">
                  {engineStats.canvasSize.width}×{engineStats.canvasSize.height}
                </span>
              </div>
              <div className="text-zinc-500">
                Post-FX:{' '}
                <span
                  className={engineStats.postProcessingEnabled ? 'text-green-400' : 'text-red-400'}
                >
                  {engineStats.postProcessingEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="text-zinc-500">
                Trails:{' '}
                <span className={engineStats.trailsEnabled ? 'text-green-400' : 'text-red-400'}>
                  {engineStats.trailsEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="text-zinc-500 col-span-2">
                Anim: <span className="text-zinc-300">{engineStats.currentAnimation}</span>
              </div>
            </div>
          </div>
        )}

        {/* Performance Budget */}
        <div className="border-t border-zinc-700 pt-2">
          <div className="text-[10px] text-zinc-500">
            Budget: <span className="text-zinc-300">16.67ms</span> (60 FPS)
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full ${
                  fpsStats.frameTime <= 16.67
                    ? 'bg-green-500'
                    : fpsStats.frameTime <= 33.33
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.min(100, (fpsStats.frameTime / 16.67) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
