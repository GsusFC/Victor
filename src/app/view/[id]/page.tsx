/**
 * Vista Minimal - Experiencia de arte puro
 * Solo fondo negro y animación en dimensiones fijas
 * Server Component para fetch eficiente
 */

import type { ArtPiece } from '@/types/art';
import { MinimalViewer as MinimalViewerClient } from '@/components/art/MinimalViewerClient';
import { headers } from 'next/headers';

interface ViewPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getArtPiece(id: string): Promise<ArtPiece | null> {
  try {
    // Obtener el host correcto desde los headers
    const headersList = await headers();
    const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000';
    
    // Determinar protocol
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    
    let baseUrl = `${protocol}://${host}`;
    
    // Fallbacks si hay variables de entorno
    if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else if (process.env.NEXT_PUBLIC_BASE_URL) {
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    }

    console.log(`🔍 getArtPiece: Fetching from ${baseUrl}/api/art/${id}`);

    const response = await fetch(`${baseUrl}/api/art/${id}`, {
      cache: 'no-store', // No cachear para ver cambios en tiempo real
    });

    if (!response.ok) {
      console.error(`API error for ${baseUrl}/api/art/${id}:`, response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    console.log(`✅ getArtPiece: Got art piece ${id}`);
    return data;
  } catch (err) {
    console.error('Error fetching art piece:', err);
    return null;
  }
}

export default async function ViewPage({ params }: ViewPageProps) {
  const { id } = await params;
  const artPiece = await getArtPiece(id);

  if (!artPiece) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Obra no encontrada</h1>
          <p className="text-zinc-400">La obra que buscas no existe o ha sido eliminada.</p>
        </div>
      </div>
    );
  }

  return <MinimalViewerClient artPiece={artPiece} />;
}
