/**
 * useVideoRecorder - Hook para gestionar grabación de video del canvas WebGPU
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VideoRecorder } from '@/lib/video-recorder';
import type { RecordingConfig, RecordingState, RecordingStats, RecordingError } from '@/types/recording';

interface UseVideoRecorderOptions {
  canvas: HTMLCanvasElement | null;
  config?: Partial<RecordingConfig>;
  onStart?: () => void;
  onStop?: () => void;
  onError?: (error: RecordingError) => void;
}

interface UseVideoRecorderReturn {
  // Estado
  state: RecordingState;
  stats: RecordingStats;
  error: RecordingError | null;
  isRecording: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  hasBuffer: boolean;

  // Acciones
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  downloadVideo: () => void;
  resetRecorder: () => void;

  // Callback para inyectar en el loop de render
  captureFrameCallback: (() => Promise<void>) | null;
}

export function useVideoRecorder({
  canvas,
  config,
  onStart,
  onStop,
  onError,
}: UseVideoRecorderOptions): UseVideoRecorderReturn {
  const recorderRef = useRef<VideoRecorder | null>(null);
  const [state, setState] = useState<RecordingState>('idle');
  const [stats, setStats] = useState<RecordingStats>({
    duration: 0,
    frameCount: 0,
    estimatedSize: 0,
    currentFps: 0,
  });
  const [error, setError] = useState<RecordingError | null>(null);
  const [hasBuffer, setHasBuffer] = useState(false);

  // Intervalo para actualizar stats
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Inicializa el recorder SOLO UNA VEZ cuando el canvas está disponible
   */
  useEffect(() => {
    if (!canvas) return;
    if (recorderRef.current) return; // Ya inicializado

    try {
      recorderRef.current = new VideoRecorder(canvas, config);
      console.log('📹 VideoRecorder inicializado');
    } catch (err) {
      const errorInfo: RecordingError = {
        code: 'INIT_ERROR',
        message: err instanceof Error ? err.message : 'Error inicializando recorder',
        recoverable: false,
      };
      setError(errorInfo);
      onError?.(errorInfo);
      console.error('❌ Error inicializando VideoRecorder:', err);
    }

    return () => {
      // Cleanup solo cuando se desmonta el componente
      if (recorderRef.current) {
        // NO llamar dispose aquí porque puede estar grabando
        // Solo limpiar si está en idle
        if (recorderRef.current.getState() === 'idle') {
          recorderRef.current.dispose();
        }
        recorderRef.current = null;
      }
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas]); // Solo depende del canvas, NO del config

  /**
   * Actualiza stats periódicamente durante grabación
   * También verifica si el recorder se detuvo automáticamente
   */
  const startStatsInterval = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }

    statsIntervalRef.current = setInterval(() => {
      if (recorderRef.current) {
        const newStats = recorderRef.current.getStats();
        const currentState = recorderRef.current.getState();
        
        setStats(newStats);
        
        // Sincronizar estado en caso de que VideoRecorder se haya detenido automáticamente
        if (currentState !== 'recording' && currentState !== 'paused') {
          console.log('🔄 Detectado cambio de estado en VideoRecorder:', currentState);
          setState(currentState);
          
          // Si se completó el loop, finalizar la grabación
          if (currentState === 'idle' || currentState === 'processing') {
            stopStatsInterval();
            setHasBuffer(recorderRef.current.hasBuffer());
          }
        }
      }
    }, 100); // Reducido a 100ms para detección más rápida
  }, []);

  const stopStatsInterval = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
      console.log('⏹️ Intervalo de stats detenido');
    }
  }, []);

  /**
   * Inicia la grabación
   */
  const startRecording = useCallback(async () => {
    if (!recorderRef.current) {
      console.error('Recorder no inicializado');
      return;
    }

    try {
      await recorderRef.current.start();
      setState(recorderRef.current.getState());
      setError(null);
      setHasBuffer(false); // Limpiar buffer anterior
      startStatsInterval();
      onStart?.();
    } catch (error) {
      console.error('Error iniciando grabación:', error);
      const errorInfo = recorderRef.current.getError();
      if (errorInfo) {
        setError(errorInfo);
        onError?.(errorInfo);
      }
      setState('error');
    }
  }, [onStart, onError, startStatsInterval]);

  /**
   * Detiene la grabación
   */
  const stopRecording = useCallback(async () => {
    if (!recorderRef.current) return;

    try {
      console.log('📞 Llamando a stopRecording...');
      stopStatsInterval(); // Detener intervalo PRIMERO
      
      await recorderRef.current.stop();
      const newState = recorderRef.current.getState();
      const newStats = recorderRef.current.getStats();
      const bufferAvailable = recorderRef.current.hasBuffer();

      console.log('🎬 Stop recording - Estado:', {
        state: newState,
        hasBuffer: bufferAvailable,
        frames: newStats.frameCount,
        duration: newStats.duration.toFixed(2) + 's'
      });

      setState(newState);
      setStats(newStats);
      setHasBuffer(bufferAvailable);
      onStop?.();
    } catch (error) {
      console.error('Error deteniendo grabación:', error);
      const errorInfo = recorderRef.current.getError();
      if (errorInfo) {
        setError(errorInfo);
        onError?.(errorInfo);
      }
      setState('error');
    }
  }, [onStop, onError, stopStatsInterval]);

  /**
   * Pausa la grabación
   */
  const pauseRecording = useCallback(async () => {
    if (!recorderRef.current) return;

    try {
      await recorderRef.current.pause();
      setState(recorderRef.current.getState());
      stopStatsInterval();
    } catch (error) {
      console.error('Error pausando grabación:', error);
    }
  }, [stopStatsInterval]);

  /**
   * Reanuda la grabación
   */
  const resumeRecording = useCallback(async () => {
    if (!recorderRef.current) return;

    try {
      await recorderRef.current.resume();
      setState(recorderRef.current.getState());
      startStatsInterval();
    } catch (error) {
      console.error('Error reanudando grabación:', error);
    }
  }, [startStatsInterval]);

  /**
   * Descarga el video grabado
   */
  const downloadVideo = useCallback(() => {
    if (!recorderRef.current) {
      console.error('Recorder no inicializado');
      return;
    }

    try {
      recorderRef.current.download();
    } catch (error) {
      console.error('Error descargando video:', error);
      const errorInfo: RecordingError = {
        code: 'DOWNLOAD_ERROR',
        message: error instanceof Error ? error.message : 'Error descargando video',
        recoverable: true,
      };
      setError(errorInfo);
      onError?.(errorInfo);
    }
  }, [onError]);

  /**
   * Resetea el recorder para permitir nueva grabación
   */
  const resetRecorder = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.clearBuffer();
    }

    setState('idle');
    setHasBuffer(false);
    setError(null);
    setStats({
      duration: 0,
      frameCount: 0,
      estimatedSize: 0,
      currentFps: 0,
    });

    console.log('🔄 Recorder reseteado, listo para nueva grabación');
  }, []);

  /**
   * Callback para capturar frames (se inyecta en el loop de render)
   */
  const captureFrameCallback = useCallback(async () => {
    if (recorderRef.current && recorderRef.current.isRecording()) {
      await recorderRef.current.captureFrame();
    }
  }, []);

  // Estados derivados
  const isRecording = state === 'recording';
  const isPaused = state === 'paused';
  const isProcessing = state === 'processing';

  return {
    state,
    stats,
    error,
    isRecording,
    isPaused,
    isProcessing,
    hasBuffer,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    downloadVideo,
    resetRecorder,
    captureFrameCallback: isRecording ? captureFrameCallback : null,
  };
}
