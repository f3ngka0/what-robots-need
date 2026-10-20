"""beats.py — generate js/beats.js + data/beats.json: measured, listener-accurate accents.

The .lrc grid marks *words*, not *sounds*: this song's grid drifts up to +-0.35 s
from the real vocal onset, and the story beats are not where the grid says
("Boom" really explodes at 31.59 s, the LRC says 31.83).

So: everything visual that is meant to land on a beat reads from this measured
map.  Output is a plain JS assignment (window.BEATS) so the render page loads it
synchronously with the other <script> tags - no fetch, no load-order race.
"""
import json
import subprocess

import numpy as np

MP3 = r"D:\code\video\AWAAWA - WHAT ROBOTS NEED.mp3"
OUT_JS = r"D:\code\video\mv\js\beats.js"
OUT_JSON = r"D:\code\video\mv\data\beats.json"
SR = 44100
WIN = 1024
HOP = 441               # 10 ms analysis hop
FPS = 100               # analysis frames per second

LRC = [
    8.88, 12.24, 13.35, 14.37, 16.59, 17.61, 21.27, 27.63, 28.65, 31.83, 32.07, 36.03,
    37.02, 39.21, 41.52, 46.77, 50.73, 57.12, 59.16, 63.63, 67.62, 73.95, 84.66, 88.17,
    90.24, 92.85, 96.75, 97.35, 99.90, 103.38, 104.43, 107.49, 107.85, 111.81, 112.86,
    115.05, 116.01, 117.09, 134.13, 138.87, 143.07, 147.30, 153.09, 159.15, 161.79,
    163.35, 167.55, 172.59, 176.22, 177.90, 184.38, 189.39, 191.28, 197.82, 201.24,
    206.22, 209.88, 212.31, 221.79, 226.95,
]

ACTS = [("act1", 0.0, 17.6), ("act2", 17.6, 41.2), ("act3", 41.2, 84.6),
        ("act4", 84.6, 152.0), ("act5", 152.0, 249.0)]


# --------------------------------------------------------------------------- io
def decode():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", MP3, "-ac", "2", "-ar", str(SR),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    st = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
    mid = (st[:, 0] + st[:, 1]) * 0.5
    side = (st[:, 0] - st[:, 1]) * 0.5
    return mid, side, mid - 0.92 * side


def band_db(sig, lo, hi):
    freqs = np.fft.rfftfreq(WIN, 1 / SR)
    m = (freqs >= lo) & (freqs < hi)
    hann = np.hanning(WIN)
    n = (len(sig) - WIN) // HOP
    out = np.zeros(n)
    for i in range(n):
        sp = np.abs(np.fft.rfft(sig[i * HOP:i * HOP + WIN] * hann)) ** 2
        out[i] = sp[m].sum()
    return 10 * np.log10(out + 1e-9)


def norm01(a, lo=3, hi=99.5):
    a = np.asarray(a, dtype=np.float64)
    l, h = np.percentile(a, lo), np.percentile(a, hi)
    return np.clip((a - l) / max(1e-9, h - l), 0, 1)


def flux(db, smooth=3):
    f = np.maximum(0.0, np.diff(db, prepend=db[0]))
    return np.convolve(f, np.ones(smooth) / smooth, mode="same")


def t2i(t):
    return int(round(t * FPS))


def i2t(i):
    return round(i / FPS, 3)


# ------------------------------------------------------------------ peak picker
def pick_peaks(sig, thr, minsep, t0=0.0, t1=1e9, weak_minsep=None, weak_thr=None):
    """Descending greedy pick with a minimum separation, in *seconds*.

    A single plosive can span several analysis frames, so neighbouring frames of
    the SAME grunt must collapse.  But two genuinely separate grunts can be only
    ~0.25 s apart, so a flat separation would swallow the weaker one.  Frames
    that are much weaker than the peak are therefore merged with a tighter
    separation window.
    """
    lo, hi = max(0, t2i(t0)), min(len(sig), t2i(t1))
    seg = sig[lo:hi]
    order = np.argsort(seg)[::-1]
    out, out_v = [], []
    for j in order:
        if seg[j] < thr:
            break
        t = i2t(lo + j)
        v = float(seg[j])
        merged = False
        for k, o in enumerate(out):
            sep = minsep
            # 只有「两帧都属于弱峰」时才收紧间隔；任何一方足够强就正常合并
            if weak_minsep is not None:
                wt = weak_thr if weak_thr is not None else thr * 2
                if v < wt and out_v[k] < wt:
                    sep = weak_minsep
            if abs(t - o) <= sep:
                merged = True
                break
        if not merged:
            out.append(t)
            out_v.append(v)
    return sorted(out)


