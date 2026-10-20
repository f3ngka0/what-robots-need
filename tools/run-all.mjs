#!/usr/bin/env node
/**
 * run-all.mjs — orchestrate record then encode for the MV offline export.
 *
 *   node tools/run-all.mjs [options]
 *
 * Record pass-throughs:
 *   --from <sec>  --to <sec>  --fps <n>  --workers <n>  --out <frames dir>
 *   --resume  --scale <x>  --reload-every <k>  --url <url>
 *   --port <n>  --root <dir>  --headless new|shell  --ready-timeout <ms>
 *
 * Encode pass-throughs:
 *   --video-out <dir>   final video directory (default <cwd>/out)
 *   --crf <n>           NVENC cq / quality (default 20)
 *   --audio <file>      default ../AWAAWA - WHAT ROBOTS NEED.mp3
 *   --name <base>       output basename (default WHAT_ROBOTS_NEED_win98_mv)
 *   --scale-mode cpu|cuda|auto
 *   --hevc=false / --h264=false
 *
 * Other:
 *   --skip-record   reuse the frames already on disk
 *   --skip-encode   capture only
 *   --dry-run       show what would run
 */
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '..');

function log(m) { process.stdout.write(m + '\n'); }
function warn(m) { process.stderr.write(m + '\n'); }
function fmtDur(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '--';
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}h${String(m).padStart(2, '0')}m` : m ? `${m}m${String(x).padStart(2, '0')}s` : `${x}s`;
}

/** Run a node tool, streaming its output; returns {code, result} where result is the parsed marker. */
function runStep(script, args, marker) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(HERE, script), ...args], {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let all = '';
    child.stdout.on('data', (d) => { const s = d.toString(); all += s; process.stdout.write(s); });
    child.stderr.on('data', (d) => { const s = d.toString(); all += s; process.stderr.write(s); });
    child.on('error', (e) => resolve({ code: -1, error: String(e), raw: all }));
    child.on('close', (code) => {
      let parsed = null;
      const idx = all.lastIndexOf(marker);
      if (idx !== -1) {
        const line = all.slice(idx + marker.length).split(/\r?\n/)[0].trim();
        try { parsed = JSON.parse(line); } catch { parsed = null; }
      }
      resolve({ code, parsed, raw: all });
    });
  });
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const fps = Number(a.fps ?? 60);
  const workers = Math.max(1, Number(a.workers ?? 2));
  const framesDir = path.resolve(a.out || path.join(PROJECT_ROOT, 'frames'));
  const videoOut = path.resolve(a.videoOut || path.join(PROJECT_ROOT, 'out'));
  const skipRecord = a.skipRecord === true || a['skip-record'] === true;
  const skipEncode = a.skipEncode === true || a['skip-encode'] === true;
  const dryRun = a.dryRun === true;

  const t0 = Date.now();

  // ---------- record ----------
  const recArgs = ['--fps', String(fps), '--workers', String(workers), '--out', framesDir];
  for (const key of ['from', 'to', 'url', 'port', 'root', 'scale', 'reloadEvery', 'readyTimeout', 'headless']) {
    if (a[key] !== undefined && a[key] !== true) recArgs.push(`--${key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`, String(a[key]));
  }
  if (a.resume) recArgs.push('--resume');
  if (a.verbose) recArgs.push('--verbose');

  let recordResult = null;
  if (skipRecord) {
    log('[run] --skip-record: reusing frames on disk');
    const names = await fsp.readdir(framesDir).catch(() => []);
    const n = names.filter((x) => /^f\d+\.png$/.test(x)).length;
    if (n === 0) {
      warn(`[run] no frames in ${framesDir}; nothing to encode`);
      process.exitCode = 1;
      return;
    }
    recordResult = { ok: true, totalFrames: n, framesPerSec: null, elapsedSec: null, skipped: true };
    log(`[run] found ${n} frames in ${framesDir}`);
  } else {
    log(`\n[run] ===== RECORD ===== ${framesDir} (fps=${fps} workers=${workers})`);
    const r = await runStep('record.mjs', recArgs, 'MV_RECORD_RESULT ');
    recordResult = r.parsed;
    if (r.code !== 0 || !recordResult || !recordResult.ok) {
      warn('\n[run] RECORD FAILED — not encoding.');
      if (r.parsed) warn(`[run] ${JSON.stringify({ missing: r.parsed.missing, error: r.parsed.error })}`);
      process.exitCode = 1;
      return;
    }
    log(`[run] record OK: ${recordResult.totalFrames} frames, ${recordResult.framesPerSec} fps, ${fmtDur(recordResult.elapsedSec || 0)}, ` +
      `${(recordResult.bytes / 1073741824).toFixed(2)} GiB`);
    log(`[run] log: ${recordResult.logFile}`);
  }

  if (skipEncode) {
    log('[run] --skip-encode: stopping after capture');
    log(`MV_RUN_RESULT ${JSON.stringify({ ok: true, record: recordResult, encode: null })}`);
    return;
  }

  // ---------- encode ----------
  const encArgs = ['--frames', framesDir, '--out', videoOut, '--fps', String(fps)];
  for (const key of ['crf', 'audio', 'name', 'scaleMode', 'hevc', 'h264', 'from', 'to']) {
    if (a[key] !== undefined) {
      encArgs.push(`--${key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`, String(a[key]));
    }
  }
  // Frame range for the encoder follows the recorded range, not the raw --from/--to.
  if (a.to !== undefined && a.to !== true) encArgs.push('--to', String(a.to));

  log(`\n[run] ===== ENCODE ===== -> ${videoOut}`);
  const e = await runStep('encode.mjs', encArgs, 'MV_ENCODE_RESULT ');
  const encodeResult = e.parsed;

  const elapsed = (Date.now() - t0) / 1000;
  const ok = e.code === 0 && encodeResult && encodeResult.ok;
  log(`\n[run] total ${fmtDur(elapsed)}`);
  if (encodeResult && encodeResult.usedCpuFallback) {
    warn('[run] WARNING: the CPU (libx264) fallback was used because NVENC failed — see the encode log above.');
  }
  if (encodeResult && encodeResult.outputs) {
    for (const o of encodeResult.outputs) {
      if (o.ok) log(`[run]   ${path.basename(o.outFile)}  ${(o.bytes / 1048576).toFixed(1)} MiB  ` +
        `${o.probe?.codecName}/${o.probe?.codecTag} ${o.probe?.width}x${o.probe?.height} ${o.probe?.duration}s`);
    }
  }
  log(`MV_RUN_RESULT ${JSON.stringify({ ok, record: recordResult, encode: encodeResult, elapsedSec: +elapsed.toFixed(1) })}`);
  if (!ok) process.exitCode = 1;
  void fs; void dryRun;
}

main().catch((e) => { warn(`[run] ERROR: ${e && e.stack || e}`); process.exitCode = 1; });
