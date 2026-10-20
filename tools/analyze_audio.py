"""Precompute deterministic per-frame audio envelope (60fps) for the MV.

Base bands (unchanged, backwards compatible):
  bass 20-120 Hz, mid 120-2000 Hz, high 2000-12000 Hz, rms

Added bands (used by the new audio-reactive accents):
  sub    20-80 Hz      -> kick / boom body
  grunt  150-900 Hz    -> the pig "oink" snort
  vocal  900-4000 Hz   -> sung syllables
  flux   broadband onset strength (0..1)  -> transient detector

Everything is a pure function of the decoded mp3, so the render stays
frame-deterministic.
"""
import json
import subprocess

import numpy as np

MP3 = r"D:\code\video\AWAAWA - WHAT ROBOTS NEED.mp3"
OUT = r"D:\code\video\mv\data\audio.json"
FPS = 60

pcm = subprocess.run(
    ["ffmpeg", "-v", "error", "-i", MP3, "-ac", "1", "-ar", "48000", "-f", "f32le", "-"],
    capture_output=True, check=True).stdout
x = np.frombuffer(pcm, dtype=np.float32).astype(np.float32)
sr = 48000
dur = len(x) / sr
print(f"decoded {dur:.3f}s  samples={len(x)}")

hop = int(sr / FPS)
n = int(dur * FPS)
win = 2048
freqs = np.fft.rfftfreq(win, 1 / sr)
bass_m = (freqs >= 20) & (freqs < 120)
mid_m = (freqs >= 120) & (freqs < 2000)
high_m = (freqs >= 2000) & (freqs < 12000)
hann = np.hanning(win).astype(np.float32)

# new bands
sub_m = (freqs >= 20) & (freqs < 80)
grunt_m = (freqs >= 150) & (freqs < 900)
vocal_m = (freqs >= 900) & (freqs < 4000)

bass, mid, high, rms = [], [], [], []
sub, grunt, vocal = [], [], []
tot_db = []
for i in range(n):
    c = i * hop
    seg = x[max(0, c - win // 2): max(0, c - win // 2) + win]
    if len(seg) < win:
        seg = np.pad(seg, (0, win - len(seg)))
    r = float(np.sqrt(np.mean(seg ** 2)))
    sp = np.abs(np.fft.rfft(seg * hann)) ** 2
    bass.append(float(sp[bass_m].sum()))
    mid.append(float(sp[mid_m].sum()))
    high.append(float(sp[high_m].sum()))
    rms.append(r)
    sub.append(float(sp[sub_m].sum()))
    grunt.append(float(sp[grunt_m].sum()))
    vocal.append(float(sp[vocal_m].sum()))
    tot_db.append(10.0 * np.log10(float(sp.sum()) + 1e-9))


def norm(a, lo=5, hi=99.5):
    a = np.array(a, dtype=np.float64)
    l, h = np.percentile(a, lo), np.percentile(a, hi)
    a = np.clip((a - l) / max(1e-12, h - l), 0, 1)
    # slight gamma so quiet parts still read
    return (a ** 0.85).tolist()


# broadband onset strength: positive spectral-flux on the total energy
tot = np.array(tot_db)
flux = np.maximum(0.0, np.diff(tot, prepend=tot[0]))
flux = np.convolve(flux, np.array([0.2, 0.6, 0.2]), mode="same")

# smooth bass a touch for a punchy-but-stable envelope
b = np.array(norm(bass))
k = np.array([0.25, 0.5, 0.25])
b = np.convolve(b, k, mode="same")
data = {
    "fps": FPS, "duration": dur,
    "bass": [round(v, 4) for v in b.tolist()],
    "mid": [round(v, 4) for v in norm(mid)],
    "high": [round(v, 4) for v in norm(high)],
    "rms": [round(v, 4) for v in norm(rms)],
    "sub": [round(v, 4) for v in norm(sub)],
    "grunt": [round(v, 4) for v in norm(grunt)],
    "vocal": [round(v, 4) for v in norm(vocal)],
    "flux": [round(v, 4) for v in norm(flux)],
}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, separators=(",", ":"))
print("wrote", OUT, "frames", n)

# ---- report: the accents the visuals will lock on to ----
def at(arr, t):
    i = int(round(t * FPS))
    return arr[max(0, min(len(arr) - 1, i))]


def peaks(arr, t0, t1, thr=0.55, minsep=0.20):
    i0, i1 = int(t0 * FPS), int(t1 * FPS)
    out = []
    order = np.argsort(np.array(arr[i0:i1]))[::-1]
    for kk in order:
        if arr[i0 + kk] < thr:
            break
        t = (i0 + kk) / FPS
        if all(abs(t - o) > minsep for o in out):
            out.append(t)
        if len(out) >= 24:
            break
    return sorted(out)


print("\n[sections]  time  bass  mid  high  grunt flux")
for s in range(0, int(dur), 8):
    a, z = s * FPS, min((s + 8) * FPS, n)
    print(f"{s:3d}s  bass={np.mean(data['bass'][a:z]):.2f} mid={np.mean(data['mid'][a:z]):.2f} "
          f"high={np.mean(data['high'][a:z]):.2f} grunt={np.mean(data['grunt'][a:z]):.2f} "
          f"flux={np.mean(data['flux'][a:z]):.2f}")

print("\n[accents] strongest flux onsets:")
print(" ".join(f"{t:.2f}" for t in peaks(data["flux"], 0, dur, 0.55, 0.25)))

print("\n[oink] grunt-band peaks 94-101s:")
print(" ".join(f"{t:.2f}" for t in peaks(data["grunt"], 94.0, 101.0, 0.55, 0.18)))
print("[oink] grunt band per 100ms 95.5-99.5s:")
for t in np.arange(95.5, 99.5, 0.1):
    print(f"  {t:5.1f} {at(data['grunt'], t):.2f} {'#' * int(at(data['grunt'], t) * 40)}")

print("\n[boom] flux/grunt/bass 31.4-33.2s:")
for t in np.arange(31.4, 33.2, 0.05):
    print(f"  {t:5.2f} flux={at(data['flux'], t):.2f} sub={at(data['sub'], t):.2f} "
          f"grunt={at(data['grunt'], t):.2f} vocal={at(data['vocal'], t):.2f}")
