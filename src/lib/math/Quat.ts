/**
 * A quaternion for representing rotations.
 * Adapted from PlayCanvas Engine
 * @license MIT
 */

import { DEG_TO_RAD, RAD_TO_DEG, EPSILON } from './constants';
import { Vec3 } from './Vec3';

export class Quat {
  /** The x component */
  x: number;

  /** The y component */
  y: number;

  /** The z component */
  z: number;

  /** The w component */
  w: number;

  /**
   * Creates a new Quat instance
   * @param x - The x component (default: 0)
   * @param y - The y component (default: 0)
   * @param z - The z component (default: 0)
   * @param w - The w component (default: 1)
   */
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  // Basic operations
  clone(): Quat {
    return new Quat(this.x, this.y, this.z, this.w);
  }

  copy(rhs: Quat): Quat {
    this.x = rhs.x;
    this.y = rhs.y;
    this.z = rhs.z;
    this.w = rhs.w;
    return this;
  }

  set(x: number, y: number, z: number, w: number): Quat {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  equals(rhs: Quat): boolean {
    return this.x === rhs.x && this.y === rhs.y && this.z === rhs.z && this.w === rhs.w;
  }

  equalsApprox(rhs: Quat, epsilon = EPSILON): boolean {
    return (
      Math.abs(this.x - rhs.x) < epsilon &&
      Math.abs(this.y - rhs.y) < epsilon &&
      Math.abs(this.z - rhs.z) < epsilon &&
      Math.abs(this.w - rhs.w) < epsilon
    );
  }

  // Quaternion operations
  conjugate(): Quat {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
  }

  invert(): Quat {
    return this.conjugate().normalize();
  }

  length(): number {
    const x = this.x;
    const y = this.y;
    const z = this.z;
    const w = this.w;
    return Math.sqrt(x * x + y * y + z * z + w * w);
  }

  lengthSq(): number {
    const x = this.x;
    const y = this.y;
    const z = this.z;
    const w = this.w;
    return x * x + y * y + z * z + w * w;
  }

  normalize(): Quat {
    const len = this.length();
    if (len > EPSILON) {
      const invLen = 1 / len;
      this.x *= invLen;
      this.y *= invLen;
      this.z *= invLen;
      this.w *= invLen;
    }
    return this;
  }

  dot(rhs: Quat): number {
    return this.x * rhs.x + this.y * rhs.y + this.z * rhs.z + this.w * rhs.w;
  }

  // Multiplication
  mul(rhs: Quat): Quat {
    const q1x = this.x;
    const q1y = this.y;
    const q1z = this.z;
    const q1w = this.w;

    const q2x = rhs.x;
    const q2y = rhs.y;
    const q2z = rhs.z;
    const q2w = rhs.w;

    this.x = q1w * q2x + q1x * q2w + q1y * q2z - q1z * q2y;
    this.y = q1w * q2y + q1y * q2w + q1z * q2x - q1x * q2z;
    this.z = q1w * q2z + q1z * q2w + q1x * q2y - q1y * q2x;
    this.w = q1w * q2w - q1x * q2x - q1y * q2y - q1z * q2z;

    return this;
  }

  mul2(lhs: Quat, rhs: Quat): Quat {
    const q1x = lhs.x;
    const q1y = lhs.y;
    const q1z = lhs.z;
    const q1w = lhs.w;

    const q2x = rhs.x;
    const q2y = rhs.y;
    const q2z = rhs.z;
    const q2w = rhs.w;

    this.x = q1w * q2x + q1x * q2w + q1y * q2z - q1z * q2y;
    this.y = q1w * q2y + q1y * q2w + q1z * q2x - q1x * q2z;
    this.z = q1w * q2z + q1z * q2w + q1x * q2y - q1y * q2x;
    this.w = q1w * q2w - q1x * q2x - q1y * q2y - q1z * q2z;

    return this;
  }

  mulScalar(scalar: number): Quat {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    this.w *= scalar;
    return this;
  }

  // Interpolation
  lerp(lhs: Quat, rhs: Quat, alpha: number): Quat {
    const lx = lhs.x;
    const ly = lhs.y;
    const lz = lhs.z;
    const lw = lhs.w;

    const rx = rhs.x;
    const ry = rhs.y;
    const rz = rhs.z;
    const rw = rhs.w;

    this.x = lx + alpha * (rx - lx);
    this.y = ly + alpha * (ry - ly);
    this.z = lz + alpha * (rz - lz);
    this.w = lw + alpha * (rw - lw);

    return this;
  }

  slerp(lhs: Quat, rhs: Quat, alpha: number): Quat {
    const lx = lhs.x;
    const ly = lhs.y;
    const lz = lhs.z;
    const lw = lhs.w;

    let rx = rhs.x;
    let ry = rhs.y;
    let rz = rhs.z;
    let rw = rhs.w;

    // Calculate angle between them
    let cosHalfTheta = lw * rw + lx * rx + ly * ry + lz * rz;

    // If dot < 0, negate one quat to take shorter path
    if (cosHalfTheta < 0) {
      rw = -rw;
      rx = -rx;
      ry = -ry;
      rz = -rz;
      cosHalfTheta = -cosHalfTheta;
    }

    // If very close, do linear interpolation
    if (cosHalfTheta >= 1.0) {
      this.x = lx;
      this.y = ly;
      this.z = lz;
      this.w = lw;
      return this;
    }

    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

    // If theta = 180 degrees, result is not fully defined
    if (Math.abs(sinHalfTheta) < EPSILON) {
      this.w = lw * 0.5 + rw * 0.5;
      this.x = lx * 0.5 + rx * 0.5;
      this.y = ly * 0.5 + ry * 0.5;
      this.z = lz * 0.5 + rz * 0.5;
      return this;
    }

    const ratioA = Math.sin((1 - alpha) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(alpha * halfTheta) / sinHalfTheta;

    this.w = lw * ratioA + rw * ratioB;
    this.x = lx * ratioA + rx * ratioB;
    this.y = ly * ratioA + ry * ratioB;
    this.z = lz * ratioA + rz * ratioB;

    return this;
  }

  // Conversions from other representations
  setFromAxisAngle(axis: Vec3, angle: number): Quat {
    const halfAngle = (angle * DEG_TO_RAD) * 0.5;
    const s = Math.sin(halfAngle);

    this.x = axis.x * s;
    this.y = axis.y * s;
    this.z = axis.z * s;
    this.w = Math.cos(halfAngle);

    return this;
  }

  setFromEulerAngles(ex: number, ey: number, ez: number): Quat {
    const halfX = (ex * DEG_TO_RAD) * 0.5;
    const halfY = (ey * DEG_TO_RAD) * 0.5;
    const halfZ = (ez * DEG_TO_RAD) * 0.5;

    const sx = Math.sin(halfX);
    const cx = Math.cos(halfX);
    const sy = Math.sin(halfY);
    const cy = Math.cos(halfY);
    const sz = Math.sin(halfZ);
    const cz = Math.cos(halfZ);

    this.x = sx * cy * cz - cx * sy * sz;
    this.y = cx * sy * cz + sx * cy * sz;
    this.z = cx * cy * sz - sx * sy * cz;
    this.w = cx * cy * cz + sx * sy * sz;

    return this;
  }

  setFromDirections(from: Vec3, to: Vec3): Quat {
    const vec = new Vec3();
    const dot = from.dot(to);

    if (dot > 0.999999) {
      // Vectors are parallel
      this.x = 0;
      this.y = 0;
      this.z = 0;
      this.w = 1;
      return this;
    }

    if (dot < -0.999999) {
      // Vectors are opposite, find perpendicular axis
      vec.cross(Vec3.RIGHT, from);
      if (vec.length() < EPSILON) {
        vec.cross(Vec3.UP, from);
      }
      vec.normalize();
      return this.setFromAxisAngle(vec, 180);
    }

    vec.cross(from, to);
    this.x = vec.x;
    this.y = vec.y;
    this.z = vec.z;
    this.w = 1 + dot;

    return this.normalize();
  }

  // Conversions to other representations
  getAxisAngle(axis: Vec3): number {
    const rad = Math.acos(this.w) * 2;
    const s = Math.sin(rad / 2);

    if (s > EPSILON) {
      axis.x = this.x / s;
      axis.y = this.y / s;
      axis.z = this.z / s;
    } else {
      // Angle is 0, axis can be anything
      axis.x = 1;
      axis.y = 0;
      axis.z = 0;
    }

    return rad * RAD_TO_DEG;
  }

  getEulerAngles(eulers?: Vec3): Vec3 {
    const result = eulers || new Vec3();

    const x = this.x;
    const y = this.y;
    const z = this.z;
    const w = this.w;

    const test = x * y + z * w;

    if (test > 0.499) {
      // Singularity at north pole
      result.x = 0;
      result.y = 2 * Math.atan2(x, w) * RAD_TO_DEG;
      result.z = 90;
      return result;
    }

    if (test < -0.499) {
      // Singularity at south pole
      result.x = 0;
      result.y = -2 * Math.atan2(x, w) * RAD_TO_DEG;
      result.z = -90;
      return result;
    }

    const sqx = x * x;
    const sqy = y * y;
    const sqz = z * z;

    result.x = Math.atan2(2 * y * w - 2 * x * z, 1 - 2 * sqy - 2 * sqz) * RAD_TO_DEG;
    result.y = Math.atan2(2 * x * w - 2 * y * z, 1 - 2 * sqx - 2 * sqz) * RAD_TO_DEG;
    result.z = Math.asin(2 * test) * RAD_TO_DEG;

    return result;
  }

  // Transform vector
  transformVector(vec: Vec3, res?: Vec3): Vec3 {
    const result = res || new Vec3();

    const x = vec.x;
    const y = vec.y;
    const z = vec.z;

    const qx = this.x;
    const qy = this.y;
    const qz = this.z;
    const qw = this.w;

    // Calculate quat * vec
    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;

    // Calculate result * inverse quat
    result.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    result.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    result.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;

    return result;
  }

  // Array conversions
  toArray(): [number, number, number, number] {
    return [this.x, this.y, this.z, this.w];
  }

  fromArray(array: number[] | Float32Array, offset = 0): Quat {
    this.x = array[offset];
    this.y = array[offset + 1];
    this.z = array[offset + 2];
    this.w = array[offset + 3];
    return this;
  }

  toString(): string {
    return `[${this.x}, ${this.y}, ${this.z}, ${this.w}]`;
  }

  // Static constants
  static readonly IDENTITY = Object.freeze(new Quat(0, 0, 0, 1));
  static readonly ZERO = Object.freeze(new Quat(0, 0, 0, 0));
}
