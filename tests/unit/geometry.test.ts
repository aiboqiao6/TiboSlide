import { describe, expect, it } from 'vitest';
import { interpolatePoints, affineTransform, trianglePath } from '../../src/geometry';

const source = [[0, 0], [1, 0], [0, 1]] as const;

describe('portrait morph geometry', () => {
  it('interpolates corresponding landmarks with exact endpoints', () => {
    const end = [[10, 20], [11, 20], [10, 21]] as const;
    expect(interpolatePoints(source, end, 0)).toEqual(source);
    expect(interpolatePoints(source, end, 1)).toEqual(end);
    expect(interpolatePoints(source, end, 0.5)).toEqual([[5, 10], [6, 10], [5, 11]]);
  });

  it('rejects mismatched landmark lists', () => {
    expect(() => interpolatePoints(source, [[1, 1]], 0.5)).toThrow('Landmark');
  });

  it('clamps the interpolation ratio', () => {
    expect(interpolatePoints(source, source, -1)).toEqual(source);
    expect(interpolatePoints(source, source, 2)).toEqual(source);
    expect(interpolatePoints(source, source, NaN)).toEqual(source);
  });

  it('calculates a transform that maps every triangle vertex', () => {
    const destination = [[2, 3], [4, 3], [2, 6]] as const;
    expect(affineTransform(source, destination)).toEqual([2, 0, 0, 3, 2, 3]);
  });

  it('handles identity and rotation', () => {
    expect(affineTransform(source, source)).toEqual([1, 0, 0, 1, 0, 0]);
    expect(affineTransform(source, [[0, 0], [0, 1], [-1, 0]])).toEqual([0, 1, -1, 0, 0, 0]);
  });

  it('skips degenerate or invalid triangles', () => {
    expect(affineTransform([[0, 0], [0, 0], [1, 1]], source)).toBeNull();
    expect(affineTransform([[NaN, 0], [1, 0], [0, 1]], source)).toBeNull();
    expect(affineTransform(source, [[Infinity, 0], [1, 0], [0, 1]])).toBeNull();
  });

  it('expands clip triangles to avoid visible seams', () => {
    const expanded = trianglePath(source, 0.5);
    expect(expanded[0][0]).toBeLessThan(0);
    expect(expanded[1][0]).toBeGreaterThan(1);
    expect(expanded[2][1]).toBeGreaterThan(1);
  });

  it('keeps a zero-length vertex finite', () => {
    expect(trianglePath([[1, 1], [1, 1], [1, 1]], 0.5)).toEqual([[1, 1], [1, 1], [1, 1]]);
  });
});
