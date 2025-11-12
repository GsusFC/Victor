/**
 * Shader chunks - Reusable WGSL code snippets
 * Import and combine these chunks to build complete shaders
 * @license MIT
 */

import { constantsChunk } from './constants.wgsl';
import { mathChunk } from './math.wgsl';
import { noiseChunk } from './noise.wgsl';
import { randomChunk } from './random.wgsl';
import { colorChunk } from './color.wgsl';

export { constantsChunk, mathChunk, noiseChunk, randomChunk, colorChunk };

/**
 * Combine multiple shader chunks into a single string
 * @param chunks - Array of chunk strings to combine
 * @returns Combined shader code
 */
export function combineChunks(...chunks: string[]): string {
  return chunks.join('\n\n');
}

/**
 * Common chunk combination for most animations
 * Includes: constants, math, noise, random
 */
export const commonChunks = combineChunks(
  constantsChunk,
  mathChunk,
  noiseChunk,
  randomChunk
);

/**
 * Full chunk combination (all chunks)
 * Includes: constants, math, noise, random, color
 */
export const allChunks = combineChunks(
  constantsChunk,
  mathChunk,
  noiseChunk,
  randomChunk,
  colorChunk
);
