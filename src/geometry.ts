export type Point = readonly [number, number];
export type Triangle = readonly [Point, Point, Point];
export type Transform = [number, number, number, number, number, number];

export function interpolatePoints(start: readonly Point[], end: readonly Point[], ratio: number): Point[] {
  if (start.length !== end.length) throw new Error('Landmark lists must have equal lengths');
  const t = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
  return start.map(([x, y], i) => [x + (end[i][0] - x) * t, y + (end[i][1] - y) * t]);
}

export function affineTransform(source: Triangle, target: Triangle): Transform | null {
  if (![...source.flat(), ...target.flat()].every(Number.isFinite)) return null;
  const [[x0, y0], [x1, y1], [x2, y2]] = source;
  const determinant = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (Math.abs(determinant) < 1e-8) return null;
  const solve = (v0: number, v1: number, v2: number) => {
    const a = ((v1 - v0) * (y2 - y0) - (v2 - v0) * (y1 - y0)) / determinant;
    const c = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / determinant;
    return [a, c, v0 - a * x0 - c * y0];
  };
  const [a, c, e] = solve(target[0][0], target[1][0], target[2][0]);
  const [b, d, f] = solve(target[0][1], target[1][1], target[2][1]);
  return [a, b, c, d, e, f];
}

export function trianglePath(triangle: Triangle, overlap: number): Point[] {
  const centerX = triangle.reduce((sum, point) => sum + point[0], 0) / 3;
  const centerY = triangle.reduce((sum, point) => sum + point[1], 0) / 3;
  return triangle.map(([x, y]) => {
    const distance = Math.hypot(x - centerX, y - centerY);
    const scale = distance > 0 ? (distance + overlap) / distance : 1;
    return [centerX + (x - centerX) * scale, centerY + (y - centerY) * scale];
  });
}
