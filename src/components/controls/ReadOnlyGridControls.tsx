/**
 * ReadOnlyGridControls - Panel de solo lectura para visualizar configuración del grid
 */

'use client';

import { useVectorStore, selectGrid } from '@/store/vectorStore';

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs font-mono text-muted-foreground">{label}</span>
      <span className="text-xs font-mono text-foreground font-medium">{value}</span>
    </div>
  );
}

export function ReadOnlyGridControls() {
  const grid = useVectorStore(selectGrid);

  return (
    <section className="space-y-4">
      <h3 className="font-semibold text-sm text-foreground">Grid</h3>

      <div className="space-y-0.5 bg-card/50 rounded-lg p-3 border">
        <InfoRow label="Filas" value={grid.rows} />
        <InfoRow label="Columnas" value={grid.cols} />
        {grid.mode === 'fixed' && <InfoRow label="Espaciado" value={grid.spacing} />}
        <InfoRow label="Modo" value={grid.mode === 'fixed' ? 'Fijo' : 'Uniforme'} />
      </div>

      <div className="text-xs text-muted-foreground font-mono pt-2 border-t">
        Total: {grid.rows * grid.cols} vectores
      </div>
    </section>
  );
}
