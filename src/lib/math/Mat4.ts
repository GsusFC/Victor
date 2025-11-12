/**
 * A 4x4 matrix for 3D transformations.
 * Adapted from PlayCanvas Engine
 * @license MIT
 */

import { Vec3 } from './Vec3';
import { Quat } from './Quat';
import { EPSILON } from './constants';

export class Mat4 {
  /** Matrix data stored in column-major order (OpenGL/WebGPU convention) */
  data: Float32Array;

  /**
   * Creates a new Mat4 instance (identity by default)
   */
  constructor() {
    this.data = new Float32Array(16);
    this.setIdentity();
  }

  // Basic operations
  clone(): Mat4 {
    const m = new Mat4();
    m.data.set(this.data);
    return m;
  }

  copy(rhs: Mat4): Mat4 {
    this.data.set(rhs.data);
    return this;
  }

  set(m: Float32Array | number[]): Mat4 {
    this.data.set(m);
    return this;
  }

  setIdentity(): Mat4 {
    const d = this.data;
    d[0] = 1; d[1] = 0; d[2] = 0; d[3] = 0;
    d[4] = 0; d[5] = 1; d[6] = 0; d[7] = 0;
    d[8] = 0; d[9] = 0; d[10] = 1; d[11] = 0;
    d[12] = 0; d[13] = 0; d[14] = 0; d[15] = 1;
    return this;
  }

  isIdentity(): boolean {
    const d = this.data;
    return (
      d[0] === 1 && d[1] === 0 && d[2] === 0 && d[3] === 0 &&
      d[4] === 0 && d[5] === 1 && d[6] === 0 && d[7] === 0 &&
      d[8] === 0 && d[9] === 0 && d[10] === 1 && d[11] === 0 &&
      d[12] === 0 && d[13] === 0 && d[14] === 0 && d[15] === 1
    );
  }

  equals(rhs: Mat4): boolean {
    for (let i = 0; i < 16; i++) {
      if (this.data[i] !== rhs.data[i]) return false;
    }
    return true;
  }

  // Matrix multiplication
  mul(rhs: Mat4): Mat4 {
    return this.mul2(this, rhs);
  }

