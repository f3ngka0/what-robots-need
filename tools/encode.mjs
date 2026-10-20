#!/usr/bin/env node
/**
 * encode.mjs — turn a PNG frame sequence + the source mp3 into the final video
 * using NVIDIA NVENC (GPU). libx264/libx265 are only ever a last-resort fallback
 * and are reported loudly when used.
 *
 *   node tools/encode.mjs [options]
 *
 *   --frames <dir>        directory of f00000.png ... (default <cwd>/frames)
 *   --from <sec>          first frame time (default 0)
 *   --to <sec>            last frame time, exclusive (default: from frame count)
 *   --fps <n>             frame rate (default 60)
 *   --out <dir>           output directory (default <cwd>/out)
 *   --crf <n>             quality knob: hevc cq / h264 cq (default 20)
 *   --audio <file>        audio source (default ../AWAAWA - WHAT ROBOTS NEED.mp3)
 *   --name <base>         output basename (default WHAT_ROBOTS_NEED_win98_mv)
 *   --hevc / --no-hevc    produce the HEVC file (default on)
 *   --h264 / --no-h264    produce the H.264 file (default on)
 *   --force-cpu           skip NVENC entirely (not recommended)
 *   --dry-run             print the ffmpeg command(s) without running
 *
 * NVENC command (primary), per the project spec:
 *   hevc_nvenc -preset p4 -rc vbr -cq 20 -b:v 0 -pix_fmt yuv420p -profile:v main
 *              -tag:v hvc1 -movflags +faststart -g 120 -bf 3
 *   with -vf scale=1920:1080:flags=lanczos,format=yuv420p  (or scale_cuda when it works)
 */
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '..');
const DEFAULT_AUDIO = path.resolve(PROJECT_ROOT, '..', 'AWAAWA - WHAT ROBOTS NEED.mp3');
const DEFAULT_DURATION = 248.99;
const W = 1920, H = 1080;

function log(m) { process.stdout.write(m + '\n'); }
function warn(m) { process.stderr.write(m + '\n'); }
let FRAME_EXT = '.png';
const frameName = (i) => `f${String(i).padStart(5, '0')}${FRAME_EXT}`;

/** Boolean flag that also accepts "--flag=false" / "--flag 0" style values. */
function flag(v, dflt) {
  if (v === undefined || v === null) return dflt;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['false', '0', 'no', 'off', ''].includes(s)) return false;
  if (['true', '1', 'yes', 'on'].includes(s)) return true;
  return dflt;
}

function which(cmd) {
  const paths = (process.env.PATH || '').split(path.delimiter);
  const exts = (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';');
  for (const p of paths) {
    for (const ext of ['', ...exts]) {
      const f = path.join(p, cmd + ext);
      try { if (fs.statSync(f).isFile()) return f; } catch { }
    }
  }
  return null;
}

function runFfmpeg(args, label) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn('ffmpeg', args, { cwd: PROJECT_ROOT, windowsHide: true });
    let stderrTail = '';
    let stdout = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => {
      const s = d.toString();
      stderrTail = (stderrTail + s).slice(-20_000);
      // Surface progress lines only when they carry a frame counter.
      const m = /\r?\s*frame=\s*(\d+).*?(?:fps=\s*([\d.]+))?/.exec(s);
      if (m && process.stdout.isTTY) process.stdout.write(`\r[enc] ${label} frame=${m[1]} fps=${m[2] || '?'}   `);
    });
    child.on('error', (err) => resolve({ code: -1, stderr: String(err), stdout, ms: Date.now() - started }));
    child.on('close', (code) => {
      if (process.stdout.isTTY) process.stdout.write('\n');
      resolve({ code, stderr: stderrTail, stdout, ms: Date.now() - started });
    });
  });
}

function probe(file) {
  return new Promise((resolve) => {
    const child = spawn('ffprobe', [
      '-v', 'error', '-print_format', 'json',
      '-show_format', '-show_streams', file,
    ], { windowsHide: true });
    let out = '', err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => {
      if (code !== 0) return resolve({ ok: false, error: err });
      try {
        const j = JSON.parse(out);
        const v = (j.streams || []).find((s) => s.codec_type === 'video');
        const a = (j.streams || []).find((s) => s.codec_type === 'audio');
        resolve({ ok: true, json: j, video: v, audio: a, format: j.format });
      } catch (e) { resolve({ ok: false, error: String(e) }); }
    });
    child.on('error', (e) => resolve({ ok: false, error: String(e) }));
  });
}

