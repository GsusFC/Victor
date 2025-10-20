/**
 * Sistema de exportación/importación de configuraciones completas
 * Permite guardar y cargar toda la configuración del estado de la aplicación
 */

import type { VectorState } from '@/store/vectorStore';

export interface ExportedConfig {
  version: string;
  timestamp: number;
  name?: string;
  description?: string;
  config: {
    animation: VectorState['animation'];
    grid: VectorState['grid'];
    visual: VectorState['visual'];
    gradients: VectorState['gradients'];
  };
}

const CURRENT_VERSION = '1.0.0';

/**
 * Exporta la configuración actual a un objeto JSON
 */
export function exportConfig(
  state: VectorState,
  metadata?: { name?: string; description?: string }
): ExportedConfig {
  return {
    version: CURRENT_VERSION,
    timestamp: Date.now(),
    name: metadata?.name,
    description: metadata?.description,
    config: {
      animation: state.animation,
      grid: state.grid,
      visual: state.visual,
      gradients: state.gradients,
    },
  };
}

/**
 * Convierte la configuración a un string JSON formateado
 */
export function exportConfigAsJSON(
  state: VectorState,
  metadata?: { name?: string; description?: string }
): string {
  const config = exportConfig(state, metadata);
  return JSON.stringify(config, null, 2);
}

/**
 * Descarga la configuración como archivo .json
 */
export function downloadConfig(
  state: VectorState,
  metadata?: { name?: string; description?: string }
) {
  const json = exportConfigAsJSON(state, metadata);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = metadata?.name
    ? `victor-${metadata.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.json`
    : `victor-config-${timestamp}.json`;

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Valida que una configuración importada tenga la estructura correcta
 */
export function validateImportedConfig(data: unknown): data is ExportedConfig {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const config = data as Record<string, unknown>;

  // Validar campos requeridos
  if (typeof config.version !== 'string') return false;
  if (typeof config.timestamp !== 'number') return false;
  if (typeof config.config !== 'object' || config.config === null) return false;

  const configData = config.config as Record<string, unknown>;

  // Validar que existan las secciones principales
  if (typeof configData.animation !== 'object') return false;
  if (typeof configData.grid !== 'object') return false;
  if (typeof configData.visual !== 'object') return false;
  if (typeof configData.gradients !== 'object') return false;

  return true;
}

/**
 * Importa una configuración desde un objeto JSON
 */
export function importConfig(data: unknown): ExportedConfig | null {
  if (!validateImportedConfig(data)) {
    console.error('Invalid config format');
    return null;
  }

  // TODO: Aquí se podría agregar migración de versiones si hay cambios en el futuro
  if (data.version !== CURRENT_VERSION) {
    console.warn(`Config version mismatch: ${data.version} vs ${CURRENT_VERSION}`);
    // Por ahora solo advertimos, pero la config podría ser compatible
  }

  return data;
}

/**
 * Importa una configuración desde un string JSON
 */
export function importConfigFromJSON(json: string): ExportedConfig | null {
  try {
    const data = JSON.parse(json);
    return importConfig(data);
  } catch (error) {
    console.error('Failed to parse config JSON:', error);
    return null;
  }
}

/**
 * Lee un archivo y devuelve la configuración importada
 */
export function importConfigFromFile(file: File): Promise<ExportedConfig | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        const config = importConfigFromJSON(text);
        resolve(config);
      } else {
        resolve(null);
      }
    };

    reader.onerror = () => {
      console.error('Failed to read file');
      resolve(null);
    };

    reader.readAsText(file);
  });
}

/**
 * Copia la configuración al clipboard
 */
export async function copyConfigToClipboard(
  state: VectorState,
  metadata?: { name?: string; description?: string }
): Promise<boolean> {
  try {
    const json = exportConfigAsJSON(state, metadata);
    await navigator.clipboard.writeText(json);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Lee la configuración desde el clipboard
 */
export async function pasteConfigFromClipboard(): Promise<ExportedConfig | null> {
  try {
    const text = await navigator.clipboard.readText();
    return importConfigFromJSON(text);
  } catch (error) {
    console.error('Failed to read from clipboard:', error);
    return null;
  }
}
