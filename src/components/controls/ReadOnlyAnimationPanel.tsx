/**
 * ReadOnlyAnimationPanel - Panel de solo lectura para visualizar configuración de animación
 */

'use client';

import { useVectorStore, selectAnimation, getAnimationCategory, type AnimationCategory } from '@/store/vectorStore';

// Categorías de animaciones
const categoryLabels: Record<AnimationCategory, string> = {
  natural: 'Naturales/Fluidas',
  energetic: 'Energéticas',
  geometric: 'Geométricas',
  experimental: 'Experimental',
};

// Nombres legibles de animaciones
const animationLabels: Record<string, string> = {
  none: 'Sin animación',
  smoothWaves: 'Olas suaves',
  seaWaves: 'Olas de mar',
  breathingSoft: 'Respiración suave',
  flocking: 'Flocking',
  electricPulse: 'Pulso eléctrico',
  vortex: 'Vórtice',
  directionalFlow: 'Flujo direccional',
  storm: 'Tormenta',
  solarFlare: 'Explosión solar',
  radiation: 'Radiación',
  tangenteClasica: 'Tangente clásica',
  lissajous: 'Lissajous',
  geometricPattern: 'Patrón geométrico',
};

// Nombres de parámetros por tipo de animación
const paramLabels: Record<string, Record<string, string>> = {
  smoothWaves: {
    frequency: 'Frecuencia',
    amplitude: 'Amplitud',
    elasticity: 'Elasticidad',
    maxLength: 'Longitud máx.',
  },
  seaWaves: {
    frequency: 'Frecuencia base',
    amplitude: 'Amplitud',
    elasticity: 'Elasticidad',
    maxLength: 'Longitud máx.',
  },
  breathingSoft: {
    frequency: 'Frecuencia giro',
    amplitude: 'Pitch helicoidal',
    elasticity: 'Mezcla axial',
    maxLength: 'Longitud máx.',
  },
  flocking: {
    frequency: 'Radio percepción',
    amplitude: 'Alineación',
    elasticity: 'Cohesión',
    maxLength: 'Longitud máx.',
  },
  electricPulse: {
    frequency: 'Velocidad pulso',
    amplitude: 'Intensidad',
    elasticity: 'Elasticidad',
    maxLength: 'Longitud máx.',
  },
  vortex: {
    frequency: 'Intensidad remolino',
    amplitude: 'Atracción centro',
    elasticity: 'Caída radial',
    maxLength: 'Longitud máx.',
  },
  directionalFlow: {
    frequency: 'Ángulo base',
    amplitude: 'Turbulencia',
    elasticity: 'Mezcla ruido',
    maxLength: 'Longitud máx.',
  },
  storm: {
    frequency: 'Caos',
    amplitude: 'Vorticidad',
    elasticity: 'Velocidad pulsos',
    maxLength: 'Longitud máx.',
  },
  solarFlare: {
    frequency: 'Intensidad eyecciones',
    amplitude: 'Rotación solar',
    elasticity: 'Ángulo apertura',
    maxLength: 'Longitud máx.',
  },
  radiation: {
    frequency: 'Velocidad ondas',
    amplitude: 'Número fuentes',
    elasticity: 'Interferencia',
    maxLength: 'Longitud máx.',
  },
  tangenteClasica: {
    frequency: 'Velocidad rotación',
    amplitude: 'Dirección',
    elasticity: 'Mezcla radial',
    maxLength: 'Longitud máx.',
  },
  lissajous: {
    frequency: 'Frecuencia X',
    amplitude: 'Frecuencia Y',
    elasticity: 'Amplitud',
    maxLength: 'Longitud máx.',
  },
  geometricPattern: {
    frequency: 'Frecuencia patrón',
    amplitude: 'Torsión',
    elasticity: 'Mezcla radial',
    maxLength: 'Longitud máx.',
  },
};

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs font-mono text-muted-foreground">{label}</span>
      <span className="text-xs font-mono text-foreground font-medium">{value}</span>
    </div>
  );
}

export function ReadOnlyAnimationPanel() {
  const animation = useVectorStore(selectAnimation);
  const currentCategory = getAnimationCategory(animation.type);
  const animationLabel = animationLabels[animation.type] || animation.type;
  const categoryLabel = categoryLabels[currentCategory];
  const params = paramLabels[animation.type] || {};

  // Formatear parámetros
  const formatParam = (param: string, value: number | undefined): string => {
    if (value === undefined) return 'N/A';

    // Casos especiales
    if (animation.type === 'tangenteClasica' && param === 'amplitude') {
      return value >= 0 ? 'Horario' : 'Antihorario';
    }
    if (param === 'amplitude' && (animation.type.includes('Waves') || animation.type === 'directionalFlow' || animation.type === 'solarFlare' || animation.type === 'geometricPattern')) {
      return `${value.toFixed(0)}°`;
    }
    if (param === 'elasticity' && animation.type === 'solarFlare') {
      return `${value.toFixed(0)}°`;
    }
    if (param === 'maxLength') {
      return `${value.toFixed(0)} px`;
    }
    if (param === 'amplitude' && animation.type === 'radiation') {
      return value.toFixed(0);
    }

    return value.toFixed(2);
  };

  return (
    <section className="space-y-4">
      <h3 className="font-semibold text-sm text-foreground">Animación</h3>

      <div className="space-y-0.5 bg-card/50 rounded-lg p-3 border">
        <InfoRow label="Categoría" value={categoryLabel} />
        <InfoRow label="Tipo" value={animationLabel} />
        <InfoRow label="Velocidad" value={`${animation.speed.toFixed(1)}x`} />
      </div>

      {Object.keys(params).length > 0 && (
        <div className="space-y-0.5 bg-card/50 rounded-lg p-3 border">
          <div className="text-xs font-mono text-muted-foreground mb-2 pb-2 border-b border-border/40">
            Parámetros
          </div>
          {Object.entries(params).map(([param, label]) => (
            <InfoRow
              key={param}
              label={label}
              value={formatParam(param, animation.params[param as keyof typeof animation.params])}
            />
          ))}
        </div>
      )}

      <div className="space-y-0.5 bg-card/50 rounded-lg p-3 border">
        <div className="text-xs font-mono text-muted-foreground mb-2 pb-2 border-b border-border/40">
          Reproducibilidad
        </div>
        <InfoRow label="Seed" value={animation.seed} />
        <InfoRow label="Auto-seed" value={animation.autoSeed ? 'Activado' : 'Desactivado'} />
      </div>
    </section>
  );
}
