/**
 * ShapeLibrary - Genera y gestiona geometrías de formas para vectores
 * Sistema de geometry instancing con pre-generación
 */

import { SHAPE_CONFIG } from './shape-constants';

export interface ShapeGeometry {
  vertices: Float32Array; // Posiciones de vértices [x, y, x, y, ...]
  vertexCount: number; // Número total de vértices
  segments: number; // Número de segmentos (para información)
}

export type ShapeName = 'line' | 'triangle' | 'arc' | 'circle' | 'star' | 'hexagon' | 'arrow' | 'diamond' | 'semicircle' | 'cross';

export class ShapeLibrary {
  private shapes = new Map<ShapeName, ShapeGeometry>();

  constructor() {
    this.generateAllShapes();
  }

  private generateAllShapes(): void {
    this.shapes.set('line', this.generateLine());
    this.shapes.set('triangle', this.generateTriangle());
    this.shapes.set('arc', this.generateArc(SHAPE_CONFIG.ARC.SEGMENTS));
    this.shapes.set('circle', this.generateCircle(SHAPE_CONFIG.CIRCLE.SEGMENTS));
    this.shapes.set('star', this.generateStar(SHAPE_CONFIG.STAR.POINTS, SHAPE_CONFIG.STAR.INNER_RADIUS));
    this.shapes.set('hexagon', this.generateHexagon());
    this.shapes.set('arrow', this.generateArrow());
    this.shapes.set('diamond', this.generateDiamond());
    this.shapes.set('semicircle', this.generateSemicircle(SHAPE_CONFIG.SEMICIRCLE.SEGMENTS));
    this.shapes.set('cross', this.generateCross());
  }

  /**
   * Genera geometría de línea (2 triángulos = rectángulo)
   */
  private generateLine(): ShapeGeometry {
    // Vértices en espacio local normalizado:
    // x: 0 (base) a 1 (punta)
    // y: -0.5 a 0.5 (ancho normalizado)

    const vertices = new Float32Array([
      // Primer triángulo (base-izq, base-der, punta-der)
      0.0, -0.5,  // vértice 0: base inferior
      0.0, 0.5,   // vértice 1: base superior
      1.0, 0.5,   // vértice 2: punta superior

      // Segundo triángulo (base-izq, punta-der, punta-izq)
      0.0, -0.5,  // vértice 3: base inferior
      1.0, 0.5,   // vértice 4: punta superior
      1.0, -0.5,  // vértice 5: punta inferior
    ]);

    return {
      vertices,
      vertexCount: 6,
      segments: 1,
    };
  }

  /**
   * Genera geometría de triángulo puntiagudo
   */
  private generateTriangle(): ShapeGeometry {
    // Triángulo con base ancha y punta
    const vertices = new Float32Array([
      // Primer triángulo (base-izq, base-der, punta)
      0.0, -0.6,  // vértice 0: base inferior (ancho extra)
      0.0, 0.6,   // vértice 1: base superior (ancho extra)
      1.0, 0.0,   // vértice 2: punta centrada

      // Segundo triángulo (no necesario, pero por consistencia)
      0.0, -0.6,  // vértice 3
      1.0, 0.0,   // vértice 4
      1.0, 0.0,   // vértice 5 (duplicado, triángulo degenerado)
    ]);

    return {
      vertices,
      vertexCount: 6,
      segments: 1,
    };
  }

