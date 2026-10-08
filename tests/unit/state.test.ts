import { describe, expect, it } from 'vitest';
import { clampValue, getStage, initialValue, STAGES, advancePlayback } from '../../src/state';

describe('intensity state', () => {
  it.each([
    [0, 0], [100, 100], [50.4, 50.4], [-20, 0], [130, 100],
    ['73', 73], [' 25 ', 25], [null, 0], [undefined, 0],
    ['', 0], [' ', 0], ['oops', 0], [NaN, 0], [Infinity, 0],
    [true, 0], [[], 0], [{}, 0],
  ])('safely normalizes %j to %s', (input, expected) => {
    expect(clampValue(input)).toBe(expected);
  });

  it('accepts a safe fallback', () => {
    expect(clampValue(null, 20)).toBe(20);
  });

  it('has the four requested ordered stages', () => {
    expect(STAGES.map((stage) => stage.value)).toEqual([0, 33, 67, 100]);
    expect(STAGES.map((stage) => stage.name)).toEqual(['重置卡', '重置', '降智', '封号']);
  });

  it.each([0, 33, 67, 100])('resolves stage %s', (value) => {
    expect(getStage(value).value).toBe(value);
  });

  it('uses nearest stage and clamps out-of-range values', () => {
    expect(getStage(49).value).toBe(33);
    expect(getStage(50).value).toBe(67);
    expect(getStage(-1).value).toBe(0);
    expect(getStage(101).value).toBe(100);
  });

  it.each([
    ['', 0], ['?z=0', 0], ['?z=100', 100], ['?z=37', 37],
    ['?z=bad', 0], ['?z=', 0], ['?z=999', 100],
  ])('restores a safe share URL from %s', (query, expected) => {
    expect(initialValue(query)).toBe(expected);
  });

  it('advances playback according to elapsed time', () => {
    expect(advancePlayback(50, 1, 1000)).toEqual({ value: 70, direction: 1 });
    expect(advancePlayback(50, -1, 1000)).toEqual({ value: 30, direction: -1 });
  });

  it('reverses at either endpoint without overshooting', () => {
    expect(advancePlayback(99, 1, 1000)).toEqual({ value: 100, direction: -1 });
    expect(advancePlayback(1, -1, 1000)).toEqual({ value: 0, direction: 1 });
  });

  it('ignores negative and invalid frame deltas', () => {
    expect(advancePlayback(50, 1, -20).value).toBe(50);
    expect(advancePlayback(50, 1, NaN).value).toBe(50);
  });
});
