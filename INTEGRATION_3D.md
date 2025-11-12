# Plan de Integración 3D en WebGPUEngine

## Estado Actual ✅

### Completado (3 commits)
1. ✅ **Mat4** - Matrices 4x4 completas
2. ✅ **Camera3D** - Sistema orbit con controles
3. ✅ **Shaders 3D** - Render + 3 animaciones compute

### Archivos Nuevos
```
src/lib/math/Mat4.ts                            (426 líneas)
src/engine/Camera3D.ts                          (339 líneas)
src/engine/types/camera.ts                      (56 líneas)
src/engine/CoordinateSystem3D.ts                (143 líneas)
src/engine/ShapeLibrary3D.ts                    (190 líneas)
src/engine/types/engine.ts                      (26 líneas)
src/engine/shaders/render/vector3d.wgsl.ts      (130 líneas)
src/engine/shaders/compute/animations3d.wgsl.ts (236 líneas)
```

**Total: ~1,546 líneas de código 3D funcional**

---

## Próximos Pasos 🔄

### 1. Modificaciones en WebGPUEngine.ts

#### A. Añadir Propiedades 3D

```typescript
// En la clase WebGPUEngine, después de línea 156
private renderMode: RenderMode = '2D';
private camera3D: Camera3D | null = null;
private coordinateSystem3D: CoordinateSystem3D | null = null;
private shapeLibrary3D: ShapeLibrary3D = new ShapeLibrary3D();

// Buffers 3D
private vector3DBuffer: GPUBuffer | null = null;
private cameraUniformBuffer: GPUBuffer | null = null;

// Pipelines 3D
private render3DPipeline: GPURenderPipeline | null = null;
private compute3DPipeline: GPUComputePipeline | null = null;
private compute3DPipelines: Map<string, GPUComputePipeline> = new Map();

// Bind groups 3D
private render3DBindGroup: GPUBindGroup | null = null;
private compute3DBindGroup: GPUBindGroup | null = null;

// Shape 3D
private currentShape3DVertexCount: number = 2; // Line por defecto
```

#### B. Modificar `initialize()`

Después de inicializar textureManager, añadir:

```typescript
// Inicializar sistema 3D
this.camera3D = new Camera3D({
  distance: 50,
  azimuth: 45,
  elevation: 30,
  aspect: this.canvas!.width / this.canvas!.height
});

this.coordinateSystem3D = new CoordinateSystem3D({
  rows: 5,
  cols: 5,
  layers: 5,
  spacing: 5,
  aspect: this.canvas!.width / this.canvas!.height
});
```

#### C. Crear Método `createCameraBuffer()`

```typescript
private createCameraBuffer(): void {
  if (!this.device) return;

  // Buffer para view-projection matrix (16 floats = 64 bytes)
  this.cameraUniformBuffer = this.device.createBuffer({
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: 'Camera Uniform Buffer'
  });
}
```

#### D. Crear Método `updateCameraBuffer()`

```typescript
private updateCameraBuffer(): void {
  if (!this.device || !this.camera3D || !this.cameraUniformBuffer) return;

  const viewProjMatrix = this.camera3D.getViewProjectionMatrix();
  this.device.queue.writeBuffer(
    this.cameraUniformBuffer,
    0,
    viewProjMatrix.data
  );
}
```

#### E. Crear Método `createVector3DBuffer()`

```typescript
private createVector3DBuffer(): void {
  if (!this.device || !this.coordinateSystem3D) return;

  const positions = this.coordinateSystem3D.getPositions();
  const vectorCount = positions.length;

  // Estructura Vector3D: 8 floats (32 bytes)
  const bufferSize = vectorCount * 32;

  this.vector3DBuffer = this.device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    label: 'Vector 3D Buffer'
  });

  // Inicializar con posiciones
  const data = new Float32Array(vectorCount * 8);
  for (let i = 0; i < vectorCount; i++) {
    const pos = positions[i];
    const offset = i * 8;
    data[offset] = pos.x;     // baseX
    data[offset + 1] = pos.y; // baseY
    data[offset + 2] = pos.z; // baseZ
    data[offset + 3] = 0;     // dirX (inicializar después)
    data[offset + 4] = 1;     // dirY
    data[offset + 5] = 0;     // dirZ
    data[offset + 6] = this.config.vectorLength; // length
    data[offset + 7] = 0;     // padding
  }

  this.device.queue.writeBuffer(this.vector3DBuffer, 0, data);
}
```

