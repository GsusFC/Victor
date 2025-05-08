import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { produce } from 'immer'; // Importar produce
import { v4 as uuidv4 } from 'uuid'; // Importar UUID para generar IDs únicos
import type { 
  VectorSettings, 
  BaseVectorSettings, 
  AnimationType, 
  VectorShape,
  LineCap,
  AspectRatio,
  RotationOrigin,
  PinwheelCenter,
  OceanEddy,
  AnimationFavorite
} from '@/components/vector/core/types';
import type { ExtendedVectorItem } from '@/components/vector/core/vectorTypes';

// Tipos de datos para el store
export interface VectorStore extends VectorStoreState {
  actions: VectorStoreActions; // Añadir la propiedad actions aquí
}

// Valores por defecto para animaciones
export const defaultAnimationSettings: Omit<BaseVectorSettings, keyof BaseVectorSettings> = {
  animationType: 'smoothWaves' as AnimationType,
  currentAnimationType: 'smoothWaves' as AnimationType,
  seaWaveFrequency: 0.02,
  seaWaveAmplitude: 30,
  perlinNoiseScale: 0.02,
  perlinNoiseSpeed: 0.002,
  mouseAttractionRadius: 100,
  mouseAttractionStrength: 1,
  pulseDuration: 2000,
  
  // Valores por defecto para patrones geométricos
  geometricPatternSize: 30,
  geometricPatternComplexity: 3,
  geometricPatternRotationSpeed: 0.5,
  
  // Valores por defecto para vórtice/remolino
  vortexStrength: 0.3,
  vortexCenterX: 50, // Centro (50%)
  vortexCenterY: 50, // Centro (50%)
  
  // Valores por defecto para seguir camino
  followPathComplexity: 2,
  followPathSpeed: 0.5,
  followPathVariation: 0.3,
  
  // Valores por defecto para Lissajous
  lissajousParamA: 3,
  lissajousParamB: 2,
  lissajousFrequency: 0.001,
  lissajousDelta: Math.PI / 2, // 90 grados en radianes
  
  // Valores por defecto para waterfall (cascada)
  waterfallTurbulence: 15, // Amplitud de la oscilación
  waterfallTurbulenceSpeed: 0.003, // Velocidad de la turbulencia
  waterfallOffsetFactor: 0.2, // Factor de desfase para la cascada
  waterfallGravityCycle: 2000, // Duración del ciclo de gravedad en ms
  waterfallGravityStrength: 0.5, // Intensidad del efecto de gravedad
  waterfallMaxStretch: 1.5, // Estiramiento máximo de los vectores
  waterfallDriftStrength: 0.2 // Intensidad de la deriva lateral
};

// Valores por defecto para configuración básica
export const defaultBaseSettings: BaseVectorSettings = {
  vectorLength: 20,
  vectorWidth: 2, // Valor por defecto para el grosor de los vectores
  vectorSpacing: 30,
  gridRows: 10,
  vectorColor: '#ffffff',
  vectorShape: 'semicircle' as VectorShape,
  strokeLinecap: 'round' as LineCap,
  animationSpeed: 1,
  backgroundColor: '#000000',
  mouseAttraction: false,
  aspectRatio: '16:9' as AspectRatio,
  animationSpeedFactor: 1,
  easingFactor: 0.1,
  useAdvancedControls: false,
  vectorLineCap: 'butt', // Valor por defecto para LineCap
  vectorStrokeWidth: 1,
  isStrokeVariabilityActive: false,
  pinwheelCount: 5,
  vortexInwardFactor: 0.01,
  jitterIntensity: 0.1,
  pulseInterval: 1000, // Valor por defecto para pulseInterval
  rotationOrigin: 'start' as RotationOrigin, // Nuevo valor por defecto
  dynamicLengthEnabled: false,
  dynamicLengthIntensity: 0.7, // Aumentado para mayor efecto visual
};

