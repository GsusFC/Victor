/**
 * 3D Camera with orbit controls
 * Adapted from PlayCanvas Engine
 * @license MIT
 */

import { Vec3, Mat4, DEG_TO_RAD } from '@/lib/math-utils';
import type { Camera3DConfig, CameraPreset, CameraPresetConfig } from './types/camera';

export class Camera3D {
  // Camera state
  position: Vec3;
  target: Vec3;
  distance: number;
  azimuth: number;    // Degrees
  elevation: number;  // Degrees

  // Target state (for smooth damping)
  private targetPosition: Vec3;
  private targetAzimuth: number;
  private targetElevation: number;
  private targetDistance: number;

  // Limits
  distanceMin: number;
  distanceMax: number;
  elevationMin: number;
  elevationMax: number;

  // Projection
  fov: number;
  aspect: number;
  near: number;
  far: number;

  // Controls
  dampingFactor: number;
  orbitSensitivity: number;
  panSensitivity: number;
  zoomSensitivity: number;

  // Matrices (cached)
  private viewMatrix: Mat4;
  private projectionMatrix: Mat4;
  private viewProjectionMatrix: Mat4;
  private matricesDirty: boolean = true;

  constructor(config?: Partial<Camera3DConfig>) {
    // Initialize with defaults
    this.position = config?.position?.clone() || new Vec3(0, 5, 10);
    this.target = config?.target?.clone() || new Vec3(0, 0, 0);
    this.distance = config?.distance ?? 10;

    this.azimuth = config?.azimuth ?? 0;
    this.elevation = config?.elevation ?? 30;

    // Target state (for damping)
    this.targetPosition = this.position.clone();
    this.targetAzimuth = this.azimuth;
    this.targetElevation = this.elevation;
    this.targetDistance = this.distance;

    // Limits
    this.distanceMin = config?.distanceMin ?? 1;
    this.distanceMax = config?.distanceMax ?? 100;
    this.elevationMin = config?.elevationMin ?? -85;
    this.elevationMax = config?.elevationMax ?? 85;

    // Projection
    this.fov = config?.fov ?? 60;
    this.aspect = config?.aspect ?? 1;
    this.near = config?.near ?? 0.1;
    this.far = config?.far ?? 1000;

    // Controls
    this.dampingFactor = config?.dampingFactor ?? 0.2;
    this.orbitSensitivity = config?.orbitSensitivity ?? 0.5;
    this.panSensitivity = config?.panSensitivity ?? 0.01;
    this.zoomSensitivity = config?.zoomSensitivity ?? 0.1;

    // Initialize matrices
    this.viewMatrix = new Mat4();
    this.projectionMatrix = new Mat4();
    this.viewProjectionMatrix = new Mat4();

    this.updatePosition();
  }

  /**
   * Update camera position based on azimuth, elevation, and distance
   */
  private updatePosition(): void {
    const theta = this.azimuth * DEG_TO_RAD;
    const phi = this.elevation * DEG_TO_RAD;

    // Convert spherical to cartesian coordinates
    const x = this.distance * Math.cos(phi) * Math.sin(theta);
    const y = this.distance * Math.sin(phi);
    const z = this.distance * Math.cos(phi) * Math.cos(theta);

    this.position.set(
      this.target.x + x,
      this.target.y + y,
      this.target.z + z
    );

    this.matricesDirty = true;
  }

  /**
   * Update camera for the current frame (with damping)
   */
  update(deltaTime: number = 1/60): void {
    // Smooth interpolation towards target values
    const t = 1.0 - Math.pow(1.0 - this.dampingFactor, deltaTime * 60);

    // Interpolate azimuth (handle wrapping)
    let azimuthDiff = this.targetAzimuth - this.azimuth;
    if (azimuthDiff > 180) azimuthDiff -= 360;
    if (azimuthDiff < -180) azimuthDiff += 360;
    this.azimuth += azimuthDiff * t;

    // Interpolate elevation
    this.elevation += (this.targetElevation - this.elevation) * t;

    // Interpolate distance
    this.distance += (this.targetDistance - this.distance) * t;

    // Interpolate target position
    this.target.x += (this.targetPosition.x - this.target.x) * t;
    this.target.y += (this.targetPosition.y - this.target.y) * t;
    this.target.z += (this.targetPosition.z - this.target.z) * t;

    this.updatePosition();
  }