  mul2(lhs: Mat4, rhs: Mat4): Mat4 {
    const a = lhs.data;
    const b = rhs.data;
    const r = this.data;

    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
    const b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
    const b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
    const b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

    r[0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
    r[1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
    r[2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
    r[3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;

    r[4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
    r[5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
    r[6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
    r[7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;

    r[8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
    r[9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
    r[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
    r[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;

    r[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
    r[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
    r[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
    r[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;

    return this;
  }

  // Transformation matrices
  setTranslate(x: number, y: number, z: number): Mat4 {
    this.setIdentity();
    this.data[12] = x;
    this.data[13] = y;
    this.data[14] = z;
    return this;
  }

  setScale(x: number, y: number, z: number): Mat4 {
    this.setIdentity();
    this.data[0] = x;
    this.data[5] = y;
    this.data[10] = z;
    return this;
  }

  setFromAxisAngle(axis: Vec3, angle: number): Mat4 {
    const x = axis.x;
    const y = axis.y;
    const z = axis.z;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;

    const d = this.data;
    d[0] = t * x * x + c;
    d[1] = t * x * y + s * z;
    d[2] = t * x * z - s * y;
    d[3] = 0;

    d[4] = t * x * y - s * z;
    d[5] = t * y * y + c;
    d[6] = t * y * z + s * x;
    d[7] = 0;

    d[8] = t * x * z + s * y;
    d[9] = t * y * z - s * x;
    d[10] = t * z * z + c;
    d[11] = 0;

    d[12] = 0;
    d[13] = 0;
    d[14] = 0;
    d[15] = 1;

    return this;
  }

  setTRS(translation: Vec3, rotation: Quat, scale: Vec3): Mat4 {
    const x = rotation.x;
    const y = rotation.y;
    const z = rotation.z;
    const w = rotation.w;

    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;

    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    const sx = scale.x;
    const sy = scale.y;
    const sz = scale.z;

    const d = this.data;
    d[0] = (1 - (yy + zz)) * sx;
    d[1] = (xy + wz) * sx;
    d[2] = (xz - wy) * sx;
    d[3] = 0;

    d[4] = (xy - wz) * sy;
    d[5] = (1 - (xx + zz)) * sy;
    d[6] = (yz + wx) * sy;
    d[7] = 0;

    d[8] = (xz + wy) * sz;
    d[9] = (yz - wx) * sz;
    d[10] = (1 - (xx + yy)) * sz;
    d[11] = 0;

    d[12] = translation.x;
    d[13] = translation.y;
    d[14] = translation.z;
    d[15] = 1;

    return this;
  }

  // View matrix (lookAt)
  setLookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
    const z = new Vec3().sub2(eye, target).normalize();
    const x = new Vec3().cross(up, z).normalize();
    const y = new Vec3().cross(z, x);

    const d = this.data;
    d[0] = x.x;
    d[1] = y.x;
    d[2] = z.x;
    d[3] = 0;

    d[4] = x.y;
    d[5] = y.y;
    d[6] = z.y;
    d[7] = 0;

    d[8] = x.z;
    d[9] = y.z;
    d[10] = z.z;
    d[11] = 0;

    d[12] = -x.dot(eye);
    d[13] = -y.dot(eye);
    d[14] = -z.dot(eye);
    d[15] = 1;

    return this;
  }

  // Perspective projection
  setPerspective(fov: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1.0 / Math.tan(fov * 0.5);
    const nf = 1.0 / (near - far);

    const d = this.data;
    d[0] = f / aspect;
    d[1] = 0;
    d[2] = 0;
    d[3] = 0;

    d[4] = 0;
    d[5] = f;
    d[6] = 0;
    d[7] = 0;

    d[8] = 0;
    d[9] = 0;
    d[10] = (far + near) * nf;
    d[11] = -1;

    d[12] = 0;
    d[13] = 0;
    d[14] = 2 * far * near * nf;
    d[15] = 0;

    return this;
  }

  // Orthographic projection
  setOrtho(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);

    const d = this.data;
    d[0] = -2 * lr;
    d[1] = 0;
    d[2] = 0;
    d[3] = 0;

    d[4] = 0;
    d[5] = -2 * bt;
    d[6] = 0;
    d[7] = 0;

    d[8] = 0;
    d[9] = 0;
    d[10] = 2 * nf;
    d[11] = 0;

    d[12] = (left + right) * lr;
    d[13] = (top + bottom) * bt;
    d[14] = (far + near) * nf;
    d[15] = 1;

    return this;
  }

  // Inversion
  invert(): Mat4 {
    const a = this.data;

    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (Math.abs(det) < EPSILON) {
      this.setIdentity();
      return this;
    }

    det = 1.0 / det;

    a[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    a[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    a[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    a[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;

    a[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    a[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    a[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    a[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;

    a[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    a[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    a[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    a[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;

    a[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    a[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    a[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    a[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return this;
  }

  // Transpose
  transpose(): Mat4 {
    const d = this.data;
    let tmp;

    tmp = d[1]; d[1] = d[4]; d[4] = tmp;
    tmp = d[2]; d[2] = d[8]; d[8] = tmp;
    tmp = d[3]; d[3] = d[12]; d[12] = tmp;
    tmp = d[6]; d[6] = d[9]; d[9] = tmp;
    tmp = d[7]; d[7] = d[13]; d[13] = tmp;
    tmp = d[11]; d[11] = d[14]; d[14] = tmp;

    return this;
  }

  // Transform vectors
  transformPoint(vec: Vec3, res?: Vec3): Vec3 {
    const result = res || new Vec3();
    const d = this.data;
    const x = vec.x;
    const y = vec.y;
    const z = vec.z;

    result.x = d[0] * x + d[4] * y + d[8] * z + d[12];
    result.y = d[1] * x + d[5] * y + d[9] * z + d[13];
    result.z = d[2] * x + d[6] * y + d[10] * z + d[14];

    return result;
  }

  transformVector(vec: Vec3, res?: Vec3): Vec3 {
    const result = res || new Vec3();
    const d = this.data;
    const x = vec.x;
    const y = vec.y;
    const z = vec.z;

    result.x = d[0] * x + d[4] * y + d[8] * z;
    result.y = d[1] * x + d[5] * y + d[9] * z;
    result.z = d[2] * x + d[6] * y + d[10] * z;

    return result;
  }

  // Extraction
  getTranslation(res?: Vec3): Vec3 {
    const result = res || new Vec3();
    result.x = this.data[12];
    result.y = this.data[13];
    result.z = this.data[14];
    return result;
  }

  getScale(res?: Vec3): Vec3 {
    const result = res || new Vec3();
    const d = this.data;

    result.x = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
    result.y = Math.sqrt(d[4] * d[4] + d[5] * d[5] + d[6] * d[6]);
    result.z = Math.sqrt(d[8] * d[8] + d[9] * d[9] + d[10] * d[10]);

    return result;
  }

  toString(): string {
    const d = this.data;
    return `[${d[0]}, ${d[1]}, ${d[2]}, ${d[3]}\n` +
           ` ${d[4]}, ${d[5]}, ${d[6]}, ${d[7]}\n` +
           ` ${d[8]}, ${d[9]}, ${d[10]}, ${d[11]}\n` +
           ` ${d[12]}, ${d[13]}, ${d[14]}, ${d[15]}]`;
  }

  // Static constants
  static readonly IDENTITY = Object.freeze(new Mat4());
  static readonly ZERO = Object.freeze(new Mat4().set(new Float32Array(16)));
}
