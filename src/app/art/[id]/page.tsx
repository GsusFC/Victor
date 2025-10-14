/**
 * Art Page - Vista individual de una obra de arte
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { ArtPiece } from '@/types/art';
import { ArtViewer } from '@/components/art/ArtViewer';
import { Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ArtPage() {
  const params = useParams();
  const id = params.id as string;
  const [artPiece, setArtPiece] = useState<ArtPiece | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchArtPiece() {
      try {
        const response = await fetch(`/api/art/${id}`);

        if (!response.ok) {
          setError(true);
          setLoading(false);
          return;
        }

        const data = await response.json();
        setArtPiece(data);
      } catch (err) {
        console.error('Error fetching art piece:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchArtPiece();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center">
          <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm font-mono">Cargando obra...</p>
        </div>
      </div>
    );
  }

  if (error || !artPiece) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Obra no encontrada</h1>
          <p className="text-zinc-400 mb-6">La obra que buscas no existe o ha sido eliminada.</p>
          <Link
            href="/gallery"
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            ← Volver a la Galería
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Top bar con acciones */}
      <div className="flex-shrink-0 bg-zinc-950 border-b border-zinc-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/gallery"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            ← Volver a la Galería
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Link
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: artPiece.title,
                    url: window.location.href,
                  });
                }
              }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Compartir
            </Button>
          </div>
        </div>
      </div>

      {/* Viewer de la obra */}
      <div className="flex-1 min-h-0">
        <ArtViewer artPiece={artPiece} />
      </div>
    </div>
  );
}