# ------------------------------------------------------------------------ main
def main():
    print("decoding", MP3)
    mono, side, vox = decode()
    print(f"  {len(mono) / SR:.3f}s")

    # NB: normalise by percentile, never by max - the song's single loudest
    # transient (the final cutoff at 248.95 s) would squash everything else to
    # nothing and the peak picker would then find exactly one "hit".
    vox_flux_n = norm01(flux(band_db(vox, 250, 5000)))
    hit_flux_n = norm01(flux(band_db(mono, 20, 12000), 2), 5, 99.8)
    grunt_n = norm01(band_db(mono, 150, 900), 5, 99.8)
    sub_n = norm01(band_db(mono, 20, 80), 5, 99.5)

    # ---- 1. global LRC offset -------------------------------------------------
    def comb(off):
        s, n = 0.0, 0
        for t in LRC:
            i = t2i(t + off)
            if 2 <= i < len(vox_flux_n) - 2:
                s += float(vox_flux_n[i - 2:i + 3].max())
                n += 1
        return s / max(1, n)

    grid = np.arange(-0.40, 0.401, 0.01)
    scores = [comb(o) for o in grid]
    g_off = round(float(grid[int(np.argmax(scores))]), 3)
    print(f"global lrc offset = {g_off:+.2f}s")

    # ---- 2. per-line measured onset -----------------------------------------
    # 关键约束：每句至少驻留 MIN_HOLD 秒，且搜索下界不得低于「上一句起音 +
    # MIN_HOLD」。否则 flux 会捡到上一句的尾音（"Boom" 的 oo 会被当成
    # "Dropping bombs" 的起音），字幕就会变成一帧一闪。
    MIN_HOLD = 0.30
    lines, prev = [], -1.0
    for t in LRC:
        lo = t2i(max(t - 0.24, prev + MIN_HOLD if prev > 0 else t - 0.24))
        hi = t2i(t + 0.18)
        lo = max(1, min(lo, hi - 1))
        hi = min(len(vox_flux_n) - 2, max(hi, lo + 1))
        k = lo + int(np.argmax(vox_flux_n[lo:hi + 1]))
        off = 0.0
        if float(vox_flux_n[k]) >= 0.16:
            off = (k - t2i(t)) / FPS
            # 只有「明显但不过分」的偏移才采信；太小=本来对得上，太大=检测跑偏
            if abs(off) < 0.06 or abs(off) > 0.28:
                off = 0.0
        onset = round(max(t + off, prev + MIN_HOLD), 3)
        prev = onset
        lines.append({"t": t, "onset": onset, "off": round(onset - t, 3)})

    # ---- 2b. 人工校正：爆破音开头的词，起音是「辅音」不是「元音」 ----
    # "Boom" 的 /b/ 在 31.59 s 炸开，而元音 oo 到 31.85 才起来。
    # 观众听到的是 31.59 那一声，字幕必须跟着那一声。
    OVERRIDE = {}
    b0, b1 = t2i(31.30), t2i(32.10)
    OVERRIDE[9] = i2t(b0 + int(np.argmax(grunt_n[b0:b1])))     # index 9 = "Boom"
    for i, v in OVERRIDE.items():
        if 0 <= i < len(lines):
            lines[i]["onset"] = round(max(v, lines[i - 1]["onset"] + MIN_HOLD if i else v), 3)
            lines[i]["off"] = round(lines[i]["onset"] - lines[i]["t"], 3)
    # 重新保证严格递增
    for i in range(1, len(lines)):
        if lines[i]["onset"] < lines[i - 1]["onset"] + MIN_HOLD:
            lines[i]["onset"] = round(lines[i - 1]["onset"] + MIN_HOLD, 3)
            lines[i]["off"] = round(lines[i]["onset"] - lines[i]["t"], 3)

    # ---- 3. broadband transients --------------------------------------------
    hits = pick_peaks(hit_flux_n, 0.30, 0.16)
    # story-level accents only: loud, well separated -> safe to attach a big VFX
    big = pick_peaks(hit_flux_n, 0.55, 0.55)
    print(f"hits: {len(hits)}  big: {len(big)}")

    # ---- 4. arrangement drops (sustained rms rise) --------------------------
    env = np.sqrt(np.convolve(mono ** 2, np.ones(441) / 441, mode="same"))[::441]
    env_db = 20 * np.log10(np.maximum(env, 1e-7))
    sm = np.convolve(env_db, np.ones(12) / 12, mode="same")   # 120 ms
    drops = []
    for i in range(2, len(sm) - 1):
        rise = sm[i] - sm[max(0, i - 5)]                       # 500 ms look-back
        if rise > 3.0 and sm[i] >= sm[i - 1] and all(abs(i / FPS - o) > 1.2 for o in drops):
            drops.append(round(i / FPS, 2))
    print(f"drops: {drops}")

    # ---- 5. story beats ------------------------------------------------------
    b0, b1 = t2i(31.30), t2i(32.10)
    boom_hit = i2t(b0 + int(np.argmax(grunt_n[b0:b1])))
    boom_windup = 30.95
    boom_after = [t for t in hits if boom_hit + 0.05 <= t <= boom_hit + 2.2]
    print(f"boom: windup {boom_windup} hit {boom_hit} after {boom_after}")

    # oink: the real nasal plosives inside "Oink oink".
    # Authoritative source is data/audio.json's grunt band - that is the exact
    # array the renderer reads at run time, so the pulses the picture uses and the
    # envelope the audio plays can never disagree.  NOTE its frame rate is 60 fps,
    # not this script's 100 fps analysis rate, so it gets its own index scale.
    AD = json.load(open(r"D:\code\video\mv\data\audio.json", encoding="utf-8"))
    grunt_rt = np.array(AD["grunt"])
    AFPS = float(AD["fps"])
    lo, hi = int(96.30 * AFPS), int(99.40 * AFPS)
    oinks = []
    for j in np.argsort(grunt_rt[lo:hi])[::-1]:
        if grunt_rt[lo + j] < 0.45:
            break
        t = round((lo + j) / AFPS, 3)
        # one plosive rings ~60-80 ms -> merge closer than 0.085 s
        if all(abs(t - o) > 0.085 for o in oinks):
            oinks.append(t)
    oinks.sort()
    print(f"oinks: {len(oinks)} {oinks}")

    # ---- 6. per-act accents -------------------------------------------------
    accents, bigacc = {}, {}
    for name, a, b in ACTS:
        accents[name] = [t for t in hits if a <= t < b]
        bigacc[name] = [t for t in big if a <= t < b]

    # ---- 7. kick-style pulse map for the low end (used for breathing) ------
    kicks = pick_peaks(sub_n, 0.80, 0.22)
    data = {
        "fps": FPS,
        "globalOffset": g_off,
        "lines": lines,
        "hits": hits,
        "big": big,
        "drops": drops,
        "kicks": kicks,
        "boom": {"windup": boom_windup, "hit": boom_hit, "after": boom_after},
        "oinks": oinks,
        "accents": accents,
        "accentsBig": bigacc,
    }

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    js = ("/* AUTO-GENERATED by tools/beats.py from the decoded mp3.\n"
          "   Measured beat map: do not hand-edit.\n"
          "   lines[i].onset  = real vocal onset of .lrc line i (seconds)\n"
          "   hits            = broadband transients\n"
          "   drops           = arrangement energy rises\n"
          "   kicks           = low-end (20-80 Hz) pulse times\n"
          "   boom            = where the explosion actually happens\n"
          "   oinks           = the real pig-grunt plosives\n"
          "   accents.actN    = transients inside act N */\n"
          "window.BEATS = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write(js)

    print("\nper-line offset:")
    print(" ".join(f"{l['off']:+.2f}" for l in lines))
    print("\nwrote", OUT_JS, "and", OUT_JSON)
    print("oinks", oinks, "boom", data["boom"])


main()
