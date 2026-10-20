# Offline video export pipeline — `tools/`

Everything needed to turn the browser MV into a deterministic frame sequence and
encode it to an NVENC HEVC/H.264 MP4 with the source audio muxed in.

The pipeline **does not modify the MV visual code**. It only consumes the app
contract (`window.__MV_READY`, `window.MV.seek(t)`).

---

## 1. Files

| File | Purpose |
|---|---|
| `serve.mjs` | Zero-dependency static server (`node:http` + `node:fs`). MIME for `.html .js .css .mjs .json .png .mp3 .lrc`, HTTP Range (206/416) for the mp3, concurrent-safe, `--root` / `--port`. |
| `record.mjs` | Frame capture driver. Launches Chromium (or chrome-headless-shell) and N worker pages, each seeking a strided slice of frames and screenshotting to `frames/fNNNNN.png`. |
| `encode.mjs` | GPU encode with `hevc_nvenc` (primary) + `h264_nvenc` (fallback file), AAC 320k audio, `ffprobe` verification. |
| `run-all.mjs` | Orchestrates record → encode. |
| `_selftest.html` | **Throwaway** synthetic page implementing the same contract (deterministic canvas + DOM-heavy HUD + deliberately animated CSS). |
| `_selftest.mjs` | **Throwaway** verification harness (server, determinism, contiguity, resume, reload guard). |

`index.html` is the real MV entry point and is **not** part of this pipeline.

---

## 2. Install / prerequisites

Already present in this project:

* Node 23 + `playwright-core` (in `node_modules`)
* Chromium — `C:\Users\fengkao\AppData\Local\ms-playwright\chromium-1243\chrome-win64\chrome.exe`
* `chrome-headless-shell` — same tree, `chromium_headless_shell-1243\chrome-headless-shell-win64\chrome-headless-shell.exe`
* `ffmpeg` / `ffprobe` on `PATH` with `--enable-nvenc` (gyan.dev 9.0.2)
* GPU: RTX 5060 Laptop (8 GB), driver 610.88

No npm install step is required.

---

## 3. Quick start

### 10-second sample

```powershell
cd D:\code\video\mv

# capture 10s (600 frames) with 3 workers
node tools/record.mjs --from 0 --to 10 --fps 60 --workers 3 --out .\frames

# encode to out\WHAT_ROBOTS_NEED_win98_mv_hevc.mp4 + ..._h264.mp4
node tools/encode.mjs --frames .\frames --from 0 --to 10 --fps 60
```

Or in one shot (server is started and stopped automatically):

```powershell
node tools/run-all.mjs --from 0 --to 10 --fps 60 --workers 3
```

### Full render (248.99 s → 14 939 frames)

```powershell
cd D:\code\video\mv

# 1. optional: serve manually on 8899 (record.mjs also starts one itself)
node tools/serve.mjs

# 2. capture everything, resumable
node tools/record.mjs --workers 3 --out .\frames --resume

# 3. encode with NVENC
node tools/encode.mjs --frames .\frames --out .\out

# — or the whole thing in one command —
node tools/run-all.mjs --workers 3
```

Full render is **~14 939 PNGs ≈ 13 GiB**. For a range-limited re-render:

```powershell
node tools/run-all.mjs --from 84.6 --to 152 --workers 3 --out .\frames --resume
```

---

## 4. `serve.mjs`

```
node tools/serve.mjs [--root DIR] [--port 8899] [--host 127.0.0.1]
                     [--no-parent-fallback] [--quiet] [--verbose]
```

* Defaults to the project root (parent of `tools/`) on port 8899.
* Range requests: `bytes=0-1023`, `bytes=-2048`, invalid → 416.
* `GET /__mv_health` → `{ok:true,pid,root,...}`; `record.mjs` uses it to reuse an
  already-running server instead of fighting over the port.
