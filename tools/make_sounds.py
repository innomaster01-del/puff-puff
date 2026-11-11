#!/usr/bin/env python3
"""Synthesize the PUFF PUFF pinball sounds as 16-bit mono WAVs (no samples, no licences). python3 make_sounds.py OUT_DIR"""
import sys, wave, numpy as np
SR = 44100
rng = np.random.default_rng(3)
def T(d): return np.arange(int(SR * d)) / SR
def band(d, lo, hi):
    n = int(SR * d); x = rng.standard_normal(n); F = np.fft.rfft(x); fr = np.fft.rfftfreq(n, 1 / SR); F[(fr < lo) | (fr > hi)] = 0
    y = np.fft.irfft(F, n); return y / max(1e-9, np.abs(y).max())
def tone(f, d, decay=8.0, kind='sine', slide=1.0):
    t = T(d); fr = f * slide ** (t / d); ph = 2 * np.pi * np.cumsum(fr) / SR
    w = np.sin(ph) if kind == 'sine' else (2 / np.pi * np.arcsin(np.sin(ph)) if kind == 'tri' else np.sign(np.sin(ph)) * 0.5)
    return w * np.exp(-t * decay)
def bell(f, d=0.5, decay=7.0): return tone(f, d, decay) + 0.5 * tone(f * 2.76, d, decay * 1.6) + 0.25 * tone(f * 5.4, d, decay * 2.4)
def mix(total, parts):
    out = np.zeros(int(SR * total))
    for start, x, vol in parts:
        i = int(SR * start); j = min(len(out), i + len(x)); out[i:j] += x[: j - i] * vol
    return out
def save(name, x, peak=0.85):
    x = x / max(1e-9, np.abs(x).max()) * peak
    with wave.open(f'{sys.argv[1]}/{name}.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes())
thock = lambda v=1.0: band(0.07, 150, 2200) * np.exp(-T(0.07) * 60) * v
save('flipper', mix(0.1, [(0, thock(), 1.0), (0, tone(110, 0.08, 40), 0.8)]), 0.8)
save('bumper', mix(0.3, [(0, thock(), 1.0), (0, tone(95, 0.12, 30), 1.0), (0.005, bell(1320, 0.28, 12), 0.6)]))
save('sling', mix(0.14, [(0, band(0.05, 800, 6000) * np.exp(-T(0.05) * 90), 1.0), (0, tone(220, 0.1, 35, 'tri'), 0.7)]), 0.75)
save('target', mix(0.35, [(0, thock(0.6), 0.6), (0, bell(1760, 0.33, 10), 0.8)]), 0.75)
save('lane', mix(0.22, [(0, tone(1175, 0.1, 18), 0.8), (0.07, tone(1568, 0.14, 16), 0.8)]), 0.6)
save('launch', mix(0.45, [(0, tone(70, 0.4, 9, 'tri', 3.5), 0.7), (0, band(0.4, 400, 3000) * np.exp(-T(0.4) * 9), 0.5), (0, thock(), 0.9)]))
save('drain', mix(0.9, [(0, tone(520, 0.8, 3.2, 'tri', 0.25), 0.8), (0.1, tone(390, 0.7, 3.5, 'sine', 0.25), 0.5)]), 0.7)
save('saved', mix(0.6, [(i * 0.09, bell(f, 0.3, 10), 0.7) for i, f in enumerate([784, 988, 1175, 1568])]), 0.7)
save('saucer', mix(0.7, [(0, thock(0.7), 0.7)] + [(0.05 + i * 0.07, tone(f, 0.16, 14), 0.6) for i, f in enumerate([523, 659, 784, 1047, 1319, 1568])]), 0.7)
save('kick', mix(0.16, [(0, thock(), 1.0), (0, tone(160, 0.12, 28, 'tri', 2.0), 0.8)]))
save('bonus', mix(0.7, [(i * 0.1, bell(f, 0.35, 9), 0.7) for i, f in enumerate([1047, 1319, 1568, 2093])]), 0.7)
save('multiball', mix(1.5, [(i * 0.11, bell(f, 0.45, 7), 0.7) for i, f in enumerate([523, 659, 784, 1047, 784, 1047, 1319, 1568, 2093])] + [(0, band(1.2, 3000, 9000) * np.linspace(0, 1, int(SR * 1.2)) ** 2 * 0.4, 0.5)]), 0.8)
save('extra', mix(1.0, [(i * 0.12, bell(f, 0.5, 6), 0.7) for i, f in enumerate([784, 1175, 1568, 2349])]), 0.75)
save('tilt', mix(0.9, [(0, tone(82, 0.85, 2.0, 'square'), 0.8), (0, tone(87, 0.85, 2.0, 'square'), 0.6)]), 0.7)
save('nudge', mix(0.15, [(0, tone(60, 0.14, 22), 1.0), (0, thock(0.5), 0.5)]), 0.8)
save('gameover', mix(1.6, [(i * 0.22, bell(f, 0.7, 4.5), 0.7) for i, f in enumerate([784, 659, 523, 392])]), 0.75)
save('start', mix(0.9, [(i * 0.08, bell(f, 0.4, 8), 0.7) for i, f in enumerate([392, 523, 659, 784, 1047, 1319])]), 0.75)
