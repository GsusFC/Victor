/**
 * EffectCard - Componente reutilizable para efectos de post-processing
 */

'use client';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ReactNode } from 'react';

interface EffectCardProps {
  title: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: ReactNode;
}

export function EffectCard({ title, enabled, onToggle, children }: EffectCardProps) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-mono">{title}</Label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="w-4 h-4 cursor-pointer"
        />
      </div>
      {enabled && <div className="space-y-3">{children}</div>}
    </Card>
  );
}
