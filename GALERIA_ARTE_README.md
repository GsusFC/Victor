# 🎨 Sistema de Galería de Arte - Victor

## ✅ Implementación Completada

Se ha implementado un sistema completo de galería de arte que permite publicar animaciones vectoriales como obras inmutables y compartirlas con links únicos.

---

## 🚀 Nuevas Funcionalidades

### 1. **Publicar Animaciones como Arte**
- Botón "Publicar como Arte" en la columna derecha de la interfaz
- Captura automática de snapshot (thumbnail)
- Generación de ID único de 8 caracteres (nanoid)
- Títulos generados automáticamente según el tipo de animación
- Modal de confirmación con link para compartir

### 2. **Vista Individual de Obra** (`/art/[id]`)
- Página de solo lectura para cada obra publicada
- Header con título, fecha de publicación e ID
- Animación renderizada en modo inmutable
- Botones para copiar link y compartir
- Link para volver a la galería

### 3. **Galería Pública** (`/gallery`)
- Grid responsive de todas las obras publicadas
- Cards con thumbnails y metadata
- Ordenadas por más recientes primero
- Click en card abre la vista individual
- Contador de obras totales
- Empty state cuando no hay obras

---

## 📁 Archivos Creados

### Types y Utilidades
```
src/types/art.ts                     - Tipos TypeScript
src/lib/art-utils.ts                 - Utilidades (IDs, títulos, capturas)
src/lib/blobs-mock.ts                - Mock de Netlify Blobs para desarrollo
```

### API Routes
```
src/app/api/art/publish/route.ts     - POST: Publicar obra
src/app/api/art/[id]/route.ts        - GET: Obtener obra por ID
src/app/api/art/list/route.ts        - GET: Listar todas las obras
```

### Componentes
```
src/components/art/PublishButton.tsx - Botón de publicación con modal
src/components/art/ArtViewer.tsx     - Visualizador en modo readonly
src/components/art/ArtCard.tsx       - Card para galería
```

### Páginas
```
src/app/art/[id]/page.tsx            - Vista individual de obra
src/app/gallery/page.tsx             - Galería pública
```

### Configuración y Documentación
```
netlify.toml                         - Configuración de Netlify
DEPLOY_NETLIFY.md                    - Guía completa de deploy
```

### Modificaciones
```
src/components/canvas/VectorCanvas.tsx  - Agregado método captureSnapshot()
src/app/page.tsx                        - Agregado panel "Publicar Arte"
package.json                            - Dependencias: @netlify/blobs, nanoid
```

---

## 🧪 Desarrollo Local

### Mock de Netlify Blobs

Para desarrollo local, se usa un mock en memoria:

```typescript
// Los datos se guardan en memoria (se pierden al recargar)
import { getStore } from '@/lib/blobs-mock';
```

**Para cambiar a producción (Netlify):**

En cada API route, cambia:

```typescript
// Desarrollo:
import { getStore } from '@/lib/blobs-mock';

// Producción (descomentar):
// import { getStore } from '@netlify/blobs';
// export const runtime = 'edge';
```

### Probar en Local

1. **Iniciar servidor:**
   ```bash
   npm run dev
   ```

2. **Crear una animación:**
   - Ve a http://localhost:3002
   - Configura una animación con los controles

3. **Publicar:**
   - Abre el panel "Publicar Arte" (columna derecha)
   - Click en "Publicar como Arte"
   - Se genera un link: `http://localhost:3002/art/abc123`

4. **Ver galería:**
   - Ve a http://localhost:3002/gallery
   - Verás tu obra publicada

5. **Ver obra individual:**
   - Click en el card de la galería
   - O abre directamente el link generado

**NOTA**: Los datos se pierden al recargar la página (es un mock en memoria).

---

## 🚀 Deploy a Netlify

### Pasos Rápidos