  /**
   * Orbit camera (rotate around target)
   */
  orbit(deltaAzimuth: number, deltaElevation: number): void {
    this.targetAzimuth += deltaAzimuth * this.orbitSensitivity;
    this.targetElevation += deltaElevation * this.orbitSensitivity;

    // Clamp elevation
    this.targetElevation = Math.max(
      this.elevationMin,
      Math.min(this.elevationMax, this.targetElevation)
    );

    // Wrap azimuth to [0, 360)
    this.targetAzimuth = ((this.targetAzimuth % 360) + 360) % 360;
  }

  /**
   * Pan camera (move target in screen space)
   */
  pan(deltaX: number, deltaY: number): void {
    // Get camera right and up vectors
    const forward = new Vec3().sub2(this.target, this.position).normalize();
    const right = new Vec3().cross(forward, Vec3.UP).normalize();
    const up = new Vec3().cross(right, forward);

    // Apply pan in screen space
    const panAmount = this.distance * this.panSensitivity;
    this.targetPosition.x += (right.x * deltaX + up.x * deltaY) * panAmount;
    this.targetPosition.y += (right.y * deltaX + up.y * deltaY) * panAmount;
    this.targetPosition.z += (right.z * deltaX + up.z * deltaY) * panAmount;
  }

  /**
   * Zoom camera (change distance from target)
   */
  zoom(delta: number): void {
    this.targetDistance *= 1 + delta * this.zoomSensitivity;
    this.targetDistance = Math.max(
      this.distanceMin,
      Math.min(this.distanceMax, this.targetDistance)
    );
  }

  /**
   * Set camera to a preset configuration
   */
  setPreset(preset: CameraPreset): void {
    const presets: Record<CameraPreset, CameraPresetConfig> = {
      top: { azimuth: 0, elevation: 89, distance: this.distance },
      side: { azimuth: 90, elevation: 0, distance: this.distance },
      front: { azimuth: 0, elevation: 0, distance: this.distance },
      isometric: { azimuth: 45, elevation: 35.264, distance: this.distance },
      corner: { azimuth: 45, elevation: 30, distance: this.distance },
    };

    const config = presets[preset];
    this.targetAzimuth = config.azimuth;
    this.targetElevation = config.elevation;
    this.targetDistance = config.distance;

    // Apply immediately for UI controls
    this.applyTargetsImmediately();
  }

  /**
   * Apply target values immediately (skip damping)
   */
  applyTargetsImmediately(): void {
    this.azimuth = this.targetAzimuth;
    this.elevation = this.targetElevation;
    this.distance = this.targetDistance;
    this.target.copy(this.targetPosition);
    this.updatePosition();
  }

  /**
   * Get view matrix (camera transform)
   */
  getViewMatrix(): Mat4 {
    if (this.matricesDirty) {
      this.viewMatrix.setLookAt(this.position, this.target, Vec3.UP);
      this.matricesDirty = false;
    }
    return this.viewMatrix;
  }

  /**
   * Get projection matrix
   */
  getProjectionMatrix(): Mat4 {
    this.projectionMatrix.setPerspective(
      this.fov * DEG_TO_RAD,
      this.aspect,
      this.near,
      this.far
    );
    return this.projectionMatrix;
  }

  /**
   * Get combined view-projection matrix
   */
  getViewProjectionMatrix(): Mat4 {
    const view = this.getViewMatrix();
    const proj = this.getProjectionMatrix();
    this.viewProjectionMatrix.mul2(proj, view);
    return this.viewProjectionMatrix;
  }

  /**
   * Update aspect ratio (call when canvas resizes)
   */
  setAspect(aspect: number): void {
    this.aspect = aspect;
  }

  /**
   * Reset camera to default state
   */
  reset(): void {
    this.targetAzimuth = 0;
    this.targetElevation = 30;
    this.targetDistance = 10;
    this.targetPosition.set(0, 0, 0);
  }

  /**
   * Get camera forward direction
   */
  getForward(): Vec3 {
    return new Vec3().sub2(this.target, this.position).normalize();
  }

  /**
   * Get camera right direction
   */
  getRight(): Vec3 {
    const forward = this.getForward();
    return new Vec3().cross(forward, Vec3.UP).normalize();
  }

  /**
   * Get camera up direction
   */
  getUp(): Vec3 {
    const forward = this.getForward();
    const right = this.getRight();
    return new Vec3().cross(right, forward).normalize();
  }
}
