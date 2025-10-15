/**
 * ArtCard - Card para mostrar una obra de arte en la galería
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { ArtPiece } from '@/types/art';
import { formatArtDate } from '@/lib/art-utils';
import { Card } from '@/components/ui/card';

interface ArtCardProps {
  artPiece: ArtPiece;
}

export function ArtCard({ artPiece }: ArtCardProps) {
  return (
    <Link href={`/art/${artPiece.id}`}>
      <Card className="group overflow-hidden bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-all duration-300 hover:scale-[1.02]">
        {/* Thumbnail */}
        <div className="aspect-video bg-black relative overflow-hidden">
          {artPiece.thumbnail ? (
            <Image
              src={artPiece.thumbnail}
              alt={artPiece.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
              <div className="text-zinc-700 text-4xl font-bold">
                {artPiece.title.charAt(0)}
              </div>
            </div>
          )}

          {/* Overlay al hover */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="text-white text-sm font-medium">Ver Obra</span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-white mb-1 truncate group-hover:text-cyan-400 transition-colors">
            {artPiece.title}
          </h3>
          <p className="text-xs text-zinc-400 mb-2">
            {formatArtDate(artPiece.createdAt)}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-mono">
              {artPiece.config.animation.type}
            </span>
            <span className="text-xs text-zinc-600">
              ID: {artPiece.id}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
