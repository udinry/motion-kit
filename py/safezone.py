"""Flag high-contrast text/face-like content inside platform UI bands.

    uv run --with pillow --with numpy python safezone.py video.mp4 [--ui ig|yt] [--times 1 2 3]

Samples frames (default every 0.5 s), checks each UI band (zones from contact.py) for
edge-dense text-like content and skin-tone blobs, relative to the band's own background.
Prints time and band for each hit; exits 1 if any, 0 if clean. Needs ffmpeg, Pillow, numpy.
"""
import argparse
import io
import re
import subprocess
import sys

import numpy as np
from PIL import Image

from contact import ffmpeg_path, zone_rects

W = 270  # analysis width; zones scale with it


def duration(video):
    r = subprocess.run([ffmpeg_path(), "-i", video], capture_output=True, text=True).stderr
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r)
    return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3]) if m else 0.0


def grab(video, t):
    p = subprocess.run(
        [ffmpeg_path(), "-v", "error", "-ss", f"{max(0.0, t):.3f}", "-i", video, "-frames:v", "1",
         "-vf", f"scale={W}:-2", "-f", "image2pipe", "-vcodec", "png", "-"],
        capture_output=True, check=True)
    return Image.open(io.BytesIO(p.stdout)).convert("RGB") if p.stdout else None


def analyse(band):
    """band: HxWx3 uint8. Returns (edge, skin) fractions."""
    g = band.astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)
    gx = np.abs(np.diff(g, axis=1))[:-1]
    gy = np.abs(np.diff(g, axis=0))[:, :-1]
    mag = np.maximum(gx, gy)
    bg = np.median(g)
    # strong edges, and only where pixels differ from the band's own background
    edge = float(((mag > 50) & (np.abs(g[:-1, :-1] - bg) > 40)).mean())
    r, gg, b = (band[..., i].astype(np.int32) for i in range(3))
    y = 0.299 * r + 0.587 * gg + 0.114 * b
    cb, cr = 128 - 0.169 * r - 0.331 * gg + 0.5 * b, 128 + 0.5 * r - 0.419 * gg - 0.081 * b
    skin = (cb > 77) & (cb < 127) & (cr > 133) & (cr < 173) & (y > 60)
    return edge, float(skin.mean())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--ui", choices=["ig", "yt"], default="ig")
    ap.add_argument("--times", type=float, nargs="*")
    ap.add_argument("--step", type=float, default=0.5)
    ap.add_argument("--edge", type=float, default=0.04, help="edge-density threshold")
    ap.add_argument("--skin", type=float, default=0.06, help="skin-tone area threshold")
    a = ap.parse_args()

    times = a.times or list(np.arange(0.2, max(duration(a.video) - 0.1, 0.3), a.step))
    hits = []
    for t in times:
        im = grab(a.video, t)
        if im is None:
            continue
        arr = np.asarray(im)
        h, w = arr.shape[:2]
        for name, x0, y0, x1, y1 in zone_rects(a.ui, w, h):
            band = arr[y0:y1, x0:x1]
            if band.size == 0:
                continue
            edge, skin = analyse(band)
            why = []
            if edge >= a.edge:
                why.append(f"text-like edges {edge:.1%}")
            if skin >= a.skin:
                why.append(f"skin/face-like {skin:.1%}")
            if why:
                hits.append((t, name))
                print(f"{t:6.2f}s  {name:<6} " + ", ".join(why))
    print(f"{len(hits)} flagged / {len(times)} frames ({a.ui})")
    sys.exit(1 if hits else 0)


if __name__ == "__main__":
    main()
