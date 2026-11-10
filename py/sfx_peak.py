"""Place a sound effect so its measured peak, not its file start, lands on the event (MOTION.md rule 7).

    python sfx_peak.py hit.wav --events 3.2 7.5 --fps 30

Prints the sample's peak time and, per event, the timeline offset at which the file must start
(start_s = event - peak) in seconds and in frames (frames are rounded last). No third-party deps;
non-wav inputs are decoded with ffmpeg.
"""
import argparse
import array
import json
import os
import shutil
import subprocess
import sys
import tempfile
import wave

FFMPEG_FALLBACK = r"C:\Program Files\kdenlive\bin\ffmpeg.exe"


def ffmpeg_path():
    return shutil.which("ffmpeg") or FFMPEG_FALLBACK


def read_wav(path):
    with wave.open(path, "rb") as w:
        ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(n)
    if sw != 2:
        raise ValueError("not 16-bit")
    a = array.array("h")
    a.frombytes(raw)
    if sys.byteorder == "big":
        a.byteswap()
    mono = [max(abs(a[i + c]) for c in range(ch)) for i in range(0, len(a), ch)]
    return mono, sr


def load(path):
    try:
        return read_wav(path)
    except Exception:
        tmp = tempfile.mkdtemp()
        out = os.path.join(tmp, "x.wav")
        subprocess.run([ffmpeg_path(), "-v", "error", "-y", "-i", path, "-ac", "1", "-ar", "48000", "-sample_fmt", "s16", out], check=True)
        return read_wav(out)


def peak_time(path, win_ms=1.0):
    """Peak of the abs signal smoothed over `win_ms`, so a single-sample spike cannot win."""
    s, sr = load(path)
    w = max(1, int(sr * win_ms / 1000))
    acc = sum(s[:w])
    best, best_i = acc, 0
    for i in range(1, len(s) - w + 1):
        acc += s[i + w - 1] - s[i - 1]
        if acc > best:
            best, best_i = acc, i
    centre = best_i + w / 2
    return centre / sr, len(s) / sr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sample")
    ap.add_argument("--events", type=float, nargs="*", default=[])
    ap.add_argument("--fps", type=float, default=30.0)
    ap.add_argument("--win-ms", type=float, default=1.0)
    a = ap.parse_args()
    peak, dur = peak_time(a.sample, a.win_ms)
    out = {"sample": a.sample, "peak_s": round(peak, 4), "duration_s": round(dur, 3), "events": []}
    for ev in a.events:
        start = ev - peak
        out["events"].append({"event_s": ev, "start_s": round(start, 4), "start_frame": round(start * a.fps), "late_by_frames": round(-start * a.fps) if start < 0 else 0})
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
