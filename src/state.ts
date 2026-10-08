export const STAGES = [
  { name: '重置卡', value: 0, color: '#287a62', code: 'RESET CARD' },
  { name: '重置', value: 33, color: '#3568b5', code: 'RESET' },
  { name: '降智', value: 67, color: '#a46c14', code: 'DOWNGRADE' },
  { name: '封号', value: 100, color: '#c04747', code: 'BANNED' },
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

export function initialValue(search: string): number {
  return clampValue(new URLSearchParams(search).get('z'));
}

export function advancePlayback(value: number, direction: Direction, elapsedMs: number) {
  const delta = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const next = clampValue(value + direction * delta * 0.02);
  return { value: next, direction: (next >= 100 ? -1 : next <= 0 ? 1 : direction) as Direction };
}
