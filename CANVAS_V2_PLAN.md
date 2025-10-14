# Plan: Canvas WebGPU V2 - Arquitectura Limpia y Centrada

## 🎯 Objetivo

Crear una versión completamente nueva del canvas que esté **perfectamente centrada** desde el diseño, sin parches ni transformaciones legacy.

## 📐 Sistema de Coordenadas ISO (Isotrópico)

### Definición
- **Centro del canvas**: `(0, 0)`
- **Eje Y**: `[-1, 1]`
- **Eje X**: `[-aspect, aspect]` donde `aspect = width / height`
- **Unidades uniformes**: 1 unidad en X = 1 unidad en Y en píxeles

### Ventajas
✅ Centro siempre en origen - centrado matemático garantizado
✅ Sin bounding boxes ni cálculos de offset
✅ Escalado preserva centrado (zoom alrededor de 0,0)
✅ Responsive solo requiere actualizar `aspect`

## 🗂️ Archivos Creados

### 1. **VectorWebGPURenderer_v2.tsx**
- Nuevo renderer limpio desde cero
- Manejo de resize con aspect ratio
- Sin lógica legacy de offsets

### 2. **useVectorGrid_v2.ts**
- Genera grid directamente en coordenadas ISO
- `baseX = -aspect + col * stepX`
- `baseY = -1 + row * stepY`
- Grid automáticamente centrado en (0,0)

### 3. **RenderShaders_v2.wgsl.ts**
- Uniforms mínimos: `aspect`, `zoom`, `thickness`, `origin_mode`, `color`
- SIN: `viewport_size`, `scale`, `offset`
- Proyección directa: `clip = vec4(iso.x / aspect, iso.y, 0, 1)`

## 🔄 Flujo de Datos Simplificado

```
1. Grid Generation (CPU)
   ↓
   Vectores en ISO: {baseX, baseY, angle, length}
   ↓
2. Upload a GPU
   ↓
   Sin transformaciones - coordenadas directas
   ↓
3. Shader
   ↓
   position_iso → rotation → zoom → clip (divdir X por aspect)
   ↓
4. Pantalla
   ↓
   ✨ PERFECTAMENTE CENTRADO
```

## 📊 Comparación

| Aspecto | V1 (Actual) | V2 (Nueva) |
|---------|-------------|------------|
| Sistemas de coords | 3 (effective → logical → clip) | 1 (ISO → clip) |
| Transformaciones | 5+ | 1 |
| Centrado | Múltiples re-centrajes | Centrado desde origen |
| Responsive | Recalcula todo | Solo actualiza aspect |
| Complejidad | Alta (legacy) | Mínima |
| Garantía centrado | ❌ No | ✅ Sí |

## 🚀 Próximos Pasos

### Fase 1: Implementación Core ✅
- [x] Crear archivos base
- [ ] Implementar inicialización WebGPU en V2
- [ ] Implementar resize handler
- [ ] Implementar animation loop básico

### Fase 2: Integración
- [ ] Conectar useVectorGrid_v2
- [ ] Implementar upload de datos
- [ ] Compilar y probar shaders

### Fase 3: Testing
- [ ] Probar centrado en diferentes resoluciones
- [ ] Verificar responsive
- [ ] Comparar con V1

### Fase 4: Migración
- [ ] Reemplazar VectorCanvasSVG para usar V2
- [ ] Deprecar V1
- [ ] Limpiar código legacy

## 💡 ¿Continuar?

La arquitectura está lista. Los archivos base están creados.

**¿Quieres que continúe con la implementación completa?**

Opciones:
- A) Implementar todo ahora (15-20 min)
- B) Implementar por fases con revisión
- C) Solo hacer un prototipo mínimo para probar el centrado
- D) Revisar primero la arquitectura antes de continuar
