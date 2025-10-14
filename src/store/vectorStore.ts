/**
 * Vector Store v2 - Store rediseñado desde cero
 * Schema limpio, minimalista y versionado
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============= TYPES =============

export type VectorShape = 'line' | 'triangle' | 'arc' | 'circle';
export type AnimationType =
  | 'none'
  | 'static'
  | 'smoothWaves'
  | 'seaWaves'
  | 'perlinFlow'
  | 'mouseInteraction'
  | 'centerPulse'
  | 'heartbeat'
  | 'directionalFlow'
  | 'tangenteClasica'
  | 'lissajous'
  | 'geometricPattern'
  | 'randomStatic'
  | 'randomLoop'
  | 'staticAngle'
  | 'flocking'
  | 'vortex'
  | 'helicalCurl';

export type SpacingMode = 'fixed' | 'dynamic';

export type GradientCurve = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
export type GradientScope = 'vector' | 'field';

export interface GradientStop {
  id: string;
  color: string;
  position: number; // Rango 0 - 1
  opacity?: number; // Permitir stops semi-transparentes
  curve?: GradientCurve;
}

export interface GradientPreset {
  id: string;
  name: string;
  description?: string;
  type: 'linear' | 'radial';
  angle: number; // En grados, solo aplica a linear
  stops: GradientStop[];
  tags?: string[];
  featured?: boolean;
  createdAt?: number;
  updatedAt?: number;
  isCustom?: boolean;
}

export interface GradientConfig {
  enabled: boolean;
  type: 'linear' | 'radial';
  angle: number;
  stops: GradientStop[];
  scope: GradientScope;
  presetId?: string | null;
  name?: string;
}

export interface GradientLibraryState {
  customPresets: GradientPreset[];
  lastUsedPresetId?: string | null;
}

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const createStop = (color: string, position: number, options: Partial<GradientStop> = {}): GradientStop => ({
  id: options.id ?? createId('stop'),
  color,
  position: clamp01(position),
  opacity: options.opacity,
  curve: options.curve,
});

const normalizeStops = (stops: GradientStop[] = []): GradientStop[] => {
  if (!stops.length) {
    return [createStop('#FFFFFF', 0), createStop('#00FFFF', 1)];
  }

  return stops
    .map((stop, index) =>
      createStop(stop.color ?? '#FFFFFF', clamp01(stop.position ?? index / Math.max(1, stops.length - 1)), {
        id: stop.id,
        opacity: stop.opacity,
        curve: stop.curve,
      })
    )
    .sort((a, b) => a.position - b.position);
};

const cloneGradientConfig = (gradient: GradientConfig): GradientConfig => ({
  ...gradient,
  stops: gradient.stops.map((stop) => ({ ...stop })),
  scope: gradient.scope ?? 'vector',
});

const defaultGradient: GradientConfig = {
  enabled: false,
  type: 'linear',
  angle: 45,
  stops: [
    createStop('#FFFFFF', 0),
    createStop('#00FFFF', 1),
  ],
  scope: 'vector',
  presetId: null,
  name: 'Por defecto',
};

const defaultGradientLibrary: GradientLibraryState = {
  customPresets: [],
  lastUsedPresetId: null,
};

type AnimationParamSet = {
  frequency: number;
  amplitude: number;
  elasticity: number;
  maxLength: number;
};

const animationParamsDefaults: Record<AnimationType, AnimationParamSet> = {
  none: { frequency: 0, amplitude: 0, elasticity: 0, maxLength: 60 },
  static: { frequency: 0, amplitude: 0, elasticity: 0, maxLength: 60 },
  staticAngle: { frequency: 45, amplitude: 0, elasticity: 0, maxLength: 60 },
  randomStatic: { frequency: 0, amplitude: 0, elasticity: 0, maxLength: 70 },
  randomLoop: { frequency: 2, amplitude: 0, elasticity: 0, maxLength: 70 },
  smoothWaves: { frequency: 0.02, amplitude: 20, elasticity: 0.5, maxLength: 90 },
  seaWaves: { frequency: 0.02, amplitude: 35, elasticity: 0.8, maxLength: 110 },
  perlinFlow: { frequency: 0.015, amplitude: 30, elasticity: 0.45, maxLength: 100 },
  mouseInteraction: { frequency: 160, amplitude: 60, elasticity: 0.5, maxLength: 90 },
  centerPulse: { frequency: 0.02, amplitude: 28, elasticity: 0.6, maxLength: 120 },
  heartbeat: { frequency: 0.015, amplitude: 40, elasticity: 0.7, maxLength: 110 },
  directionalFlow: { frequency: 45, amplitude: 25, elasticity: 0.6, maxLength: 90 },
  tangenteClasica: { frequency: 0.6, amplitude: 1, elasticity: 0.5, maxLength: 110 },
  lissajous: { frequency: 2.0, amplitude: 3.0, elasticity: 120, maxLength: 90 },
  geometricPattern: { frequency: 4, amplitude: 45, elasticity: 0.5, maxLength: 80 },
  flocking: { frequency: 0.5, amplitude: 1.5, elasticity: 0.4, maxLength: 95 },
  vortex: { frequency: 1.2, amplitude: 0.45, elasticity: 1.2, maxLength: 130 },
  helicalCurl: { frequency: 1.1, amplitude: 60, elasticity: 0.4, maxLength: 150 },
};

const ensureGradientConfig = (input?: any): GradientConfig => {
  if (!input) {
    return cloneGradientConfig(defaultGradient);
  }

  if (Array.isArray(input)) {
    // Caso extremo: se guardó directamente como stops
    return {
      ...cloneGradientConfig(defaultGradient),
      enabled: true,
      stops: normalizeStops(input as GradientStop[]),
      scope: 'vector',
      presetId: null,
    };
  }

  if ('stops' in (input as Record<string, unknown>)) {
    const normalizedStops = normalizeStops((input as GradientConfig).stops);
    return {
      enabled: input.enabled ?? true,
      type: input.type ?? 'linear',
      angle: input.angle ?? 45,
      stops: normalizedStops,
      scope: (input as GradientConfig).scope ?? 'vector',
      presetId: input.presetId ?? null,
      name: input.name ?? undefined,
    };
  }

  const startColor = input.startColor ?? input.color ?? '#FFFFFF';
  const endColor = input.endColor ?? '#00FFFF';

  return {
    enabled: input.enabled ?? false,
    type: input.type ?? 'linear',
    angle: input.angle ?? 45,
    stops: normalizeStops([
      { id: createId('stop'), color: startColor, position: 0 },
      { id: createId('stop'), color: endColor, position: 1 },
    ]),
    scope: input.scope ?? 'vector',
    presetId: null,
    name: input.name ?? undefined,
  };
};

// ============= STATE SCHEMA =============

export interface VectorState {
  // Versión del schema (para migraciones futuras)
  version: number;

  // Configuración visual
  visual: {
    vectorLength: number;
    vectorWidth: number;
    shape: VectorShape;
    color: string;
    gradient?: GradientConfig;
  };

  // Configuración del grid
  grid: {
    rows: number;
    cols: number;
    spacing: number;
    mode: SpacingMode;
  };

  // Configuración de animación
  animation: {
    type: AnimationType;
    speed: number;
    paused: boolean;
    // Parámetros dinámicos por tipo de animación
    params: Record<string, number>;
  };

  // Configuración del canvas
  canvas: {
    width: number;
    height: number;
    zoom: number;
    backgroundColor: string;
  };

  // Biblioteca de gradientes
  gradients: GradientLibraryState;
}

// ============= ACTIONS =============

export interface VectorActions {
  // Visual
  setVisual: <K extends keyof VectorState['visual']>(key: K, value: VectorState['visual'][K]) => void;
  setGradient: (gradient: Partial<GradientConfig>) => void;
  setGradientStops: (stops: GradientStop[]) => void;
  applyGradientPreset: (preset: GradientPreset, options?: { remember?: boolean }) => void;
  addCustomGradientPreset: (preset: Omit<GradientPreset, 'id' | 'createdAt' | 'updatedAt' | 'isCustom'> & { id?: string }) => GradientPreset;
  updateCustomGradientPreset: (id: string, patch: Partial<Omit<GradientPreset, 'id'>>) => void;
  removeCustomGradientPreset: (id: string) => void;

  // Grid
  setGrid: (config: Partial<VectorState['grid']>) => void;
  setGridDimensions: (rows: number, cols: number) => void;

  // Animation
  setAnimation: (config: Partial<VectorState['animation']>) => void;
  setAnimationType: (type: AnimationType) => void;
  togglePause: () => void;
  setAnimationParam: (key: string, value: number) => void;

  // Canvas
  setCanvas: (config: Partial<VectorState['canvas']>) => void;

  // Reset
  reset: () => void;
}

// ============= STORE TYPE =============

export type VectorStore = VectorState & { actions: VectorActions };

// ============= DEFAULT STATE =============

const defaultState: VectorState = {
  version: 1,

  visual: {
    vectorLength: 30,
    vectorWidth: 2,
    shape: 'line',
    color: '#FFFFFF',
    gradient: defaultGradient,
  },

  grid: {
    rows: 15,
    cols: 20,
    spacing: 20,
    mode: 'fixed',
  },

  animation: {
    type: 'smoothWaves',
    speed: 1,
    paused: false,
    params: { ...animationParamsDefaults.smoothWaves },
  },

  canvas: {
    width: 800,
    height: 600,
    zoom: 1,
    backgroundColor: '#000000',
  },

  gradients: defaultGradientLibrary,
};

// ============= STORE IMPLEMENTATION =============

export const useVectorStore = create<VectorStore>()(
  persist(
    (set) => ({
      ...defaultState,

      actions: {
        // Visual actions
        setVisual: (key, value) =>
          set((state) => ({
            visual: { ...state.visual, [key]: value },
          })),

        setGradient: (gradient) =>
          set((state) => {
            const currentGradient = state.visual.gradient ?? cloneGradientConfig(defaultGradient);
            const shouldDetachPreset =
              gradient.stops !== undefined || gradient.type !== undefined || gradient.angle !== undefined;

            const nextGradient: GradientConfig = {
              ...currentGradient,
              ...gradient,
              stops: gradient.stops ? normalizeStops(gradient.stops) : currentGradient.stops,
              presetId: gradient.presetId ?? (shouldDetachPreset ? null : currentGradient.presetId ?? null),
              name: gradient.name ?? currentGradient.name,
              scope: gradient.scope ?? currentGradient.scope ?? 'vector',
            };

            return {
              visual: {
                ...state.visual,
                gradient: nextGradient,
              },
            };
          }),

        setGradientStops: (stops) =>
          set((state) => {
            const currentGradient = state.visual.gradient ?? cloneGradientConfig(defaultGradient);
            return {
              visual: {
                ...state.visual,
                gradient: {
                  ...currentGradient,
                  stops: normalizeStops(stops),
                  presetId: null,
                  scope: currentGradient.scope ?? 'vector',
                },
              },
            };
          }),

        applyGradientPreset: (preset, options) => {
          const normalizedStops = normalizeStops(preset.stops);
          set((state) => ({
            visual: {
              ...state.visual,
              gradient: {
                enabled: true,
                type: preset.type,
                angle: preset.angle,
                stops: normalizedStops,
                presetId: preset.id,
                name: preset.name,
                scope: state.visual.gradient?.scope ?? 'vector',
              },
            },
            gradients: {
              ...state.gradients,
              lastUsedPresetId:
                options?.remember === false ? state.gradients.lastUsedPresetId ?? preset.id : preset.id,
            },
          }));
        },

        addCustomGradientPreset: (presetInput) => {
          const now = Date.now();
          const normalizedStops = normalizeStops(presetInput.stops);
          const preset: GradientPreset = {
            id: presetInput.id ?? createId('preset'),
            name: presetInput.name ?? 'Nuevo gradiente',
            description: presetInput.description,
            type: presetInput.type ?? 'linear',
            angle: presetInput.angle ?? 45,
            stops: normalizedStops,
            tags: presetInput.tags,
            featured: presetInput.featured,
            createdAt: now,
            updatedAt: now,
            isCustom: true,
          };

          set((state) => ({
            gradients: {
              ...state.gradients,
              customPresets: [...state.gradients.customPresets, preset],
              lastUsedPresetId: preset.id,
            },
          }));

          return preset;
        },

        updateCustomGradientPreset: (id, patch) =>
          set((state) => ({
            gradients: {
              ...state.gradients,
              customPresets: state.gradients.customPresets.map((preset) =>
                preset.id === id
                  ? {
                      ...preset,
                      ...patch,
                      stops: patch.stops ? normalizeStops(patch.stops as GradientStop[]) : preset.stops,
                      updatedAt: Date.now(),
                    }
                  : preset
              ),
            },
          })),

        removeCustomGradientPreset: (id) =>
          set((state) => ({
            gradients: {
              ...state.gradients,
              customPresets: state.gradients.customPresets.filter((preset) => preset.id !== id),
              lastUsedPresetId: state.gradients.lastUsedPresetId === id ? null : state.gradients.lastUsedPresetId,
            },
          })),

        // Grid actions
        setGrid: (config) =>
          set((state) => ({
            grid: { ...state.grid, ...config },
          })),

        setGridDimensions: (rows, cols) =>
          set((state) => ({
            grid: { ...state.grid, rows, cols },
          })),

        // Animation actions
        setAnimation: (config) =>
          set((state) => ({
            animation: { ...state.animation, ...config },
          })),

        setAnimationType: (type) =>
          set((state) => ({
            animation: {
              ...state.animation,
              type,
              params: { ...animationParamsDefaults[type] },
            },
          })),

        togglePause: () =>
          set((state) => ({
            animation: { ...state.animation, paused: !state.animation.paused },
          })),

        setAnimationParam: (key, value) =>
          set((state) => ({
            animation: {
              ...state.animation,
              params: { ...state.animation.params, [key]: value },
            },
          })),

        // Canvas actions
        setCanvas: (config) =>
          set((state) => ({
            canvas: { ...state.canvas, ...config },
          })),

        // Reset
        reset: () => set(defaultState),
      },
    }),
    {
      name: 'victor-vector-store-v2',
      storage: createJSONStorage(() => localStorage),

      // Solo persistir visual, grid y animation (no canvas ni version)
      partialize: (state) => ({
        visual: state.visual,
        grid: state.grid,
        animation: {
          ...state.animation,
          paused: false, // Siempre iniciar sin pausa
        },
        gradients: state.gradients,
      }),

      // Validación y migración al cargar
      merge: (persistedState: unknown, currentState) => {
        const pState = persistedState as Partial<VectorState>;
        // Si no hay versión, es estado antiguo - resetear
        if (!pState?.version) {
          console.warn('⚠️ Estado antiguo detectado, usando valores por defecto');
          return currentState;
        }

        // Validar shapes
        const validShapes: VectorShape[] = ['line', 'triangle', 'arc', 'circle'];
        if (pState.visual?.shape && !validShapes.includes(pState.visual.shape)) {
          pState.visual.shape = 'line';
        }

        // Validar animationType (migraciones de valores antiguos)
        if (pState.animation?.type && (pState.animation.type as string) === 'tangentialFlow') {
          pState.animation.type = 'tangenteClasica';
        }

        const validTypes: AnimationType[] = [
          'none',
          'static',
          'staticAngle',
          'randomStatic',
          'randomLoop',
          'smoothWaves',
          'seaWaves',
          'perlinFlow',
          'mouseInteraction',
          'centerPulse',
          'heartbeat',
          'directionalFlow',
          'tangenteClasica',
          'lissajous',
          'geometricPattern',
          'flocking',
          'vortex',
          'helicalCurl',
        ];
        if (pState.animation?.type && !validTypes.includes(pState.animation.type)) {
          pState.animation.type = 'smoothWaves';
        }

        const mergedVisualGradient = ensureGradientConfig(pState.visual?.gradient ?? currentState.visual.gradient);

        const mergedVisual = {
          ...currentState.visual,
          ...pState.visual,
          gradient: mergedVisualGradient,
        };

        const persistedGradients = (pState as any).gradients as Partial<GradientLibraryState> | undefined;
        const customPresets = persistedGradients?.customPresets?.map((preset) => ({
          ...preset,
          id: preset.id ?? createId('preset'),
          type: preset.type ?? 'linear',
          angle: preset.angle ?? 45,
          stops: normalizeStops((preset.stops as GradientStop[] | undefined) ?? []),
          createdAt: preset.createdAt ?? Date.now(),
          updatedAt: preset.updatedAt ?? Date.now(),
          isCustom: true,
        })) ?? currentState.gradients.customPresets;

        const mergedGradients: GradientLibraryState = {
          customPresets,
          lastUsedPresetId:
            persistedGradients?.lastUsedPresetId ?? currentState.gradients.lastUsedPresetId ?? null,
        };

        // Merge con valores por defecto
        const resolvedType = validTypes.includes(pState.animation?.type as AnimationType)
          ? (pState.animation?.type as AnimationType)
          : currentState.animation.type;

        const mergedAnimation = {
          ...currentState.animation,
          ...pState.animation,
          type: resolvedType,
          params: {
            ...animationParamsDefaults[resolvedType],
            ...(pState.animation?.params ?? {}),
          },
          paused: false,
        };

        return {
          ...currentState,
          visual: mergedVisual,
          grid: { ...currentState.grid, ...pState.grid },
          animation: mergedAnimation,
          gradients: mergedGradients,
        };
      },
    }
  )
);

// ============= SELECTORS =============

// Selectores optimizados para evitar re-renders innecesarios
export const selectVisual = (state: VectorStore) => state.visual;
export const selectGrid = (state: VectorStore) => state.grid;
export const selectAnimation = (state: VectorStore) => state.animation;
export const selectCanvas = (state: VectorStore) => state.canvas;
export const selectActions = (state: VectorStore) => state.actions;
export const selectGradientLibrary = (state: VectorStore) => state.gradients;

// Selector combinado para configuración completa
export const selectVectorConfig = (state: VectorStore) => ({
  visual: state.visual,
  grid: state.grid,
  animation: state.animation,
  canvas: state.canvas,
});

// ============= UTILITIES =============

/**
 * Limpia el store del localStorage (útil para debugging)
 */
export const clearVectorStore = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('victor-vector-store-v2');
    console.log('🧹 Store limpiado');
  }
};
