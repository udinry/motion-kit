"""Vendor the kit into a studio.

    python sync.py <studio path> --kind remotion|html [--dest DIR]

remotion: copies remotion/ to <studio>/src/motion-kit/ (three/ included; delete it if the studio has no three deps).
html:     copies html/ to <studio>/engine/lib/motion-kit/ (or --dest).
Writes VERSION with the kit commit hash (suffix -dirty when the kit has uncommitted changes).
"""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

KIT = Path(__file__).resolve().parent


def commit():
    try:
        h = subprocess.check_output(["git", "-C", str(KIT), "rev-parse", "--short", "HEAD"], text=True).strip()
        dirty = subprocess.check_output(["git", "-C", str(KIT), "status", "--porcelain", "--", "remotion", "html"], text=True).strip()
        return h + ("-dirty" if dirty else "")
    except Exception:
        return "unknown"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("studio")
    ap.add_argument("--kind", required=True, choices=["remotion", "html"])
    ap.add_argument("--dest")
    ap.add_argument("--no-three", action="store_true", help="skip remotion/three (studio has no three/R3F deps)")
    a = ap.parse_args()

    studio = Path(a.studio).resolve()
    if not studio.is_dir():
        sys.exit(f"not a directory: {studio}")
    if a.dest:
        dest = Path(a.dest) if Path(a.dest).is_absolute() else studio / a.dest
    else:
        dest = studio / ("src/motion-kit" if a.kind == "remotion" else "engine/lib/motion-kit")
    src = KIT / a.kind
    if dest.exists():
        shutil.rmtree(dest)
    ignore = shutil.ignore_patterns("out", "__pycache__", "three") if a.no_three and a.kind == "remotion" else shutil.ignore_patterns("out", "__pycache__")
    shutil.copytree(src, dest, ignore=ignore)
    (dest / "VERSION").write_text(commit() + "\n", encoding="utf8")
    print(f"synced {a.kind} -> {dest}  ({commit()})")


if __name__ == "__main__":
    main()
