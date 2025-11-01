/**
 * RecordingPanel - Panel de control de grabación SIMPLIFICADO
 * Solo grabación manual sin loops automáticos
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useVideoRecorder } from '@/hooks/useVideoRecorder';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Video, Circle, Square, Pause, Play, AlertCircle, Download, RotateCcw, CheckCircle, Camera } from 'lucide-react';
import type { VideoFormat, VideoQuality, RecordingConfig } from '@/types/recording';
import type { VectorCanvasHandle } from '@/components/canvas/VectorCanvas';

type FlowState = 'config' | 'countdown' | 'recording' | 'paused' | 'processing' | 'ready';

interface RecordingPanelProps {
  canvas: HTMLCanvasElement | null;
  canvasRef?: React.RefObject<VectorCanvasHandle>;
  onRecordingCallbackChange?: (callback: (() => Promise<void>) | null) => void;
}

export function RecordingPanel({ canvas, onRecordingCallbackChange }: RecordingPanelProps) {
  // Estado de configuración
  const [format, setFormat] = useState<VideoFormat>('mp4');
  const [quality, setQuality] = useState<VideoQuality>('high');
  const [countdown, setCountdown] = useState(3);
  const [flowState, setFlowState] = useState<FlowState>('config');

  // Config para el hook
  const config: RecordingConfig = {
    format,
    quality,
    frameRate: 60,
    fileName: 'victor-animation',
  };

  // Hook de grabación
  const {
    state,
    stats,
    hasBuffer,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    downloadVideo,
    resetRecorder,
    captureFrameCallback,
  } = useVideoRecorder({
    canvas,
    config,
    onStart: () => console.log('🎥 Grabación iniciada'),
    onStop: () => {
      console.log('✅ Grabación completada');
      setFlowState('ready');
    },
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

  // Manejar countdown
  useEffect(() => {
    if (flowState !== 'countdown') return;

    const timer = setTimeout(async () => {
      if (countdown > 1) {
        setCountdown(countdown - 1);
      } else {
        setCountdown(3);
        setFlowState('recording');
        await startRecording();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [flowState, countdown, startRecording]);

  // Estados derivados
  const isPaused = state === 'paused';
  const isProcessing = state === 'processing';
  const hasError = state === 'error';

  // Funciones manejadoras
  const handleStartRecording = () => {
    setFlowState('countdown');
    setCountdown(3);
  };

  const handleStopRecording = async () => {
    await stopRecording();
  };

  const handleNewRecording = () => {
    resetRecorder();
    setFlowState('config');
  };

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
          variant={
            flowState === 'countdown'
              ? 'secondary'
              : flowState === 'recording'
                ? 'destructive'
                : flowState === 'processing'
                  ? 'default'
                  : flowState === 'ready'
                    ? 'outline'
                    : 'outline'
          }
          className="text-xs font-mono"
        >
          {flowState === 'config' && 'Configurando'}
          {flowState === 'countdown' && `⏱️ ${countdown}`}
          {flowState === 'recording' && '● REC'}
          {flowState === 'paused' && '⏸ Pausado'}
          {flowState === 'processing' && 'Procesando...'}
          {flowState === 'ready' && '✅ Listo'}
          {hasError && 'Error'}
        </Badge>
      </div>

      {/* CONFIGURACIÓN - Solo en estado 'config' */}
      {flowState === 'config' && (
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
                <SelectItem value="low">Baja (1080p30 - 6 Mbps)</SelectItem>
                <SelectItem value="medium">Redes Sociales (1080p30 - 8 Mbps)</SelectItem>
                <SelectItem value="high">Alta (1080p60 - 18 Mbps)</SelectItem>
                <SelectItem value="max">Máxima (1080p60 - 30 Mbps)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botón iniciar */}
          <Button
            onClick={handleStartRecording}
            disabled={!canvas}
            size="sm"
            className="w-full gap-2 h-8 text-xs"
          >
            <Circle className="w-3 h-3 fill-current" />
            Iniciar Grabación
          </Button>
        </div>
      )}

      {/* COUNTDOWN */}
      {flowState === 'countdown' && (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 rounded bg-muted/40 border border-border/40">
          <div className="text-6xl font-bold font-mono text-primary animate-pulse">{countdown}</div>
          <div className="text-sm text-muted-foreground">Preparando grabación...</div>
        </div>
      )}

      {/* GRABANDO - Estadísticas y controles */}
      {(flowState === 'recording' || flowState === 'paused') && stats && (
        <div className="space-y-2">
          {/* Estadísticas */}
          <div className="p-2 rounded bg-muted/20 border border-border/40 space-y-2">
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
          </div>

          {/* Controles */}
          <div className="flex gap-2">
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
              onClick={handleStopRecording}
              disabled={isProcessing}
              size="sm"
              variant="destructive"
              className="flex-1 gap-2 h-8 text-xs"
            >
              <Square className="w-3 h-3 fill-current" />
              Detener
            </Button>
          </div>
        </div>
      )}

      {/* PROCESANDO */}
      {flowState === 'processing' && (
        <div className="space-y-2 p-2 rounded bg-muted/20 border border-border/40">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Circle className="w-2 h-2 animate-pulse" />
            Procesando video...
          </div>
          <Progress value={undefined} className="h-1" />
        </div>
      )}

      {/* LISTO - Video grabado */}
      {flowState === 'ready' && hasBuffer && (
        <div className="space-y-2">
          {/* Indicador de éxito */}
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 p-2 rounded bg-green-500/10 border border-green-500/20">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Video listo para descargar</span>
          </div>

          {/* Estadísticas finales */}
          <div className="grid grid-cols-2 gap-2 p-2 rounded bg-muted/20 border border-border/40 text-xs font-mono">
            <div>
              <div className="text-muted-foreground">Duración</div>
              <div className="font-medium">{formatDuration(stats.duration)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Tamaño</div>
              <div className="font-medium">{formatFileSize(stats.estimatedSize)}</div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="space-y-2">
            <Button
              onClick={downloadVideo}
              size="sm"
              className="w-full gap-2 h-8 text-xs"
            >
              <Download className="w-3 h-3" />
              Descargar Video
            </Button>

            <Button
              onClick={handleNewRecording}
              size="sm"
              variant="outline"
              className="w-full gap-2 h-8 text-xs"
            >
              <RotateCcw className="w-3 h-3" />
              Grabar de Nuevo
            </Button>
          </div>
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
    </div>
  );
}
