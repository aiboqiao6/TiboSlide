import { describe, expect, it } from 'vitest';
import { clampValue, getStage, getPortraitFrame, initialValue, PORTRAIT_FRAMES, STAGES, advancePlayback } from '../../src/state';

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
    expect(STAGES.map((stage) => stage.name)).toEqual(['提祖', '提圣', '提波', '牢提']);
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

describe('single-photo keyframes', () => {
  it('orders four portraits and three separately generated intermediate photos', () => {
    expect(PORTRAIT_FRAMES.map((frame) => frame.value)).toEqual([0, 16.5, 33, 50, 67, 83.5, 100]);
    expect(PORTRAIT_FRAMES.map((frame) => frame.file)).toEqual([
      'tibo-handsome.jpg', 'tibo-handsome-smile-mid.jpg', 'tibo-reset.jpg',
      'tibo-smile-serious-mid.jpg', 'tibo-ban.jpg', 'tibo-serious-disheveled-mid.jpg',
      'tibo-disheveled.jpg',
    ]);
  });

  it.each([0, 16.5, 33, 50, 67, 83.5, 100])('selects the exact photo at %s', (value) => {
    expect(getPortraitFrame(value).value).toBe(value);
  });

  it.each([
    [8, 0], [8.25, 16.5], [24, 16.5], [25, 33], [41, 33],
    [41.5, 50], [58, 50], [58.5, 67], [75, 67], [75.25, 83.5],
    [91, 83.5], [91.75, 100], [-10, 0], [110, 100], [NaN, 0],
  ])('selects one nearest frame for %s, not a blend', (value, expected) => {
    expect(getPortraitFrame(value).value).toBe(expected);
  });
});
