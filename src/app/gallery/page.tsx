/**
 * Gallery Page - Galería pública de obras de arte
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ArtPiece } from '@/types/art';
import { ArtCard } from '@/components/art/ArtCard';
import { Button } from '@/components/ui/button';
import { Home, Palette } from 'lucide-react';

export default function GalleryPage() {
  const [artPieces, setArtPieces] = useState<ArtPiece[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArtPieces() {
      try {
        const response = await fetch('/api/art/list');

        if (!response.ok) {
          setLoading(false);
          return;
        }

        const data = await response.json();
        setArtPieces(data.artPieces || []);
      } catch (error) {
        console.error('Error fetching art pieces:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchArtPieces();
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-zinc-950 border-b border-zinc-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
                <Palette className="w-8 h-8" />
                Galería de Arte
              </h1>
              <p className="text-zinc-400">
                Colección de animaciones vectoriales publicadas
              </p>
            </div>

            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Volver al Editor
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          /* Loading state */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mb-4" />
            <p className="text-zinc-400 text-sm font-mono">Cargando galería...</p>
          </div>
        ) : artPieces.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-zinc-700 mb-4">
              <Palette className="w-16 h-16" />
            </div>
            <h2 className="text-2xl font-semibold text-zinc-400 mb-2">
              La galería está vacía
            </h2>
            <p className="text-zinc-500 mb-6 text-center max-w-md">
              Aún no se han publicado obras de arte. Crea tu primera animación
              en el editor y publícala para verla aquí.
            </p>
            <Link href="/">
              <Button>
                <Home className="w-4 h-4 mr-2" />
                Ir al Editor
              </Button>
            </Link>
          </div>
        ) : (
          /* Grid de obras */
          <>
            <div className="mb-6 text-zinc-400 text-sm">
              {artPieces.length} {artPieces.length === 1 ? 'obra' : 'obras'} publicadas
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {artPieces.map((artPiece) => (
                <ArtCard key={artPiece.id} artPiece={artPiece} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-zinc-800 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-zinc-500 text-sm">
          <p>Victor - Galería de Arte Vectorial</p>
        </div>
      </footer>
    </div>
  );
}
