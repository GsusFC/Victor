/**
 * ShapeLibrary - Genera y gestiona geometrías de formas para vectores
 * Sistema de geometry instancing con pre-generación
 */

export interface ShapeGeometry {
  vertices: Float32Array; // Posiciones de vértices [x, y, x, y, ...]
  vertexCount: number; // Número total de vértices
  segments: number; // Número de segmentos (para información)
}

export type ShapeName = 'line' | 'triangle' | 'arc' | 'circle';

export class ShapeLibrary {
  private shapes = new Map<ShapeName, ShapeGeometry>();

  constructor() {
    this.generateAllShapes();
  }

  private generateAllShapes(): void {
    this.shapes.set('line', this.generateLine());
    this.shapes.set('triangle', this.generateTriangle());
    this.shapes.set('arc', this.generateArc(12)); // 12 segmentos para curva suave
    this.shapes.set('circle', this.generateCircle(16)); // 16 segmentos para círculo suave
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
    const halfWidth = 0.05; // Ancho de la línea del arco

    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;

      // Calcular posición en la curva (sin(t * π) para arco semicircular)
      // Aumentamos el factor de curvatura de 0.5 a 0.8 (80% de altura)
      const x0 = t0;
      const y0 = Math.sin(t0 * Math.PI) * 0.8;
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
}
