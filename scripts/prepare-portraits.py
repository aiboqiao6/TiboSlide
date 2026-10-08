"""Extract and stabilize independent AI portrait frames; never blend photographs."""

import json
import math
import subprocess
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageStat

ROOT = Path(__file__).resolve().parents[1]
SIZE = 512


def cell_box(size, index):
    if size <= 0 or size % 4 or not isinstance(index, int) or not 0 <= index < 16:
        raise ValueError("Expected square sheet divisible by four and cell index 0..15")
    cell = size // 4
    x, y = (index % 4) * cell, (index // 4) * cell
    return x, y, x + cell, y + cell


def interpolate_eyes(start, end, fraction):
    return [
        tuple(a + (b - a) * fraction for a, b in zip(first, last))
        for first, last in zip(start, end)
    ]


def inverse_alignment(source, target):
    for pair in (source, target):
        if len(pair) != 2 or any(len(point) != 2 or not all(math.isfinite(v) for v in point) for point in pair):
            raise ValueError("Two finite eye centers are required")
        if math.dist(*pair) < 1:
            raise ValueError("Eye centers must be distinct")
    sx, sy = source[1][0] - source[0][0], source[1][1] - source[0][1]
    tx, ty = target[1][0] - target[0][0], target[1][1] - target[0][1]
    norm = sx * sx + sy * sy
    a, b = (sx * tx + sy * ty) / norm, (sx * ty - sy * tx) / norm
    c = target[0][0] - a * source[0][0] + b * source[0][1]
    d = target[0][1] - b * source[0][0] - a * source[0][1]
    determinant = a * a + b * b
    return a / determinant, b / determinant, -(a * c + b * d) / determinant, \
        -b / determinant, a / determinant, (b * c - a * d) / determinant


def extend_background(image, padding=128):
    """Extend the wall and hoodie, never mirror facial features into an exposed edge."""
    clothing = [ImageStat.Stat(image.crop(box)).mean for box in
                [(0, SIZE - 16, 64, SIZE), (SIZE - 64, SIZE - 16, SIZE, SIZE)]]
    bottom = tuple(round(value) for value in min(clothing, key=sum))
    # Only wall/shoulder edge colors form the extended backdrop; no facial pixels.
    strip = Image.new("RGB", (2, SIZE + padding * 2))
    for y in range(strip.height):
        source_y = min(SIZE - 1, max(0, y - padding))
        for x in range(2):
            color = bottom if y >= padding + SIZE else image.getpixel((x * (SIZE - 1), source_y))
            strip.putpixel((x, y), color)
    output = strip.resize((SIZE + padding * 2,) * 2, Image.Resampling.BILINEAR)
    output = output.filter(ImageFilter.GaussianBlur(16))
    mask = Image.new("L", (SIZE, SIZE))
    ImageDraw.Draw(mask).rectangle((2, 2, SIZE - 2, SIZE - 2), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(2))
    output.paste(image, (padding, padding), mask)
    return output


def prepare(refresh=False):
    assets = ROOT / "public/assets"
    generated = ROOT / "output/imagegen"
    scratch = ROOT / "tmp/continuity-portraits"
    scratch.mkdir(parents=True, exist_ok=True)
    destinations = [assets / f"tibo-{segment}-{index:02}.jpg"
                    for segment in ("first", "middle", "last") for index in range(1, 15)]
    destinations += [assets / "tibo-handsome-v2.jpg", assets / "tibo-disheveled-v2.jpg"]
    if not refresh and any(path.exists() for path in destinations):
        raise FileExistsError("New portrait assets already exist; choose a new version")
    sheets = {}
    for name in ("first-v1", "middle-v1", "middle-v2", "last-v1"):
        with Image.open(generated / f"continuity-{name}.png") as image:
            if image.size != (2048, 2048):
                raise ValueError(f"Expected a 2048 square contact sheet: {name}")
            sheets[name] = image.convert("RGB")
    anchors = [
        Image.open(generated / "continuity-handsome-v2.png").convert("RGB"),
        Image.open(assets / "tibo-reset.jpg").convert("RGB"),
        Image.open(assets / "tibo-ban.jpg").convert("RGB"),
        Image.open(generated / "continuity-disheveled-v2.png").convert("RGB"),
    ]
    anchors = [image.resize((SIZE, SIZE), Image.Resampling.LANCZOS) for image in anchors]
    raw = {}
    for index, image in enumerate(anchors):
        path = scratch / f"anchor-{index}.png"
        image.save(path)
        raw[f"anchor-{index}"] = path
    for segment in ("first", "middle", "last"):
        for index in range(1, 15):
            sheet = f"{segment}-v1"
            if segment == "middle" and index >= 4:
                sheet = "middle-v2"
            name = f"tibo-{segment}-{index:02}"
            path = scratch / f"{name}.png"
            sheets[sheet].crop(cell_box(2048, index)).save(path)
            raw[name] = path
    detection = subprocess.run(
        ["swift", str(ROOT / "scripts/portrait-eyes.swift"), *map(str, raw.values())],
        capture_output=True, text=True, check=True, timeout=180,
    )
    landmarks = json.loads(detection.stdout)
    eyes = {name: [tuple(v * SIZE for v in point) for point in landmarks[str(path)]]
            for name, path in raw.items()}
    bg_region = (460, 25, 500, 65)
    backgrounds = [ImageStat.Stat(image.crop(bg_region)).mean for image in anchors]
    for anchor, name in [(anchors[0], "tibo-handsome-v2"), (anchors[3], "tibo-disheveled-v2")]:
        anchor.save(assets / f"{name}.jpg", quality=90, optimize=True)
    records = {}
    for segment_index, segment in enumerate(("first", "middle", "last")):
        for index in range(1, 15):
            name = f"tibo-{segment}-{index:02}"
            fraction = index / 15
            target = interpolate_eyes(eyes[f"anchor-{segment_index}"], eyes[f"anchor-{segment_index + 1}"], fraction)
            matrix = list(inverse_alignment(eyes[name], target))
            matrix[2] += 128
            matrix[5] += 128
            with Image.open(raw[name]) as source:
                image = extend_background(source.convert("RGB")).transform(
                    (SIZE, SIZE), Image.Transform.AFFINE, matrix, Image.Resampling.BICUBIC)
            # Match illumination of the wall, without mixing in any other photograph.
            current = ImageStat.Stat(image.crop(bg_region)).mean
            expected = [a + (b - a) * fraction for a, b in
                        zip(backgrounds[segment_index], backgrounds[segment_index + 1])]
            gains = [min(1.2, max(0.8, goal / max(1, actual))) for actual, goal in zip(current, expected)]
            image = Image.merge("RGB", tuple(
                channel.point([min(255, round(value * gain)) for value in range(256)])
                for channel, gain in zip(image.split(), gains)))
            image.save(assets / f"{name}.jpg", quality=88, optimize=True)
            records[name] = {"source": str(raw[name].relative_to(ROOT)), "eyes": target, "gains": gains}
    (scratch / "alignment.json").write_text(json.dumps(records, indent=2))
    print(json.dumps({"event": "portraits_prepared", "new_images": len(destinations)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="Reprocess this version's generated JPEGs only")
    args = parser.parse_args()
    try:
        prepare(args.refresh)
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        raise SystemExit(f"Portrait preparation failed: {error}") from error