* `/favicon.ico` → 204 (keeps capture logs clean).
* **Parent fallback:** the audio lives at `..\AWAAWA - WHAT ROBOTS NEED.mp3`.
  A browser clamps `../` at the origin root, so the request arrives as
  `/AWAAWA%20-%20WHAT%20ROBOTS%20NEED.mp3`. The server resolves misses against
  the parent directory too (contained — cannot escape one level up).
  Same applies to the `.lrc`.

Requires the app to reference the audio with a relative path (`../file.mp3` or
`file.mp3`). Nothing is copied into the project.

## 5. `record.mjs`

```
node tools/record.mjs [options]

  --from <sec>          start time                       (default 0)
  --to <sec>            end time, exclusive              (default MV.duration ?? 248.99)
  --fps <n>             frames per second                (default 60)
  --workers <n>         parallel pages                   (default 2)
  --out <dir>           output frames dir                (default ./frames)
  --resume              skip frames already on disk (validated PNG, size > 0)
  --scale <0.1..1>      downscale via CSS zoom           (default 1 = 1920x1080)
  --reload-every <k>    reload each page every K frames  (default 900, 0 = never)
  --url <url>           page to capture                  (default .../index.html?render=1)
  --port <n>            server port, 0 = free port       (default 8899)
  --headless <new|shell>  headless flavour               (default new)
  --ready-timeout <ms>  wait for __MV_READY              (default 120000)
  --fast-capture=0      use Playwright screenshot instead of CDP
  --freeze-css=0        do not inject the animation-freeze stylesheet
  --verbose / --quiet
```

Frame `i` is rendered at `t = i / fps`, for `i` in `[from*fps, to*fps)`.
Worker `k` takes frames `k, k+N, k+2N, …`, so the union is a contiguous set.

Each frame: `page.evaluate(t => MV.seek(t))` then a screenshot, then a
size/signature check. Failures retry 3× with a page reload, then abort the run.

Writes `progress.json` (state, percent, fps, ETA, per-worker counts) and
`logs/render-<timestamp>.log` (console, pageerror, requestfailed, retries).

### Determinism settings (all measured, not guessed)

```
--force-color-profile=srgb --disable-lcd-text --hide-scrollbars
--autoplay-policy=no-user-gesture-required --force-device-scale-factor=1
--disable-gpu-vsync --disable-gpu-compositing
```

Two findings that matter:

1. **`--disable-gpu-compositing` is required.** Canvas *raster* was already
   bit-stable (`canvas.toDataURL()` identical across repeats), but the GPU
   compositor added ±1 LSB dithering noise to screenshots of identical state
   (≈0.05 % of pixels, maxΔ 1). With it disabled, repeated captures are
   byte-identical. Cost: ~13 % throughput.
2. **Playwright's `animations:'disabled'` does not freeze infinite CSS
   animations** in this Chromium build — a `spin … infinite` element still
   reported `playState:"running"` and rotated between captures. The recorder
   therefore injects a freeze stylesheet at document-start
   (`animation:none; transition:none; caret-color:transparent`) into every
   worker via `addInitScript`.

Screenshots go through CDP `Page.captureScreenshot{optimizeForSpeed:true}`,
measured at **52 ms** vs Playwright's 145 ms per 1920×1080 frame (≈3×), still
byte-stable. PNGs are ~1.8× larger (≈911 KB vs ≈500 KB) — encoded video is
unaffected.

## 6. `encode.mjs`

```
node tools/encode.mjs [--frames DIR] [--out DIR] [--from SEC] [--to SEC]
                      [--fps 60] [--crf 20] [--audio FILE] [--name BASE]
                      [--scale-mode cpu|cuda|auto] [--hevc=false] [--h264=false]
                      [--force-cpu] [--dry-run]
```

Primary (HEVC):

