/**
 * Camera3D - Sistema de cámara 3D con soporte para orbital controls
 * Maneja transformaciones, matrices de vista/proyección y controles interactivos
 */

export type ProjectionType = 'perspective' | 'orthographic';
export type CameraPreset = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right' | 'isometric';

export interface Camera3DConfig {
  // Posición y orientación
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  up: { x: number; y: number; z: number };

  // Proyección
  projectionType: ProjectionType;
  fov: number; // Field of view en grados (perspective)
  near: number;
  far: number;

  // Orbital controls
  distance: number; // Distancia desde el target
  azimuth: number; // Ángulo horizontal en radianes
  elevation: number; // Ángulo vertical en radianes

  // Límites
  minDistance: number;
  maxDistance: number;
  minElevation: number;
  maxElevation: number;
}

export class Camera3D {
  private config: Camera3DConfig;
  private viewMatrix: Float32Array;
  private projectionMatrix: Float32Array;
  private viewProjectionMatrix: Float32Array;
  private isDirty: boolean = true;

  constructor(config?: Partial<Camera3DConfig>) {
    this.config = {
      position: { x: 0, y: 5, z: 10 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 1, z: 0 },
      projectionType: 'perspective',
      fov: 45,
      near: 0.1,
      far: 1000,
      distance: 10,
      azimuth: 0,
      elevation: Math.PI / 6, // 30 grados
      minDistance: 2,
      maxDistance: 100,
      minElevation: -Math.PI / 2 + 0.01,
      maxElevation: Math.PI / 2 - 0.01,
      ...config,
    };

    this.viewMatrix = new Float32Array(16);
    this.projectionMatrix = new Float32Array(16);
    this.viewProjectionMatrix = new Float32Array(16);

    this.updateMatrices();
  }

  /**
   * Orbital controls: rotar la cámara alrededor del target
   */
  rotate(deltaAzimuth: number, deltaElevation: number): void {
    this.config.azimuth += deltaAzimuth;
    this.config.elevation = Math.max(
      this.config.minElevation,
      Math.min(this.config.maxElevation, this.config.elevation + deltaElevation)
    );

    // Normalizar azimuth a [0, 2π]
    this.config.azimuth = this.config.azimuth % (Math.PI * 2);

    this.updatePositionFromOrbit();
    this.isDirty = true;
  }

  /**
   * Orbital controls: zoom (cambiar distancia)
   */
  zoom(delta: number): void {
    this.config.distance = Math.max(
      this.config.minDistance,
      Math.min(this.config.maxDistance, this.config.distance + delta)
    );

    this.updatePositionFromOrbit();
    this.isDirty = true;
  }

  /**
   * Orbital controls: pan (mover el target)
   */
  pan(deltaX: number, deltaY: number): void {
    // Calcular vectores right y up en world space
    const forward = this.normalize({
      x: this.config.target.x - this.config.position.x,
      y: this.config.target.y - this.config.position.y,
      z: this.config.target.z - this.config.position.z,
    });

    const right = this.normalize(this.cross(forward, this.config.up));
    const up = this.normalize(this.cross(right, forward));

    // Escalar por distancia para pan speed apropiado
    const panSpeed = this.config.distance * 0.001;

    this.config.target.x += right.x * deltaX * panSpeed + up.x * deltaY * panSpeed;
    this.config.target.y += right.y * deltaX * panSpeed + up.y * deltaY * panSpeed;
    this.config.target.z += right.z * deltaX * panSpeed + up.z * deltaY * panSpeed;

    this.updatePositionFromOrbit();
    this.isDirty = true;
  }

  /**
   * Actualizar posición de la cámara basado en orbital controls
   */
  private updatePositionFromOrbit(): void {
    const x = this.config.target.x + this.config.distance * Math.cos(this.config.elevation) * Math.sin(this.config.azimuth);
    const y = this.config.target.y + this.config.distance * Math.sin(this.config.elevation);
    const z = this.config.target.z + this.config.distance * Math.cos(this.config.elevation) * Math.cos(this.config.azimuth);

    this.config.position = { x, y, z };
  }

  /**
   * Aplicar preset de cámara
   */
  applyPreset(preset: CameraPreset): void {
    switch (preset) {
      case 'front':
        this.config.azimuth = 0;
        this.config.elevation = 0;
        break;
      case 'back':
        this.config.azimuth = Math.PI;
        this.config.elevation = 0;
        break;
      case 'top':
        this.config.azimuth = 0;
        this.config.elevation = Math.PI / 2 - 0.01;
        break;
      case 'bottom':
        this.config.azimuth = 0;
        this.config.elevation = -Math.PI / 2 + 0.01;
        break;
      case 'left':
        this.config.azimuth = -Math.PI / 2;
        this.config.elevation = 0;
        break;
      case 'right':
        this.config.azimuth = Math.PI / 2;
        this.config.elevation = 0;
        break;
      case 'isometric':
        this.config.azimuth = Math.PI / 4; // 45 grados
        this.config.elevation = Math.atan(1 / Math.sqrt(2)); // ~35.26 grados
        break;
    }

    this.updatePositionFromOrbit();
    this.isDirty = true;
  }

  /**
   * Actualizar matrices de vista y proyección
   */
  updateMatrices(aspect: number = 1): void {
    if (!this.isDirty && aspect === this.getAspect()) {
      return;
    }

    // View matrix
    this.lookAt(this.config.position, this.config.target, this.config.up);

    // Projection matrix
    if (this.config.projectionType === 'perspective') {
      this.perspective(this.config.fov, aspect, this.config.near, this.config.far);
    } else {
      const height = this.config.distance * 0.5;
      const width = height * aspect;
      this.orthographic(-width, width, -height, height, this.config.near, this.config.far);
    }

    // View-Projection matrix
    this.multiplyMatrices(this.projectionMatrix, this.viewMatrix, this.viewProjectionMatrix);

    this.isDirty = false;
  }

