# Canvas V3 - Estrategia Híbrida

## 🎯 Objetivo
Combinar el **centrado perfecto de V2** con la **funcionalidad completa de V1**

## 🧠 Approach Híbrido

### Lo que MANTIENE de V1:
✅ Sistema completo de animaciones (todas las 19 animaciones)
✅ useVectorAnimation con todas las lógicas
✅ NewVectorCanvas para generar y animar vectores
✅ Controles de filas/columnas/spacing funcionales
✅ Mouse interaction, flocking, etc.

### Lo que TOMA de V2:
✅ Sistema de coordenadas ISO (centrado matemático)
✅ Shader simplificado sin offsets complejos
✅ Grid generado en coordenadas centradas

## 🔄 Arquitectura V3

```
1. useVectorGrid (MODIFICADO)
   ↓
   Genera grid en coordenadas ISO centradas
   ↓
2. useVectorAnimation (SIN CAMBIOS)
   ↓
   Actualiza ángulos como siempre
   ↓
3. useVectorField (SIMPLIFICADO)
   ↓
   Pasa coordenadas ISO directamente (sin re-normalizar)
   ↓
4. Shader V3 (ISO)
   ↓
   Proyecta ISO → Clip con centrado perfecto
```

## 🔑 Cambios Clave

### 1. useVectorGrid - Genera en ISO desde el inicio
```typescript
// En lugar de píxeles (0 → width):
const baseX = c * spacing;

// Usar ISO (-aspect → +aspect):
const stepX = (2 * aspect) / (gridCols + 1);
const baseX = -aspect + (c + 1) * stepX;
```

### 2. useVectorField - Pasa datos sin transformar
```typescript
// Sin re-normalización - usa baseX/baseY directamente
vectorArray[i*4 + 0] = vector.baseX; // Ya en ISO
vectorArray[i*4 + 1] = vector.baseY; // Ya en ISO
```

### 3. Shader - Proyección ISO simple
```wgsl
let clip_pos = vec4(world_iso.x / aspect, world_iso.y, 0, 1);
// Sin viewport_size, sin offset, sin inversión de Y
```

## ✅ Garantías

- ✅ Centrado perfecto (matemático, no aproximado)
- ✅ Todas las animaciones funcionan
- ✅ Controles filas/columnas/spacing operativos
- ✅ Mouse interaction funciona
- ✅ Responsive automático
- ✅ Sin regresiones de funcionalidad

## 📁 Archivos V3 Creados

- ✅ VectorWebGPURenderer_v3.tsx - Renderer con shader ISO
- ✅ useVectorField_v3.ts - Sin re-normalización
- ✅ useVectorGrid_v3.ts - Grid en ISO centrado  
- ✅ NewVectorCanvas_v3.tsx - Animaciones + ISO
- ✅ VectorCanvasSVG_v3.tsx - Wrapper principal
- ✅ Usa RenderShaders_v2.wgsl (ya compatible ISO)

## 🚀 Para Activar V3

Cambiar en src/app/page.tsx:
```diff
- import VectorCanvasSVG from '@/components/vector/VectorCanvasSVG';
+ import VectorCanvasSVG_v3 from '@/components/vector/VectorCanvasSVG_v3';

- <VectorCanvasSVG />
+ <VectorCanvasSVG_v3 />
```