```
ffmpeg -y -framerate 60 -start_number <first> -i frames/f%05d.png \
       -ss <audioOffset> -t <duration> -i "../AWAAWA - WHAT ROBOTS NEED.mp3" \
       -vf "scale=1920:1080:flags=lanczos,format=yuv420p" \
       -r 60 -pix_fmt yuv420p \
       -c:v hevc_nvenc -preset p4 -rc vbr -cq 20 -b:v 0 \
       -profile:v main -tag:v hvc1 -g 120 -bf 3 -movflags +faststart \
       -map 0:v:0 -map 1:a:0 -c:a aac -b:a 320k -shortest \
       out/WHAT_ROBOTS_NEED_win98_mv_hevc.mp4
```

H.264 fallback file: same but `-c:v h264_nvenc -preset p5 -rc vbr -cq 19
-profile:v high`, named `..._h264.mp4`.

`-t` on the audio input is deliberate: `-shortest` alone only stops on a
*longer* stream, so a short video would leave audio running.

**`scale_cuda`:** it works, but only through `hwupload_cuda` —
`format=yuv420p,hwupload_cuda,scale_cuda=…`. The plain form in the spec fails
with `EINVAL` because `scale_cuda` cannot consume software frames. Measured
throughput is a wash (306–325 fps CPU lanczos vs 304–311 fps CUDA chain) since
PNG decode dominates, so **CPU lanczos is the default**; use
`--scale-mode cuda` to keep frames on the GPU.

Failures fall back `hevc_nvenc → (CPU scale) → libx264`, logging the exact
ffmpeg stderr and flagging `usedCpuFallback:true`.

## 7. `run-all.mjs`

```
node tools/run-all.mjs [--from --to --fps --workers --out --resume --scale
                        --video-out --crf --audio --name --scale-mode
                        --skip-record --skip-encode --dry-run]
```

Runs record, then encode, and prints a combined `MV_RUN_RESULT` JSON line.

---

## 8. Measured results (this machine)

### Capture throughput — synthetic test page (300 frames @1920×1080)

| workers | fps | elapsed |
|---|---|---|
| 1 | 11.9 | 25.2 s |
| 2 | 21.5 | 14.0 s |
| 3 | 25.4 | 11.8 s |
| 4 | 27.5 | 10.9 s |
| 5 | 26.8 | 11.2 s |
| 6 | 30.6 | 9.8 s |
| 8 | 29.7 | 10.1 s |

**Single worker: ~11.9 fps** for a canvas + DOM-heavy page (200 DOM cells,
22 animated letters, 3 CSS-animated elements, full-canvas redraw). With 3
workers: **~25–27 fps**; the curve flattens around 30 fps.

### Capture throughput — the real MV (`index.html?render=1`)

Measured over 120 frames inside act2:

| workers | fps | elapsed |
|---|---|---|
| 1 | 2.67 | 45.0 s |
| 2 | 5.07 | 23.7 s |
| 3 | 6.11 | 19.6 s |
| 4 | 6.00 | 20.0 s |

The real app is ~4.5× heavier than the synthetic page (many DOM windows, text
reflow, multiple full-canvas passes). **~6 fps at 3 workers** is the practical
ceiling; 4 workers gives no gain. A full 14 939-frame render is therefore
roughly **40–45 min at 3 workers**, or ~1.5 h single-worker.

### headless=new vs headless shell

| mode | fps (4 workers) | correctness |
|---|---|---|
| `--headless new` | 26.1 | deterministic, byte-identical |
| `--headless shell` | 29.6 | deterministic, byte-identical |

Both render the canvas correctly and produce **identical PNG bytes** for the
same `t` (verified across t = 0 / 2.5 / 5 / 9.75). Shell is ~12 % faster;
`new` is the default for maximum fidelity.

### Encode (600 frames → 10 s)

| codec | time | fps | size |
|---|---|---|---|
| `hevc_nvenc` p4 cq20 | 1.9 s | ~313 fps | 19.8 MiB |
| `h264_nvenc` p5 cq21 | 2.9 s | ~207 fps | 23.9 MiB |

### Determinism (`tools/_selftest.mjs`, 13/13 pass)