  /**
   * Crear matriz lookAt (view matrix)
   */
  private lookAt(eye: { x: number; y: number; z: number }, center: { x: number; y: number; z: number }, up: { x: number; y: number; z: number }): void {
    const z = this.normalize({
      x: eye.x - center.x,
      y: eye.y - center.y,
      z: eye.z - center.z,
    });

    const x = this.normalize(this.cross(up, z));
    const y = this.cross(z, x);

    this.viewMatrix[0] = x.x;
    this.viewMatrix[1] = y.x;
    this.viewMatrix[2] = z.x;
    this.viewMatrix[3] = 0;

    this.viewMatrix[4] = x.y;
    this.viewMatrix[5] = y.y;
    this.viewMatrix[6] = z.y;
    this.viewMatrix[7] = 0;

    this.viewMatrix[8] = x.z;
    this.viewMatrix[9] = y.z;
    this.viewMatrix[10] = z.z;
    this.viewMatrix[11] = 0;

    this.viewMatrix[12] = -this.dot(x, eye);
    this.viewMatrix[13] = -this.dot(y, eye);
    this.viewMatrix[14] = -this.dot(z, eye);
    this.viewMatrix[15] = 1;
  }

  /**
   * Crear matriz de proyección perspectiva
   */
  private perspective(fov: number, aspect: number, near: number, far: number): void {
    const f = 1 / Math.tan((fov * Math.PI) / 180 / 2);
    const rangeInv = 1 / (near - far);

    this.projectionMatrix[0] = f / aspect;
    this.projectionMatrix[1] = 0;
    this.projectionMatrix[2] = 0;
    this.projectionMatrix[3] = 0;

    this.projectionMatrix[4] = 0;
    this.projectionMatrix[5] = f;
    this.projectionMatrix[6] = 0;
    this.projectionMatrix[7] = 0;

    this.projectionMatrix[8] = 0;
    this.projectionMatrix[9] = 0;
    this.projectionMatrix[10] = (near + far) * rangeInv;
    this.projectionMatrix[11] = -1;

    this.projectionMatrix[12] = 0;
    this.projectionMatrix[13] = 0;
    this.projectionMatrix[14] = near * far * rangeInv * 2;
    this.projectionMatrix[15] = 0;
  }

  /**
   * Crear matriz de proyección ortográfica
   */
  private orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): void {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);

    this.projectionMatrix[0] = -2 * lr;
    this.projectionMatrix[1] = 0;
    this.projectionMatrix[2] = 0;
    this.projectionMatrix[3] = 0;

    this.projectionMatrix[4] = 0;
    this.projectionMatrix[5] = -2 * bt;
    this.projectionMatrix[6] = 0;
    this.projectionMatrix[7] = 0;

    this.projectionMatrix[8] = 0;
    this.projectionMatrix[9] = 0;
    this.projectionMatrix[10] = 2 * nf;
    this.projectionMatrix[11] = 0;

    this.projectionMatrix[12] = (left + right) * lr;
    this.projectionMatrix[13] = (top + bottom) * bt;
    this.projectionMatrix[14] = (far + near) * nf;
    this.projectionMatrix[15] = 1;
  }

  /**
   * Multiplicar dos matrices 4x4
   */
  private multiplyMatrices(a: Float32Array, b: Float32Array, out: Float32Array): void {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  }

  /**
   * Producto cruz de vectores
   */
  private cross(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  }

  /**
   * Producto punto de vectores
   */
  private dot(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  /**
   * Normalizar vector
   */
  private normalize(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len === 0) return { x: 0, y: 1, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  // Getters
  getViewMatrix(): Float32Array {
    return this.viewMatrix;
  }

  getProjectionMatrix(): Float32Array {
    return this.projectionMatrix;
  }

  getViewProjectionMatrix(): Float32Array {
    return this.viewProjectionMatrix;
  }

  getConfig(): Camera3DConfig {
    return { ...this.config };
  }

  getPosition(): { x: number; y: number; z: number } {
    return { ...this.config.position };
  }

  getTarget(): { x: number; y: number; z: number } {
    return { ...this.config.target };
  }

  getDistance(): number {
    return this.config.distance;
  }

  getAzimuth(): number {
    return this.config.azimuth;
  }

  getElevation(): number {
    return this.config.elevation;
  }

  getFov(): number {
    return this.config.fov;
  }

  getProjectionType(): ProjectionType {
    return this.config.projectionType;
  }

  private getAspect(): number {
    // Stored for comparison, calculated externally
    return 1;
  }

  // Setters
  setProjectionType(type: ProjectionType): void {
    this.config.projectionType = type;
    this.isDirty = true;
  }

  setFov(fov: number): void {
    this.config.fov = Math.max(10, Math.min(120, fov));
    this.isDirty = true;
  }

  setDistance(distance: number): void {
    this.config.distance = Math.max(
      this.config.minDistance,
      Math.min(this.config.maxDistance, distance)
    );
    this.updatePositionFromOrbit();
    this.isDirty = true;
  }

  setTarget(target: { x: number; y: number; z: number }): void {
    this.config.target = { ...target };
    this.updatePositionFromOrbit();
    this.isDirty = true;
  }

  reset(): void {
    this.config.azimuth = 0;
    this.config.elevation = Math.PI / 6;
    this.config.distance = 10;
    this.config.target = { x: 0, y: 0, z: 0 };
    this.updatePositionFromOrbit();
    this.isDirty = true;
  }
}
