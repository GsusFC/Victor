# Plan de Refactorización de WebGPUEngine

## 📊 Estado Actual
- **Archivo**: `src/engine/WebGPUEngine.ts`
- **Líneas**: ~1,500
- **Problemas**: Monolito que hace demasiadas cosas, difícil de testear y mantener

## 🎯 Objetivo
Reducir WebGPUEngine a ~300 líneas de código, actuando como **orquestador** simple que delega responsabilidades a managers especializados.

## 📦 Managers Disponibles

### ✅ TextureManager
**Responsabilidades**:
- Crear/destruir texturas MSAA (4x)
- Crear/destruir texturas para post-processing
- Render-to-texture (ping-pong)
- Bloom textures (multi-pass)
- Samplers
- Actualizar dimensiones canvas

**Métodos clave**:
- `getPostProcessTextures()` - Retorna todas las texturas necesarias
- `updateCanvasDimensions()` - Recrea texturas al resize
- `getMSAASampleCount()` - Obtiene sample count
- `dispose()` - Limpia recursos

### ✅ PipelineManager
**Responsabilidades**:
- Crear todos los pipelines (render, compute, fade, post-process, bloom)
- Crear bind group layouts
- Caching de pipelines
- Workgroup size optimization

**Métodos clave**:
- `getPipelines()` - Retorna todos los pipelines
- `getBindGroupLayouts()` - Retorna layouts
- `getOptimalWorkgroupSize()` - Workgroup size óptimo
- `dispose()` - Limpia recursos

### ✅ UniformManager
**Responsabilidades**:
- Crear/manejar uniform buffer
- Differential updates (solo escribir si cambió)
- Gradient stops caching inteligente
- Normalización de valores

**Métodos clave**:
- `getBuffer()` - Retorna uniform buffer
- `updateUniforms()` - Actualiza uniforms con differential update
- `markDirty()` - Fuerza actualización
- `dispose()` - Limpia recursos

### ✅ RenderPass
**Responsabilidades**:
- Abstracción de render passes
- Configurar attachments (color, depth, MSAA)
- Clear/load operations
- Viewport y scissor rect

**Métodos clave**:
- `execute(commandEncoder, callback)` - Ejecuta render pass
- `updateColorView()` - Actualiza textura target
- `setClearColor()` - Cambia clear color

### ✅ ComputePass
**Responsabilidades**:
- Abstracción de compute passes
- Dispatch con workgroup optimization
- Bind groups management

**Métodos clave**:
- `execute(commandEncoder)` - Ejecuta compute pass
- `setBindGroups()` - Actualiza bind groups
- `setWorkgroupSize()` - Ajusta workgroup size

### ✅ PostProcessStack
**Responsabilidades**:
- Composición de post-process effects
- Bloom multi-pass
- Tone mapping
- Blur

**Métodos clave**:
- `execute()` - Ejecuta todos los effects activos
- `setEffectEnabled()` - Habilita/deshabilita effect
- `updateConfig()` - Actualiza configuración

## 🔄 Plan de Refactorización

### Fase 1: Preparación
- [x] Crear todos los managers (6 módulos)
- [x] Commit managers a main
- [ ] Leer y analizar WebGPUEngine.ts actual

### Fase 2: Integración Gradual
1. **Integrar TextureManager** (~30 min)
   - Reemplazar métodos `createMSAATexture()` y `createPostProcessTextures()`
   - Usar `textureManager.getPostProcessTextures()`
   - Actualizar `updateCanvasDimensions()` para usar manager

2. **Integrar PipelineManager** (~45 min)
   - Reemplazar método gigante `createPipelines()`
   - Usar `pipelineManager.getPipelines()` y `getBindGroupLayouts()`
   - Simplificar lógica de pipeline selection

3. **Integrar UniformManager** (~30 min)
   - Reemplazar método complejo `updateUniforms()`
   - Remover cache manual de gradient stops
   - Usar `uniformManager.updateUniforms()`

4. **Integrar RenderPass y ComputePass** (~30 min)
   - Abstraer lógica de `renderFrame()`
   - Crear render passes con builder pattern
   - Simplificar compute pass execution

5. **Integrar PostProcessStack** (~30 min)
   - Abstraer lógica de post-processing
   - Usar `postProcessStack.execute()`
   - Remover código duplicado de bloom

### Fase 3: Limpieza
- Remover código duplicado
- Simplificar métodos
- Mejorar nombrado
- Documentar cambios

### Fase 4: Testing
- Verificar que todo funciona igual
- Testing end-to-end
- Performance profiling

## 📝 Estructura Final Esperada

```typescript
export class WebGPUEngine {
  // Managers
  private textureManager: TextureManager;
  private pipelineManager: PipelineManager;
  private uniformManager: UniformManager;
  private postProcessStack: PostProcessStack;
  
  // Core WebGPU
  private device: GPUDevice;
  private context: GPUCanvasContext;
  private canvas: HTMLCanvasElement;
  
  // Buffers simples
  private vectorBuffer: GPUBuffer;
  private shapeBuffer: GPUBuffer;
  
  // Bind groups simples
  private renderBindGroup: GPUBindGroup;
  private computeBindGroup: GPUBindGroup;
  
  // Estado mínimo
  private config: WebGPUEngineConfig;
  private currentAnimationType: AnimationType;
  
  // Métodos orquestadores (~20 métodos, 300 líneas total)
  async initialize(canvas: HTMLCanvasElement): Promise<boolean>
  updateConfig(config: Partial<WebGPUEngineConfig>): void
  setAnimationType(type: AnimationType): void
  setShape(shape: VectorShape): void
  updateVectorBuffer(data: Float32Array): void
  updateUniforms(...params): void
  computeAnimation(deltaTime: number): void
  renderFrame(): void
  destroy(): void
}
```

## ✨ Beneficios Esperados
- **Mantenibilidad**: Código más simple y organizado
- **Testabilidad**: Cada manager testeabel independientemente
- **Escalabilidad**: Fácil agregar nuevas funcionalidades
- **Legibilidad**: WebGPUEngine ahora es fácil de entender
- **Performance**: Mismo rendimiento con mejor arquitectura
- **Colaboración**: Múltiples desarrolladores pueden trabajar en paralelo

## 🚀 Ejecución
**Tiempo estimado**: 2-3 horas
**Complejidad**: Media-Alta
**Riesgo**: Bajo (managers ya testeados independientemente)
