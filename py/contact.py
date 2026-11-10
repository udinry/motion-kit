"""Contact sheet for stills-first review (MOTION.md process step 2).

    uv run --with pillow python contact.py video.mp4 --out sheet.jpg --beats beat.json --strip 0 12.4
    uv run --with pillow python contact.py video.mp4 --out sheet.jpg --times 0 1.5 3 --strip 0

One frame per beat (from beat.py JSON) or per time, plus a 0.2 s strip (7 frames at 30 fps) around each
--strip time. Needs ffmpeg and Pillow.
"""
import argparse
import json
import os
import shutil
import subprocess
import tempfile

from PIL import Image, ImageDraw

FFMPEG_FALLBACK = r"C:\Program Files\kdenlive\bin\ffmpeg.exe"


def ffmpeg_path():
    return shutil.which("ffmpeg") or FFMPEG_FALLBACK


def grab(video, t, out, width):
    subprocess.run(
        [ffmpeg_path(), "-v", "error", "-y", "-ss", f"{max(0.0, t):.4f}", "-i", video, "-frames:v", "1", "-vf", f"scale={width}:-2", out],
        check=True,
    )


def sheet(frames, cols, label_h=22):
    w, h = frames[0][1].size
    rows = (len(frames) + cols - 1) // cols
    img = Image.new("RGB", (cols * w, rows * (h + label_h)), (24, 22, 20))
    d = ImageDraw.Draw(img)
    for k, (label, im) in enumerate(frames):
        x, y = (k % cols) * w, (k // cols) * (h + label_h)
        img.paste(im, (x, y + label_h))
        d.text((x + 6, y + 5), label, fill=(235, 225, 205))
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--out", required=True)
    ap.add_argument("--times", type=float, nargs="*", default=[])
    ap.add_argument("--beats", help="beat.py JSON; one frame per beat (or per bar with --bars)")
    ap.add_argument("--bars", action="store_true")
    ap.add_argument("--strip", type=float, nargs="*", default=[], help="centre times for 0.2 s strips")
    ap.add_argument("--fps", type=float, default=30.0)
    ap.add_argument("--width", type=int, default=216)
    ap.add_argument("--cols", type=int, default=8)
    ap.add_argument("--max", type=int, default=64)
    a = ap.parse_args()

    times = list(a.times)
    if a.beats:
        j = json.load(open(a.beats, encoding="utf8"))
        key = "bars" if a.bars else "beats"
        times += [b["t"] for b in j[key]]
    times = sorted(set(round(t, 4) for t in times))[: a.max]

    tmp = tempfile.mkdtemp()
    frames = []
    for k, t in enumerate(times):
        p = os.path.join(tmp, f"f{k}.png")
        grab(a.video, t, p, a.width)
        frames.append((f"{t:.2f}s", Image.open(p).convert("RGB")))
    parts = []
    if frames:
        parts.append(sheet(frames, a.cols))
    for c in a.strip:
        n = 7
        row = []
        for k in range(n):
            t = c - 0.1 + k * (0.2 / (n - 1))
            p = os.path.join(tmp, f"s{c}_{k}.png")
            grab(a.video, t, p, a.width)
            row.append((f"{t:.3f}", Image.open(p).convert("RGB")))
        parts.append(sheet(row, n))
    W = max(p.width for p in parts)
    H = sum(p.height for p in parts)
    out = Image.new("RGB", (W, H), (24, 22, 20))
    y = 0
    for p in parts:
        out.paste(p, (0, y))
        y += p.height
    out.save(a.out, quality=88)
    print(f"{a.out}  {out.width}x{out.height}  {len(frames)} frames + {len(a.strip)} strips")


if __name__ == "__main__":
    main()
