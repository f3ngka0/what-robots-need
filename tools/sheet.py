"""sheet.py — build a contact sheet from the rendered frames.

  python tools/sheet.py 31.6 34.6 0.25 out/boom_sheet.png
"""
import os
import sys

from PIL import Image, ImageDraw

FR = r"D:\code\video\mv\frames"
FPS = 60


def main():
    a = float(sys.argv[1]); b = float(sys.argv[2])
    step = float(sys.argv[3]) if len(sys.argv) > 3 else 0.25
    out = sys.argv[4] if len(sys.argv) > 4 else r"D:\code\video\mv\out\sheet.png"
    cols = 4
    scale = 0.34
    tiles = []
    t = a
    while t <= b + 1e-6:
        f = int(round(t * FPS))
        p = os.path.join(FR, "f%05d.jpg" % f)
        if os.path.exists(p):
            im = Image.open(p).convert("RGB")
            im = im.resize((int(1920 * scale), int(1080 * scale)), Image.LANCZOS)
            d = ImageDraw.Draw(im)
            d.rectangle([0, 0, 150, 26], fill=(0, 0, 0))
            d.text((6, 6), "%.2fs f%d" % (t, f), fill=(0, 255, 0))
            tiles.append(im)
        t += step
    rows = (len(tiles) + cols - 1) // cols
    tw, th = tiles[0].size
    sheet = Image.new("RGB", (cols * tw, rows * th), (30, 30, 30))
    for i, im in enumerate(tiles):
        sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
    sheet.save(out)
    print(out, sheet.size, len(tiles), "tiles")


main()
