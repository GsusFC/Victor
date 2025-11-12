/**
 * A 3-dimensional vector.
 * Adapted from PlayCanvas Engine
 * @license MIT
 */

import { EPSILON } from './constants';

export class Vec3 {
  /** The x component */
  x: number;

  /** The y component */
  y: number;

  /** The z component */
  z: number;

  /**
   * Creates a new Vec3 instance
   * @param x - The x component (default: 0)
   * @param y - The y component (default: 0)
   * @param z - The z component (default: 0)
   */
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  // Arithmetic operations
  add(rhs: Vec3): Vec3 {
    this.x += rhs.x;
    this.y += rhs.y;
    this.z += rhs.z;
    return this;
  }

  add2(lhs: Vec3, rhs: Vec3): Vec3 {
    this.x = lhs.x + rhs.x;
    this.y = lhs.y + rhs.y;
    this.z = lhs.z + rhs.z;
    return this;
  }

  addScalar(scalar: number): Vec3 {
    this.x += scalar;
    this.y += scalar;
    this.z += scalar;
    return this;
  }

  addScaled(rhs: Vec3, scalar: number): Vec3 {
    this.x += rhs.x * scalar;
    this.y += rhs.y * scalar;
    this.z += rhs.z * scalar;
    return this;
  }

  sub(rhs: Vec3): Vec3 {
    this.x -= rhs.x;
    this.y -= rhs.y;
    this.z -= rhs.z;
    return this;
  }

  sub2(lhs: Vec3, rhs: Vec3): Vec3 {
    this.x = lhs.x - rhs.x;
    this.y = lhs.y - rhs.y;
    this.z = lhs.z - rhs.z;
    return this;
  }

  subScalar(scalar: number): Vec3 {
    this.x -= scalar;
    this.y -= scalar;
    this.z -= scalar;
    return this;
  }

  mul(rhs: Vec3): Vec3 {
    this.x *= rhs.x;
    this.y *= rhs.y;
    this.z *= rhs.z;
    return this;
  }

  mul2(lhs: Vec3, rhs: Vec3): Vec3 {
    this.x = lhs.x * rhs.x;
    this.y = lhs.y * rhs.y;
    this.z = lhs.z * rhs.z;
    return this;
  }

  mulScalar(scalar: number): Vec3 {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }

  div(rhs: Vec3): Vec3 {
    this.x /= rhs.x;
    this.y /= rhs.y;
    this.z /= rhs.z;
    return this;
  }

  div2(lhs: Vec3, rhs: Vec3): Vec3 {
    this.x = lhs.x / rhs.x;
    this.y = lhs.y / rhs.y;
    this.z = lhs.z / rhs.z;
    return this;
  }

  divScalar(scalar: number): Vec3 {
    this.x /= scalar;
    this.y /= scalar;
    this.z /= scalar;
    return this;
  }

  // Geometric operations
  dot(rhs: Vec3): number {
    return this.x * rhs.x + this.y * rhs.y + this.z * rhs.z;
  }

  cross(lhs: Vec3, rhs: Vec3): Vec3 {
    const lx = lhs.x;
    const ly = lhs.y;
    const lz = lhs.z;
    const rx = rhs.x;
    const ry = rhs.y;
    const rz = rhs.z;

    this.x = ly * rz - lz * ry;
    this.y = lz * rx - lx * rz;
    this.z = lx * ry - ly * rx;

    return this;
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  distance(rhs: Vec3): number {
    const dx = this.x - rhs.x;
    const dy = this.y - rhs.y;
    const dz = this.z - rhs.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  distanceSq(rhs: Vec3): number {
    const dx = this.x - rhs.x;
    const dy = this.y - rhs.y;
    const dz = this.z - rhs.z;
    return dx * dx + dy * dy + dz * dz;
  }

  normalize(): Vec3 {
    const len = this.length();
    if (len > EPSILON) {
      this.x /= len;
      this.y /= len;
      this.z /= len;
    }
    return this;
  }

  project(rhs: Vec3): Vec3 {
    const a_dot_b = this.x * rhs.x + this.y * rhs.y + this.z * rhs.z;
    const b_dot_b = rhs.x * rhs.x + rhs.y * rhs.y + rhs.z * rhs.z;
    const s = a_dot_b / b_dot_b;
    this.x = rhs.x * s;
    this.y = rhs.y * s;
    this.z = rhs.z * s;
    return this;
  }

  // Interpolation
  lerp(lhs: Vec3, rhs: Vec3, alpha: number): Vec3 {
    this.x = lhs.x + alpha * (rhs.x - lhs.x);
    this.y = lhs.y + alpha * (rhs.y - lhs.y);
    this.z = lhs.z + alpha * (rhs.z - lhs.z);
    return this;
  }

  // Utility operations
  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  copy(rhs: Vec3): Vec3 {
    this.x = rhs.x;
    this.y = rhs.y;
    this.z = rhs.z;
    return this;
  }

  set(x: number, y: number, z: number): Vec3 {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  equals(rhs: Vec3): boolean {
    return this.x === rhs.x && this.y === rhs.y && this.z === rhs.z;
  }

  equalsApprox(rhs: Vec3, epsilon = EPSILON): boolean {
    return (
      Math.abs(this.x - rhs.x) < epsilon &&
      Math.abs(this.y - rhs.y) < epsilon &&
      Math.abs(this.z - rhs.z) < epsilon
    );
  }

  floor(): Vec3 {
    this.x = Math.floor(this.x);
    this.y = Math.floor(this.y);
    this.z = Math.floor(this.z);
    return this;
  }

  ceil(): Vec3 {
    this.x = Math.ceil(this.x);
    this.y = Math.ceil(this.y);
    this.z = Math.ceil(this.z);
    return this;
  }

  round(): Vec3 {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    this.z = Math.round(this.z);
    return this;
  }

  min(rhs: Vec3): Vec3 {
    if (rhs.x < this.x) this.x = rhs.x;
    if (rhs.y < this.y) this.y = rhs.y;
    if (rhs.z < this.z) this.z = rhs.z;
    return this;
  }

  max(rhs: Vec3): Vec3 {
    if (rhs.x > this.x) this.x = rhs.x;
    if (rhs.y > this.y) this.y = rhs.y;
    if (rhs.z > this.z) this.z = rhs.z;
    return this;
  }

  // Array conversions
  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  fromArray(array: number[] | Float32Array, offset = 0): Vec3 {
    this.x = array[offset];
    this.y = array[offset + 1];
    this.z = array[offset + 2];
    return this;
  }

  toString(): string {
    return `[${this.x}, ${this.y}, ${this.z}]`;
  }

  // Static constants
  static readonly ZERO = Object.freeze(new Vec3(0, 0, 0));
  static readonly ONE = Object.freeze(new Vec3(1, 1, 1));
  static readonly HALF = Object.freeze(new Vec3(0.5, 0.5, 0.5));
  static readonly UP = Object.freeze(new Vec3(0, 1, 0));
  static readonly DOWN = Object.freeze(new Vec3(0, -1, 0));
  static readonly RIGHT = Object.freeze(new Vec3(1, 0, 0));
  static readonly LEFT = Object.freeze(new Vec3(-1, 0, 0));
  static readonly FORWARD = Object.freeze(new Vec3(0, 0, -1));
  static readonly BACK = Object.freeze(new Vec3(0, 0, 1));
}
