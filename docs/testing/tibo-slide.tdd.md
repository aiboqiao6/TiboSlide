# TiboSlide TDD Evidence

Date: 2026-10-08.

## Source and Journeys

No external plan. Journeys were derived from the user's request and follow-up:

1. Drag through exactly four stages: 重置卡, 重置, 降智, 封号.
2. See the supplied portraits transition continuously, with exact endpoint images.
3. Play, pause, reset, compare originals, export a PNG, and restore shared state.
4. Use the same controls on desktop and mobile, including loading failure recovery.
5. See all four presets in the tested desktop and mobile first viewport.

## RED / GREEN

- `be48d38`: tests referenced intentionally missing `src/state` and `src/geometry`; `npm test` exited 1 with two missing-implementation suites.
- `7eb05a2`: `npm run test:coverage` passed 42 tests. State and geometry had 100% statements, branches, functions, and lines. `npm run test:e2e` passed 12 browser tests. `npm run build` passed.
- `bffdfc7`: first-viewport regression test failed on desktop (868.5px bottom in 720px viewport) and mobile (883.3px bottom in 664px viewport), before compact layout changes.
- Compact-layout GREEN: `npm run test:e2e` passed all 12 tests, including first-viewport assertions on both projects. `npm run build` passed.

Checkpoint commits remain on the main branch; they have not been squashed.

## Guarantees

| Guarantee | Test | Kind |
| --- | --- | --- |
| Exactly the four user-requested stages, in order | `tests/unit/state.test.ts` | Unit |
| Invalid, empty, non-finite and out-of-range input is safe | `tests/unit/state.test.ts` | Unit |
| Playback reverses at endpoints without overshooting | `tests/unit/state.test.ts` | Unit |
| Safe URL parameter restoration | `tests/unit/state.test.ts` | Unit |
| Landmark interpolation has exact endpoints | `tests/unit/geometry.test.ts` | Unit |
| Affine transforms map vertices correctly; degenerate triangles are skipped | `tests/unit/geometry.test.ts` | Unit |
| Canvas contains opaque pixels and many distinct colors | `tests/e2e/slider.spec.ts` | Browser |
| Four presets, keyboard, mouse dragging and touch interaction work | `tests/e2e/slider.spec.ts` | Browser |
| Playback pauses and manual actions cancel playback | `tests/e2e/slider.spec.ts` | Browser |
| Comparison changes pixels; PNG download succeeds | `tests/e2e/slider.spec.ts` | Browser |
| Failed image loading disables controls and can be retried | `tests/e2e/slider.spec.ts` | Browser |
| No horizontal overflow; presets fit tested first viewports | `tests/e2e/slider.spec.ts` | Browser |

## Scope and Limitations

Unit coverage measures only `state.ts` and `geometry.ts`, not the entire application. Canvas rendering and DOM interactions are verified with Playwright Chromium on desktop and an emulated iPhone touch viewport. Native Safari, the operating system share sheet, and device-specific download behavior have not been tested on real devices.

Portraits have low-resolution, differently posed source photos. Intermediate morphs retain some photographic blending artifacts. Tests establish nonblank output and working interaction, not photorealism.

GitHub publishing requires an authenticated account and repository access. Build and test results do not by themselves prove an online deployment; the live page is verified separately after publication.