#### F. Crear Método `create3DPipelines()`

```typescript
private async create3DPipelines(): Promise<void> {
  if (!this.device || !this.canvasFormat) return;

  // Render pipeline 3D
  const shaderModule = this.device.createShaderModule({
    code: vector3DShader,
    label: 'Vector 3D Shader'
  });

  const shape = this.shapeLibrary3D.getShape('line')!;

  // Vertex buffer layout
  const vertexBufferLayout: GPUVertexBufferLayout = {
    arrayStride: 12, // 3 floats (x, y, z)
    stepMode: 'vertex',
    attributes: [{
      shaderLocation: 0,
      offset: 0,
      format: 'float32x3'
    }]
  };

  this.render3DPipeline = this.device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: shaderModule,
      entryPoint: 'vertexMain',
      buffers: [vertexBufferLayout]
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fragmentMain',
      targets: [{
        format: this.canvasFormat,
        blend: {
          color: {
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add'
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add'
          }
        }
      }]
    },
    primitive: {
      topology: shape.primitiveType === 'line-list' ? 'line-list' : 'triangle-list',
      cullMode: 'none'
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus'
    },
    multisample: {
      count: 4
    },
    label: 'Render 3D Pipeline'
  });

  // Compute pipelines 3D
  const animations = ['smoothWaves3D', 'vortex3D', 'sphericalWaves3D'];
  for (const anim of animations) {
    const shader = get3DAnimationShader(anim);
    const module = this.device.createShaderModule({
      code: shader,
      label: `Compute 3D - ${anim}`
    });

    const pipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module,
        entryPoint: 'computeMain'
      },
      label: `Compute Pipeline 3D - ${anim}`
    });

    this.compute3DPipelines.set(anim, pipeline);
  }
}
```

#### G. Añadir Método Público `setRenderMode()`

```typescript
public setRenderMode(mode: RenderMode): void {
  if (this.renderMode === mode) return;

  this.renderMode = mode;

  if (mode === '3D') {
    // Inicializar recursos 3D si no existen
    if (!this.vector3DBuffer) {
      this.createVector3DBuffer();
      this.createCameraBuffer();
      this.create3DPipelines();
    }
  }

  console.log(`Render mode changed to: ${mode}`);
}
```

#### H. Añadir Método Público `updateCamera3D()`

```typescript
public updateCamera3D(updates: Partial<Camera3DConfig>): void {
  if (!this.camera3D) return;

  // Aplicar updates (por ahora manual, después se puede mejorar)
  if (updates.azimuth !== undefined) {
    this.camera3D.targetAzimuth = updates.azimuth;
  }
  if (updates.elevation !== undefined) {
    this.camera3D.targetElevation = updates.elevation;
  }
  // ... más propiedades según necesario
}
```

#### I. Modificar `render()`

En el método render, antes del render pass:

```typescript
// Actualizar cámara 3D si está en modo 3D
if (this.renderMode === '3D' && this.camera3D) {
  this.camera3D.update(deltaTime);
  this.updateCameraBuffer();
}
```

Y modificar el render pass para usar pipeline 3D cuando corresponda:

```typescript
if (this.renderMode === '3D') {
  renderPass.setPipeline(this.render3DPipeline!);
  renderPass.setVertexBuffer(0, this.shape3DBuffer);
  renderPass.setBindGroup(0, this.render3DBindGroup!);
  renderPass.draw(
    this.currentShape3DVertexCount,
    this.coordinateSystem3D!.getCount()
  );
} else {
  // Código 2D existente
  renderPass.setPipeline(this.renderPipeline!);
  // ... resto del código 2D
}
```

---

### 2. Modificaciones en Store (useVectorStore.ts)

Añadir estado 3D:

```typescript
interface VectorStore {
  // ... propiedades existentes ...

  // 3D State
  renderMode: RenderMode;
  setRenderMode: (mode: RenderMode) => void;

  camera3D: {
    azimuth: number;
    elevation: number;
    distance: number;
    fov: number;
  };
  updateCamera3D: (updates: Partial<VectorStore['camera3D']>) => void;
  setCameraPreset: (preset: CameraPreset) => void;
}
```

---

### 3. Crear Componentes UI

#### A. `RenderModeToggle.tsx`