// Configuración completa por defecto - SOLO SETTINGS
export const defaultSettings: VectorSettings = {
  // --- Propiedades de BaseVectorSettings --- 
  vectorLength: 30,
  vectorWidth: 2, 
  vectorSpacing: 20,
  gridRows: 15,
  vectorColor: '#FFFFFF',
  vectorShape: 'line',
  strokeLinecap: 'round', 
  animationSpeed: 1, 
  backgroundColor: '#000000', 
  mouseAttraction: true, 
  aspectRatio: '16:9',
  animationSpeedFactor: 1, 
  easingFactor: 0.1,
  useAdvancedControls: false, 
  vectorLineCap: 'round', // Mantener consistencia con strokeLinecap
  vectorStrokeWidth: 2, // Mantener consistencia con vectorWidth
  isStrokeVariabilityActive: false, 
  pinwheelCount: 3, 
  vortexInwardFactor: 0.5, 
  jitterIntensity: 0.1,
  pulseInterval: 1000,
  rotationOrigin: 'start',
  dynamicLengthEnabled: false,
  dynamicLengthIntensity: 0.7, // Aumentado para mayor efecto visual
  
  // --- Propiedades de AnimationVectorSettings (excluyendo las ya en Base) --- 
  animationType: 'smoothWaves',
  currentAnimationType: 'smoothWaves',
  seaWaveFrequency: 0.02,
  seaWaveAmplitude: 20,
  perlinNoiseScale: 0.01, // Corregido de noiseScale
  perlinNoiseSpeed: 0.005, // Corregido de noiseSpeed
  mouseAttractionRadius: 100, // Corregido de mouseRadius
  mouseAttractionStrength: 1, // Corregido de mouseStrength
  pulseDuration: 500, 
  geometricPatternSize: 50, 
  geometricPatternComplexity: 3, 
  geometricPatternRotationSpeed: 0.01, 
  vortexStrength: 1,
  vortexCenterX: 50, 
  vortexCenterY: 50, 
  followPathComplexity: 5, 
  followPathSpeed: 1, 
  followPathVariation: 0.1, 
  lissajousParamA: 1, 
  lissajousParamB: 2, 
  lissajousFrequency: 0.01, 
  lissajousDelta: Math.PI / 2, 
  
  // Valores por defecto para waterfall (cascada)
  waterfallTurbulence: 15, 
  waterfallTurbulenceSpeed: 0.003, 
  waterfallOffsetFactor: 0.2, 
  waterfallGravityCycle: 2000, 
  waterfallGravityStrength: 0.5, 
  waterfallMaxStretch: 1.5, 
  waterfallDriftStrength: 0.2, 
  
  // --- Propiedad de VectorSettings --- 
  isPaused: false,
};

// Definición explícita del estado base sin las acciones
export interface VectorStoreState {
  svgLines: ExtendedVectorItem[];
  vectorGridMap: Map<string, number>;
  animationFrameId: number | null;
  isLoading: boolean;
  error: string | null;
  // Agrupar valores calculados
  calculatedValues: {
    gridCols: number;
    logicalWidth: number;
    logicalHeight: number;
  };
  settings: VectorSettings;
  pinwheelCenters: PinwheelCenter[];
  lastPulseTime: number;
  oceanEddies: OceanEddy[];
  // Colección de favoritos de animación
  animationFavorites: AnimationFavorite[];
}

