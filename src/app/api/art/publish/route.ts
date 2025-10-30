/**
 * API Route: POST /api/art/publish
 * Publica una animación como obra de arte
 */

import { NextRequest, NextResponse } from 'next/server';
// import { getStore } from '@netlify/blobs';  // Producción (Netlify)
import { getStore } from '@/lib/blobs-mock';  // Desarrollo local
import type { ArtPiece, ArtIndex, PublishArtRequest, PublishArtResponse } from '@/types/art';
import { generateArtId, generateArtTitle } from '@/lib/art-utils';

// export const runtime = 'edge';  // Solo en Netlify

export async function POST(request: NextRequest) {
  try {
    // Parse el body
    const body: PublishArtRequest = await request.json();

    // LOG: Ver qué datos llegaron al API
    console.log('📥 API /art/publish: Datos recibidos');
    console.log('📥 Config recibido:', JSON.stringify(body.config, null, 2));
    console.log('📥 Capture time recibido:', body.captureTime);
    console.log('📥 Vector data recibido (primeros 20):', body.vectorData?.slice(0, 20));

    if (!body.config) {
      return NextResponse.json(
        { success: false, error: 'Config is required' } as PublishArtResponse,
        { status: 400 }
      );
    }

    // Generar ID único
    const id = generateArtId();

    // Generar título si no se provee
    const title = body.title || generateArtTitle(body.config.animation.type);

    console.log('📥 ID generado:', id);
    console.log('📥 Título:', title);

    // Crear la obra de arte
    const artPiece: ArtPiece = {
      id,
      title,
      createdAt: Date.now(),
      config: body.config,
      thumbnail: body.thumbnail,
      captureTime: body.captureTime,
      vectorData: body.vectorData,
    };

    // Guardar en Netlify Blobs
    const store = getStore('art');

    // Guardar la obra (sin prefijo art: porque el mock ya lo agrega)
    await store.setJSON(id, artPiece);

    // Actualizar el índice
    let index: ArtIndex;
    try {
      const existingIndex = await store.get('index', { type: 'json' });
      index = existingIndex as ArtIndex || { ids: [], updatedAt: Date.now() };
    } catch {
      index = { ids: [], updatedAt: Date.now() };
    }

    // Agregar el nuevo ID al principio (más recientes primero)
    index.ids.unshift(id);
    index.updatedAt = Date.now();

    await store.setJSON('index', index);

    // Construir URL - Usar /view/ para experiencia minimal
    const url = `${request.nextUrl.origin}/view/${id}`;

    return NextResponse.json({
      success: true,
      id,
      url,
    } as PublishArtResponse);

  } catch (error) {
    console.error('Error publishing art:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as PublishArtResponse,
      { status: 500 }
    );
  }
}
