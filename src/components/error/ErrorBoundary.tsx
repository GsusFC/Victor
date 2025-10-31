'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary - Captura errores de React y muestra UI de fallback
 * Especialmente útil para errores de WebGPU que pueden crashear la app
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error para debugging
    console.error('🚨 ErrorBoundary caught error:', error);
    console.error('📍 Component stack:', errorInfo.componentStack);

    // Llamar callback opcional
    this.props.onError?.(error, errorInfo);

    // Guardar errorInfo en state
    this.setState({ errorInfo });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Si hay fallback custom, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback por defecto
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-zinc-900 to-black">
          <Card className="max-w-2xl w-full p-8 bg-zinc-900/50 border-zinc-800">
            <div className="flex items-start gap-4 mb-6">
              <div className="rounded-full bg-red-500/20 p-3">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white mb-2">
                  Algo salió mal
                </h1>
                <p className="text-zinc-400">
                  La aplicación encontró un error inesperado. Esto puede ocurrir si tu navegador no soporta WebGPU o si hay un problema con la GPU.
                </p>
              </div>
            </div>

            {/* Error details (development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-zinc-950/50 rounded-lg border border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-300 mb-2">
                  Detalles del error:
                </h3>
                <pre className="text-xs text-red-400 overflow-x-auto whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
                      Component Stack
                    </summary>
                    <pre className="text-xs text-zinc-600 mt-2 overflow-x-auto whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Troubleshooting tips */}
            <div className="mb-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <h3 className="text-sm font-semibold text-blue-400 mb-2">
                💡 Posibles soluciones:
              </h3>
              <ul className="text-sm text-zinc-400 space-y-1 list-disc list-inside">
                <li>Verifica que tu navegador soporte WebGPU (Chrome, Edge, Opera)</li>
                <li>Actualiza tu navegador a la última versión</li>
                <li>Actualiza los drivers de tu GPU</li>
                <li>Intenta recargar la página</li>
                <li>Si el problema persiste, prueba en modo incógnito</li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                onClick={this.handleReset}
                variant="default"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Intentar de nuevo
              </Button>
              <Button
                onClick={this.handleReload}
                variant="outline"
                className="flex-1"
              >
                Recargar página
              </Button>
            </div>

            {/* Additional help */}
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 text-center">
                Si el problema continúa, por favor{' '}
                <a
                  href="https://github.com/GsusFC/Victor/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  reporta un issue en GitHub
                </a>
              </p>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * WebGPUErrorBoundary - Error boundary específico para errores de WebGPU
 * Muestra mensaje personalizado para problemas de GPU
 */
export function WebGPUErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error) => {
        // Detectar errores específicos de WebGPU
        const isWebGPUError = 
          error.message.includes('WebGPU') ||
          error.message.includes('GPU') ||
          error.message.includes('adapter') ||
          error.message.includes('device');

        if (isWebGPUError) {
          console.error('🎮 WebGPU Error detected:', error);
        }
      }}
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-zinc-900 to-black">
          <Card className="max-w-2xl w-full p-8 bg-zinc-900/50 border-zinc-800">
            <div className="flex items-start gap-4 mb-6">
              <div className="rounded-full bg-purple-500/20 p-3">
                <AlertTriangle className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white mb-2">
                  WebGPU no disponible
                </h1>
                <p className="text-zinc-400">
                  Esta aplicación requiere WebGPU, una tecnología moderna de gráficos web que no está disponible en tu navegador actual.
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <h3 className="text-sm font-semibold text-purple-400 mb-3">
                🌐 Navegadores compatibles:
              </h3>
              <ul className="text-sm text-zinc-400 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Chrome 113+ (recomendado)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Edge 113+</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Opera 99+</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-500">⚠</span>
                  <span>Firefox (experimental, requiere habilitar flag)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">✗</span>
                  <span>Safari (en desarrollo)</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={() => window.location.reload()}
              variant="default"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Recargar página
            </Button>

            <div className="mt-6 pt-6 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 text-center">
                Para más información, visita{' '}
                <a
                  href="https://caniuse.com/webgpu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  CanIUse - WebGPU
                </a>
              </p>
            </div>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