// Interfaz para las acciones separada para claridad
export interface VectorStoreActions {
  setInitialSettings: (settings: Partial<VectorSettings>) => void;
  resetSettings: () => void;
  setSvgLines: (lines: ExtendedVectorItem[]) => void;
  setCalculatedValues: (gridCols: number, logicalWidth: number, logicalHeight: number) => void;
  setVectorGridMap: (map: Map<string, number>) => void;
  updateSetting: <K extends keyof VectorSettings>(key: K, value: VectorSettings[K]) => void;
  togglePause: () => void;
  setAnimationType: (type: AnimationType) => void;
  setVectorShape: (shape: VectorShape) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setLineCap: (cap: LineCap) => void;
  setPinwheelCenters: (centers: PinwheelCenter[]) => void;
  setLastPulseTime: (time: number) => void;
  setRotationOrigin: (origin: RotationOrigin) => void;
  setDynamicLengthEnabled: (enabled: boolean) => void;
  setDynamicLengthIntensity: (intensity: number) => void;
  // Añadir las que faltaban de la implementación
  updateVectorAngle: (id: string, angle: number) => void;
  setAnimationFrameId: (id: number | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  resetStore: () => void;
  
  // Acciones para gestión de favoritos de animación
  saveAnimationFavorite: (name: string) => void;
  loadAnimationFavorite: (id: string) => void;
  deleteAnimationFavorite: (id: string) => void;
  renameAnimationFavorite: (id: string, newName: string) => void;
}

// Estado inicial completo
const initialState: VectorStoreState = {
  svgLines: [],
  vectorGridMap: new Map(),
  animationFrameId: null,
  isLoading: false,
  error: null,
  calculatedValues: { gridCols: 0, logicalWidth: 0, logicalHeight: 0 },
  settings: { ...defaultSettings },
  pinwheelCenters: [],
  lastPulseTime: 0,
  oceanEddies: [], 
  animationFavorites: [],
};

// --- STORE --- //
const createVectorStore = () => create<VectorStore>()(persist(
  (set) => ({
    ...initialState,
    actions: {
      // Usar setInitialSettings en lugar de setSettings genérico aquí
      setInitialSettings: (settings) => set(produce((draft: VectorStoreState) => {
        Object.assign(draft.settings, settings);
        // Quizás marcar isInitialized aquí si tuviéramos esa propiedad en State
      })),
      setSvgLines: (lines: ExtendedVectorItem[]) =>
        set(() => ({ svgLines: lines })), 
      
      updateVectorAngle: (id: string, angle: number) =>
        set(produce((state: VectorStoreState) => {
          const line = state.svgLines.find(l => l.id === id);
          if (line) {
            line.currentAngle = angle;
          }
          // Actualizar map es innecesario aquí si los índices no cambian
        })),
      
      setAnimationFrameId: (id: number | null) =>
        set(() => ({ animationFrameId: id })), 
      
      setIsLoading: (isLoading: boolean) =>
        set(() => ({ isLoading })), 
      
      setError: (error: string | null) =>
        set(() => ({ error })), 
      
      // Corregir setCalculatedValues para usar el objeto anidado
      setCalculatedValues: (gridCols: number, logicalWidth: number, logicalHeight: number) =>
        set(() => ({ 
          calculatedValues: { gridCols, logicalWidth, logicalHeight }
        })), 
      resetSettings: () =>
        set(() => ({ settings: { ...defaultSettings } })), // Usar copia
      resetStore: () =>
        set(() => ({ 
          ...initialState,
          settings: defaultSettings
        })), 
      
      setPinwheelCenters: (centers: PinwheelCenter[]) =>
        set(() => ({ pinwheelCenters: centers })), 
      
      setLastPulseTime: (time: number) =>
        set(() => ({ lastPulseTime: time })), 
      
      setRotationOrigin: (origin: RotationOrigin) => 
        set(produce((draft: VectorStoreState) => {
          draft.settings.rotationOrigin = origin;
        })), 
      
      setDynamicLengthEnabled: (enabled: boolean) => 
        set(produce((draft: VectorStoreState) => {
          draft.settings.dynamicLengthEnabled = enabled;
        })), 
      
      setDynamicLengthIntensity: (intensity: number) =>
        set(produce((draft: VectorStoreState) => {
          draft.settings.dynamicLengthIntensity = intensity;
        })),

      // Implementación de acciones para gestionar favoritos de animación
      saveAnimationFavorite: (name: string) => 
        set(produce((state: VectorStoreState) => {
          // Extraer solo las propiedades de animación relevantes
          const relevantSettings: Partial<VectorSettings> = {
            animationType: state.settings.animationType,
            vectorShape: state.settings.vectorShape,
            vectorStrokeWidth: state.settings.vectorStrokeWidth,
            vectorColor: state.settings.vectorColor,
            backgroundColor: state.settings.backgroundColor,
            dynamicLengthEnabled: state.settings.dynamicLengthEnabled,
            dynamicLengthIntensity: state.settings.dynamicLengthIntensity,
            seaWaveFrequency: state.settings.seaWaveFrequency,
            seaWaveAmplitude: state.settings.seaWaveAmplitude,
            perlinNoiseScale: state.settings.perlinNoiseScale,
            perlinNoiseSpeed: state.settings.perlinNoiseSpeed,
            mouseAttractionRadius: state.settings.mouseAttractionRadius,
            mouseAttractionStrength: state.settings.mouseAttractionStrength,
            pulseDuration: state.settings.pulseDuration,
            geometricPatternSize: state.settings.geometricPatternSize,
            geometricPatternComplexity: state.settings.geometricPatternComplexity,
            geometricPatternRotationSpeed: state.settings.geometricPatternRotationSpeed,
            animationSpeed: state.settings.animationSpeed,
            rotationOrigin: state.settings.rotationOrigin,
          };
          
          // Crear un nuevo favorito
          const newFavorite: AnimationFavorite = {
            id: uuidv4(),
            name: name,
            timestamp: Date.now(),
            settings: relevantSettings
          };
          
          // Añadir a la colección de favoritos
          state.animationFavorites.push(newFavorite);
        })),
        
      loadAnimationFavorite: (id: string) =>
        set(produce((state: VectorStoreState) => {
          const favorite = state.animationFavorites.find(fav => fav.id === id);
          if (favorite) {
            // Aplicar la configuración guardada al estado actual
            Object.assign(state.settings, favorite.settings);
          }
        })),
        
      deleteAnimationFavorite: (id: string) =>
        set(produce((state: VectorStoreState) => {
          state.animationFavorites = state.animationFavorites.filter(fav => fav.id !== id);
        })),
        
      renameAnimationFavorite: (id: string, newName: string) =>
        set(produce((state: VectorStoreState) => {
          const favorite = state.animationFavorites.find(fav => fav.id === id);
          if (favorite) {
            favorite.name = newName;
            favorite.timestamp = Date.now(); // Actualizar timestamp
          }
        })),

      togglePause: () => set(produce((draft: VectorStoreState) => {
        draft.settings.isPaused = !draft.settings.isPaused;
      })),

      setAnimationType: (type: AnimationType) => set(produce((draft: VectorStoreState) => {
        draft.settings.animationType = type;
        draft.settings.currentAnimationType = type; // Actualizar ambas propiedades
      })),
      
      setVectorShape: (shape: VectorShape) => set(produce((draft: VectorStoreState) => {
        draft.settings.vectorShape = shape;
      })),
      setAspectRatio: (ratio: AspectRatio) => set(produce((draft: VectorStoreState) => {
        draft.settings.aspectRatio = ratio;
      })),
      setLineCap: (cap: LineCap) => set(produce((draft: VectorStoreState) => {
        // Actualizar vectorLineCap (propiedad correcta) y strokeLinecap (para compatibilidad)
        draft.settings.vectorLineCap = cap;
        draft.settings.strokeLinecap = cap; // Mantener compatibilidad con código anterior
      })),
      setVectorGridMap: (map: Map<string, number>) => set({ vectorGridMap: map }),
      updateSetting: <K extends keyof VectorSettings>(key: K, value: VectorSettings[K]) => 
        set(produce((draft: VectorStoreState) => {
          if (key in draft.settings) {
            // Usamos una asignación tipada correcta en lugar de 'any'
            draft.settings[key] = value;
          } else {
            console.warn(`Attempted to update non-setting key: ${key}`);
          }
      })),
    }
  }),
  {
    name: 'vector-store',
    storage: createJSONStorage(() => localStorage),
    merge: (persistedState, currentState) => {
      const mergedState = produce(currentState, draft => {
        const pState = persistedState as VectorStoreState; // Type assertion
        // Sobrescribir solo las partes del estado que deben persistir
        if (pState.settings) {
          // Validar vectorShape
          const validShapes: VectorShape[] = ['line', 'arrow', 'dot', 'triangle', 'semicircle', 'curve'];
          if (!validShapes.includes(pState.settings.vectorShape)) {
            console.warn(`Invalid persisted vectorShape '${pState.settings.vectorShape}', resetting to '${defaultSettings.vectorShape}'.`);
            draft.settings.vectorShape = defaultSettings.vectorShape;
          } else {
            draft.settings.vectorShape = pState.settings.vectorShape;
          }

          // Validar aspectRatio
          const validAspectRatios: AspectRatio[] = ['16:9', '1:1', '2:1'];
          if (!validAspectRatios.includes(pState.settings.aspectRatio)) {
            console.warn(`Invalid persisted aspectRatio '${pState.settings.aspectRatio}', resetting to '${defaultSettings.aspectRatio}'.`);
            draft.settings.aspectRatio = defaultSettings.aspectRatio;
          } else {
            draft.settings.aspectRatio = pState.settings.aspectRatio;
          }
          // Copiar otros settings persistidos si existen
          // (Asegúrate de copiar solo lo que quieres persistir)
          Object.assign(draft.settings, pState.settings);
          // Re-aplicar el valor validado/por defecto por si Object.assign lo sobrescribió mal
          draft.settings.vectorShape = validShapes.includes(pState.settings.vectorShape) ? pState.settings.vectorShape : defaultSettings.vectorShape;
        }
        // Podrías persistir/validar otros estados aquí si fuese necesario
        // draft.someOtherState = pState.someOtherState ?? currentState.someOtherState;
      });
      return mergedState;
    },
    partialize: (state) => (
      {
        settings: state.settings, // Persistir configuración
        animationFavorites: state.animationFavorites // Persistir favoritos de animación
        // No persistir: svgLines, vectorGridMap, animationFrameId, etc.
      }
    )
  }
));

// Función para limpiar el localStorage para debugging
export const clearVectorStore = () => {
  // Solo ejecutar en el cliente, no en el servidor
  if (typeof window !== 'undefined') {
    localStorage.removeItem('vector-store');
    console.log('Vector store localStorage limpiado.');
  }
};

// Limpiar el localStorage al inicio (solo en cliente)
// COMENTAR ESTA LÍNEA CUANDO TODO FUNCIONE
if (typeof window !== 'undefined') {
  clearVectorStore();
}

// Exportar instancia del store
export const useVectorStore = createVectorStore();

// Selectores para optimización
export const selectSettings = (state: VectorStore) => state.settings;
export const selectSvgLines = (state: VectorStore) => state.svgLines;
export const selectAnimationState = (state: VectorStore) => ({
  animationFrameId: state.animationFrameId
});
export const selectApplicationState = (state: VectorStore) => ({
  isLoading: state.isLoading,
  error: state.error
});

// Selector para obtener solo las acciones
export const useVectorActions = () => useVectorStore((state) => state.actions);
