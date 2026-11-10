"""Synthesises the two demo sounds (thump with a late peak, soft whoosh). Stdlib only."""
import math
import random
import struct
import wave

SR = 48000


def write(path, samples):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s)) * 32000)) for s in samples))


def thump():
    n = int(SR * 0.5)
    r = random.Random(4)
    out = []
    for i in range(n):
        t = i / SR
        attack = min(1.0, t / 0.045)
        env = attack * math.exp(-(max(0.0, t - 0.045)) * 9)
        tone = math.sin(2 * math.pi * (95 - 40 * min(1, t / 0.3)) * t)
        click = (r.random() * 2 - 1) * math.exp(-t * 120) * 0.3
        out.append(0.9 * env * tone + click)
    return out


def whoosh():
    n = int(SR * 0.6)
    r = random.Random(9)
    out = []
    lp = 0.0
    for i in range(n):
        t = i / SR
        env = math.sin(math.pi * min(1.0, t / 0.6)) ** 2
        lp += 0.15 * ((r.random() * 2 - 1) - lp)
        out.append(0.5 * env * lp * 3)
    return out


write("demo/public/thump.wav", thump())
write("demo/public/whoosh.wav", whoosh())
