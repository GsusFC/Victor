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
  {
    id: 'cyber-punk',
    name: 'Cyber Punk',
    description: 'Neón intenso estilo cyberpunk',
    type: 'linear',
    angle: 225,
    stops: withStops(
      [
        { color: '#FF00FF', position: 0 },
        { color: '#00FFFF', position: 0.5 },
        { color: '#FFFF00', position: 1 },
      ],
      'cyber-punk'
    ),
    tags: ['neón', 'urbano'],
    featured: true,
  },
  {
    id: 'lava-flow',
    name: 'Lava Flow',
    description: 'Magma ardiente y volcánico',
    type: 'linear',
    angle: 180,
    stops: withStops(
      [
        { color: '#FF0000', position: 0 },
        { color: '#FF4500', position: 0.3 },
        { color: '#FFD700', position: 0.6 },
        { color: '#FFA500', position: 1 },
      ],
      'lava-flow'
    ),
    tags: ['fuego', 'energía'],
  },
  {
    id: 'electric-violet',
    name: 'Electric Violet',
    description: 'Violetas eléctricos con rosa neón',
    type: 'linear',
    angle: 45,
    stops: withStops(
      [
        { color: '#8A2BE2', position: 0 },
        { color: '#9D00FF', position: 0.4 },
        { color: '#FF10F0', position: 0.7 },
        { color: '#FF1493', position: 1 },
      ],
      'electric-violet'
    ),
    tags: ['neón', 'eléctrico'],
    featured: true,
  },
  {
    id: 'toxic-green',
    name: 'Toxic Green',
    description: 'Verde radioactivo brillante',
    type: 'linear',
    angle: 135,
    stops: withStops(
      [
        { color: '#00FF00', position: 0 },
        { color: '#7FFF00', position: 0.35 },
        { color: '#ADFF2F', position: 0.7 },
        { color: '#00FF7F', position: 1 },
      ],
      'toxic-green'
    ),
    tags: ['neón', 'radioactivo'],
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    description: 'Azules profundos de medianoche',
    type: 'linear',
    angle: 90,
    stops: withStops(
      [
        { color: '#000428', position: 0 },
        { color: '#004e92', position: 0.5 },
        { color: '#1e3c72', position: 1 },
      ],
      'midnight-blue'
    ),
    tags: ['oscuro', 'azul'],
  },
  {
    id: 'neon-city',
    name: 'Neon City',
    description: 'Luces de ciudad nocturna',
    type: 'linear',
    angle: 315,
    stops: withStops(
      [
        { color: '#FF006E', position: 0 },
        { color: '#8338EC', position: 0.33 },
        { color: '#3A86FF', position: 0.66 },
        { color: '#06FFA5', position: 1 },
      ],
      'neon-city'
    ),
    tags: ['neón', 'urbano'],
    featured: true,
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    description: 'Cálidos dorados del atardecer',
    type: 'linear',
    angle: 160,
    stops: withStops(
      [
        { color: '#FFD89B', position: 0 },
        { color: '#FF9A56', position: 0.4 },
        { color: '#FF6F61', position: 0.7 },
        { color: '#DE3163', position: 1 },
      ],
      'golden-hour'
    ),
    tags: ['cálido', 'atardecer'],
  },
  {
    id: 'matrix-code',
    name: 'Matrix Code',
    description: 'Verde Matrix con negro profundo',
    type: 'linear',
    angle: 270,
    stops: withStops(
      [
        { color: '#000000', position: 0 },
        { color: '#003B00', position: 0.4 },
        { color: '#00FF41', position: 0.75 },
        { color: '#39FF14', position: 1 },
      ],
      'matrix-code'
    ),
    tags: ['tech', 'verde'],
  },
  {
    id: 'cotton-candy',
    name: 'Cotton Candy',
    description: 'Pasteles dulces rosa y azul',
    type: 'linear',
    angle: 60,
    stops: withStops(
      [
        { color: '#FFB6D9', position: 0 },
        { color: '#D5A5FF', position: 0.5 },
        { color: '#A8E6FF', position: 1 },
      ],
      'cotton-candy'
    ),
    tags: ['pastel', 'dulce'],
  },
  {
    id: 'fire-ice',
    name: 'Fire & Ice',
    description: 'Contraste extremo de fuego y hielo',
    type: 'linear',
    angle: 0,
    stops: withStops(
      [
        { color: '#FF0000', position: 0 },
        { color: '#FF4500', position: 0.25 },
        { color: '#00CED1', position: 0.75 },
        { color: '#00BFFF', position: 1 },
      ],
      'fire-ice'
    ),
    tags: ['contraste', 'extremo'],
    featured: true,
  },
  {
    id: 'cosmic-purple',
    name: 'Cosmic Purple',
    description: 'Morados cósmicos profundos',
    type: 'radial',
    angle: 0,
    stops: withStops(
      [
        { color: '#2E0854', position: 0 },
        { color: '#5E2A84', position: 0.4 },
        { color: '#9D4EDD', position: 0.75 },
        { color: '#C77DFF', position: 1 },
      ],
      'cosmic-purple'
    ),
    tags: ['radial', 'cósmico'],
  },
  {
    id: 'retro-wave',
    name: 'Retro Wave',
    description: 'Estética synthwave de los 80',
    type: 'linear',
    angle: 180,
    stops: withStops(
      [
        { color: '#FF006E', position: 0 },
        { color: '#FF1B8D', position: 0.33 },
        { color: '#8B2FC9', position: 0.66 },
        { color: '#4361EE', position: 1 },
      ],
      'retro-wave'
    ),
    tags: ['retro', '80s'],
    featured: true,
  },
];

export const FEATURED_GRADIENT_PRESETS = BUILT_IN_GRADIENT_PRESETS.filter((preset) => preset.featured);
