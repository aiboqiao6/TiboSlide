# Single-Portrait Stages TDD Evidence

Date: 2026-10-08. No external plan; journeys were derived from the user's follow-up requests.

## Journeys

1. Select exactly four titles in order: 提祖, 提圣, 提波, 牢提.
2. See the enhanced smile, original smile, original serious photo, and disheveled serious photo at the four preset positions.
3. See three separately generated intermediate photographs, never transparent overlays or geometrically blended faces.
4. Preserve keyboard, dragging, touch, playback, reset, original-photo comparison, PNG export, shared progress and recoverable image-load errors.
5. Keep all four title controls visible in desktop and mobile first viewports.
6. Generate assets locally with an environment-only credential and support either base64 or HTTPS-link image responses.

## RED and GREEN

- `ec46397`: RED checkpoint on `codex/single-portrait-stages`. `npm test -- tests/unit/state.test.ts` ran 57 tests with 24 intended failures for the missing seven-frame selection and outdated titles. `node --test tests/imagegen-compat.test.mjs` failed because the new compatibility module did not exist.
- Initial browser run: `npm run test:e2e` passed 15 of 16 tests. The desktop title row ended at 721.59375px in a 720px viewport. Short-screen spacing was then reduced without weakening the assertion.
- Adapter hardening RED: two added tests reproduced accepting an object instead of a `data` array and failing to detect an already cached response before regeneration. Both pass after strict array validation and cache preflight.
- GREEN: `npm run test:coverage` passed all 65 unit tests. `node --test tests/imagegen-compat.test.mjs` passed all 19 adapter tests. `npm run test:e2e` passed all 16 browser tests. `npm run build` and `git diff --check` passed.
- The GREEN checkpoint is the implementation commit containing this report. RED/GREEN commits are preserved, not squashed.

## Guarantees

| Guarantee | Evidence | Type |
| --- | --- | --- |
| Four exact titles at 0, 33, 67, 100 | `tests/unit/state.test.ts` | Unit |
| Seven ordered images with safe nearest-frame selection and tested boundaries | `tests/unit/state.test.ts` | Unit |
| Every integer progress from 0 to 100 produces pixels identical to one full-opacity source photo; all seven frames are visited | `tests/e2e/slider.spec.ts`, both projects | Browser |
| The thumbnail cards and old status titles are absent | `tests/e2e/slider.spec.ts` | Browser |
| Mouse, keyboard, touch, playback, reset, comparison and actual PNG download work | `tests/e2e/slider.spec.ts` | Browser |
| Missing assets disable controls and can be retried | `tests/e2e/slider.spec.ts` | Browser |
| Nonblank canvas, no horizontal overflow, title controls fit the first viewport | `tests/e2e/slider.spec.ts` | Browser |
| Base64 and HTTPS-link responses are supported without forwarding API credentials to the download host | `tests/imagegen-compat.test.mjs` | Mocked API unit |
| Malformed responses, unsafe URLs, HTTP errors, non-images and oversized downloads are rejected | `tests/imagegen-compat.test.mjs` | Mocked API unit |
| An existing response cache blocks duplicate paid generation | `tests/imagegen-compat.test.mjs` | CLI integration |

## Production Preview

Additional Playwright inspection against the built preview at `http://127.0.0.1:4173` waited for loaded portraits and fonts, took screenshots, and checked these viewports:

`BASE_URL=http://127.0.0.1:4173 npm run test:e2e` separately reran the complete browser suite against the production build: all 16 tests passed in 3.2 seconds.

| Viewport | Title row bottom | Horizontal overflow | Script errors |
| --- | --- | --- | --- |
| 1280 x 720 | 707.59375 | No | None |
| 1920 x 1080 | 779.59375 | No | None |
| 1920 x 720 | 707.59375 | No | None |
| 768 x 1024 | 731.59375 | No | None |
| 390 x 844 | 776.28125 | No | None |
| 360 x 640 | 629.375 | No | None |

Five live image API requests through the compatibility script saved the requested PNGs. Each generated portrait was visually inspected after conversion to the 512px website JPEG. The two original JPEGs remain unchanged. Full-size outputs, signed-response caches and screenshots stay local in the Git-ignored `output/` directory.

## Coverage and Limits

Coverage is 100% for statements, branches, functions and lines in `state.ts` and the retained legacy `geometry.ts`; this is not whole-application coverage. Canvas rendering and DOM behavior are covered with Chromium on desktop and an emulated touch device. Real-device Safari, operating-system share sheets and device-specific download behavior are not verified.

Pixels are compared with the actual source photos, so the tests establish absence of runtime blending. Photographic identity and aesthetic quality are assessed visually, not inferred from these tests.

The compatibility script intentionally does not retry paid generation automatically. Cached responses can resume downloads. Provider transport, account billing and provider-side data retention are outside the automated mocked tests.

GitHub Pages verification is performed separately after publishing; local tests alone do not establish online availability.
