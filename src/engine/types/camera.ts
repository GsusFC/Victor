/**
 * Types for 3D camera system
 */

import type { Vec3 } from '@/lib/math-utils';

export interface Camera3DConfig {
  /** Position of the camera in world space */
  position: Vec3;

  /** Point the camera is looking at */
  target: Vec3;

  /** Distance from camera to target */
  distance: number;

  /** Minimum allowed distance */
  distanceMin: number;

  /** Maximum allowed distance */
  distanceMax: number;

  /** Azimuth angle (horizontal rotation) in degrees */
  azimuth: number;

  /** Elevation angle (vertical rotation) in degrees */
  elevation: number;

  /** Minimum elevation angle in degrees */
  elevationMin: number;

  /** Maximum elevation angle in degrees */
  elevationMax: number;

  /** Field of view in degrees */
  fov: number;

  /** Aspect ratio (width / height) */
  aspect: number;

  /** Near clipping plane */
  near: number;

  /** Far clipping plane */
  far: number;

  /** Damping factor for smooth camera movement (0-1) */
  dampingFactor: number;

  /** Sensitivity for orbit controls */
  orbitSensitivity: number;

  /** Sensitivity for pan controls */
  panSensitivity: number;

  /** Sensitivity for zoom controls */
  zoomSensitivity: number;
}

export type CameraPreset = 'top' | 'side' | 'isometric' | 'front' | 'corner';

export interface CameraPresetConfig {
  azimuth: number;
  elevation: number;
  distance: number;
}
