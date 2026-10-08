# Portrait Continuity TDD Evidence

Date: 2026-10-08. Journeys were derived from the user's request to smooth stages two/three, exaggerate the endpoints, and retain single-photo rendering.

## Guarantees

| Behavior | Test / Command | Result |
| --- | --- | --- |
| At least 46 unique ordered frames with gaps no larger than 2.3%, preserving exact stage anchors | `tests/unit/state.test.ts` | PASS |
| At least 15 distinct visible photographs between 33% and 67%, deterministic forward/reverse selection | `tests/unit/state.test.ts` | PASS |
| Every integer slider position, forward and backward, exactly matches a single opaque source photo | `tests/e2e/slider.spec.ts`, desktop/mobile | PASS |
| Original comparison still uses the original smile and serious photos, not old numeric indices | `tests/e2e/slider.spec.ts`, desktop/mobile | PASS |
| Size validation supports 2048 square sheets and rejects invalid dimensions | `node --test tests/imagegen-compat.test.mjs` | 27 PASS |
| Extraction order, finite/nonduplicate eye centers, similarity alignment and nonmirrored padding | `python3 tests/prepare-portraits.test.py` | 6 PASS |
| Loading retry, four presets, playback cancellation, keyboard/touch input, export, restored URLs and no horizontal overflow | `npm run test:e2e` | 18 PASS |

## RED / GREEN

- `59b5fcf`: `npm test -- tests/unit/state.test.ts` executed 45 tests, with 4 intended failures: only 7 frames, old endpoints, only 3 central photographs, excessive selection gaps. The adapter tests referenced the missing size-validator export and failed to load.
- `66dbe37`: `npm run test:e2e -- --grep 'single source'` failed on desktop and mobile: 7 visited frames versus the required 46. Preparation tests referenced the not-yet-implemented preparation module.
- `356814d`: the added padding regression test failed at runtime, reporting reflected skin `(220, 130, 100)` rather than clothing `(20, 20, 20)`. Padding was changed to extend background/clothing without mirroring facial features.
- GREEN: `npm run test:coverage`: 53 PASS, state and legacy geometry modules 100% statements/branches/functions/lines. Adapter tests: 27 PASS. Preparation tests: 6 PASS. `npm run test:e2e`: 18 PASS. `npm run build`: PASS.

## Visual Checks and Limits

The two original anchors are unchanged. Four new contact sheets and two endpoints were inspected locally. The original central intermediate looked right; the selected replacement sequence gradually looks left and approaches the actual serious reference. New frames are aligned in eye-line/scale and adjusted in wall illumination.

As a rough visual-change diagnostic, mean absolute RGB difference on crop `(90, 90, 420, 400)` of adjacent middle frames fell from maximum 69.43 in the old three-photo segment to 29.16 in the new sixteen-photo segment. This is a pixel-change proxy, not proof of perfect perceptual continuity. Frame spacing is at most 2.27 percentage points; photographs are still discrete, not a continuous morph.

Coverage reports do not include DOM event wiring, canvas internals, Swift Vision internals or subjective attractiveness. Those boundaries are covered by browser/image checks or explicitly remain visual judgments. No claim of total-project 100% coverage is made.

Additional Playwright inspection covered six viewports (1440x900, 1280x720, 768x1024, 430x932, 390x844, 320x640), each at 0%, 50% and 100%. No horizontal overflow, failed assets or script errors occurred. Playback changed the actual canvas pixels. Screenshots remain in the ignored local `output/` directory.
