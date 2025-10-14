Victor – Visualización de Vectores (SVG + React)

Proyecto basado en Next.js (App Router) y TypeScript para visualizar y animar campos de vectores en SVG. Usa Zustand para estado y Victor.js para operaciones vectoriales.

Requisitos
- Node.js 18.18+ (recomendado 20 LTS)
- npm, pnpm o bun

Instalación
```bash
cd Victor
npm ci           # o: pnpm i / bun install
```

Ejecución (desarrollo)
```bash
npm run dev
```
- App: http://localhost:3000
- Demo directa: http://localhost:3000/demo

Rutas
- `/` Interfaz principal con layout de 3 columnas (controles, lienzo SVG, propiedades)
- `/demo` Demo del lienzo SVG optimizado (`src/app/demo/page.tsx`)
- `/webgpu-test` Suite completa de pruebas WebGPU, benchmarks y análisis de compatibilidad

Características
- **Múltiples motores de renderizado**: SVG nativo, WebGL acelerado, y WebGPU moderno
- **Compute shaders**: Animaciones ejecutadas en GPU para máximo rendimiento
- **Fallbacks inteligentes**: Selección automática del mejor motor según capacidades
- Estado con Zustand y controles en tiempo real (forma, color, densidad, animación)
- Hooks utilitarios (`useContainerDimensions`, `useExportDialog`)
- Tailwind 4 + shadcn/ui para UI (incluye `Card`)
- Sistema completo de testing y benchmarking WebGPU

Notas técnicas
- `next.config.ts` está unificado y temporalmente ignora errores de TypeScript/ESLint durante build. Quitar estos flags cuando todo compile limpio.
- El store no se borra automáticamente al cargar: la función `clearVectorStore` está disponible para debugging manual.
- Si ajustas relaciones de aspecto, el lienzo mantiene una altura base de 600px para consistencia visual.

## 🚀 WebGPU (Nuevo)

Victor ahora incluye soporte completo para WebGPU con:

**Características WebGPU:**
- Compute shaders para animaciones de alta performance
- Sistema de easing en GPU con buffers de doble estado
- Fallbacks inteligentes (WebGPU → WebGL → SVG)
- Detección automática de capacidades del navegador
- Benchmarking y análisis de rendimiento integrado

**Compatibilidad:**
- ✅ Chrome/Edge 113+ (soporte completo)
- ⚠️ Firefox 141+ (Windows únicamente)
- ⚠️ Safari Technology Preview (experimental)
- ❌ Mobile (soporte limitado)

**Testing:**
Visita `/webgpu-test` para acceder a la suite completa de pruebas, incluyendo:
- Tests de compatibilidad WebGPU
- Benchmarks de rendimiento comparativo
- Análisis de estrategias de animación
- Información detallada de capacidades

Ver `WEBGPU_MIGRATION.md` para documentación técnica completa.

Estructura relevante
- `src/app/page.tsx` Pantalla principal
- `src/app/demo/page.tsx` Página de demo
- `src/app/webgpu-test/page.tsx` Suite de pruebas WebGPU
- `src/components/vector/*` Lienzo y renderizadores de vectores
- `src/components/vector/webgpu/*` Implementación WebGPU completa
- `src/lib/store.ts` Estado global (Zustand)
- `src/components/columns/*` Controles y propiedades
- `WEBGPU_MIGRATION.md` Documentación técnica completa de WebGPU

Despliegue
Funciona en cualquier hosting compatible con Next.js. Asegúrate de:
- Establecer la versión de Node soportada (20 LTS recomendado)
- Ejecutar `npm run build && npm start`

Licencia
- Consulta el repositorio original para detalles de licencia y contribuciones.
