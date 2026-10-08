# Portrait Assets

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
