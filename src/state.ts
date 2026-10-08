export const STAGES = [
  { name: '提祖', value: 0, color: '#287a62', code: 'TI ZU' },
  { name: '提圣', value: 33, color: '#3568b5', code: 'TI SHENG' },
  { name: '提波', value: 67, color: '#a46c14', code: 'TI BO' },
  { name: '牢提', value: 100, color: '#c04747', code: 'LAO TI' },
] as const;

export const PORTRAIT_FRAMES = [
  { value: 0, file: 'tibo-handsome.jpg' },
  { value: 16.5, file: 'tibo-handsome-smile-mid.jpg' },
  { value: 33, file: 'tibo-reset.jpg' },
  { value: 50, file: 'tibo-smile-serious-mid.jpg' },
  { value: 67, file: 'tibo-ban.jpg' },
  { value: 83.5, file: 'tibo-serious-disheveled-mid.jpg' },
  { value: 100, file: 'tibo-disheveled.jpg' },
] as const;

export type Direction = 1 | -1;

export function clampValue(input: unknown, fallback = 0): number {
  if (typeof input !== 'number' && typeof input !== 'string') return fallback;
  if (typeof input === 'string' && input.trim() === '') return fallback;
  const number = Number(input);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : fallback;
}

export function getStage(value: unknown) {
  return STAGES[Math.round(clampValue(value) * 3 / 100)];
}

export function getPortraitFrame(input: unknown) {
  const value = clampValue(input);
  return PORTRAIT_FRAMES.reduce((nearest, frame) =>
    Math.abs(frame.value - value) <= Math.abs(nearest.value - value) ? frame : nearest);
}

export function initialValue(search: string): number {
  return clampValue(new URLSearchParams(search).get('z'));
}

export function advancePlayback(value: number, direction: Direction, elapsedMs: number) {
  const delta = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const next = clampValue(value + direction * delta * 0.02);
  return { value: next, direction: (next >= 100 ? -1 : next <= 0 ? 1 : direction) as Direction };
}