async function countPngs(dir) {
  const names = await fsp.readdir(dir).catch(() => []);
  return names.filter((n) => /^f\d+\.(png|jpg|jpeg)$/i.test(n)).sort();
}

/** True when the encoder accepts the given source/format (fast probe). */
async function nvencAvailable(codec) {
  const args = [
    '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'testsrc2=s=256x144:d=0.1:r=10',
    '-pix_fmt', 'yuv420p', '-c:v', codec, '-f', 'null', '-',
  ];
  const r = await runFfmpeg(args, 'probe');
  return { ok: r.code === 0, stderr: r.stderr };
}

/**
 * Probe whether the GPU scale chain (hwupload_cuda -> scale_cuda) works on our
 * PNG decode source. scale_cuda alone cannot consume software frames, so the
 * upload filter must be part of the chain.
 */
async function scaleCudaWorks(firstFrame) {
  const args = [
    '-hide_banner', '-loglevel', 'error',
    '-f', 'image2', '-framerate', '60', '-i', firstFrame,
    '-vf', 'format=yuv420p,hwupload_cuda,scale_cuda=1920:1080:interp_algo=lanczos',
    '-c:v', 'hevc_nvenc', '-frames:v', '1', '-f', 'null', '-',
  ];
  const r = await runFfmpeg(args, 'scale_cuda probe');
  return { ok: r.code === 0, stderr: r.stderr };
}

/**
 * ffmpeg requires INPUT options before the input they apply to and OUTPUT
 * options after every input. Build the two groups separately.
 *
 * scale mode:
 *   'cpu'  -> scale=1920:1080:flags=lanczos (always works)
 *   'cuda' -> format=yuv420p,hwupload_cuda,scale_cuda=...  (frames stay on the GPU
 *             straight into nvenc, so no hwdownload is needed)
 */
