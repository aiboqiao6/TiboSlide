import importlib.util
import unittest
from pathlib import Path
from PIL import Image

SPEC = importlib.util.spec_from_file_location(
    "prepare_portraits", Path(__file__).resolve().parents[1] / "scripts/prepare-portraits.py"
)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class PortraitPreparationTests(unittest.TestCase):
    def test_cells_follow_row_major_order_without_gutters(self):
        self.assertEqual(MODULE.cell_box(2048, 1), (512, 0, 1024, 512))
        self.assertEqual(MODULE.cell_box(2048, 14), (1024, 1536, 1536, 2048))

    def test_invalid_sheet_dimensions_and_cell_indices_are_rejected(self):
        for size, cell in [(2049, 1), (0, 1), (2048, -1), (2048, 16)]:
            with self.assertRaises(ValueError):
                MODULE.cell_box(size, cell)

    def test_eye_line_interpolation_preserves_exact_anchors(self):
        start, end = [(100, 180), (220, 190)], [(90, 200), (190, 200)]
        self.assertEqual(MODULE.interpolate_eyes(start, end, 0), start)
        self.assertEqual(MODULE.interpolate_eyes(start, end, 1), end)
        self.assertEqual(MODULE.interpolate_eyes(start, end, 0.5), [(95, 190), (205, 195)])

    def test_similarity_transform_maps_both_eyes_without_shearing_a_face(self):
        source, target = [(100, 180), (220, 190)], [(90, 200), (190, 200)]
        a, b, c, d, e, f = MODULE.inverse_alignment(source, target)
        for (x, y), (expected_x, expected_y) in zip(target, source):
            self.assertAlmostEqual(a * x + b * y + c, expected_x)
            self.assertAlmostEqual(d * x + e * y + f, expected_y)
        self.assertAlmostEqual(a, e)
        self.assertAlmostEqual(b, -d)

    def test_missing_or_duplicate_eyes_are_rejected(self):
        for eyes in [[], [(1, 1)], [(1, 1), (1, 1)], [(float("nan"), 1), (2, 2)]]:
            with self.assertRaises(ValueError):
                MODULE.inverse_alignment(eyes, [(100, 100), (200, 100)])

    def test_padding_never_reflects_a_second_chin_below_the_portrait(self):
        source = Image.new("RGB", (512, 512), (20, 20, 20))
        source.paste((220, 130, 100), (245, 450, 265, 512))
        padded = MODULE.reflected_edges(source)
        self.assertEqual(padded.getpixel((128 + 255, 128 + 512 + 20)), (20, 20, 20))


if __name__ == "__main__":
    unittest.main()