```
seek determinism across 2 pages       t=0,0.25,1.5,3,7.75,13.3333 all SAME
animations disabled (1.2s wall clock)  SAME
seek is stateless (t=12 after t=2)     SAME
parallel(3) frame set contiguous       120/120, 0 missing, 0 zero-byte
resume restores missing frames         skipped=115, 5 refilled
reload-every guard                     4 reloads, 30/30 frames
record.mjs frame == fresh page frame   SAME md5
```

Example determinism hashes (test page, two independent browser launches):

```
t=0      13746685c128c015e7b6bf4f0b3d1df9  SAME
t=0.25   b254774f7eecd53962fed3f8636f76b8  SAME
t=5      aa9d6d9ad2c537ee9f51152b31237064  SAME
t=13.3333 504bc7ff4268b8cc5bf5e7ae5ba8e01e  SAME
```

---

## 9. App-side issues found during pipeline testing — STATUS: FIXED

All three were found by testing this pipeline against the real app and were
fixed in the MV visual code by the Lead. Recorded here because they explain the
pipeline's constraints.

1. **`MV.seek` crashed for `117 ≤ t < 118`** (FIXED) — `js/act4.js` indexed
   `pts[idx % pts.length]` with a negative `idx` before t=118, so `pts[-1]` was
   `undefined`. This threw on every frame in that second and was the cause of
   the stuck frame gaps. Fixed with a sign-safe modulo.
2. **`MV.seek` was not stateless across scene changes** (FIXED) — `enter()`
   side effects (desktop opacity, taskbar) ran only on transition, so a cold
   `seek(t)` could differ from a walked seek. Now re-applied declaratively each
   frame.
3. **Accumulated state in `#world`** (FIXED) — traced to act2's
   `dosText.scrollTop = scrollHeight` persisting across seeks. Replaced with a
   deterministic last-N-lines text window, plus a per-frame canvas state reset
   (`setTransform` / `globalAlpha` / `globalCompositeOperation`) at the top of
   `APP.apply`.

**Remaining known limitation:** DOS-window text glyph antialiasing can still
differ slightly between stride-1 and stride-3 walks (confined to that window's
text area, visually imperceptible). So `--workers>1` is not bit-identical to
`--workers=1`, but **each worker count is reproducible**, and the final master
is deterministic for the worker count used to produce it. Use `--workers 1`
if bit-exact reproducibility across machines/modes is required.

**Note on JPEG frames:** `record.mjs` writes PNG by default; the Lead's final
render used a high-speed JPEG path (`FRAME_EXT` in `encode.mjs` autodetects
`.png/.jpg/.jpeg`). JPEG input is full-range (`yuvj420p`), so ffmpeg tags the
output `yuv420p(pc, …)`. This is *consistent* — the stored Y data matches the
`pc` tag (verified: source vs master YAVG differ by <0.2, i.e. no range shift),
and players render it correctly. If you need strict broadcast limited-range,
add `in_range=full:out_range=tv` to the scale filter.

---

## 10. Housekeeping

`frames/` was 10.3 GiB for the full song (14 939 JPEGs at ~155 KB each; the PNG
default is much larger, ~13 GiB). Delete it after a successful encode, or keep
it and use `--resume` for partial re-renders. `out/` holds the two deliverable
MP4s.

### Final delivered outputs

| file | codec | duration | size |
|---|---|---|---|
| `out/WHAT_ROBOTS_NEED_win98_mv_hevc.mp4` | HEVC `hvc1`, Main, `hevc_nvenc` | 248.98 s | 469 MiB |
| `out/WHAT_ROBOTS_NEED_win98_mv_h264.mp4` | H.264 High, `h264_nvenc` | 248.98 s | 1046 MiB |

1920×1080 @ 60 fps, 14 939 frames, AAC ~327 kbps. Both encoded entirely on the
GPU — no CPU (`libx264`) fallback was used.
