/**
 * HeaderRecordingControls - Controles compactos de grabación para el header
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useVideoRecorder } from '@/hooks/useVideoRecorder';
import { Button } from '@/components/ui/button';
import { Circle, Square, Pause, Play, Download, Video } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { VideoFormat, VideoQuality, RecordingConfig } from '@/types/recording';

interface HeaderRecordingControlsProps {
  canvas: HTMLCanvasElement | null;
  onRecordingCallbackChange?: (callback: (() => Promise<void>) | null) => void;
}

export function HeaderRecordingControls({ canvas, onRecordingCallbackChange }: HeaderRecordingControlsProps) {
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

  // Formatear duración
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Si está grabando o hay buffer, mostrar controles expandidos
  if (!isIdle || hasBuffer) {
    return (
      <div className="flex items-center gap-2">
        {/* Estado y duración */}
        {stats && (
          <div className="hidden md:flex items-center gap-2 text-xs font-mono">
            <Badge variant={isRecording ? 'destructive' : 'outline'} className="text-xs">
              {state === 'recording' && '● REC'}
              {state === 'paused' && '⏸'}
              {state === 'processing' && '⏳'}
            </Badge>
            <span className="text-muted-foreground">{formatDuration(stats.duration)}</span>
          </div>
        )}

        {/* Pausar/Reanudar */}
        {!isIdle && (
          <Button
            size="sm"
            variant="outline"
            onClick={isPaused ? resumeRecording : pauseRecording}
            disabled={isProcessing}
            className="h-8 w-8 p-0"
            title={isPaused ? 'Reanudar grabación' : 'Pausar grabación'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
        )}

        {/* Detener */}
        {!isIdle && (
          <Button
            size="sm"
            variant="destructive"
            onClick={stopRecording}
            disabled={isProcessing}
            className="h-8 w-8 p-0"
            title="Detener grabación"
          >
            <Square className="w-4 h-4 fill-current" />
          </Button>
        )}

        {/* Descargar (cuando hay buffer) */}
        {hasBuffer && isIdle && (
          <Button
            size="sm"
            variant="default"
            onClick={downloadVideo}
            className="h-8 gap-2 px-3"
            title="Descargar video"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Descargar</span>
          </Button>
        )}
      </div>
    );
  }

  // Modo idle: mostrar botón de inicio con menú de configuración
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={!canvas}
          className="h-8 gap-2 px-3"
        >
          <Video className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Grabar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">Configuración</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Formatos */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Formato</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setFormat('mp4')} className="text-xs">
          {format === 'mp4' && '✓ '}MP4 (H.264)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setFormat('webm')} className="text-xs">
          {format === 'webm' && '✓ '}WebM (VP9)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setFormat('gif')} className="text-xs">
          {format === 'gif' && '✓ '}GIF
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Calidades */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Calidad</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setQuality('low')} className="text-xs">
          {quality === 'low' && '✓ '}Baja (720p)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setQuality('medium')} className="text-xs">
          {quality === 'medium' && '✓ '}Media (1080p30)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setQuality('high')} className="text-xs">
          {quality === 'high' && '✓ '}Alta (1080p60)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setQuality('max')} className="text-xs">
          {quality === 'max' && '✓ '}Máxima (1440p60)
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Botón de inicio */}
        <DropdownMenuItem
          onClick={() => {
            startRecording();
          }}
          disabled={!canvas}
          className="text-xs font-medium"
        >
          <Circle className="w-3 h-3 mr-2 fill-current text-red-500" />
          Iniciar grabación
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
