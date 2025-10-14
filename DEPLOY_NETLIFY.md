# Guía de Deploy en Netlify

## 🎯 Sistema de Galería de Arte Implementado

El proyecto ahora incluye un sistema completo de galería de arte que permite:

- ✅ Publicar animaciones como obras de arte inmutables
- ✅ Generar links únicos compartibles (`/art/abc123`)
- ✅ Galería pública navegable (`/gallery`)
- ✅ Vistas de solo lectura para obras publicadas

---

## 📦 Archivos Nuevos Creados

### Types y Utilidades
- `src/types/art.ts` - Tipos TypeScript para el sistema de arte
- `src/lib/art-utils.ts` - Utilidades (IDs, títulos, capturas, etc.)

### API Routes (Netlify Edge Functions)
- `src/app/api/art/publish/route.ts` - POST: Publicar obra
- `src/app/api/art/[id]/route.ts` - GET: Obtener obra por ID
- `src/app/api/art/list/route.ts` - GET: Listar todas las obras

### Componentes
- `src/components/art/PublishButton.tsx` - Botón para publicar con modal
- `src/components/art/ArtViewer.tsx` - Visualizador en modo solo lectura
- `src/components/art/ArtCard.tsx` - Card para galería

### Páginas
- `src/app/art/[id]/page.tsx` - Vista individual de obra
- `src/app/gallery/page.tsx` - Galería pública

### Configuración
- `netlify.toml` - Configuración de Netlify

---

## 🚀 Pasos para Deploy en Netlify

### 1. Crear cuenta en Netlify

Ve a [https://netlify.com](https://netlify.com) y crea una cuenta (gratis).

### 2. Instalar Netlify CLI (opcional pero recomendado)

```bash
npm install -g netlify-cli
netlify login
```

### 3. Conectar repositorio

Dos opciones:

**Opción A: Desde el dashboard de Netlify**
1. Click en "Add new site" > "Import an existing project"
2. Conecta tu repositorio de GitHub
3. Selecciona el branch `main`
4. Build settings se detectan automáticamente desde `netlify.toml`

**Opción B: Desde CLI**
```bash
netlify init
```

### 4. Configurar variables de entorno

En el dashboard de Netlify:
- Ve a Site settings > Environment variables
- Agrega:
  ```
  NEXT_PUBLIC_BASE_URL=https://tu-sitio.netlify.app
  ```

### 5. Deploy

**Automático (recomendado):**
- Push a tu branch `main` y Netlify deployará automáticamente

**Manual:**
```bash
npm run build
netlify deploy --prod
```

---

## 🗄️ Netlify Blobs Storage

### ¿Qué es?

Netlify Blobs es un sistema de almacenamiento key-value serverless:
- **Zero-config**: Se configura automáticamente
- **Free tier**: 125,000 function calls/mes
- **Edge runtime**: Rápido y distribuido globalmente
- **Integración nativa**: Funciona automáticamente con Next.js en Netlify

### Cómo funciona

Las API routes usan `@netlify/blobs`:

```typescript
import { getStore } from '@netlify/blobs';

const store = getStore('art');  // Nombre del store
await store.setJSON(`art:${id}`, artPiece);  // Guardar
const art = await store.get(`art:${id}`, { type: 'json' });  // Leer
```

### Stores creados automáticamente

- `art` - Store principal para obras de arte
  - Keys: `art:{id}` - Obra individual
  - Key: `art:index` - Índice de IDs

---

## 🧪 Probar en Local (Desarrollo)

**IMPORTANTE**: Netlify Blobs solo funciona en Netlify, **no en local**.

Para desarrollo local, tienes dos opciones:

### Opción 1: Mock de Netlify Blobs

Crear un archivo `src/lib/blobs-mock.ts`:

```typescript
// Mock simple para desarrollo local
const mockStore: Record<string, any> = {};

export function getStore(name: string) {
  return {
    async setJSON(key: string, data: any) {
      mockStore[key] = data;
    },
    async get(key: string, options?: { type: 'json' }) {
      return mockStore[key] || null;
    },
  };
}
```

Y modificar las API routes para usar el mock en desarrollo:

```typescript
import { getStore } from '@netlify/blobs';
// import { getStore } from '@/lib/blobs-mock';  // Usar en local
```

### Opción 2: Netlify Dev (Recomendado)

Ejecutar el proyecto con el CLI de Netlify:

```bash
netlify dev
```

Esto emula el entorno de Netlify localmente, incluyendo Blobs.

---

## 📊 Límites del Free Tier

### Netlify Free Plan
- ✅ 100 GB bandwidth/mes
- ✅ 300 build minutes/mes
- ✅ Dominio personalizado con HTTPS
- ✅ 125,000 function calls/mes
- ✅ Blobs storage ilimitado (con límite de calls)

### Consideraciones
- Cada publicación de arte = 2 function calls (setJSON x2)
- Cada vista de arte = 1 function call (get)
- Cada carga de galería = 1 + N calls (index + N obras)

**Estimación**: Con 125k calls/mes puedes:
- Publicar ~62,000 obras/mes, O
- Ver ~125,000 obras individuales/mes, O
- Cargar galería de 100 obras ~1,250 veces/mes

Es más que suficiente para un proyecto personal o pequeño.

---

## 🔧 Troubleshooting

### Error: "getStore is not a function"

**Causa**: Intentando usar Netlify Blobs fuera del entorno de Netlify.

**Solución**:
1. Usa `netlify dev` en local
2. O implementa el mock mencionado arriba
3. O despliega a Netlify para probar

### Error: "Module not found: @netlify/blobs"

**Solución**:
```bash
npm install @netlify/blobs
```

### API routes devuelven 404

**Solución**: Verifica que `netlify.toml` esté en la raíz del proyecto y que el path de las API routes sea correcto.

### Fast Refresh warnings

Son normales durante desarrollo. No afectan el funcionamiento en producción.

---

## ✅ Checklist Final

Antes de hacer push:

- [ ] Todas las dependencias instaladas (`npm install`)
- [ ] Build exitoso en local (`npm run build`)
- [ ] `netlify.toml` en la raíz
- [ ] Variables de entorno configuradas en Netlify dashboard
- [ ] Repositorio conectado a Netlify
- [ ] Branch `main` configurado para auto-deploy

---

## 🎨 Uso del Sistema

### Para publicar una obra:

1. Crea tu animación en el editor principal
2. Abre el panel "Publicar Arte" (columna derecha)
3. Click en "Publicar como Arte"
4. Se captura un snapshot y se genera un link único
5. Comparte el link: `https://tu-sitio.netlify.app/art/abc123`

### Para ver la galería:

1. Ve a `https://tu-sitio.netlify.app/gallery`
2. Navega por todas las obras publicadas
3. Click en cualquier card para ver la obra en detalle

---

## 📝 Notas

- Las obras publicadas son **inmutables** (no se pueden editar)
- Los IDs son únicos y permanentes
- Los thumbnails se guardan en base64 (parte del JSON)
- No hay límite de obras (solo el límite de function calls/mes)

---

## 🆘 Soporte

- Netlify Docs: https://docs.netlify.com
- Netlify Blobs: https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- Next.js on Netlify: https://docs.netlify.com/frameworks/next-js/

¡Listo para deploy! 🚀
