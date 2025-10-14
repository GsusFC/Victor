/**
 * gradient-presets.ts
 * Colección curada de gradientes profesionales para Victor
 */

import type { GradientPreset } from '@/store/vectorStore';

const withStops = (stops: Array<{ color: string; position: number }>, id: string): GradientPreset['stops'] =>
  stops.map((stop, index) => ({
    id: `${id}-${index}`,
    color: stop.color,
    position: stop.position,
  }));

export const BUILT_IN_GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: 'aurora-sky',
    name: 'Aurora Sky',
    description: 'Neón frío con matices vaporwave',
    type: 'linear',
    angle: 32,
    stops: withStops(
      [
        { color: '#35E8FF', position: 0 },
        { color: '#7D5CFF', position: 0.6 },
        { color: '#23074D', position: 1 },
      ],
      'aurora-sky'
    ),
    tags: ['neón', 'vaporwave'],
    featured: true,
  },
  {
    id: 'sunset-drive',
    name: 'Sunset Drive',
    description: 'Atardecer cálido con transición dramática',
    type: 'linear',
    angle: 200,
    stops: withStops(
      [
        { color: '#FF9A8B', position: 0 },
        { color: '#FF6A88', position: 0.45 },
        { color: '#FF99AC', position: 1 },
      ],
      'sunset-drive'
    ),
    tags: ['cálido', 'retro'],
    featured: true,
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    description: 'Oscuro, elegante y cinematográfico',
    type: 'linear',
    angle: 120,
    stops: withStops(
      [
        { color: '#02111B', position: 0 },
        { color: '#031D44', position: 0.4 },
        { color: '#2D4F73', position: 0.75 },
        { color: '#1A8FE3', position: 1 },
      ],
      'deep-ocean'
    ),
    tags: ['oscuro', 'azul'],
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    description: 'Tonos energía con alto contraste',
    type: 'linear',
    angle: 18,
    stops: withStops(
      [
        { color: '#FFE29F', position: 0 },
        { color: '#FFA99F', position: 0.5 },
        { color: '#FF719A', position: 1 },
      ],
      'solar-flare'
    ),
    tags: ['energía', 'festival'],
  },
  {
    id: 'sage-mist',
    name: 'Sage Mist',
    description: 'Paleta suave y contemporánea',
    type: 'linear',
    angle: 90,
    stops: withStops(
      [
        { color: '#DCE35B', position: 0 },
        { color: '#45B649', position: 0.55 },
        { color: '#283C86', position: 1 },
      ],
      'sage-mist'
    ),
    tags: ['pastel', 'organic'],
  },
  {
    id: 'infrared',
    name: 'Infrared',
    description: 'Gradiente futurista, ideal para visualizaciones técnicas',
    type: 'linear',
    angle: 135,
    stops: withStops(
      [
        { color: '#F72585', position: 0 },
        { color: '#7209B7', position: 0.45 },
        { color: '#3A0CA3', position: 0.75 },
        { color: '#4361EE', position: 1 },
      ],
      'infrared'
    ),
    tags: ['tech', 'contrast'],
  },
  {
    id: 'northern-lights',
    name: 'Northern Lights',
    description: 'Inspirado en auroras boreales con verdes y cianes',
    type: 'radial',
    angle: 0,
    stops: withStops(
      [
        { color: '#0b486b', position: 0 },
        { color: '#3b8686', position: 0.35 },
        { color: '#79bd9a', position: 0.7 },
        { color: '#a8dba8', position: 1 },
      ],
      'northern-lights'
    ),
    tags: ['radial', 'nórdico'],
  },
  {
    id: 'mono-glow',
    name: 'Mono Glow',
    description: 'Grises con resplandor cálido',
    type: 'linear',
    angle: 270,
    stops: withStops(
      [
        { color: '#1F1C2C', position: 0 },
        { color: '#928DAB', position: 0.65 },
        { color: '#FFE29F', position: 1 },
      ],
      'mono-glow'
    ),
    tags: ['monocromo', 'editorial'],
  },
];

export const FEATURED_GRADIENT_PRESETS = BUILT_IN_GRADIENT_PRESETS.filter((preset) => preset.featured);
