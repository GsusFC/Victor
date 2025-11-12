/**
 * A 2-dimensional vector.
 * Adapted from PlayCanvas Engine
 * @license MIT
 */

import { DEG_TO_RAD, RAD_TO_DEG, EPSILON } from './constants';

export class Vec2 {
  /** The x component */
  x: number;

  /** The y component */
  y: number;

  /**
   * Creates a new Vec2 instance
   * @param x - The x component (default: 0)
   * @param y - The y component (default: 0)
   */
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  // Arithmetic operations
  add(rhs: Vec2): Vec2 {
    this.x += rhs.x;
    this.y += rhs.y;
    return this;
  }

  add2(lhs: Vec2, rhs: Vec2): Vec2 {
    this.x = lhs.x + rhs.x;
    this.y = lhs.y + rhs.y;
    return this;
  }

  addScalar(scalar: number): Vec2 {
    this.x += scalar;
    this.y += scalar;
    return this;
  }

  addScaled(rhs: Vec2, scalar: number): Vec2 {
    this.x += rhs.x * scalar;
    this.y += rhs.y * scalar;
    return this;
  }

  sub(rhs: Vec2): Vec2 {
    this.x -= rhs.x;
    this.y -= rhs.y;
    return this;
  }

  sub2(lhs: Vec2, rhs: Vec2): Vec2 {
    this.x = lhs.x - rhs.x;
    this.y = lhs.y - rhs.y;
    return this;
  }

  subScalar(scalar: number): Vec2 {
    this.x -= scalar;
    this.y -= scalar;
    return this;
  }

  mul(rhs: Vec2): Vec2 {
    this.x *= rhs.x;
    this.y *= rhs.y;
    return this;
  }

  mul2(lhs: Vec2, rhs: Vec2): Vec2 {
    this.x = lhs.x * rhs.x;
    this.y = lhs.y * rhs.y;
    return this;
  }

  mulScalar(scalar: number): Vec2 {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  div(rhs: Vec2): Vec2 {
    this.x /= rhs.x;
    this.y /= rhs.y;
    return this;
  }

  div2(lhs: Vec2, rhs: Vec2): Vec2 {
    this.x = lhs.x / rhs.x;
    this.y = lhs.y / rhs.y;
    return this;
  }

  divScalar(scalar: number): Vec2 {
    this.x /= scalar;
    this.y /= scalar;
    return this;
  }

  // Geometric operations
  dot(rhs: Vec2): number {
    return this.x * rhs.x + this.y * rhs.y;
  }

  cross(rhs: Vec2): number {
    return this.x * rhs.y - this.y * rhs.x;
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  distance(rhs: Vec2): number {
    const dx = this.x - rhs.x;
    const dy = this.y - rhs.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  distanceSq(rhs: Vec2): number {
    const dx = this.x - rhs.x;
    const dy = this.y - rhs.y;
    return dx * dx + dy * dy;
  }

  normalize(): Vec2 {
    const len = this.length();
    if (len > EPSILON) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  // Interpolation
  lerp(lhs: Vec2, rhs: Vec2, alpha: number): Vec2 {
    this.x = lhs.x + alpha * (rhs.x - lhs.x);
    this.y = lhs.y + alpha * (rhs.y - lhs.y);
    return this;
  }

  // Rotation and angles
  rotate(angle: number): Vec2 {
    const rad = angle * DEG_TO_RAD;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const x = this.x;
    const y = this.y;
    this.x = x * cos - y * sin;
    this.y = x * sin + y * cos;
    return this;
  }

  angle(): number {
    return Math.atan2(this.y, this.x) * RAD_TO_DEG;
  }

  angleTo(rhs: Vec2): number {
    const angle = Math.atan2(rhs.y - this.y, rhs.x - this.x) * RAD_TO_DEG;
    return angle < 0 ? angle + 360 : angle;
  }

  // Utility operations
  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  copy(rhs: Vec2): Vec2 {
    this.x = rhs.x;
    this.y = rhs.y;
    return this;
  }

  set(x: number, y: number): Vec2 {
    this.x = x;
    this.y = y;
    return this;
  }

  equals(rhs: Vec2): boolean {
    return this.x === rhs.x && this.y === rhs.y;
  }

  equalsApprox(rhs: Vec2, epsilon = EPSILON): boolean {
    return Math.abs(this.x - rhs.x) < epsilon && Math.abs(this.y - rhs.y) < epsilon;
  }

  floor(): Vec2 {
    this.x = Math.floor(this.x);
    this.y = Math.floor(this.y);
    return this;
  }

  ceil(): Vec2 {
    this.x = Math.ceil(this.x);
    this.y = Math.ceil(this.y);
    return this;
  }

  round(): Vec2 {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    return this;
  }

  min(rhs: Vec2): Vec2 {
    if (rhs.x < this.x) this.x = rhs.x;
    if (rhs.y < this.y) this.y = rhs.y;
    return this;
  }

  max(rhs: Vec2): Vec2 {
    if (rhs.x > this.x) this.x = rhs.x;
    if (rhs.y > this.y) this.y = rhs.y;
    return this;
  }

  // Array conversions
  toArray(): [number, number] {
    return [this.x, this.y];
  }

  fromArray(array: number[] | Float32Array, offset = 0): Vec2 {
    this.x = array[offset];
    this.y = array[offset + 1];
    return this;
  }

  toString(): string {
    return `[${this.x}, ${this.y}]`;
  }

  // Static constants
  static readonly ZERO = Object.freeze(new Vec2(0, 0));
  static readonly ONE = Object.freeze(new Vec2(1, 1));
  static readonly HALF = Object.freeze(new Vec2(0.5, 0.5));
  static readonly UP = Object.freeze(new Vec2(0, 1));
  static readonly DOWN = Object.freeze(new Vec2(0, -1));
  static readonly RIGHT = Object.freeze(new Vec2(1, 0));
  static readonly LEFT = Object.freeze(new Vec2(-1, 0));
}
