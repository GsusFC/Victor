/**
 * Mock de Netlify Blobs para desarrollo local
 * IMPORTANTE: Este mock solo funciona en memoria, se pierde al reiniciar el servidor
 * Para producción, se usa el verdadero @netlify/blobs
 */

// Storage en memoria persistente durante HMR (Hot Module Replacement)
// Usamos globalThis para evitar que se reinicialice en cada recarga del módulo
const globalForMock = globalThis as unknown as {
  mockBlobsStorage: Record<string, any> | undefined;
};

globalForMock.mockBlobsStorage = globalForMock.mockBlobsStorage ?? {};
const mockStorage = globalForMock.mockBlobsStorage;

export function getStore(name: string) {
  console.log(`[Mock Blobs] Using mock store: ${name}`);

  return {
    async setJSON(key: string, data: any): Promise<void> {
      console.log(`[Mock Blobs] SET ${key}:`, data);
      mockStorage[`${name}:${key}`] = JSON.parse(JSON.stringify(data));
    },

    async get(key: string, options?: { type: 'json' }): Promise<any> {
      const fullKey = `${name}:${key}`;
      const data = mockStorage[fullKey];
      console.log(`[Mock Blobs] GET ${key}:`, data ? 'found' : 'not found');

      if (options?.type === 'json') {
        return data || null;
      }

      return data || null;
    },

    async delete(key: string): Promise<void> {
      const fullKey = `${name}:${key}`;
      delete mockStorage[fullKey];
      console.log(`[Mock Blobs] DELETE ${key}`);
    },

    async list(): Promise<string[]> {
      const prefix = `${name}:`;
      const keys = Object.keys(mockStorage)
        .filter((k) => k.startsWith(prefix))
        .map((k) => k.substring(prefix.length));
      console.log(`[Mock Blobs] LIST:`, keys);
      return keys;
    },
  };
}

// Función para limpiar el storage (útil para testing)
export function clearMockStorage() {
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  console.log('[Mock Blobs] Storage cleared');
}

// Función para ver el contenido del storage (debugging)
export function debugStorage() {
  console.log('[Mock Blobs] Current storage:', mockStorage);
  return mockStorage;
}
