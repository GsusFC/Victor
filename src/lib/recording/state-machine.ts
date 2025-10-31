/**
 * RecordingStateMachine - Máquina de estados para grabación
 * Responsabilidades:
 * - Gestionar estados de grabación
 * - Validar transiciones permitidas
 * - Prevenir estados inválidos
 */

import type { RecordingState } from '@/types/recording';

interface StateTransitionRule {
  from: RecordingState;
  to: RecordingState;
  allowed: boolean;
}

export class RecordingStateMachine {
  private currentState: RecordingState = 'idle';

  // Tabla de transiciones permitidas
  private readonly transitions: StateTransitionRule[] = [
    // Desde idle
    { from: 'idle', to: 'recording', allowed: true },
    { from: 'idle', to: 'error', allowed: true },

    // Desde recording
    { from: 'recording', to: 'paused', allowed: true },
    { from: 'recording', to: 'processing', allowed: true },
    { from: 'recording', to: 'error', allowed: true },

    // Desde paused
    { from: 'paused', to: 'recording', allowed: true },
    { from: 'paused', to: 'processing', allowed: true },
    { from: 'paused', to: 'error', allowed: true },

    // Desde processing
    { from: 'processing', to: 'idle', allowed: true },
    { from: 'processing', to: 'error', allowed: true },

    // Desde error
    { from: 'error', to: 'idle', allowed: true },
  ];

  /**
   * Intenta transicionar a un nuevo estado
   * @throws Error si la transición no está permitida
   */
  transition(to: RecordingState): void {
    if (!this.canTransition(to)) {
      throw new Error(
        `Invalid state transition: ${this.currentState} -> ${to}`
      );
    }

    const previousState = this.currentState;
    this.currentState = to;

    console.log(`🔄 State transition: ${previousState} → ${to}`);
  }

  /**
   * Verifica si una transición es permitida
   */
  canTransition(to: RecordingState): boolean {
    // Permitir transición al mismo estado (no-op)
    if (this.currentState === to) {
      return true;
    }

    return this.transitions.some(
      (rule) =>
        rule.from === this.currentState &&
        rule.to === to &&
        rule.allowed
    );
  }

  /**
   * Obtiene el estado actual
   */
  getCurrentState(): RecordingState {
    return this.currentState;
  }

  /**
   * Restablece al estado inicial
   */
  reset(): void {
    this.currentState = 'idle';
    console.log('🔄 State machine reset to idle');
  }

  /**
   * Verifica si está grabando actualmente
   */
  isRecording(): boolean {
    return this.currentState === 'recording';
  }

  /**
   * Verifica si está pausado
   */
  isPaused(): boolean {
    return this.currentState === 'paused';
  }

  /**
   * Verifica si está procesando
   */
  isProcessing(): boolean {
    return this.currentState === 'processing';
  }

  /**
   * Verifica si está en estado de error
   */
  hasError(): boolean {
    return this.currentState === 'error';
  }

  /**
   * Verifica si está en estado idle (disponible para nueva grabación)
   */
  isIdle(): boolean {
    return this.currentState === 'idle';
  }

  /**
   * Verifica si el estado actual permite iniciar grabación
   */
  canStart(): boolean {
    return this.canTransition('recording');
  }

  /**
   * Verifica si el estado actual permite pausar
   */
  canPause(): boolean {
    return this.canTransition('paused');
  }

  /**
   * Verifica si el estado actual permite reanudar
   */
  canResume(): boolean {
    return this.isPaused() && this.canTransition('recording');
  }

  /**
   * Verifica si el estado actual permite detener
   */
  canStop(): boolean {
    return (
      this.isRecording() || this.isPaused()
    ) && this.canTransition('processing');
  }

  /**
   * Obtiene estados válidos desde el estado actual
   */
  getValidTransitions(): RecordingState[] {
    return this.transitions
      .filter(
        (rule) =>
          rule.from === this.currentState && rule.allowed
      )
      .map((rule) => rule.to);
  }
}
