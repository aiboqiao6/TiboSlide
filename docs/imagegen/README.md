# Portrait Assets

## Continuity Revision

Updated 2026-10-08 through the previously authorized provider compatibility CLI/API, model `gpt-image-2`, high quality. New endpoints are 1024 x 1024; four contact sheets are 2048 x 2048 with sixteen square cells each. The frontend uses 46 opaque 512 x 512 JPEGs, including the two untouched original anchors.

| Progress | Assets | Prompt / Reference Order |
| --- | --- | --- |
| 0 | `tibo-handsome-v2.jpg` | [Stronger handsome endpoint](continuity-01-handsome.txt), original smile |
| 2.2-30.8 | `tibo-first-01.jpg` through `tibo-first-14.jpg` | [First sequence](continuity-03-first-sequence.txt), handsome v2 then original smile |
| 33 | `tibo-reset.jpg` | Original unchanged |
| 35.27-39.8 | `tibo-middle-01.jpg` through `tibo-middle-03.jpg` | Cells 1-3 (zero-based) of [first middle sequence](continuity-02-middle-sequence.txt), smile then serious |
| 42.07-64.73 | `tibo-middle-04.jpg` through `tibo-middle-14.jpg` | Cells 4-14 of [revised middle sequence](continuity-02-middle-sequence-v2.txt), serious then smile |
| 67 | `tibo-ban.jpg` | Original unchanged |
| 69.2-97.8 | `tibo-last-01.jpg` through `tibo-last-14.jpg` | [Last sequence](continuity-05-last-sequence.txt), serious then disheveled v2 |
| 100 | `tibo-disheveled-v2.jpg` | [Stronger disheveled endpoint](continuity-04-disheveled.txt), original serious |

The first middle sheet correctly closed the smile but did not sufficiently approach the destination's face. Its first three interior cells are retained; the second sheet supplies the remainder. Head movement is toward the viewer's left throughout, rather than reversing right like the old intermediate.

`scripts/prepare-portraits.py` extracts cells, uses local macOS Vision eye landmarks via `scripts/portrait-eyes.swift`, and applies a whole-photo similarity transform toward interpolated anchor eye positions. It corrects illumination using the wall region. Border extension uses only the same photo's wall/hoodie colors, not reflected facial features or another person's photo. All frames are flattened to opaque JPEGs before the website loads them.

Preparation requires macOS with Swift/Vision and Python 3 with Pillow. These are production-asset tools only, not frontend dependencies:

```bash
python3 tests/prepare-portraits.test.py
python3 scripts/prepare-portraits.py
# Reprocess this version's generated JPEGs without new API calls:
python3 scripts/prepare-portraits.py --refresh
```

Generation uses the commands below with the appropriate reference order from the table:

```bash
node scripts/imagegen-compat.mjs \
  --image public/assets/tibo-reset.jpg \
  --image public/assets/tibo-ban.jpg \
  --prompt-file docs/imagegen/continuity-02-middle-sequence.txt \
  --size 2048x2048 \
  --out output/imagegen/continuity-middle-v1.png
```

Each generation is invoked only once; responses are cached for download recovery. This revision made six successful API requests (two endpoints, three segment sheets, one middle-sheet correction). No credentials are in assets, prompts, Git or browser code. Large outputs and local preparation records stay under ignored `output/` and `tmp/`.

## Previous Seven-Frame Version

Generated on 2026-10-08 using the user-authorized CLI/API fallback, model `gpt-image-2`, 1024 x 1024, high quality. The provider required a compatibility script because its response could contain an image URL instead of `b64_json`. No bundled Codex skill files were modified.

## Frames and Prompts

| Progress | Frame | References | Prompt |
| --- | --- | --- | --- |
| 0 | `public/assets/tibo-handsome.jpg` | Original smile | [Handsome endpoint](01-handsome.txt) |
| 16.5 | `public/assets/tibo-handsome-smile-mid.jpg` | Handsome endpoint, original smile | [Handsome/smile intermediate](02-handsome-smile-mid.txt) |
| 33 | `public/assets/tibo-reset.jpg` | User-supplied original | Unedited source |
| 50 | `public/assets/tibo-smile-serious-mid.jpg` | Original smile, original serious | [Smile/serious intermediate](04-smile-serious-mid.txt) |
| 67 | `public/assets/tibo-ban.jpg` | User-supplied original | Unedited source |
| 83.5 | `public/assets/tibo-serious-disheveled-mid.jpg` | Original serious, disheveled endpoint | [Serious/disheveled intermediate](06-serious-disheveled-mid.txt) |
| 100 | `public/assets/tibo-disheveled.jpg` | Original serious only | [Disheveled endpoint](07-disheveled-single.txt) |

All five generated images are independent, coherent photographs, not superimposed source images. The old ghosted `reference-third.png` was deliberately not used as a reference. The website always renders one frame at full opacity. The original-photo comparison is an explicitly selected, clipped split view, not a blend.

Full-size generated PNGs remain in the local `output/imagegen/` directory. Website copies are 512 x 512 JPEGs. The source photos were not replaced or recompressed.

## Regeneration

Requires Node.js 22.12+. Set `OPENAI_API_KEY` and optionally `OPENAI_BASE_URL` in the shell environment; do not put credentials in source files, prompts, or command-line arguments.

```bash
node scripts/imagegen-compat.mjs \
  --image public/assets/tibo-reset.jpg \
  --prompt-file docs/imagegen/01-handsome.txt \
  --out output/imagegen/01-handsome-v2.png
```

Pass multiple `--image` options for the intermediate prompts in the table. Use a new output filename for new generations. Requests are not automatically regenerated after failure, to avoid duplicate charges. The script validates image signatures and download sizes, and never forwards the API credential to the image download host.

If image generation succeeded but downloading failed, resume the cached response:

```bash
node scripts/imagegen-compat.mjs \
  --resume-response output/imagegen/01-handsome-v2.png.response.local \
  --out output/imagegen/01-handsome-v2.png
```

`output/` is excluded from Git because cached responses may contain temporary signed download links. Publishing the static site does not require API access.
