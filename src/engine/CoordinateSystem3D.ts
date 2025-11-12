/**
 * 3D Coordinate System for Victor
 * Generates 3D grids and handles coordinate transformations
 */

import { Vec3 } from '@/lib/math-utils';

export interface GridConfig3D {
  rows: number;
  cols: number;
  layers: number;
  spacing: number;
  aspect: number;
}

export interface Vector3DPosition {
  x: number;
  y: number;
  z: number;
  index: number;
}

export class CoordinateSystem3D {
  private gridConfig: GridConfig3D;
  private positions: Vector3DPosition[] = [];

  constructor(config: GridConfig3D) {
    this.gridConfig = config;
    this.generateGrid();
  }

  /**
   * Generate 3D grid of vector positions
   */
  private generateGrid(): void {
    const { rows, cols, layers, spacing, aspect } = this.gridConfig;

    this.positions = [];
    let index = 0;

    // Calculate bounds to center the grid
    const totalWidth = (cols - 1) * spacing;
    const totalHeight = (rows - 1) * spacing;
    const totalDepth = (layers - 1) * spacing;

    const offsetX = -totalWidth / 2;
    const offsetY = -totalHeight / 2;
    const offsetZ = -totalDepth / 2;

    // Generate grid in 3D space
    for (let layer = 0; layer < layers; layer++) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * spacing + offsetX;
          const y = row * spacing + offsetY;
          const z = layer * spacing + offsetZ;

          this.positions.push({
            x: x * aspect, // Apply aspect ratio to X
            y,
            z,
            index: index++
          });
        }
      }
    }
  }

  /**
   * Get all vector positions
   */
  getPositions(): Vector3DPosition[] {
    return this.positions;
  }

  /**
   * Get total number of vectors
   */
  getCount(): number {
    return this.positions.length;
  }

  /**
   * Get position at specific index
   */
  getPosition(index: number): Vector3DPosition | undefined {
    return this.positions[index];
  }

  /**
   * Update grid configuration and regenerate
   */
  updateConfig(config: Partial<GridConfig3D>): void {
    this.gridConfig = { ...this.gridConfig, ...config };
    this.generateGrid();
  }

  /**
   * Get grid bounds (for camera setup)
   */
  getBounds(): { min: Vec3; max: Vec3; center: Vec3; size: Vec3 } {
    if (this.positions.length === 0) {
      return {
        min: new Vec3(),
        max: new Vec3(),
        center: new Vec3(),
        size: new Vec3()
      };
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const pos of this.positions) {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      minZ = Math.min(minZ, pos.z);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
      maxZ = Math.max(maxZ, pos.z);
    }

    const min = new Vec3(minX, minY, minZ);
    const max = new Vec3(maxX, maxY, maxZ);
    const center = new Vec3(
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2
    );
    const size = new Vec3(
      maxX - minX,
      maxY - minY,
      maxZ - minZ
    );

    return { min, max, center, size };
  }

  /**
   * Calculate optimal camera distance for viewing entire grid
   */
  getOptimalCameraDistance(fov: number = 60): number {
    const bounds = this.getBounds();
    const maxDimension = Math.max(bounds.size.x, bounds.size.y, bounds.size.z);

    // Calculate distance needed to fit the grid in view
    const fovRad = (fov * Math.PI) / 180;
    const distance = (maxDimension / 2) / Math.tan(fovRad / 2);

    return distance * 1.5; // Add 50% padding
  }
}