```typescript
export function RenderModeToggle() {
  const { renderMode, setRenderMode } = useVectorStore();
  const engine = WebGPUEngine.getInstance();

  const handleChange = (mode: RenderMode) => {
    setRenderMode(mode);
    engine.setRenderMode(mode);
  };

  return (
    <Tabs value={renderMode} onValueChange={handleChange}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="2D">2D Plano</TabsTrigger>
        <TabsTrigger value="3D">3D Espacial</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
```

#### B. `CameraControls3D.tsx`

```typescript
export function CameraControls3D() {
  const { renderMode, camera3D, setCameraPreset, updateCamera3D } = useVectorStore();

  if (renderMode !== '3D') return null;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Controles de Cámara 3D</h3>

      {/* Presets */}
      <div className="grid grid-cols-3 gap-2">
        <Button size="sm" onClick={() => setCameraPreset('top')}>
          Top
        </Button>
        <Button size="sm" onClick={() => setCameraPreset('side')}>
          Side
        </Button>
        <Button size="sm" onClick={() => setCameraPreset('isometric')}>
          Isometric
        </Button>
      </div>

      {/* FOV Slider */}
      <div>
        <Label>FOV: {camera3D.fov}°</Label>
        <Slider
          value={[camera3D.fov]}
          onValueChange={([v]) => updateCamera3D({ fov: v })}
          min={30}
          max={120}
          step={5}
        />
      </div>

      {/* Help text */}
      <div className="text-xs text-muted-foreground">
        <p><kbd>Click Izq</kbd> + Drag: Rotar</p>
        <p><kbd>Click Der</kbd> + Drag: Pan</p>
        <p><kbd>Scroll</kbd>: Zoom</p>
      </div>
    </div>
  );
}
```

#### C. Modificar `VectorCanvas.tsx`

Añadir event handlers:

```typescript
const handleMouseDown = (e: React.MouseEvent) => {
  if (renderMode !== '3D') return;

  const engine = WebGPUEngine.getInstance();
  const camera = engine.getCamera3D();

  if (e.button === 0) {
    // Left click: orbit
    setIsDragging(true);
    setDragMode('orbit');
  } else if (e.button === 2) {
    // Right click: pan
    setIsDragging(true);
    setDragMode('pan');
  }
};

const handleMouseMove = (e: React.MouseEvent) => {
  if (!isDragging || renderMode !== '3D') return;

  const engine = WebGPUEngine.getInstance();
  const camera = engine.getCamera3D();

  if (dragMode === 'orbit') {
    camera?.orbit(e.movementX, -e.movementY);
  } else if (dragMode === 'pan') {
    camera?.pan(-e.movementX, e.movementY);
  }
};

const handleWheel = (e: React.WheelEvent) => {
  if (renderMode !== '3D') return;

  e.preventDefault();
  const engine = WebGPUEngine.getInstance();
  const camera = engine.getCamera3D();

  camera?.zoom(e.deltaY > 0 ? 0.1 : -0.1);
};
```

---

### 4. Testing Checklist

Antes de considerar completa la integración:

- [ ] Compilación TypeScript sin errores
- [ ] Modo 2D funciona exactamente igual que antes
- [ ] Toggle 2D/3D funciona sin crashes
- [ ] Cámara 3D responde a mouse (orbit, pan, zoom)
- [ ] Al menos 1 animación 3D funciona (smoothWaves3D)
- [ ] Grabación de video funciona en ambos modos
- [ ] Performance: 1000+ vectores @ 60 FPS en 3D
- [ ] No hay memory leaks al cambiar de modo

---

## Estimación de Tiempo Restante

- **Modificar WebGPUEngine**: 30-45 min
- **Crear UI components**: 15-20 min
- **Event handlers canvas**: 10-15 min
- **Testing y debugging**: 20-30 min

**Total estimado: 1.5 - 2 horas**

---

## Notas Importantes

1. **Compatibilidad**: Mantener 100% de funcionalidad 2D
2. **Performance**: 3D será ~20-30% más pesado por geometría y lighting
3. **Depth buffer**: Necesario crear texture para depth en modo 3D
4. **MSAA**: Aplicar también en 3D para consistencia visual
5. **Post-processing**: Bloom y trails deberían funcionar en ambos modos

---

## Commits Sugeridos

1. `feat: Integrar modo 3D en WebGPUEngine`
2. `feat: Añadir UI para toggle y controles de cámara 3D`
3. `feat: Implementar event handlers para cámara 3D`
4. `test: Validar funcionalidad completa 2D/3D`

---

**Estado**: Fundamentos 3D completos, listos para integración final ✅
