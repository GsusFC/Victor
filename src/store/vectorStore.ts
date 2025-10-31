/**
 * Vector Store v2 - Store rediseñado desde cero
 * Schema limpio, minimalista y versionado
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AnimationType, VectorShape } from '@/types/engine';

// ============= TYPES =============

export type AnimationCategory = 'natural' | 'energetic' | 'geometric' | 'experimental';


export type SpacingMode = 'fixed' | 'dynamic';

export type GradientCurve = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
export type GradientScope = 'vector' | 'field';

export interface GradientStop {
  id: string;
  color: string;
  position: number;
  opacity?: number;
  curve?: GradientCurve;
}

export interface GradientPreset {
  id: string;
  name: string;
  description?: string;
  type: 'linear' | 'radial';
  angle: number;
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
  smoothWaves: { frequency: 0.02, amplitude: 20, elasticity: 0.5, maxLength: 90 },
  seaWaves: { frequency: 0.02, amplitude: 35, elasticity: 0.8, maxLength: 110 },
  breathingSoft: { frequency: 1.1, amplitude: 60, elasticity: 0.4, maxLength: 150 },
  flowField: { frequency: 0.04, amplitude: 1.2, elasticity: 0.5, maxLength: 100 },
  dnaHelix: { frequency: 1.0, amplitude: 0.4, elasticity: 45, maxLength: 100 },
  rippleEffect: { frequency: 1.5, amplitude: 4, elasticity: 0.5, maxLength: 120 },
  organicGrowth: { frequency: 1.0, amplitude: 0.5, elasticity: 0.2, maxLength: 150 },
  fluidDynamics: { frequency: 0.05, amplitude: 1.0, elasticity: 0.6, maxLength: 100 },
  aurora: { frequency: 1.0, amplitude: 45, elasticity: 0.5, maxLength: 110 },
  electricPulse: { frequency: 0.03, amplitude: 45, elasticity: 0.7, maxLength: 130 },
  vortex: { frequency: 1.2, amplitude: 0.45, elasticity: 1.2, maxLength: 130 },
  directionalFlow: { frequency: 45, amplitude: 25, elasticity: 0.6, maxLength: 90 },
  storm: { frequency: 1.5, amplitude: 1.0, elasticity: 1.2, maxLength: 140 },
  solarFlare: { frequency: 1.8, amplitude: 0.5, elasticity: 45, maxLength: 150 },
  radiation: { frequency: 1.0, amplitude: 4, elasticity: 0.5, maxLength: 120 },
  magneticField: { frequency: 4, amplitude: 1.5, elasticity: 0.8, maxLength: 125 },
  chaosAttractor: { frequency: 0, amplitude: 0, elasticity: 0, maxLength: 110 },
  plasmaBall: { frequency: 1.5, amplitude: 6, elasticity: 0.3, maxLength: 130 },
  blackHole: { frequency: 1.2, amplitude: 0.5, elasticity: 0.5, maxLength: 140 },
  lightningStorm: { frequency: 2.0, amplitude: 0.4, elasticity: 0.6, maxLength: 120 },
  quantumField: { frequency: 0.08, amplitude: 1.0, elasticity: 0.5, maxLength: 110 },
  tangenteClasica: { frequency: 0.6, amplitude: 1, elasticity: 0.5, maxLength: 110 },
  lissajous: { frequency: 2.0, amplitude: 3.0, elasticity: 120, maxLength: 90 },
  geometricPattern: { frequency: 4, amplitude: 45, elasticity: 0.5, maxLength: 80 },
  harmonicOscillator: { frequency: 2.0, amplitude: 1.0, elasticity: 0.4, maxLength: 90 },
  spirograph: { frequency: 0.6, amplitude: 1.5, elasticity: 0.8, maxLength: 100 },
  fibonacci: { frequency: 0.3, amplitude: 45, elasticity: 0.5, maxLength: 100 },
  voronoiDiagram: { frequency: 8, amplitude: 0.5, elasticity: 0.3, maxLength: 110 },
  mandalas: { frequency: 6, amplitude: 1.5, elasticity: 0.4, maxLength: 95 },
  kaleidoscope: { frequency: 3, amplitude: 1.0, elasticity: 1.0, maxLength: 100 },
  springMesh: { frequency: 1.0, amplitude: 0.8, elasticity: 0.6, maxLength: 100 },
};

const ensureGradientConfig = (input?: any): GradientConfig => {
  if (!input) {
    return cloneGradientConfig(defaultGradient);
  }

  if (Array.isArray(input)) {
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

export interface VectorState {
  version: number;
  visual: {
    vectorLength: number;
    vectorWidth: number;
    shape: VectorShape;
    color: string;
    gradient?: GradientConfig;
    trails: {
      enabled: boolean;
      length: number;
      opacity: number;
      fadeMode: 'linear' | 'exponential';
    };
    postProcessing: {
      enabled: boolean;
      bloom: {
        enabled: boolean;
        intensity: number;
        threshold: number;
        radius: number;
      };
      advancedBloom: {
        enabled: boolean;
        quality: 5 | 9 | 13;
        radius: number;
        threshold: number;
        intensity: number;
      };
      chromaticAberration: {
        enabled: boolean;
        intensity: number;
        offset: number;
      };
      vignette: {
        enabled: boolean;
        intensity: number;
        softness: number;
      };
      exposure: number;
      contrast: number;
      saturation: number;
      brightness: number;
    };
  };
  grid: {
    rows: number;
    cols: number;
    spacing: number;
    mode: SpacingMode;
  };
  animation: {
    type: AnimationType;
    speed: number;
    paused: boolean;
    category?: AnimationCategory;
    params: Record<string, number>;
    seed: number;
    autoSeed: boolean;
  };
  canvas: {
    width: number;
    height: number;
    zoom: number;
    backgroundColor: string;
  };
  gradients: GradientLibraryState;
}

export interface VectorActions {
  setVisual: <K extends keyof VectorState['visual']>(key: K, value: VectorState['visual'][K]) => void;
  setTrails: (trails: Partial<VectorState['visual']['trails']>) => void;
  setPostProcessing: (config: Partial<VectorState['visual']['postProcessing']>) => void;
  setGradient: (gradient: Partial<GradientConfig>) => void;
  setGradientStops: (stops: GradientStop[]) => void;
  applyGradientPreset: (preset: GradientPreset, options?: { remember?: boolean }) => void;
  addCustomGradientPreset: (preset: Omit<GradientPreset, 'id' | 'createdAt' | 'updatedAt' | 'isCustom'> & { id?: string }) => GradientPreset;
  updateCustomGradientPreset: (id: string, patch: Partial<Omit<GradientPreset, 'id'>>) => void;
  removeCustomGradientPreset: (id: string) => void;
  setGrid: (config: Partial<VectorState['grid']>) => void;
  setGridDimensions: (rows: number, cols: number) => void;
  setAnimation: (config: Partial<VectorState['animation']>) => void;
  setAnimationType: (type: AnimationType) => void;
  togglePause: () => void;
  setAnimationParam: (key: string, value: number) => void;
  setSeed: (seed: number) => void;
  generateNewSeed: () => void;
  toggleAutoSeed: () => void;
  setCanvas: (config: Partial<VectorState['canvas']>) => void;
  importConfig: (config: Pick<VectorState, 'animation' | 'grid' | 'visual' | 'gradients'>) => void;
  reset: () => void;
}

export type VectorStore = VectorState & { actions: VectorActions };

const defaultState: VectorState = {
  version: 1,
  visual: {
    vectorLength: 30,
    vectorWidth: 2,
    shape: 'line',
    color: '#FFFFFF',
    gradient: defaultGradient,
    trails: {
      enabled: false,
      length: 8,
      opacity: 0.6,
      fadeMode: 'exponential',
    },
    postProcessing: {
      enabled: false,
      bloom: {
        enabled: false,
        intensity: 0.5,
        threshold: 0.7,
        radius: 3,
      },
      advancedBloom: {
        enabled: false,
        quality: 9,
        radius: 1.5,
        threshold: 0.7,
        intensity: 0.5,
      },
      chromaticAberration: {
        enabled: false,
        intensity: 0.5,
        offset: 0.01,
      },
      vignette: {
        enabled: false,
        intensity: 0.6,
        softness: 0.4,
      },
      exposure: 1.0,
      contrast: 1.0,
      saturation: 1.0,
      brightness: 1.0,
    },
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
    seed: Math.floor(Math.random() * 1000000),
    autoSeed: true,
  },
  canvas: {
    width: 800,
    height: 600,
    zoom: 1,
    backgroundColor: '#000000',
  },
  gradients: defaultGradientLibrary,
};

export const useVectorStore = create<VectorStore>()(
  persist(
    (set) => ({
      ...defaultState,
      actions: {
        setVisual: (key, value) =>
          set((state) => ({
            visual: { ...state.visual, [key]: value },
          })),
        setTrails: (trails) =>
          set((state) => ({
            visual: {
              ...state.visual,
              trails: { ...state.visual.trails, ...trails },
            },
          })),
        setPostProcessing: (config) =>
          set((state) => ({
            visual: {
              ...state.visual,
              postProcessing: {
                ...state.visual.postProcessing,
                ...config,
                bloom: config.bloom ? { ...state.visual.postProcessing.bloom, ...config.bloom } : state.visual.postProcessing.bloom,
                advancedBloom: (config as any).advancedBloom ? { ...state.visual.postProcessing.advancedBloom, ...(config as any).advancedBloom } : state.visual.postProcessing.advancedBloom,
                chromaticAberration: config.chromaticAberration ? { ...state.visual.postProcessing.chromaticAberration, ...config.chromaticAberration } : state.visual.postProcessing.chromaticAberration,
                vignette: config.vignette ? { ...state.visual.postProcessing.vignette, ...config.vignette } : state.visual.postProcessing.vignette,
              },
            },
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
        setGrid: (config) =>
          set((state) => ({
            grid: { ...state.grid, ...config },
          })),
        setGridDimensions: (rows, cols) =>
          set((state) => ({
            grid: { ...state.grid, rows, cols },
          })),
        setAnimation: (config) =>
          set((state) => ({
            animation: { ...state.animation, ...config },
          })),
        setAnimationType: (type) =>
          set((state) => {
            const newSeed = state.animation.autoSeed
              ? Math.floor(Math.random() * 1000000)
              : state.animation.seed;
            return {
              animation: {
                ...state.animation,
                type,
                params: { ...animationParamsDefaults[type] },
                seed: newSeed,
              },
            };
          }),
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
        setSeed: (seed) =>
          set((state) => ({
            animation: { ...state.animation, seed },
          })),
        generateNewSeed: () =>
          set((state) => ({
            animation: {
              ...state.animation,
              seed: Math.floor(Math.random() * 1000000),
            },
          })),
        toggleAutoSeed: () =>
          set((state) => ({
            animation: {
              ...state.animation,
              autoSeed: !state.animation.autoSeed,
            },
          })),
        setCanvas: (config) =>
          set((state) => ({
            canvas: { ...state.canvas, ...config },
          })),
        importConfig: (config) =>
          set((state) => ({
            animation: { ...state.animation, ...config.animation, paused: false },
            grid: { ...state.grid, ...config.grid },
            visual: {
              ...state.visual,
              ...config.visual,
              gradient: ensureGradientConfig(config.visual?.gradient),
            },
            gradients: { ...state.gradients, ...config.gradients },
          })),
        reset: () => set(defaultState),
      },
    }),
    {
      name: 'victor-vector-store-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        version: state.version,
        visual: state.visual,
        grid: state.grid,
        animation: {
          ...state.animation,
          paused: false,
        },
        gradients: state.gradients,
      }),
      merge: (persistedState: unknown, currentState) => {
        const pState = persistedState as Partial<VectorState>;
        if (!pState?.version) {
          console.warn('⚠️ Estado antiguo detectado, usando valores por defecto');
          return currentState;
        }
        if (pState.visual?.postProcessing && !(pState.visual.postProcessing as any).advancedBloom) {
          (pState.visual.postProcessing as any).advancedBloom = {
            enabled: false,
            quality: 9,
            radius: 1.5,
            threshold: 0.7,
            intensity: 0.5,
          };
        }
        const validTypes: AnimationType[] = Object.keys(animationParamsDefaults) as AnimationType[];
        if (pState.animation?.type && !validTypes.includes(pState.animation.type)) {
          pState.animation.type = 'smoothWaves';
        }
        const mergedVisualGradient = ensureGradientConfig(pState.visual?.gradient ?? currentState.visual.gradient);
        const mergedVisual = {
          ...currentState.visual,
          ...pState.visual,
          gradient: mergedVisualGradient,
        };
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
          gradients: { ...currentState.gradients, ...pState.gradients },
        };
      },
    }
  )
);

export const selectVisual = (state: VectorStore) => state.visual;
export const selectGrid = (state: VectorStore) => state.grid;
export const selectAnimation = (state: VectorStore) => state.animation;
export const selectCanvas = (state: VectorStore) => state.canvas;
export const selectActions = (state: VectorStore) => state.actions;
export const selectGradientLibrary = (state: VectorStore) => state.gradients;

export const selectVectorConfig = (state: VectorStore) => ({
  visual: state.visual,
  grid: state.grid,
  animation: state.animation,
  canvas: state.canvas,
});

export const getAnimationCategory = (type: AnimationType): AnimationCategory => {
  const categoryMap: Record<AnimationType, AnimationCategory> = {
    none: 'experimental',
    smoothWaves: 'natural',
    seaWaves: 'natural',
    breathingSoft: 'natural',
    flowField: 'natural',
    dnaHelix: 'natural',
    rippleEffect: 'natural',
    organicGrowth: 'natural',
    fluidDynamics: 'natural',
    aurora: 'natural',
    electricPulse: 'energetic',
    vortex: 'energetic',
    directionalFlow: 'energetic',
    storm: 'energetic',
    solarFlare: 'energetic',
    radiation: 'energetic',
    magneticField: 'energetic',
    chaosAttractor: 'energetic',
    plasmaBall: 'energetic',
    blackHole: 'energetic',
    lightningStorm: 'energetic',
    quantumField: 'energetic',
    tangenteClasica: 'geometric',
    lissajous: 'geometric',
    geometricPattern: 'geometric',
    harmonicOscillator: 'geometric',
    spirograph: 'geometric',
    fibonacci: 'geometric',
    voronoiDiagram: 'geometric',
    mandalas: 'geometric',
    kaleidoscope: 'geometric',
    springMesh: 'experimental',
  };
  return categoryMap[type] || 'experimental';
};

export const getAnimationsByCategory = (category: AnimationCategory): AnimationType[] => {
  const allTypes: AnimationType[] = [
    'none',
    'smoothWaves',
    'seaWaves',
    'breathingSoft',
    'flowField',
    'dnaHelix',
    'rippleEffect',
    'organicGrowth',
    'fluidDynamics',
    'aurora',
    'electricPulse',
    'vortex',
    'directionalFlow',
    'storm',
    'solarFlare',
    'radiation',
    'magneticField',
    'chaosAttractor',
    'plasmaBall',
    'blackHole',
    'lightningStorm',
    'quantumField',
    'tangenteClasica',
    'lissajous',
    'geometricPattern',
    'harmonicOscillator',
    'spirograph',
    'fibonacci',
    'voronoiDiagram',
    'mandalas',
    'kaleidoscope',
    'springMesh',
  ];
  return allTypes.filter((type) => getAnimationCategory(type) === category);
};

export const clearVectorStore = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('victor-vector-store-v2');
    console.log('🧹 Store limpiado');
  }
};
