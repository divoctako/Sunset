"""Die-cut the 12 best-seller scoops from the owner's TOP12 poster.

source-extracted/menu/top12.jpg (dark paper background, 4 x 3 grid) ->
  source-extracted/flavors/<code>.png   transparent cut-out at full resolution
  site/assets/flavors/<code>.webp       400px for the page (+ .png fallback)

The background is separated with OpenCV GrabCut, seeded with an ellipse
around each scoop. Needs: pip install opencv-python-headless pillow numpy
Run:  python tools/cut_scoops.py
"""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
POSTER = ROOT / "source-extracted" / "menu" / "top12.jpg"
RAW = ROOT / "source-extracted" / "flavors"
OUT = ROOT / "site" / "assets" / "flavors"
SIZE = 400

# Grid cells in poster pixels (1206 x 1486): x ranges per column, y ranges per row.
COLS = [(90, 335), (360, 605), (625, 875), (865, 1140)]
ROWS = [(255, 500), (580, 835), (905, 1155)]
# Poster order, left to right, top to bottom.
CODES = ["ptm", "hon", "sck", "mk",
         "dc", "bn", "rum", "pis",
         "bis", "scc", "strpf", "org"]


def cut(cell):
    h, w = cell.shape[:2]
    mask = np.full((h, w), cv2.GC_BGD, np.uint8)
    # Everything inside a generous ellipse may be scoop; a tighter one surely is.
    cv2.ellipse(mask, (w // 2, h // 2), (int(w * .47), int(h * .47)), 0, 0, 360, cv2.GC_PR_FGD, -1)
    cv2.ellipse(mask, (w // 2, h // 2), (int(w * .22), int(h * .22)), 0, 0, 360, cv2.GC_FGD, -1)
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(cell, mask, None, bgd, fgd, 8, cv2.GC_INIT_WITH_MASK)
    fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    # Keep the largest blob, fill holes, smooth the outline.
    n, labels, stats, _ = cv2.connectedComponentsWithStats(fg)
    if n > 1:
        big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        fg = np.where(labels == big, 255, 0).astype(np.uint8)
    contours, _ = cv2.findContours(fg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    fg = np.zeros_like(fg)
    cv2.drawContours(fg, contours, -1, 255, -1)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    fg = cv2.erode(fg, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))   # drop the dark rim
    return cv2.GaussianBlur(fg, (0, 0), 1.2)                                     # feathered edge


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    poster = cv2.imread(str(POSTER))
    for i, code in enumerate(CODES):
        (x0, x1), (y0, y1) = COLS[i % 4], ROWS[i // 4]
        cell = poster[y0:y1, x0:x1]
        alpha = cut(cell)
        rgba = cv2.cvtColor(cell, cv2.COLOR_BGR2RGBA)
        rgba[:, :, 3] = alpha
        img = Image.fromarray(rgba)
        img = img.crop(img.getbbox())
        img.save(RAW / f"{code}.png", optimize=True)
        side = max(img.size)
        square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        square.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
        small = square.resize((SIZE, SIZE), Image.LANCZOS)
        small.save(OUT / f"{code}.webp", quality=86, method=6)
        small.save(OUT / f"{code}.png", optimize=True)
        print(code, img.size)


if __name__ == "__main__":
    main()
