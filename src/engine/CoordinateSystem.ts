/**
 * CoordinateSystem - Sistema de coordenadas ISO v2
 * Maneja conversiones entre espacios de coordenadas y generación de grids
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export class ISOCoordinates {
  /**
   * Convierte coordenadas de pantalla (píxeles) a espacio ISO normalizado
   * @param x Coordenada X en píxeles (0 a width)
   * @param y Coordenada Y en píxeles (0 a height)
   * @param viewport Dimensiones del viewport
   * @returns Coordenadas ISO normalizadas (-aspect a +aspect en X, -1 a +1 en Y)
   */
  static screenToISO(x: number, y: number, viewport: Viewport): Vec2 {
    const aspect = viewport.width / viewport.height;

    // Normalizar a rango [0, 1]
    const normX = x / viewport.width;
    const normY = y / viewport.height;

    // Convertir a ISO [-aspect, +aspect] × [-1, +1]
    return {
      x: (normX * 2 - 1) * aspect,
      y: 1 - normY * 2, // Invertir Y (pantalla crece hacia abajo, ISO hacia arriba)
    };
  }

  /**
   * Convierte coordenadas ISO a clip space para WebGPU
   * @param iso Coordenadas en espacio ISO
   * @param aspect Relación de aspecto (width/height)
   * @returns Coordenadas en clip space [-1, +1] × [-1, +1]
   */
  static ISOToClipSpace(iso: Vec2, aspect: number): Vec2 {
    return {
      x: iso.x / aspect,
      y: iso.y,
    };
  }

  /**
   * Genera grid de vectores en coordenadas ISO centradas
   * @param rows Número de filas
   * @param cols Número de columnas
   * @param aspect Relación de aspecto del canvas
   * @param spacing Espaciado entre vectores (en unidades ISO)
   * @returns Array de posiciones ISO
   */
  static generateGrid(
    rows: number,
    cols: number,
    aspect: number,
    spacing?: number
  ): Vec2[] {
    const grid: Vec2[] = [];

    // Si no se especifica spacing, calcularlo automáticamente
    const autoSpacing = spacing ?? Math.min((2 * aspect) / (cols + 1), 2 / (rows + 1));

    // Calcular dimensiones del grid
    const gridWidth = (cols - 1) * autoSpacing;
    const gridHeight = (rows - 1) * autoSpacing;

    // Calcular offset para centrar
    const startX = -gridWidth / 2;
    const startY = -gridHeight / 2;

    // Generar posiciones
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        grid.push({
          x: startX + col * autoSpacing,
          y: startY + row * autoSpacing,
        });
      }
    }

    return grid;
  }

  /**
   * Genera grid uniforme que llena todo el espacio ISO
   * @param rows Número de filas
   * @param cols Número de columnas
   * @param aspect Relación de aspecto
   * @returns Array de posiciones ISO distribuidas uniformemente
   */
  static generateUniformGrid(rows: number, cols: number, aspect: number): Vec2[] {
    const grid: Vec2[] = [];

    // Calcular pasos para distribución uniforme
    const stepX = (2 * aspect) / (cols + 1);
    const stepY = 2 / (rows + 1);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        grid.push({
          x: -aspect + (col + 1) * stepX,
          y: -1 + (row + 1) * stepY,
        });
      }
    }

    return grid;
  }

  /**
   * Normaliza posición del mouse a coordenadas ISO
   * @param event Mouse event
   * @param canvas Canvas element
   * @returns Coordenadas ISO del mouse
   */
  static normalizeMousePosition(event: MouseEvent, canvas: HTMLCanvasElement): Vec2 {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return this.screenToISO(x, y, {
      width: rect.width,
      height: rect.height,
    });
  }

  /**
   * Calcula la distancia entre dos puntos ISO
   */
  static distance(a: Vec2, b: Vec2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calcula el ángulo entre dos puntos ISO (en radianes)
   */
  static angle(from: Vec2, to: Vec2): number {
    return Math.atan2(to.y - from.y, to.x - from.x);
  }

  /**
   * Interpola linealmente entre dos puntos ISO
   */
  static lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
  }

  /**
   * Calcula el aspect ratio de un canvas
   */
  static getAspectRatio(canvas: HTMLCanvasElement): number {
    return canvas.width / canvas.height;
  }

  /**
   * Convierte ángulo en radianes a grados
   */
  static radToDeg(rad: number): number {
    return (rad * 180) / Math.PI;
  }

  /**
   * Convierte ángulo en grados a radianes
   */
  static degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
