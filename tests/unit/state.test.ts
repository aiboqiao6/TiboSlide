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
  it('densely samples every segment without gaps larger than 2.3 percent', () => {
    expect(PORTRAIT_FRAMES.length).toBeGreaterThanOrEqual(46);
    for (let index = 1; index < PORTRAIT_FRAMES.length; index++) {
      const gap = PORTRAIT_FRAMES[index].value - PORTRAIT_FRAMES[index - 1].value;
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThanOrEqual(2.3);
    }
    expect(new Set(PORTRAIT_FRAMES.map((frame) => frame.file)).size).toBe(PORTRAIT_FRAMES.length);
  });

  it.each([0, 33, 67, 100])('selects the exact anchor photo at %s', (value) => {
    expect(getPortraitFrame(value).value).toBe(value);
  });

  it('replaces the exaggerated endpoints but preserves the original middle anchors', () => {
    expect(getPortraitFrame(0).file).toBe('tibo-handsome-v2.jpg');
    expect(getPortraitFrame(33).file).toBe('tibo-reset.jpg');
    expect(getPortraitFrame(67).file).toBe('tibo-ban.jpg');
    expect(getPortraitFrame(100).file).toBe('tibo-disheveled-v2.jpg');
  });

  it('shows at least fifteen different portraits between the middle anchors', () => {
    const visited = new Set(Array.from({ length: 35 }, (_, index) => getPortraitFrame(index + 33).file));
    expect(visited.size).toBeGreaterThanOrEqual(15);
  });

  it('selects a deterministic single nearest frame in both directions', () => {
    const forwards = Array.from({ length: 101 }, (_, value) => getPortraitFrame(value));
    const backwards = Array.from({ length: 101 }, (_, value) => getPortraitFrame(100 - value)).reverse();
    expect(backwards).toEqual(forwards);
    forwards.forEach((frame, value) => {
      expect(PORTRAIT_FRAMES).toContain(frame);
      expect(Math.abs(frame.value - value)).toBeLessThanOrEqual(1.15);
    });
  });

  it.each([[-10, 0], [110, 100], [NaN, 0]])('clamps %s to the endpoint %s', (value, expected) => {
    expect(getPortraitFrame(value).value).toBe(expected);
  });
});
