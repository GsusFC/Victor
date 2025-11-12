/**
 * 3D Shape Library for Victor
 * Generates 3D geometry for vectors (lines, arrows, cones)
 */

export interface ShapeGeometry3D {
  vertices: Float32Array;
  vertexCount: number;
  primitiveType: 'line-list' | 'triangle-list';
}

export type Shape3DType = 'line' | 'arrow' | 'cone';

export class ShapeLibrary3D {
  private shapes: Map<Shape3DType, ShapeGeometry3D> = new Map();

  constructor() {
    this.initializeShapes();
  }

  /**
   * Initialize all 3D shapes
   */
  private initializeShapes(): void {
    this.shapes.set('line', this.generateLine());
    this.shapes.set('arrow', this.generateArrow());
    this.shapes.set('cone', this.generateCone(12));
  }

  /**
   * Generate simple 3D line (2 vertices)
   * Line goes from (0,0,0) to (0,1,0) in local space
   */
  private generateLine(): ShapeGeometry3D {
    const vertices = new Float32Array([
      // Start point
      0, 0, 0,
      // End point
      0, 1, 0
    ]);

    return {
      vertices,
      vertexCount: 2,
      primitiveType: 'line-list'
    };
  }

  /**
   * Generate 3D arrow (line + cone tip)
   * Uses triangles for the cone tip
   */
  private generateArrow(segments: number = 8): ShapeGeometry3D {
    const vertices: number[] = [];

    // Line shaft (0 to 0.8)
    vertices.push(0, 0, 0);
    vertices.push(0, 0.8, 0);

    // Cone tip (from 0.8 to 1.0)
    const tipStart = 0.8;
    const tipEnd = 1.0;
    const tipRadius = 0.1;

    // Cone vertices
    const angleStep = (Math.PI * 2) / segments;

    for (let i = 0; i < segments; i++) {
      const angle = i * angleStep;
      const nextAngle = ((i + 1) % segments) * angleStep;

      const x1 = Math.cos(angle) * tipRadius;
      const z1 = Math.sin(angle) * tipRadius;
      const x2 = Math.cos(nextAngle) * tipRadius;
      const z2 = Math.sin(nextAngle) * tipRadius;

      // Triangle: tip -> base1 -> base2
      vertices.push(0, tipEnd, 0);           // Tip
      vertices.push(x1, tipStart, z1);      // Base 1
      vertices.push(x2, tipStart, z2);      // Base 2
    }

    return {
      vertices: new Float32Array(vertices),
      vertexCount: vertices.length / 3,
      primitiveType: 'triangle-list'
    };
  }

  /**
   * Generate cone (for arrow heads)
   */
  private generateCone(segments: number = 12): ShapeGeometry3D {
    const vertices: number[] = [];
    const height = 1.0;
    const radius = 0.2;

    const angleStep = (Math.PI * 2) / segments;

    // Generate cone triangles
    for (let i = 0; i < segments; i++) {
      const angle = i * angleStep;
      const nextAngle = ((i + 1) % segments) * angleStep;

      const x1 = Math.cos(angle) * radius;
      const z1 = Math.sin(angle) * radius;
      const x2 = Math.cos(nextAngle) * radius;
      const z2 = Math.sin(nextAngle) * radius;

      // Side triangle: tip -> base1 -> base2
      vertices.push(0, height, 0);      // Tip
      vertices.push(x1, 0, z1);         // Base 1
      vertices.push(x2, 0, z2);         // Base 2

      // Base triangle: center -> base2 -> base1
      vertices.push(0, 0, 0);           // Center
      vertices.push(x2, 0, z2);         // Base 2
      vertices.push(x1, 0, z1);         // Base 1
    }

    return {
      vertices: new Float32Array(vertices),
      vertexCount: vertices.length / 3,
      primitiveType: 'triangle-list'
    };
  }

  /**
   * Get shape geometry by type
   */
  getShape(type: Shape3DType): ShapeGeometry3D | undefined {
    return this.shapes.get(type);
  }

  /**
   * Get all available shape types
   */
  getAvailableShapes(): Shape3DType[] {
    return Array.from(this.shapes.keys());
  }

  /**
   * Generate cylinder (for arrow shafts)
   */
  generateCylinder(segments: number = 12, height: number = 1.0, radius: number = 0.05): ShapeGeometry3D {
    const vertices: number[] = [];
    const angleStep = (Math.PI * 2) / segments;

    // Generate cylinder triangles
    for (let i = 0; i < segments; i++) {
      const angle = i * angleStep;
      const nextAngle = ((i + 1) % segments) * angleStep;

      const x1 = Math.cos(angle) * radius;
      const z1 = Math.sin(angle) * radius;
      const x2 = Math.cos(nextAngle) * radius;
      const z2 = Math.sin(nextAngle) * radius;

      // Side quad (2 triangles)
      // Triangle 1: bottom1 -> top1 -> top2
      vertices.push(x1, 0, z1);
      vertices.push(x1, height, z1);
      vertices.push(x2, height, z2);

      // Triangle 2: bottom1 -> top2 -> bottom2
      vertices.push(x1, 0, z1);
      vertices.push(x2, height, z2);
      vertices.push(x2, 0, z2);
    }

    return {
      vertices: new Float32Array(vertices),
      vertexCount: vertices.length / 3,
      primitiveType: 'triangle-list'
    };
  }
}