  /**
   * Genera geometría de arco (línea curva)
   * @param segments Número de segmentos para aproximar la curva
   */
  private generateArc(segments: number): ShapeGeometry {
    const vertices: number[] = [];
    const halfWidth = SHAPE_CONFIG.ARC.HALF_WIDTH;

    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;

      // Calcular posición en la curva (sin(t * π) para arco semicircular)
      const x0 = t0;
      const y0 = Math.sin(t0 * Math.PI) * SHAPE_CONFIG.ARC.CURVATURE;
      const x1 = t1;
      const y1 = Math.sin(t1 * Math.PI) * 0.8;

      // Calcular normal perpendicular para el ancho
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len;
      const ny = dx / len;

      // Generar rectángulo para este segmento
      const p0x = x0 - nx * halfWidth;
      const p0y = y0 - ny * halfWidth;
      const p1x = x0 + nx * halfWidth;
      const p1y = y0 + ny * halfWidth;
      const p2x = x1 + nx * halfWidth;
      const p2y = y1 + ny * halfWidth;
      const p3x = x1 - nx * halfWidth;
      const p3y = y1 - ny * halfWidth;

      // Primer triángulo
      vertices.push(p0x, p0y, p1x, p1y, p2x, p2y);
      // Segundo triángulo
      vertices.push(p0x, p0y, p2x, p2y, p3x, p3y);
    }

