/**
 * math-utils.ts
 * Utilidades matemáticas compartidas para Victor
 */

/**
 * Normaliza un ángulo al rango [0, 360)
 * @param angle Ángulo en grados
 * @returns Ángulo normalizado
 */
export const normalizeAngle = (angle: number): number => {
  if (!Number.isFinite(angle)) return 0;
  const wrapped = angle % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
};

/**
 * Clamps un valor entre min y max
 * @param value Valor a limitar
 * @param min Valor mínimo
 * @param max Valor máximo
 * @returns Valor limitado
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

/**
 * Clamps un valor entre 0 y 1
 * @param value Valor a limitar
 * @returns Valor limitado entre 0 y 1
 */
export const clamp01 = (value: number): number => {
  return clamp(value, 0, 1);
};

/**
 * Interpolación lineal
 * @param a Valor inicial
 * @param b Valor final
 * @param t Factor de interpolación [0, 1]
 * @returns Valor interpolado
 */
export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * clamp01(t);
};

/**
 * Convierte grados a radianes
 * @param degrees Ángulo en grados
 * @returns Ángulo en radianes
 */
export const degToRad = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

/**
 * Convierte radianes a grados
 * @param radians Ángulo en radianes
 * @returns Ángulo en grados
 */
export const radToDeg = (radians: number): number => {
  return (radians * 180) / Math.PI;
};
