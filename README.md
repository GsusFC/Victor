# Victor - Visualización de Campos Vectoriales con WebGPU

Sistema avanzado de visualización y animación de campos vectoriales usando **WebGPU**, **compute shaders** y **Next.js 15**.

## 🎨 Características Principales

### Motor WebGPU
- **Renderizado acelerado por GPU** con WebGPU API
- **18 animaciones** implementadas con compute shaders (WGSL)
- **MSAA 4x** para antialiasing y bordes suaves
- **Geometry instancing** para renderizar miles de vectores eficientemente
- **Sistema de coordenadas ISO** personalizado para aspect ratios dinámicos

### Animaciones Disponibles
- **Pulso radial** - Ondas que viajan desde el centro
- **Latido (Heartbeat)** - Expansión y contracción sincronizada
- **Olas suaves** - Movimiento ondulatorio suave
- **Olas de mar** - Ondas más complejas con múltiples frecuencias
- **Flujo Perlin** - Campo de flujo basado en ruido Perlin
- **Interacción con mouse** - Vectores que siguen el cursor
- **Flujo direccional** - Movimiento en una dirección específica
- **Tangente clásica** - Rotación tangencial clásica
- **Lissajous** - Patrones de Lissajous
- **Patrón geométrico** - Formas geométricas complejas
- **Flocking** - Simulación de comportamiento de enjambre
- **Vórtice** - Rotación en espiral
- **Curl helicoidal** - Movimiento helicoidal 3D
- Y más...

### Sistema de Grabación de Video
- **Grabación a 60 FPS** con canvas-record
- **Múltiples formatos**: MP4 (H.264), WebM (VP9), GIF
- **4 presets de calidad**: 720p30, 1080p30, 1080p60, 1440p60
- **WebCodecs API** con fallback automático a WASM
- **Controles completos**: Iniciar, pausar, reanudar, detener
- **Estadísticas en tiempo real**: Duración, frames, FPS, tamaño
- **100% client-side** - Sin servicios externos

### Interfaz y Controles
- **Layout responsivo** con 3 columnas adaptables
- **Paneles colapsables** para mejor organización
- **Controles en tiempo real**:
  - Tipo de animación y parámetros
  - Densidad del grid (filas/columnas)
  - Forma de vectores (línea, triángulo, semicírculo, etc.)
  - Color sólido o degradado
  - Velocidad de animación
  - Zoom y pausa

## 🚀 Instalación

### Requisitos
- **Node.js 18.18+** (recomendado 20 LTS)
- **npm**, pnpm o bun
- **Navegador compatible con WebGPU**: Chrome 113+, Edge 113+

### Setup
```bash
# Clonar repositorio
git clone https://github.com/GsusFC/NewVictor.git
cd NewVictor

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

La aplicación estará disponible en: http://localhost:3000

## 📁 Estructura del Proyecto

```
src/
├── engine/                 # Motor WebGPU
│   ├── WebGPUEngine.ts    # Motor principal
│   ├── BufferManager.ts   # Gestión de buffers GPU
│   ├── CoordinateSystem.ts # Sistema de coordenadas ISO
│   ├── ShapeLibrary.ts    # Biblioteca de formas geométricas
│   └── shaders/           # Shaders WGSL
│       ├── compute/       # Compute shaders (animaciones)
│       └── render/        # Render shaders (visualización)
├── components/
│   ├── canvas/            # Componente del canvas WebGPU
│   ├── controls/          # Paneles de control
│   └── layout/            # Layout responsivo
├── hooks/
│   ├── useVectorEngine.ts # Hook principal del motor
│   ├── useVideoRecorder.ts # Hook de grabación
│   └── useAnimationFrame.ts # Loop de animación
├── store/
│   └── vectorStore.ts     # Estado global (Zustand)
├── lib/
│   ├── video-recorder.ts  # Sistema de grabación
│   └── math-utils.ts      # Utilidades matemáticas
└── types/                 # Tipos TypeScript

```

## 🎮 Uso

### Controles Básicos
1. **Seleccionar animación**: Panel izquierdo "Animación"
2. **Ajustar densidad**: Panel izquierdo "Grid" (filas/columnas)
3. **Cambiar visualización**: Panel derecho "Visual"
4. **Grabar video**: Panel derecho "Grabación"

### Grabación de Video
1. Expandir panel "Grabación" (derecha)
2. Seleccionar formato (MP4 recomendado)
3. Elegir calidad (Alta = 1080p60)
4. Click "Iniciar grabación"
5. Esperar el tiempo deseado
6. Click "Detener" para descargar

### Atajos de Teclado
- **Scroll** en canvas: Zoom in/out

## 🛠️ Tecnologías

### Frontend
- **Next.js 15** - Framework React con App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **shadcn/ui** - Componentes UI

### Renderizado
- **WebGPU** - API gráfica moderna
- **WGSL** - WebGPU Shading Language
- **Compute Shaders** - Cómputo en GPU

### Estado y Performance
- **Zustand** - State management
- **canvas-record** - Video recording
- **media-codecs** - Codec handling

## 📊 Performance

- **60 FPS** en animaciones con miles de vectores
- **MSAA 4x** sin impacto significativo
- **Compute shaders** ejecutan animaciones en GPU
- **Geometry instancing** reduce draw calls

## 🌐 Compatibilidad

### Navegadores Soportados
- ✅ **Chrome 113+** - Soporte completo
- ✅ **Edge 113+** - Soporte completo
- ⚠️ **Safari** - Sin soporte WebGPU aún
- ⚠️ **Firefox** - WebGPU experimental

### Grabación de Video
- ✅ **Chrome/Edge** - WebCodecs (hardware accelerated)
- ⚠️ **Safari** - Fallback a WASM encoder

## 📝 Scripts

```bash
# Desarrollo con webpack
npm run dev

# Desarrollo con Turbopack (experimental)
npm run dev:turbo

# Build de producción
npm run build

# Ejecutar build
npm run start

# Linting
npm run lint
```

## 🐛 Debugging

### Logs de Console
El motor incluye logs detallados:
- 🚀 Inicialización del engine
- ✅ Confirmaciones de operaciones
- 📐 Dimensiones del canvas
- 🎬 Frames renderizados
- 🎥 Estado de grabación

### Troubleshooting

**WebGPU no disponible:**
- Verifica que estés usando Chrome/Edge 113+
- Habilita flags experimentales: `chrome://flags/#enable-unsafe-webgpu`

**Grabación no funciona:**
- Verifica compatibilidad WebCodecs
- Prueba con formato WebM si MP4 falla

**Performance bajo:**
- Reduce densidad del grid
- Desactiva MSAA en `WebGPUEngine.ts`

## 📚 Documentación Adicional

- [WEBGPU_MIGRATION.md](WEBGPU_MIGRATION.md) - Guía de migración
- [CANVAS_V3_STRATEGY.md](CANVAS_V3_STRATEGY.md) - Estrategia del canvas
- [DEBUG_INSTRUCTIONS.md](DEBUG_INSTRUCTIONS.md) - Instrucciones de debug

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el repositorio
2. Crea una rama para tu feature
3. Commit con mensajes descriptivos
4. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo licencia MIT.

## 🙏 Agradecimientos

- **WebGPU Community** - Especificaciones y ejemplos
- **canvas-record** - Sistema de grabación
- **shadcn/ui** - Componentes UI
- **Claude Code** - Asistencia en desarrollo

---

Desarrollado con ❤️ usando WebGPU y Next.js
