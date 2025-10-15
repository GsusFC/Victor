/**
 * RecordingPanel - Panel de control de grabación de video
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useVideoRecorder } from '@/hooks/useVideoRecorder';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Video, Circle, Square, Pause, Play, AlertCircle, Download } from 'lucide-react';
import type { VideoFormat, VideoQuality, RecordingConfig } from '@/types/recording';

interface RecordingPanelProps {
  canvas: HTMLCanvasElement | null;
  onRecordingCallbackChange?: (callback: (() => Promise<void>) | null) => void;
}

export function RecordingPanel({ canvas, onRecordingCallbackChange }: RecordingPanelProps) {
  // Estado de configuración
  const [format, setFormat] = useState<VideoFormat>('mp4');
  const [quality, setQuality] = useState<VideoQuality>('high');
  const fileName = 'victor-animation';

  // Config para el hook
  const config: RecordingConfig = useMemo(
    () => ({
      format,
      quality,
      frameRate: 60,
      fileName,
    }),
    [format, quality, fileName]
  );

  // Hook de grabación
  const {
    state,
    stats,
    isRecording,
    hasBuffer,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    downloadVideo,
    captureFrameCallback,
  } = useVideoRecorder({
    canvas,
    config,
    onStart: () => console.log('🎥 Grabación iniciada'),
    onStop: () => console.log('✅ Grabación completada'),
    onError: (error) => console.error('❌ Error en grabación:', error),
  });

  // Notificar cambios en el callback
  useEffect(() => {
    if (!onRecordingCallbackChange) return;
    onRecordingCallbackChange(captureFrameCallback);
    return () => {
      onRecordingCallbackChange(null);
    };
  }, [captureFrameCallback, onRecordingCallbackChange]);

  // Estados de grabación
  const isIdle = state === 'idle';
  const isPaused = state === 'paused';
  const isProcessing = state === 'processing';
  const hasError = state === 'error';

  // Formatear duración
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Header con estado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4" />
          <span className="text-sm font-mono">Grabación</span>
        </div>
        <Badge
          variant={isRecording ? 'destructive' : isProcessing ? 'default' : 'outline'}
          className="text-xs font-mono"
        >
          {state === 'idle' && 'Inactivo'}
          {state === 'recording' && '● REC'}
          {state === 'paused' && '⏸ Pausado'}
          {state === 'processing' && 'Procesando...'}
          {state === 'error' && 'Error'}
        </Badge>
      </div>

      {/* Configuración (solo cuando no está grabando) */}
      {isIdle && (
        <div className="space-y-2">
          {/* Formato */}
          <div className="space-y-1">
            <Label className="text-xs">Formato</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as VideoFormat)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">MP4 (H.264)</SelectItem>
                <SelectItem value="webm">WebM (VP9)</SelectItem>
                <SelectItem value="gif">GIF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Calidad */}
          <div className="space-y-1">
            <Label className="text-xs">Calidad</Label>
            <Select value={quality} onValueChange={(v) => setQuality(v as VideoQuality)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baja (720p30 - 5 Mbps)</SelectItem>
                <SelectItem value="medium">Media (1080p30 - 8 Mbps)</SelectItem>
                <SelectItem value="high">Alta (1080p60 - 12 Mbps)</SelectItem>
                <SelectItem value="max">Máxima (1440p60 - 20 Mbps)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Estadísticas (cuando está grabando) */}
      {!isIdle && stats && (
        <div className="space-y-2 p-2 rounded bg-muted/20 border border-border/40">
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <div className="text-muted-foreground">Duración</div>
              <div className="font-medium">{formatDuration(stats.duration)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Frames</div>
              <div className="font-medium">{stats.frameCount}</div>
            </div>
            <div>
              <div className="text-muted-foreground">FPS</div>
              <div className="font-medium">{stats.currentFps.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Tamaño</div>
              <div className="font-medium">{formatFileSize(stats.estimatedSize)}</div>
            </div>
          </div>

          {/* Barra de progreso (solo visual durante grabación) */}
          {isRecording && (
            <div className="space-y-1">
              <Progress value={undefined} className="h-1" />
              <div className="text-xs text-muted-foreground text-center">Grabando...</div>
            </div>
          )}
        </div>
      )}

      {/* Mensaje de error */}
      {hasError && (
        <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-xs text-destructive">
            Error en la grabación. Verifica que tu navegador soporte WebCodecs API.
          </div>
        </div>
      )}

      {/* Controles */}
      <div className="flex gap-2">
        {isIdle ? (
          <Button
            onClick={startRecording}
            disabled={!canvas}
            size="sm"
            className="w-full gap-2 h-8 text-xs"
          >
            <Circle className="w-3 h-3 fill-current" />
            Iniciar grabación
          </Button>
        ) : (
          <>
            {/* Pausar/Reanudar */}
            <Button
              onClick={isPaused ? resumeRecording : pauseRecording}
              disabled={isProcessing}
              size="sm"
              variant="outline"
              className="flex-1 gap-2 h-8 text-xs"
            >
              {isPaused ? (
                <>
                  <Play className="w-3 h-3" />
                  Reanudar
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3" />
                  Pausar
                </>
              )}
            </Button>

            {/* Detener */}
            <Button
              onClick={stopRecording}
              disabled={isProcessing}
              size="sm"
              variant="destructive"
              className="flex-1 gap-2 h-8 text-xs"
            >
              <Square className="w-3 h-3 fill-current" />
              Detener
            </Button>
          </>
        )}
      </div>

      {/* Botón de descarga (solo visible cuando hay buffer) */}
      {hasBuffer && isIdle && (
        <div className="space-y-2 p-2 rounded bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
            <Video className="w-3 h-3" />
            <span className="font-medium">Video listo para descargar</span>
          </div>
          <Button
            onClick={downloadVideo}
            size="sm"
            variant="outline"
            className="w-full gap-2 h-8 text-xs border-green-500/30 hover:bg-green-500/10"
          >
            <Download className="w-3 h-3" />
            Descargar video
          </Button>
        </div>
      )}

      {/* Información adicional */}
      {isIdle && !hasBuffer && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Graba animaciones a 60 FPS</p>
          <p>• Requiere Chrome/Edge con WebCodecs</p>
          <p>• Descarga manual tras detener grabación</p>
        </div>
      )}
    </div>
  );
}
