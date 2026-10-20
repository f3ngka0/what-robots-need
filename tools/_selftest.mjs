#!/usr/bin/env node
/**
 * _selftest.mjs — throwaway verification harness for the capture pipeline.
 * NOT part of the deliverable pipeline; safe to delete.
 *
 *   node tools/_selftest.mjs [--port 8899]
 *
 * Proves:
 *   1. window.__MV_READY / MV.seek contract works against tools/_selftest.html
 *   2. seek determinism: same t in two INDEPENDENT browser contexts => identical PNG bytes
 *   3. animations:'disabled' freezes infinite CSS animations (2 captures of the same t
 *      separated by real wall-clock time are identical)
 *   4. parallel workers produce a contiguous, complete, unique frame set
 *   5. resume skips existing frames and does not re-capture them
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { parseArgs, probeHealth, startServer, DEFAULT_ROOT, DEFAULT_PORT } from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Users\\fengkao\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
const TMP = path.join(PROJECT_ROOT, 'tools', '_selftest_out');

const ARGS = [
  '--force-color-profile=srgb', '--disable-lcd-text', '--hide-scrollbars',
  '--autoplay-policy=no-user-gesture-required', '--force-device-scale-factor=1',
  '--disable-gpu-vsync', '--disable-gpu-compositing', '--no-first-run', '--mute-audio',
];

// Must mirror record.mjs FREEZE_CSS: Playwright's animations:'disabled' does not
// freeze infinite CSS animations in this Chromium build.
const FREEZE_CSS = '*,*::before,*::after{animation:none !important;animation-play-state:paused !important;' +
  'transition:none !important;transition-duration:0s !important;caret-color:transparent !important}';
const FREEZE_INIT = `(() => {
  const CSS = ${JSON.stringify(FREEZE_CSS)};
  const apply = () => { const s = document.createElement('style');
    s.setAttribute('data-mv-freeze','1'); s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s); };
  if (document.head) apply(); else document.addEventListener('DOMContentLoaded', apply, { once: true });
})();`;

const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex');
const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

async function openPage(browser, url, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    reducedMotion: opts.reducedMotion || 'reduce',
    colorScheme: 'dark',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(FREEZE_INIT);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('window.__MV_READY === true', { timeout: 60000, polling: 25 });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Page.enable');
  return { ctx, page, errors, cdp };
}

/** Same capture path record.mjs uses (CDP optimizeForSpeed). */
async function shoot(p, t) {
  await p.page.evaluate((tt) => { window.MV.seek(tt); }, t);
  const res = await p.cdp.send('Page.captureScreenshot', {
    format: 'png', optimizeForSpeed: true, fromSurface: true, captureBeyondViewport: false,
  });
  return Buffer.from(res.data, 'base64');
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const port = Number(a.port ?? DEFAULT_PORT);

  await fsp.rm(TMP, { recursive: true, force: true });
  await fsp.mkdir(TMP, { recursive: true });

  // ---- server ----
  let handle = null;
  let base = null;
  const health = await probeHealth(port);
  if (health && path.resolve(health.root || '') === PROJECT_ROOT) {
    base = `http://127.0.0.1:${port}/`;
    record('server reuse', true, `port ${port} pid ${health.pid}`);
  } else {
    handle = await startServer({ root: PROJECT_ROOT, port, logLevel: 'quiet' });
    base = handle.url;
    record('server start', true, base);
  }

  // ---- range/MIME sanity ----
  const mp3Url = `${base}AWAAWA%20-%20WHAT%20ROBOTS%20NEED.mp3`;
  const head = await fetch(mp3Url, { method: 'HEAD' });
  const rng = await fetch(mp3Url, { headers: { Range: 'bytes=100-1099' } });
  const rngBuf = Buffer.from(await rng.arrayBuffer());
  record('mp3 HEAD mime+len',
    head.status === 200 && (head.headers.get('content-type') || '').startsWith('audio/mpeg') &&
    Number(head.headers.get('content-length')) === 9963352,
    `${head.status} ${head.headers.get('content-type')} len=${head.headers.get('content-length')}`);
  record('mp3 byte-range 206',
    rng.status === 206 && rng.headers.get('content-range') === 'bytes 100-1099/9963352' && rngBuf.length === 1000,
    `${rng.status} ${rng.headers.get('content-range')} got=${rngBuf.length}`);

  // ---- concurrency: 40 parallel requests, all must be 200 ----
  const t0 = Date.now();
  const conc = await Promise.all(Array.from({ length: 40 }, (_, i) =>
    fetch(`${base}tools/_selftest.html?i=${i}`).then((r) => r.status).catch(() => 0)));
  record('concurrent requests', conc.every((s) => s === 200), `40 parallel in ${Date.now() - t0}ms, ok=${conc.filter((s) => s === 200).length}`);

  const url = `${base}tools/_selftest.html`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ARGS });

  // ---- ready contract ----
  const A = await openPage(browser, url);
  record('__MV_READY + MV.seek present',
    (await A.page.evaluate(() => typeof window.MV.seek === 'function')) === true &&
    (await A.page.evaluate(() => window.__MV_READY === true)) === true &&
    A.errors.length === 0,
    `pageerrors=${A.errors.length}`);

  // ---- determinism: same t, two independent contexts ----
  const B = await openPage(browser, url); // separate BrowserContext => separate renderer process/cache
  const times = [0, 0.25, 1.5, 3.0, 7.75, 13.3333];
  const detRows = [];
  for (const t of times) {
    const [ba, bb] = await Promise.all([shoot(A, t), shoot(B, t)]);
    const same = Buffer.compare(ba, bb) === 0;
    detRows.push({ t, md5A: md5(ba), md5B: md5(bb), bytes: ba.length, identical: same });
  }
  record('seek determinism across 2 pages (byte-identical)',
    detRows.every((r) => r.identical),
    detRows.map((r) => `t=${r.t}:${r.identical ? 'SAME' : 'DIFF'}`).join(' '));

  // ---- CSS animation freeze: same t across wall-clock time, same page ----
  const f1 = await shoot(A, 5.0);
  await new Promise((r) => setTimeout(r, 1200)); // let any CSS animation advance if not disabled
  const f2 = await shoot(A, 5.0);
  record('animations disabled (CSS frozen over 1.2s wall clock)',
    Buffer.compare(f1, f2) === 0,
    `md5 ${md5(f1)} vs ${md5(f2)}`);

  // ---- distinct t => distinct pixels ----
  const g1 = await shoot(A, 5.0);
  const g2 = await shoot(A, 5.0 + 1 / 60);
  record('adjacent frames differ', Buffer.compare(g1, g2) !== 0,
    `md5 ${md5(g1).slice(0, 8)} vs ${md5(g2).slice(0, 8)}`);

  // ---- order independence: seeking backwards/forwards gives same pixels ----
  await shoot(A, 12.0);
  await shoot(A, 2.0);
  const h1 = await shoot(A, 12.0);
  const h1ref = await shoot(B, 12.0);
  record('seek is stateless (t=12 after t=2 == fresh t=12)', Buffer.compare(h1, h1ref) === 0,
    `md5 ${md5(h1)}`);

  // ---- parallel worker frame set: run record.mjs, then verify contiguity ----
  const framesDir = path.join(TMP, 'frames');
  const { spawn } = await import('node:child_process');
  const runRecord = (args) => new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(HERE, 'record.mjs'), ...args], {
      cwd: PROJECT_ROOT, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => resolve({ code, out, err }));
  });

  const common = ['--url', url, '--fps', '60', '--workers', '3',
    '--out', framesDir, '--progress', path.join(TMP, 'progress.json')];
  const r1 = await runRecord([...common, '--from', '0', '--to', '2']); // 120 frames
  const files1 = (await fsp.readdir(framesDir)).filter((f) => f.endsWith('.png'));
  const expected = Array.from({ length: 120 }, (_, i) => `f${String(i).padStart(5, '0')}.png`);
  const missing = expected.filter((f) => !files1.includes(f));
  const zero = [];
  for (const f of expected) {
    const st = await fsp.stat(path.join(framesDir, f)).catch(() => null);
    if (!st || st.size === 0) zero.push(f);
  }
  record('parallel(3) frame set contiguous & complete',
    r1.code === 0 && missing.length === 0 && zero.length === 0 && files1.length === 120,
    `exit=${r1.code} files=${files1.length} missing=${missing.length} zero=${zero.length}`);

  // ---- resume: delete 5 frames, re-run, only those must be recaptured ----
  const deleted = ['f00010.png', 'f00011.png', 'f00077.png', 'f00100.png', 'f00119.png'];
  for (const f of deleted) await fsp.rm(path.join(framesDir, f));
  const r2 = await runRecord([...common, '--from', '0', '--to', '2', '--resume']);
  const files2 = (await fsp.readdir(framesDir)).filter((f) => f.endsWith('.png'));
  const skippedMatch = /"skipped":(\d+)/.exec(r2.out);
  record('resume restores missing frames and reports skips',
    r2.code === 0 && files2.length === 120 && expected.every((f) => files2.includes(f)) &&
    Number(skippedMatch?.[1] || -1) === 115,
    `exit=${r2.code} files=${files2.length} skipped=${skippedMatch?.[1]}`);

  // ---- reload-every path (state leakage guard) ----
  const framesReload = path.join(TMP, 'frames_reload');
  const r3 = await runRecord([...common, '--out', framesReload, '--from', '0', '--to', '0.5',
    '--workers', '2', '--reload-every', '7', '--progress', path.join(TMP, 'progress_reload.json')]);
  const files3 = (await fsp.readdir(framesReload)).filter((f) => f.endsWith('.png'));
  const reloadMatch = /"reloads":(\d+)/.exec(r3.out);
  record('reload-every guard works', r3.code === 0 && files3.length === 30 && Number(reloadMatch?.[1] || 0) >= 3,
    `exit=${r3.code} files=${files3.length} reloads=${reloadMatch?.[1]}`);

  // ---- determinism across the record pipeline: re-record 1 frame, compare md5 ----
  const framesDet = path.join(TMP, 'frames_det');
  await runRecord(['--url', url, '--fps', '60', '--workers', '1', '--from', '2', '--to', '2.05',
    '--out', framesDet, '--progress', path.join(TMP, 'progress_det.json')]);
  const detFile = path.join(framesDet, 'f00120.png');
  const detBytes = await fsp.readFile(detFile).catch(() => null);
  const ref = await shoot(B, 2.0);
  record('record.mjs frame == fresh page frame at same t',
    detBytes !== null && Buffer.compare(detBytes, ref) === 0,
    detBytes ? `on-disk ${md5(detBytes)} / fresh ${md5(ref)}` : 'missing');

  await A.ctx.close();
  await B.ctx.close();
  await browser.close();
  if (handle) await handle.close();

  // ---- report ----
  const report = {
    when: new Date().toISOString(),
    determinism: detRows,
    results,
    allPassed: results.every((r) => r.ok),
  };
  await fsp.writeFile(path.join(TMP, 'selftest-report.json'), JSON.stringify(report, null, 2));
  console.log(`\n${report.allPassed ? 'ALL PASS' : 'SOME FAILED'} (${results.filter((r) => r.ok).length}/${results.length})`);
  console.log('report: ' + path.join(TMP, 'selftest-report.json'));
  if (!report.allPassed) process.exitCode = 1;
}

main().catch((e) => { console.error('SELFTEST ERROR', e); process.exitCode = 1; });