1. **Conectar repositorio a Netlify:**
   - Login en [netlify.com](https://netlify.com)
   - "Add new site" → "Import an existing project"
   - Conecta tu repo GitHub
   - Branch: `main`
   - Build settings: Detectados automáticamente desde `netlify.toml`

2. **Configurar variables de entorno:**
   - En Netlify dashboard: Site settings → Environment variables
   - Agregar: `NEXT_PUBLIC_BASE_URL=https://tu-sitio.netlify.app`

3. **Cambiar a producción en API routes:**

   En `src/app/api/art/publish/route.ts`:
   ```typescript
   import { getStore } from '@netlify/blobs';  // ✅
   // import { getStore } from '@/lib/blobs-mock';  // ❌
   export const runtime = 'edge';  // ✅
   ```

   Hacer lo mismo en:
   - `src/app/api/art/[id]/route.ts`
   - `src/app/api/art/list/route.ts`

4. **Push a main:**
   ```bash
   git add .
   git commit -m "feat: Sistema de galería de arte con Netlify Blobs"
   git push origin main
   ```

5. **Deploy automático:**
   - Netlify detectará el push y hará deploy automáticamente

### Verificar Deploy

- ✅ Build exitoso en Netlify dashboard
- ✅ Netlify Blobs activo (zero-config)
- ✅ API routes funcionando en Edge Functions
- ✅ Variables de entorno configuradas

---

## 📊 Arquitectura

### Stack Técnico

**Frontend:**
- Next.js 15 App Router
- React 19
- TypeScript
- Zustand (state management)
- Tailwind CSS 4
- shadcn/ui components

**Backend:**
- Netlify Edge Functions
- Netlify Blobs (KV storage)
- Zero-config serverless

**Graphics:**
- WebGPU rendering engine
- MSAA 4x antialiasing
- 18 animaciones con compute shaders

### Flujo de Datos

```
Usuario crea animación
    ↓
Click "Publicar como Arte"
    ↓
1. Captura snapshot del canvas (base64)
2. Serializa estado de Zustand
3. POST /api/art/publish
    ↓
4. Genera ID único (nanoid)
5. Genera título automático
6. Guarda en Netlify Blobs:
   - Key: art:{id} → ArtPiece
   - Key: art:index → Array de IDs
    ↓
7. Retorna URL: /art/{id}
    ↓
Usuario comparte link
    ↓
Otros usuarios visitan /art/{id}
    ↓
1. Server Component fetch de /api/art/{id}
2. Lee de Netlify Blobs
3. Renderiza ArtViewer (readonly)
4. Aplica config al store
5. VectorCanvas renderiza animación
```

### Modelo de Datos

```typescript
// Netlify Blobs Store: "art"

// Key: art:{id}
interface ArtPiece {
  id: string;              // "abc12345"
  title: string;           // "Olas Suaves"
  createdAt: number;       // 1697123456789
  config: VectorState;     // { visual, grid, animation, canvas }
  thumbnail?: string;      // "data:image/png;base64,..."
}

// Key: art:index
interface ArtIndex {
  ids: string[];           // ["abc12345", "def67890", ...]
  updatedAt: number;       // 1697123456789
}
```

---

## 🎯 Características Clave

### Inmutabilidad
- Las obras publicadas **NO se pueden editar**
- Links permanentes (mientras exista el deploy)
- IDs únicos y cortos (8 chars)

### Generación Automática
- **IDs**: nanoid de 8 caracteres (2 billones de combinaciones)
- **Títulos**: Generados según tipo de animación con variaciones
- **Thumbnails**: Snapshot automático del canvas en PNG

### Performance
- Server Components para fetch eficiente
- Edge Functions para baja latencia global
- Thumbnails en base64 (no requieren storage adicional)
- Zero-config con Netlify Blobs

---

## 💡 Uso

### Para Creadores

1. **Crear animación:**
   - Ajusta parámetros en los paneles de control
   - Experimenta con los 18 tipos de animación disponibles
   - Personaliza colores, gradientes, grid, etc.

2. **Publicar:**
   - Abre panel "Publicar Arte"
   - Click "Publicar como Arte"
   - Espera confirmación (1-2 segundos)
   - Copia el link generado

3. **Compartir:**
   - Pega el link donde quieras (redes sociales, email, etc.)
   - Link directo a la obra: `https://victor.app/art/abc123`

### Para Visitantes

1. **Explorar galería:**
   - Ve a `/gallery`
   - Navega por todas las obras
   - Click en cualquier card

2. **Ver obra individual:**
   - Link directo: `/art/abc123`
   - Visualización de solo lectura
   - Botones para copiar/compartir

---

## 🔧 Mantenimiento

### Límites (Free Tier)

- **Function calls**: 125,000/mes
- **Bandwidth**: 100 GB/mes
- **Build minutes**: 300/mes

**Estimación de uso:**
- Publicar obra: 2 function calls
- Ver obra: 1 function call
- Cargar galería (100 obras): 101 function calls

**Capacidad mensual estimada:**
- ~62,000 obras publicadas, O
- ~125,000 vistas individuales, O
- ~1,200 cargas de galería completa

### Monitoreo

En Netlify dashboard:
- Ve a "Functions" para ver uso
- Ve a "Bandwidth" para tráfico
- Ve a "Deploys" para builds

---

## 📝 Notas Técnicas

### Por qué Netlify Blobs

1. **Zero-config**: Se activa automáticamente al deployar
2. **Serverless nativo**: Integración perfecta con Edge Functions
3. **Free tier generoso**: Suficiente para proyectos medianos
4. **Sin base de datos**: KV store simple y rápido
5. **Global**: Edge distribution automática

### Alternativas Consideradas

- **URL Encoding**: Limitado a ~2KB (puede no ser suficiente con thumbnails)
- **Vercel KV**: Similar, pero Victor va a Netlify
- **Supabase**: Requiere más configuración, overkill para este uso
- **Firebase**: Más complejo, pricing menos claro

### Limitaciones del Mock Local

El mock en memoria:
- ✅ Perfecto para desarrollo y testing
- ✅ Mismo API que Netlify Blobs
- ❌ Datos se pierden al recargar
- ❌ No persiste entre sesiones
- ❌ No sirve para demo pública

Para persistencia local, considera:
- Usar `localStorage` en el mock
- O usar `netlify dev` (emula Netlify localmente)

---

## 🆘 Troubleshooting

### "getStore is not a function"
**Causa**: Trying to use Netlify Blobs outside Netlify environment
**Solución**: Asegúrate de estar usando el mock en local

### Obra no aparece en galería
**Causa**: El índice no se actualizó
**Solución**: Verifica logs del API route `/api/art/publish`

### Thumbnail no se muestra
**Causa**: Canvas no capturado correctamente
**Solución**: Verifica que `captureSnapshot()` esté siendo llamado

### Build falla en Netlify
**Causa**: Variables de entorno faltantes o imports incorrectos
**Solución**: Verifica `NEXT_PUBLIC_BASE_URL` y que imports usen `@netlify/blobs`

---

## ✨ Próximas Mejoras Posibles

- [ ] Agregar autenticación (solo creador puede eliminar obra)
- [ ] Sistema de "me gusta" o favoritos
- [ ] Tags y categorías para filtrar galería
- [ ] Búsqueda por título o tipo de animación
- [ ] Embed code para integrar obras en otros sitios
- [ ] Modo "featured" para destacar obras
- [ ] Exportar obra como video además de link
- [ ] QR code para compartir fácilmente

---

## 🎉 Conclusión

El sistema de galería de arte está **100% funcional** y listo para:

1. ✅ **Desarrollo local** con mock
2. ✅ **Deploy a Netlify** con instrucciones claras
3. ✅ **Compartir obras** con links únicos
4. ✅ **Galería pública** navegable
5. ✅ **Experiencia inmutable** (arte permanente)

¡Disfruta publicando tus animaciones como obras de arte! 🚀🎨
