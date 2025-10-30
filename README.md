# Victor - Vector Field Visualization with WebGPU

Advanced vector field visualization and animation system using **WebGPU**, **compute shaders**, and **Next.js 15**.

## 🎨 Key Features

### WebGPU Engine
- **GPU-accelerated rendering** with WebGPU API
- **18 animations** implemented with compute shaders (WGSL)
- **4x MSAA** for antialiasing and smooth edges
- **Geometry instancing** for efficient rendering of thousands of vectors
- **Custom ISO coordinate system** for dynamic aspect ratios

### Available Animations
- **Radial Pulse** - Waves traveling from the center
- **Heartbeat** - Synchronized expansion and contraction
- **Smooth Waves** - Smooth undulating movement
- **Sea Waves** - Complex waves with multiple frequencies
- **Perlin Flow** - Flow field based on Perlin noise
- **Mouse Interaction** - Vectors following the cursor
- **Directional Flow** - Movement in a specific direction
- **Classic Tangent** - Classic tangential rotation
- **Lissajous** - Lissajous patterns
- **Geometric Pattern** - Complex geometric shapes
- **Flocking** - Swarm behavior simulation
- **Vortex** - Spiral rotation
- **Helical Curl** - 3D helical movement
- And more...

### Video Recording System
- **60 FPS recording** with canvas-record
- **Multiple formats**: MP4 (H.264), WebM (VP9), GIF
- **4 quality presets**: 720p30, 1080p30, 1080p60, 1440p60
- **WebCodecs API** with automatic WASM fallback
- **Full controls**: Start, pause, resume, stop
- **Real-time statistics**: Duration, frames, FPS, file size
- **100% client-side** - No external services

### Interface and Controls
- **Responsive 3-column layout** with adaptable panels
- **Collapsible panels** for better organization
- **Real-time controls**:
  - Animation type and parameters
  - Grid density (rows/columns)
  - Vector shapes (line, triangle, semicircle, etc.)
  - Solid color or gradient
  - Animation speed
  - Zoom and pause

## 🚀 Installation

### Requirements
- **Node.js 18.18+** (recommended 20 LTS)
- **npm**, pnpm, or bun
- **WebGPU-compatible browser**: Chrome 113+, Edge 113+

### Setup
```bash
# Clone repository
git clone https://github.com/GsusFC/Victor.git
cd Victor

# Install dependencies
npm install

# Run development server
npm run dev
```

Application will be available at: http://localhost:3000

## 📁 Project Structure

```
src/
├── engine/                 # WebGPU Engine
│   ├── WebGPUEngine.ts    # Main engine
│   ├── BufferManager.ts   # GPU buffer management
│   ├── CoordinateSystem.ts # ISO coordinate system
│   ├── ShapeLibrary.ts    # Geometric shapes library
│   └── shaders/           # WGSL Shaders
│       ├── compute/       # Compute shaders (animations)
│       └── render/        # Render shaders (visualization)
├── components/
│   ├── canvas/            # WebGPU canvas component
│   ├── controls/          # Control panels
│   └── layout/            # Responsive layout
├── hooks/
│   ├── useVectorEngine.ts # Main engine hook
│   ├── useVideoRecorder.ts # Recording hook
│   └── useAnimationFrame.ts # Animation loop
├── store/
│   └── vectorStore.ts     # Global state (Zustand)
├── lib/
│   ├── video-recorder.ts  # Recording system
│   └── math-utils.ts      # Math utilities
└── types/                 # TypeScript types

```

## 🎮 Usage

### Basic Controls
1. **Select animation**: Left panel "Animation"
2. **Adjust density**: Left panel "Grid" (rows/columns)
3. **Change visualization**: Right panel "Visual"
4. **Record video**: Right panel "Recording"

### Video Recording
1. Expand "Recording" panel (right)
2. Select format (MP4 recommended)
3. Choose quality (High = 1080p60)
4. Click "Start recording"
5. Wait for desired duration
6. Click "Stop" to download

### Keyboard Shortcuts
- **Scroll** on canvas: Zoom in/out

## 🛠️ Technologies

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **shadcn/ui** - UI components

### Rendering
- **WebGPU** - Modern graphics API
- **WGSL** - WebGPU Shading Language
- **Compute Shaders** - GPU compute

### State and Performance
- **Zustand** - State management
- **canvas-record** - Video recording
- **media-codecs** - Codec handling

## 📊 Performance

- **60 FPS** animations with thousands of vectors
- **4x MSAA** with minimal performance impact
- **Compute shaders** execute animations on GPU
- **Geometry instancing** reduces draw calls

## 🌐 Compatibility

### Supported Browsers
- ✅ **Chrome 113+** - Full support
- ✅ **Edge 113+** - Full support
- ⚠️ **Safari** - WebGPU not supported yet
- ⚠️ **Firefox** - WebGPU experimental

### Video Recording
- ✅ **Chrome/Edge** - WebCodecs (hardware accelerated)
- ⚠️ **Safari** - WASM encoder fallback

## 📝 Scripts

```bash
# Development with webpack
npm run dev

# Development with Turbopack (experimental)
npm run dev:turbo

# Production build
npm run build

# Run build
npm run start

# Linting
npm run lint
```

## 🐛 Debugging

### Console Logs
The engine includes detailed logs:
- 🚀 Engine initialization
- ✅ Operation confirmations
- 📐 Canvas dimensions
- 🎬 Rendered frames
- 🎥 Recording status

### Troubleshooting

**WebGPU not available:**
- Verify you're using Chrome/Edge 113+
- Enable experimental flags: `chrome://flags/#enable-unsafe-webgpu`

**Recording not working:**
- Check WebCodecs compatibility
- Try WebM format if MP4 fails

**Low performance:**
- Reduce grid density
- Disable MSAA in `WebGPUEngine.ts`

## 📚 Additional Documentation

- [WEBGPU_MIGRATION.md](WEBGPU_MIGRATION.md) - Migration guide
- [CANVAS_V3_STRATEGY.md](CANVAS_V3_STRATEGY.md) - Canvas strategy
- [DEBUG_INSTRUCTIONS.md](DEBUG_INSTRUCTIONS.md) - Debug instructions

## 🤝 Contributing

Contributions are welcome. Please:
1. Fork the repository
2. Create a branch for your feature
3. Commit with descriptive messages
4. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **WebGPU Community** - Specifications and examples
- **canvas-record** - Recording system
- **shadcn/ui** - UI components
- **Claude** - Development assistance

---

Developed with ❤️ using WebGPU and Next.js
