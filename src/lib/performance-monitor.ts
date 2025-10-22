/**
 * Performance Monitor - Utility for tracking FPS and frame timing
 */

export interface FPSStats {
  current: number;
  min: number;
  max: number;
  avg: number;
  frameTime: number;  // milliseconds
}

export class PerformanceMonitor {
  private frameTimes: number[] = [];
  private lastFrameTime: number = performance.now();
  private readonly maxSamples = 60;  // Track last 60 frames (1 second @ 60fps)

  update(): FPSStats {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Add to circular buffer
    this.frameTimes.push(deltaTime);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }

    // Calculate stats
    const fps = this.frameTimes.map(dt => 1000 / dt);
    const current = fps[fps.length - 1] || 0;
    const min = Math.min(...fps);
    const max = Math.max(...fps);
    const avg = fps.reduce((sum, f) => sum + f, 0) / fps.length;

    return {
      current: Math.round(current),
      min: Math.round(min),
      max: Math.round(max),
      avg: Math.round(avg * 10) / 10,  // 1 decimal
      frameTime: Math.round(deltaTime * 100) / 100,  // 2 decimals
    };
  }

  reset(): void {
    this.frameTimes = [];
    this.lastFrameTime = performance.now();
  }
}