function buildVideoArgs({ codec, cq, fps, startNumber, framesDir, scaleMode }) {
  const inputs = [
    '-framerate', String(fps),
    '-start_number', String(startNumber),
    '-i', path.join(framesDir, 'f%05d' + FRAME_EXT),
  ];
  let vf;
  if (scaleMode === 'cuda') {
    // PNG decodes to rgba8888 on the CPU; hwupload_cuda is required before any
    // scale_cuda filter (scale_cuda cannot consume software frames: EINVAL).
    // yuv420p conversion happens on the GPU, then nvenc accepts the hw frames.
    vf = 'format=yuv420p,hwupload_cuda,scale_cuda=1920:1080:interp_algo=lanczos';
  } else {
    vf = 'scale=1920:1080:flags=lanczos,format=yuv420p';
  }
  const vfArgs = ['-vf', vf, '-r', String(fps)];
  if (scaleMode !== 'cuda') vfArgs.push('-pix_fmt', 'yuv420p');
  let enc;
  if (codec === 'hevc_nvenc') {
    enc = ['-c:v', 'hevc_nvenc', '-preset', 'p4', '-rc', 'vbr', '-cq', String(cq), '-b:v', '0',
      '-profile:v', 'main', '-tag:v', 'hvc1', '-g', '120', '-bf', '3'];
  } else if (codec === 'h264_nvenc') {
    enc = ['-c:v', 'h264_nvenc', '-preset', 'p5', '-rc', 'vbr', '-cq', String(cq + 1), '-b:v', '0',
      '-profile:v', 'high', '-g', '120', '-bf', '3'];
  } else if (codec === 'libx264') {
    enc = ['-c:v', 'libx264', '-preset', 'slow', '-crf', String(cq), '-profile:v', 'high'];
  } else {
    throw new Error(`unknown codec ${codec}`);
  }
  return { inputs, outputs: [...vfArgs, ...enc, '-movflags', '+faststart'] };
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const framesDir = path.resolve(a.frames || path.join(PROJECT_ROOT, 'frames'));
  const outDir = path.resolve(a.out || path.join(PROJECT_ROOT, 'out'));
  const fps = Number(a.fps ?? 60);
  const cq = Number(a.crf ?? 20);
  const name = String(a.name || 'WHAT_ROBOTS_NEED_win98_mv');
  const audio = path.resolve(a.audio || DEFAULT_AUDIO);
  const wantHevc = a['no-hevc'] === true ? false : flag(a.hevc, true);
  const wantH264 = a['no-h264'] === true ? false : flag(a.h264, true);
  const forceCpu = flag(a.forceCpu, false);
  const dryRun = flag(a.dryRun, false);

  if (!fs.existsSync(framesDir)) throw new Error(`frames directory not found: ${framesDir}`);
  if (!fs.existsSync(audio)) throw new Error(`audio file not found: ${audio}`);
  if (!which('ffmpeg')) throw new Error('ffmpeg not found on PATH');
  if (!which('ffprobe')) throw new Error('ffprobe not found on PATH');

  const pngs = await countPngs(framesDir);
  if (pngs.length === 0) throw new Error(`no fNNNNN.png/jpg frames in ${framesDir}`);
  FRAME_EXT = path.extname(pngs[0]) || '.png';
  const firstIdx = Number(/^f(\d+)\.(png|jpg|jpeg)$/i.exec(pngs[0])[1]);
  const lastIdx = Number(/^f(\d+)\.(png|jpg|jpeg)$/i.exec(pngs[pngs.length - 1])[1]);

  const fromSec = Number(a.from ?? 0);
  const fromFrame = Math.max(firstIdx, Math.round(fromSec * fps));
  const toSec = a.to === undefined ? null : Number(a.to);
  const toFrame = toSec === null ? null : Math.min(lastIdx, Math.floor(toSec * fps) - 1);
  const startNumber = fromFrame;
  const videoFrames = (toFrame === null ? lastIdx : toFrame) - fromFrame + 1;
  if (videoFrames <= 0) throw new Error(`empty frame range ${fromFrame}..${toFrame}`);

  await fsp.mkdir(outDir, { recursive: true });

  // Detect gaps inside the requested window.
  const have = new Set(pngs.map((n) => Number(/^f(\d+)\.(png|jpg|jpeg)$/i.exec(n)[1])));
  const gaps = [];
  const endIdx = toFrame === null ? lastIdx : toFrame;
  for (let f = fromFrame; f <= endIdx; f++) if (!have.has(f)) gaps.push(f);
  if (gaps.length) {
    // A gap silently shortens the video (ffmpeg's image2 demuxer just stops at the
    // hole), so fail loudly instead of emitting an out-of-sync file.
    warn(`[enc] ERROR ${gaps.length} missing frame(s) in ${fromFrame}..${endIdx}; ` +
      `first: ${gaps.slice(0, 10).join(', ')}${gaps.length > 10 ? ', ...' : ''}`);
    warn(`[enc] Re-run record.mjs with --resume to fill the holes, then encode again.`);
    process.exitCode = 1;
    return;
  }

  const durationSec = videoFrames / fps;
  const audioFromSec = fromFrame / fps;
  log(`[enc] frames=${framesDir}`);
  log(`[enc] ${videoFrames} frames (f${String(fromFrame).padStart(5, '0')}..f${String(endIdx).padStart(5, '0')}) @ ${fps}fps = ${durationSec.toFixed(2)}s`);
  log(`[enc] audio=${audio} (offset ${audioFromSec.toFixed(3)}s)`);

  // ---------------- capability probes ----------------
  let hevcOk = false, h264Ok = false, scaleCudaOk = false;
  if (!forceCpu) {
    const [h, x] = await Promise.all([nvencAvailable('hevc_nvenc'), nvencAvailable('h264_nvenc')]);
    hevcOk = h.ok; h264Ok = x.ok;
    if (!hevcOk) warn(`[enc] hevc_nvenc unavailable: ${h.stderr.trim().split('\n').slice(-3).join(' | ')}`);
    if (!h264Ok) warn(`[enc] h264_nvenc unavailable: ${x.stderr.trim().split('\n').slice(-3).join(' | ')}`);
    if (hevcOk) {
      const sc = await scaleCudaWorks(path.join(framesDir, frameName(fromFrame)));
      scaleCudaOk = sc.ok;
      log(`[enc] GPU scale chain (hwupload_cuda->scale_cuda): ${scaleCudaOk ? 'AVAILABLE' : 'not usable -> CPU lanczos scale'}`);
      if (!scaleCudaOk) log(`[enc]   reason: ${sc.stderr.trim().split('\n').slice(-2).join(' | ') || 'unknown'}`);
    }
  } else {
    warn('[enc] --force-cpu: NVENC probes skipped');
  }

  // --scale-mode cpu|cuda|auto
  // MEASURED on this machine (RTX 5060, 600 PNG frames @1920x1080):
  //   cpu  lanczos: ~306-325 fps   (hevc_nvenc)
  //   cuda chain  : ~304-311 fps   (hwupload_cuda -> scale_cuda -> nvenc)
  // => the GPU chain is NOT faster here: PNG decode + hwupload costs as much as
  //    CPU lanczos for a 1:1 scale. CPU scale is therefore the default, and the
  //    GPU chain remains available via --scale-mode cuda (it does work).
  const requestedScaleMode = String(a.scaleMode || 'cpu').toLowerCase();
  let scaleMode;
  if (requestedScaleMode === 'cuda') {
    if (!scaleCudaOk) {
      warn('[enc] --scale-mode cuda requested but the GPU scale probe failed; using cpu');
      scaleMode = 'cpu';
    } else scaleMode = 'cuda';
  } else if (requestedScaleMode === 'auto') {
    scaleMode = scaleCudaOk ? 'cuda' : 'cpu';
  } else {
    scaleMode = 'cpu';
  }
  log(`[enc] scale mode: ${scaleMode}${scaleMode === 'cuda' ? ' (frames stay on GPU)' : ' (CPU lanczos)'}`);

  const results = [];

  const encodeOne = async ({ codec, scaleMode, label, fileName }) => {
    const outFile = path.join(outDir, fileName);
    const { inputs, outputs } = buildVideoArgs({ codec, cq, fps, startNumber, framesDir, scaleMode });
    // [all inputs] then [all output options] then output path.
    // Audio comes from the mp3, trimmed to the same start offset, AAC 320k.
    // NOTE: -shortest only stops on a *longer* stream. If the video stream ends
    // early (e.g. a frame gap) the mp3 would keep going, so the audio is also
    // hard-clamped with -t to the exact video duration.
    const full = [
      '-hide_banner', '-y',
      ...inputs,
      '-ss', audioFromSec.toFixed(6), '-t', durationSec.toFixed(6), '-i', audio,
      ...outputs,
      '-map', '0:v:0', '-map', '1:a:0',
      '-c:a', 'aac', '-b:a', '320k',
      '-shortest',
      outFile,
    ];
    if (dryRun) { log(`\n[enc:dry] ${label}\nffmpeg ${full.join(' ')}`); return null; }

    log(`\n[enc] ${label} -> ${path.basename(outFile)}`);
    const r = await runFfmpeg(full, label);
    if (r.code !== 0) {
      warn(`[enc] ${label} FAILED (exit ${r.code})`);
      warn(`[enc] ---- ffmpeg stderr (tail) ----\n${r.stderr.trim()}\n[enc] ------------------------------`);
      return { label, ok: false, outFile, codec, stderr: r.stderr };
    }
    const st = await fsp.stat(outFile).catch(() => null);
    if (!st || st.size === 0) {
      warn(`[enc] ${label} produced no output file`);
      return { label, ok: false, outFile, codec, stderr: r.stderr };
    }
    const p = await probe(outFile);
    const codecTag = p.ok ? p.video?.codec_tag_string : null;
    const encTag = p.ok ? (p.video?.tags?.encoder || '').toLowerCase() : '';
    const dur = p.ok ? Number(p.format?.duration) : null;
    log(`[enc] ${label} OK ${(st.size / 1048576).toFixed(1)}MiB in ${(r.ms / 1000).toFixed(1)}s ` +
      `(${(videoFrames / (r.ms / 1000)).toFixed(1)} fps)`);
    if (p.ok) {
      const delta = Math.abs((dur || 0) - durationSec);
      log(`[enc]   ffprobe: ${p.video?.codec_name}/${codecTag} ${p.video?.profile} ` +
        `${p.video?.width}x${p.video?.height} fps=${p.video?.r_frame_rate} dur=${dur?.toFixed(3)}s ` +
        `audio=${p.audio?.codec_name} ${p.audio?.bit_rate ? (Number(p.audio.bit_rate) / 1000).toFixed(0) + 'k' : '?'}`);
      log(`[enc]   encoder tag: ${p.video?.tags?.encoder || '(none)'}`);
      if (delta > 0.25) warn(`[enc]   WARNING duration mismatch: container ${dur?.toFixed(3)}s vs expected ${durationSec.toFixed(3)}s`);
      if (codec.includes('nvenc') && !encTag.includes('nvenc')) {
        warn(`[enc]   WARNING expected an nvenc encoder tag, got "${p.video?.tags?.encoder || '(none)'}"`);
      }
    } else {
      warn(`[enc]   ffprobe failed: ${p.error}`);
    }
    return {
      label, ok: true, outFile, codec, bytes: st.size,
      ms: r.ms, fps: +(videoFrames / (r.ms / 1000)).toFixed(2),
      probe: p.ok ? {
        codecName: p.video?.codec_name, codecTag, profile: p.video?.profile,
        width: p.video?.width, height: p.video?.height,
        rFrameRate: p.video?.r_frame_rate,
        duration: dur, audioCodec: p.audio?.codec_name, audioBitrate: p.audio?.bit_rate,
        encoderTag: p.video?.tags?.encoder || null,
      } : null,
    };
  };

  // ---------------- HEVC (primary) ----------------
  if (wantHevc) {
    let res = null;
    if (hevcOk) {
      res = await encodeOne({
        codec: 'hevc_nvenc', scaleMode: scaleMode,
        label: 'HEVC nvenc (p4 vbr cq' + cq + ')',
        fileName: `${name}_hevc.mp4`,
      });
      if (res && !res.ok && scaleMode === 'cuda') {
        warn('[enc] retrying HEVC with CPU lanczos scale instead of scale_cuda');
        res = await encodeOne({
          codec: 'hevc_nvenc', scaleMode: 'cpu',
          label: 'HEVC nvenc (retry, CPU scale)',
          fileName: `${name}_hevc.mp4`,
        });
      }
    }
    if (!res || !res.ok) {
      warn('\n[enc] !!! NVENC HEVC UNAVAILABLE OR FAILED — FALLING BACK TO libx264 (CPU) !!!\n');
      res = await encodeOne({
        codec: 'libx264', scaleMode: 'cpu',
        label: 'FALLBACK libx264 (CPU) — HEVC NVENC unavailable',
        fileName: `${name}_hevc.mp4`,
      });
      if (res) res.fallback = 'libx264';
    }
    if (res) results.push({ ...res, primary: true });
  }

  // ---------------- H.264 (fallback file) ----------------
  if (wantH264) {
    let res = null;
    if (h264Ok) {
      res = await encodeOne({
        codec: 'h264_nvenc', scaleMode: scaleMode,
        label: `H.264 nvenc (p5 vbr cq${cq + 1})`,
        fileName: `${name}_h264.mp4`,
      });
      if (res && !res.ok && scaleMode === 'cuda') {
        warn('[enc] retrying H.264 with CPU lanczos scale instead of scale_cuda');
        res = await encodeOne({
          codec: 'h264_nvenc', scaleMode: 'cpu',
          label: 'H.264 nvenc (retry, CPU scale)',
          fileName: `${name}_h264.mp4`,
        });
      }
    }
    if (!res || !res.ok) {
      warn('\n[enc] !!! NVENC H.264 UNAVAILABLE OR FAILED — FALLING BACK TO libx264 (CPU) !!!\n');
      res = await encodeOne({
        codec: 'libx264', scaleMode: 'cpu',
        label: 'FALLBACK libx264 (CPU) — H.264 NVENC unavailable',
        fileName: `${name}_h264.mp4`,
      });
      if (res) res.fallback = 'libx264';
    }
    if (res) results.push({ ...res, primary: false });
  }

  const summary = {
    ok: results.length > 0 && results.every((r) => r.ok),
    framesDir, outDir, fps, crf: cq,
    startFrame: fromFrame, endFrame: endIdx, videoFrames, durationSec: +durationSec.toFixed(3),
    audio, audioOffsetSec: +audioFromSec.toFixed(3),
    nvenc: { hevc: hevcOk, h264: h264Ok, scaleCuda: scaleCudaOk }, scaleMode,
    usedCpuFallback: results.some((r) => r.fallback === 'libx264'),
    outputs: results,
  };
  log(`\nMV_ENCODE_RESULT ${JSON.stringify(summary)}`);
  if (!summary.ok) process.exitCode = 1;
}

main().catch((e) => { warn(`[enc] ERROR: ${e && e.stack || e}`); process.exitCode = 1; });
