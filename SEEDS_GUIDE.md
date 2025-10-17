# 🎲 Guía del Sistema de Seeds

## ¿Qué son las Seeds?

Las **seeds** (semillas) son números que controlan la generación pseudo-aleatoria en las animaciones. Con la misma seed, obtienes **exactamente la misma animación** cada vez.

## 🎯 Características

### Reproducibilidad Total
- Misma seed + misma configuración = Misma animación
- Perfecta para compartir obras de arte específicas
- Útil para debugging y experimentación controlada

### Auto-Seed
- Genera automáticamente una nueva seed al cambiar de animación
- Explora variaciones infinitas de la misma animación
- Perfecto para descubrir patrones interesantes

### Compartir Configuraciones
- Copia el seed con un click
- Comparte seeds entre usuarios
- Reproduce obras exactamente como fueron creadas

## 📝 Cómo Usar

### 1. Control Manual de Seed
```
1. Abre el panel de "Animación"
2. Encuentra la sección "Seed (Reproducibilidad)"
3. Ingresa un número (0-999999) en el input
4. La animación cambiará al patrón de esa seed
```

### 2. Generar Nueva Seed
```
1. Click en el botón 🔀 (Shuffle)
2. Se generará una nueva seed aleatoria
3. La animación cambiará instantáneamente
```

### 3. Copiar Seed Actual
```
1. Click en el botón 📋 (Copy)
2. La seed se copia al portapapeles
3. Compártela con otros usuarios
```

### 4. Activar Auto-Seed
```
1. Marca el checkbox "Auto-seed"
2. Cada vez que cambies de animación, se generará una nueva seed
3. Útil para explorar variaciones rápidamente
```

## 🎨 Animaciones que Usan Seeds

Las siguientes animaciones tienen comportamiento controlado por seed:

### ✅ **Flocking** (Bandada)
- El ruido que afecta el movimiento es reproducible
- Misma seed = mismo patrón de movimiento caótico

### ✅ **Storm** (Tormenta)
- Las 3 capas de turbulencia usan la seed
- Patrones de caos completamente reproducibles

### 🔄 **Próximamente**: Más animaciones se actualizarán para usar seeds

## 💡 Casos de Uso

### Compartir Obras de Arte
```typescript
// Usuario A crea una animación increíble
Seed: 742691
Animation: Storm
Caos: 2.1
Vorticidad: 1.5

// Usuario B puede reproducirla exactamente:
1. Ingresar seed 742691
2. Seleccionar "Storm"
3. Ajustar parámetros a los mismos valores
```

### Exploración Sistemática
```
1. Activa Auto-seed OFF
2. Empieza con seed 0
3. Incrementa manualmente: 1, 2, 3, 4...
4. Descubre patrones interesantes
5. Guarda las seeds favoritas
```

### Debugging
```
1. Encuentra un bug en una animación específica
2. Nota la seed actual
3. Reinicia la app
4. Ingresa la misma seed
5. El bug es reproducible!
```

## 🔧 Detalles Técnicos

### Algoritmo PRNG
Usamos **PCG Hash** (Permuted Congruential Generator):
- Muy eficiente en GPU (WebGPU/WGSL)
- Distribución uniforme de números
- Hash de 32 bits

### Funciones Disponibles (WGSL)
```wgsl
// Número aleatorio [0,1) basado en posición
rand(seed, x, y) -> f32

// Número aleatorio [0,1) con tiempo
rand_time(seed, x, y, t) -> f32

// Número aleatorio en rango [min,max)
rand_range(seed, x, y, min, max) -> f32
```

### Ubicación en el Código
- **Store**: `src/store/vectorStore.ts` (líneas 233-234, 500-519)
- **PRNG**: `src/engine/shaders/compute/animations.wgsl.ts` (líneas 78-117)
- **Engine**: `src/engine/WebGPUEngine.ts` (línea 951)
- **UI**: `src/components/controls/AnimationPanel.tsx` (líneas 191-245)

## 📊 Rango de Seeds

- **Mínimo**: 0
- **Máximo**: 999,999
- **Recomendado**: Usar números entre 1,000 - 900,000 para mejor distribución

## 🎬 Ejemplo de Flujo

```
1. Selecciona animación "Storm"
2. Ajusta parámetros a tu gusto
3. Click en 🔀 varias veces hasta encontrar un patrón que te guste
4. Click en 📋 para copiar la seed
5. Guarda la seed: "Mi tormenta favorita: seed 847293"
6. Comparte la configuración completa con otros
```

## 🚀 Próximas Mejoras

- [ ] Guardar seeds favoritas con nombres
- [ ] Biblioteca de seeds preestablecidas
- [ ] Exportar/importar configuraciones con seed
- [ ] Más animaciones usando el sistema PRNG
- [ ] Seed en URL (compartir enlaces directos)

---

**¿Tienes ideas?** Contribuye al proyecto o sugiere mejoras!
