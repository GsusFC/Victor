/**
 * API Route: GET /api/art/list
 * Lista todas las obras de arte publicadas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@netlify/blobs';  // Producción (Netlify)
// import { getStore } from '@/lib/blobs-mock';  // Desarrollo local
import type { ArtIndex, ArtPiece } from '@/types/art';

export const runtime = 'edge';  // Edge Runtime para Netlify

export async function GET(_request: NextRequest) {
  try {
    const store = getStore('art');

    // Obtener el índice (sin prefijo art: porque el mock ya lo agrega)
    let index: ArtIndex;
    try {
      const existingIndex = await store.get('index', { type: 'json' });
      index = existingIndex as ArtIndex || { ids: [], updatedAt: Date.now() };
    } catch {
      index = { ids: [], updatedAt: Date.now() };
    }

    // Obtener todas las obras
    const artPieces: ArtPiece[] = [];

    for (const id of index.ids) {
      try {
        const piece = await store.get(id, { type: 'json' }) as ArtPiece | null;
        if (piece) {
          artPieces.push(piece);
        }
      } catch (error) {
        console.error(`Error fetching art piece ${id}:`, error);
        // Continuar con las demás obras
      }
    }

    return NextResponse.json({
      artPieces,
      total: artPieces.length,
    });

  } catch (error) {
    console.error('Error listing art:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