    return {
      vertices: new Float32Array(vertices),
      vertexCount: segments * 6,
      segments,
    };
  }

  /**
   * Genera geometría de círculo
   * @param segments Número de segmentos para aproximar el círculo
   */
  private generateCircle(segments: number): ShapeGeometry {
    const vertices: number[] = [];
    const radius = 0.15; // Radio del círculo en espacio local
    const centerX = 0.15; // Centrado cerca del inicio
    const centerY = 0.0;

    for (let i = 0; i < segments; i++) {
      const angle0 = (i / segments) * Math.PI * 2;
      const angle1 = ((i + 1) / segments) * Math.PI * 2;

      const x0 = centerX + Math.cos(angle0) * radius;
      const y0 = centerY + Math.sin(angle0) * radius;
      const x1 = centerX + Math.cos(angle1) * radius;
      const y1 = centerY + Math.sin(angle1) * radius;

      // Triángulo desde el centro
      vertices.push(
        centerX, centerY, // Centro
        x0, y0,           // Punto 1 en circunferencia
        x1, y1            // Punto 2 en circunferencia
      );
    }

    return {
      vertices: new Float32Array(vertices),
      vertexCount: segments * 3,
      segments,
    };
  }

  /**
   * Obtiene la geometría de una forma
   */
  getShape(name: ShapeName): ShapeGeometry {
    const shape = this.shapes.get(name);
    if (!shape) {
      throw new Error(`Shape "${name}" not found`);
    }
    return shape;
  }

  /**
   * Lista todas las formas disponibles
   */
  getAvailableShapes(): ShapeName[] {
    return Array.from(this.shapes.keys());
  }

  /**
   * Obtiene información de una forma
   */
  getShapeInfo(name: ShapeName): { vertexCount: number; segments: number } {
    const shape = this.getShape(name);
    return {
      vertexCount: shape.vertexCount,
      segments: shape.segments,
    };
  }

  /**
   * Genera geometría de estrella
   * @param points Número de puntas (default: 5)
   * @param innerRadius Radio interior relativo (0-1, default: 0.5)
   */
  private generateStar(points: number = 5, innerRadius: number = 0.5): ShapeGeometry {
    const vertices: number[] = [];
    const outerRadius = 0.2;
    const centerX = 0.2;
    const centerY = 0.0;

    // Generar puntos alternando entre radio exterior e interior
    for (let i = 0; i < points * 2; i++) {
      const angle0 = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const angle1 = ((i + 1) / (points * 2)) * Math.PI * 2 - Math.PI / 2;

      const radius0 = i % 2 === 0 ? outerRadius : outerRadius * innerRadius;
      const radius1 = (i + 1) % 2 === 0 ? outerRadius : outerRadius * innerRadius;

      const x0 = centerX + Math.cos(angle0) * radius0;
      const y0 = centerY + Math.sin(angle0) * radius0;
      const x1 = centerX + Math.cos(angle1) * radius1;
      const y1 = centerY + Math.sin(angle1) * radius1;

      // Triángulo desde el centro
      vertices.push(
        centerX, centerY, // Centro
        x0, y0,           // Punto actual
        x1, y1            // Punto siguiente
      );
    }

    return {
      vertices: new Float32Array(vertices),
      vertexCount: points * 2 * 3,
      segments: points * 2,
    };
  }

  /**
   * Genera geometría de hexágono regular
   */
  private generateHexagon(): ShapeGeometry {
    const vertices: number[] = [];
    const radius = 0.18;
    const centerX = 0.2;
    const centerY = 0.0;
    const sides = 6;

    for (let i = 0; i < sides; i++) {
      const angle0 = (i / sides) * Math.PI * 2;
      const angle1 = ((i + 1) / sides) * Math.PI * 2;

      const x0 = centerX + Math.cos(angle0) * radius;
      const y0 = centerY + Math.sin(angle0) * radius;
      const x1 = centerX + Math.cos(angle1) * radius;
      const y1 = centerY + Math.sin(angle1) * radius;

      vertices.push(
        centerX, centerY,
        x0, y0,
        x1, y1
      );
    }

    return {
      vertices: new Float32Array(vertices),
      vertexCount: sides * 3,
      segments: sides,
    };
  }

  /**
   * Genera geometría de flecha (rectángulo + triángulo puntiagudo)
   */
  private generateArrow(): ShapeGeometry {
    const vertices = new Float32Array([
      // Cuerpo de la flecha (rectángulo)
      0.0, -0.3,
      0.0, 0.3,
      0.6, 0.3,

      0.0, -0.3,
      0.6, 0.3,
      0.6, -0.3,

      // Punta de la flecha (triángulo grande)
      0.6, -0.6,
      0.6, 0.6,
      1.0, 0.0,

      0.6, -0.6,
      1.0, 0.0,
      1.0, 0.0, // Degenerado para mantener 6 vértices por segmento
    ]);

    return {
      vertices,
      vertexCount: 12,
      segments: 2,
    };
  }

  /**
   * Genera geometría de rombo/diamante
   */
  private generateDiamond(): ShapeGeometry {
    const vertices = new Float32Array([
      // Triángulo izquierdo
      0.0, 0.0,
      0.5, 0.5,
      1.0, 0.0,

      // Triángulo derecho
      0.0, 0.0,
      1.0, 0.0,
      0.5, -0.5,
    ]);

    return {
      vertices,
      vertexCount: 6,
      segments: 2,
    };
  }

  /**
   * Genera geometría de semicírculo
   * @param segments Número de segmentos para aproximar la curva
   */
  private generateSemicircle(segments: number = 12): ShapeGeometry {
    const vertices: number[] = [];
    const radius = 0.2;
    const centerX = 0.2;
    const centerY = 0.0;

    for (let i = 0; i < segments; i++) {
      // Solo media vuelta (π radianes)
      const angle0 = (i / segments) * Math.PI;
      const angle1 = ((i + 1) / segments) * Math.PI;

      const x0 = centerX + Math.cos(angle0) * radius;
      const y0 = centerY + Math.sin(angle0) * radius;
      const x1 = centerX + Math.cos(angle1) * radius;
      const y1 = centerY + Math.sin(angle1) * radius;

      vertices.push(
        centerX, centerY,
        x0, y0,
        x1, y1
      );
    }

    return {
      vertices: new Float32Array(vertices),
      vertexCount: segments * 3,
      segments,
    };
  }

  /**
   * Genera geometría de cruz (dos rectángulos perpendiculares)
   */
  private generateCross(): ShapeGeometry {
    const width = 0.15;
    const vertices = new Float32Array([
      // Barra horizontal
      0.2, -width,
      0.2, width,
      0.8, width,

      0.2, -width,
      0.8, width,
      0.8, -width,

      // Barra vertical
      0.5 - width, 0.1,
      0.5 - width, 0.6,
      0.5 + width, 0.6,

      0.5 - width, 0.1,
      0.5 + width, 0.6,
      0.5 + width, 0.1,
    ]);

    return {
      vertices,
      vertexCount: 12,
      segments: 2,
    };
  }
}
