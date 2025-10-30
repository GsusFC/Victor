/**
 * API Route: GET /api/art/[id]
 * Obtiene una obra de arte por su ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@netlify/blobs';  // Producción (Netlify)
// import { getStore } from '@/lib/blobs-mock';  // Desarrollo local
import type { ArtPiece } from '@/types/art';

export const runtime = 'edge';  // Edge Runtime para Netlify

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    // Obtener de Netlify Blobs
    const store = getStore('art');
    const artPiece = await store.get(id, { type: 'json' }) as ArtPiece | null;

    // LOG: Ver qué datos se están devolviendo
    console.log('📤 API /art/[id]: Obteniendo obra', id);
    if (artPiece) {
      console.log('📤 Config devuelto:', JSON.stringify(artPiece.config, null, 2));
    }

    if (!artPiece) {
      return NextResponse.json(
        { error: 'Art piece not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(artPiece);

  } catch (error) {
    console.error('Error fetching art:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
