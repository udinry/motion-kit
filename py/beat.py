"""Beat grid for music cuts (MOTION.md rule 12).

    uv run --with librosa python beat.py music.wav --fps 30 --out beat.json

Beat track, then a least-squares fit t_i = t0 + i*T over the whole beat sequence (the tempo scalar from
beat_track can be off 2%+, the beat times are good). Accept the grid when the residual is <= 15 ms.
Everything is kept in float seconds; frames are computed at the last step only.
"""
import argparse
import json
import sys

import numpy as np


def load(path, sr=22050):
    import librosa

    y, sr = librosa.load(path, sr=sr, mono=True)
    return y, sr


def fit_grid(beats):
    i = np.arange(len(beats))
    a = np.vstack([i, np.ones_like(i)]).T
    (period, t0), *_ = np.linalg.lstsq(a, beats, rcond=None)
    resid = beats - (t0 + i * period)
    return float(t0), float(period), resid


def grid_score(onset_env, times_s, hop, sr):
    idx = np.round(np.asarray(times_s) * sr / hop).astype(int)
    idx = idx[(idx >= 0) & (idx < len(onset_env))]
    return float(onset_env[idx].mean()) if len(idx) else 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("--fps", type=float, default=30.0)
    ap.add_argument("--out", default="-")
    ap.add_argument("--beats-per-bar", type=int, default=4)
    ap.add_argument("--tightness", type=float, default=400.0)
    ap.add_argument("--resid-ms", type=float, default=15.0)
    args = ap.parse_args()

    import librosa

    y, sr = load(args.audio)
    hop = 128
    duration = float(len(y) / sr)
    env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    _, beats = librosa.beat.beat_track(onset_envelope=env, sr=sr, hop_length=hop, tightness=args.tightness, units="time")
    beats = np.asarray(beats, dtype=float)
    if len(beats) < 8:
        sys.exit("fewer than 8 beats found; not a rhythmic track?")

    t0, period, _ = fit_grid(beats)
    env_t = librosa.frames_to_time(np.arange(len(env)), sr=sr, hop_length=hop)

    def comb(p, ph, span):
        pts = ph + np.arange(int((span - ph) / p) + 1) * p
        return float(np.interp(pts, env_t, env).sum() / len(pts))

    def refine(p0, ph0, span):
        best = (-1.0, p0, ph0)
        for p in np.linspace(p0 * 0.97, p0 * 1.03, 121):
            for ph in np.linspace(0, p, 96, endpoint=False):
                v = comb(p, ph, span)
                if v > best[0]:
                    best = (v, p, ph)
        return best[1], best[2]

    def contrast(p, ph):
        on = ph + np.arange(int((duration - ph) / p) + 1) * p
        return float(np.interp(on, env_t, env).mean() - np.interp(on + p / 2, env_t, env).mean())

    candidates, fits = {}, {}
    for name, mult in (("half", 2.0), ("one", 1.0), ("double", 0.5)):
        p, ph = refine(period * mult, t0 % (period * mult), duration)
        fits[name] = (p, ph)
        bpm_c = 60.0 / p
        prior = 1.0 if 70.0 <= bpm_c <= 170.0 else 0.6
        candidates[name] = contrast(p, ph) * prior
    best = max(candidates, key=candidates.get)
    period, t0 = fits[best]

    # least-squares fit over the onset peaks nearest each grid beat, then check the residual
    for _ in range(2):
        grid_i = np.arange(int((duration - t0) / period) + 1)
        pts = t0 + grid_i * period
        snapped = []
        for g in pts:
            sel = (env_t > g - 0.04) & (env_t < g + 0.04)
            snapped.append(env_t[sel][np.argmax(env[sel])] if sel.any() else g)
        snapped = np.asarray(snapped)
        keep = np.abs(snapped - pts) < 0.035
        a_mat = np.vstack([grid_i[keep], np.ones(keep.sum())]).T
        (period, t0), *_ = np.linalg.lstsq(a_mat, snapped[keep], rcond=None)
        period, t0 = float(period), float(t0)
    resid = snapped[keep] - (t0 + grid_i[keep] * period)
    res_max = float(np.abs(resid).max() * 1000.0)
    res_p95 = float(np.percentile(np.abs(resid), 95) * 1000.0)

    n = int((duration - t0) / period) + 1
    grid = t0 + np.arange(n) * period
    if t0 > period:
        back = np.arange(int(t0 // period), 0, -1)
        grid = np.concatenate([t0 - back * period, grid])

    bpb = args.beats_per_bar
    low = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop, fmax=200)
    phase_score = []
    for ph in range(bpb):
        phase_score.append(grid_score(low, grid[ph::bpb], hop, sr))
    downbeat_phase = int(np.argmax(phase_score))
    bar_starts = grid[downbeat_phase::bpb]

    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    rms_t = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)
    bars = []
    for k, s in enumerate(bar_starts):
        e = s + bpb * period
        sel = (rms_t >= s) & (rms_t < e)
        bars.append({"bar": k, "t": round(float(s), 4), "frame": int(round(s * args.fps)), "rms": round(float(rms[sel].mean()) if sel.any() else 0.0, 5)})
    energy = np.array([b["rms"] for b in bars])
    drop = None
    if len(energy) >= 4:
        jump = np.zeros(len(energy))
        for k in range(2, len(energy)):
            jump[k] = energy[k] - energy[max(0, k - 2) : k].mean()
        k = int(np.argmax(jump))
        drop = {"bar": k, "t": bars[k]["t"], "frame": bars[k]["frame"], "energy_jump": round(float(jump[k]), 5)}

    onsets = librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=hop, units="time", backtrack=False)

    out = {
        "file": args.audio,
        "fps": args.fps,
        "duration_s": round(duration, 3),
        "bpm": round(60.0 / period, 3),
        "t0_s": round(t0, 4),
        "period_s": round(period, 5),
        "beats_per_bar": bpb,
        "downbeat_phase": downbeat_phase,
        "grid_choice": best,
        "residual_ms_max": round(res_max, 1),
        "residual_ms_p95": round(res_p95, 1),
        "beats_snapped_frac": round(float(keep.mean()), 3),
        "residual_ok": bool(res_max <= args.resid_ms),
        "beats": [{"i": i, "t": round(float(t), 4), "frame": int(round(t * args.fps))} for i, t in enumerate(grid)],
        "bars": bars,
        "onsets": [{"t": round(float(t), 4), "frame": int(round(t * args.fps))} for t in onsets],
        "drop": drop,
    }
    text = json.dumps(out, indent=1)
    if args.out == "-":
        print(text)
    else:
        with open(args.out, "w", encoding="utf8") as f:
            f.write(text)
        print(f"bpm {out['bpm']}  residual {res_max:.1f} ms ({'ok' if out['residual_ok'] else 'CHECK: variable tempo'})  bars {len(bars)}  drop {drop}")


if __name__ == "__main__":
    main()
