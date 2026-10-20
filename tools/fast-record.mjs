#!/usr/bin/env node
/**
 * fast-record.mjs — high-throughput frame capture for the MV.
 *
 * Uses JPEG screenshots (Chrome's native JPEG encoder is ~6x faster than PNG
 * for 1920x1080 UI screens) + in-page seek, N parallel browser pages.
 *
 *   node tools/fast-record.mjs --from 0 --to 249 --fps 60 --workers 3 --out frames
 *
 *   --from/--to      seconds (default 0 / MV.duration)
 *   --fps            default 60
 *   --workers        parallel pages (default 3)
 *   --out            frames dir (default ./frames)
 *   --quality        jpeg quality (default 95)
 *   --resume         skip existing non-empty frames
 *   --port           server port (default 8899)
 *   --url            explicit page url
 *
 * Writes <out>/f00000.jpg ... plus <out>/../progress.json
 * Encoding order is irrelevant: filenames carry the absolute frame index.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { startServer } from './serve.mjs';

const CHROME = process.env.MV_CHROME ||
  'C:\\Users\\fengkao\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';

function parseArgs(argv) {
  const a = { from: 0, to: null, fps: 60, workers: 3, out: 'frames', quality: 95, resume: false, port: 8899, url: null, reloadEvery: 0 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const next = () => argv[++i];
    if (k === '--from') a.from = +next();
    else if (k === '--to') a.to = +next();
    else if (k === '--fps') a.fps = +next();
    else if (k === '--workers') a.workers = +next();
    else if (k === '--out') a.out = next();
    else if (k === '--quality') a.quality = +next();
    else if (k === '--port') a.port = +next();
    else if (k === '--url') a.url = next();
    else if (k === '--reload-every') a.reloadEvery = +next();
    else if (k === '--resume') a.resume = true;
  }
  return a;
}
const A = parseArgs(process.argv.slice(2));
const OUT = path.resolve(A.out);
await fsp.mkdir(path.join(OUT), { recursive: true });

// ---- ensure a static server ----
let srv = null;
if (!A.url) {
  try {
    srv = await startServer({ port: A.port });
  } catch (e) {
    // port already in use -> reuse it
    srv = null;
  }
  A.url = `http://127.0.0.1:${A.port}/index.html?render=1`;
}
if (srv) console.log(`[fast] serving ${srv.url}`);

const frameName = (i) => 'f' + String(i).padStart(5, '0') + '.jpg';

// ---- boot one page ----
async function makeWorker(idx) {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--force-color-profile=srgb', '--hide-scrollbars', '--disable-lcd-text',
      '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required',
      '--disable-gpu-vsync', '--disable-frame-rate-limit'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(A.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('window.__MV_READY === true', null, { timeout: 120000 });
  return { browser, page, errs, idx };
}

// ---- resolve duration ----
const probe = await makeWorker(0);
const duration = await probe.page.evaluate(() => (window.MV && window.MV.duration) || 248.9879375);
const to = A.to != null ? A.to : duration;
const startFrame = Math.round(A.from * A.fps);
const endFrame = Math.round(to * A.fps);
const total = endFrame - startFrame;
console.log(`[fast] ${A.from}s..${to}s @${A.fps}fps -> ${total} frames, ${A.workers} workers, q${A.quality}`);

// ---- plan: chunk contiguous ranges per worker so each can keep its page warm ----
const per = Math.ceil(total / A.workers);
const chunks = [];
for (let w = 0; w < A.workers; w++) {
  const s = startFrame + w * per;
  const e = Math.min(endFrame, s + per);
  if (s < e) chunks.push([s, e]);
}

let done = 0, skipped = 0;
const missing = [];
const t0 = Date.now();
let lastLog = 0;

async function runChunk(w, page, [s, e]) {
  const errsThis = [];
  for (let f = s; f < e; f++) {
    const file = path.join(OUT, frameName(f));
    if (A.resume) {
      try { const st = await fsp.stat(file); if (st.size > 1000) { skipped++; done++; continue; } } catch { }
    }
    try {
      await page.evaluate((tt) => window.MV.seek(tt), f / A.fps);
      await page.screenshot({
        path: file, type: 'jpeg', quality: A.quality,
        animations: 'disabled', caret: 'hide',
      });
    } catch (err) {
      errsThis.push(f + ': ' + err.message);
      missing.push(f);
    }
    done++;
    const now = Date.now();
    if (now - lastLog > 2000) {
      lastLog = now;
      const el = (now - t0) / 1000;
      const rate = done / el;
      const eta = Math.round((total - done) / Math.max(0.01, rate));
      const mem = process.memoryUsage().rss / 1e9;
      console.log(`[fast] ${done}/${total} ${(done / total * 100).toFixed(1)}% ${rate.toFixed(2)} fps eta ${eta}s rss ${mem.toFixed(2)}GB`);
    }
  }
  return errsThis;
}

// start workers (worker 0 reuses probe)
const workers = [probe];
for (let w = 1; w < chunks.length; w++) workers.push(await makeWorker(w));

await Promise.all(chunks.map((c, i) => runChunk(i, workers[i].page, c)));

const el = (Date.now() - t0) / 1000;
const files = (await fsp.readdir(OUT)).filter((f) => f.endsWith('.jpg')).length;
const report = {
  ok: missing.length === 0, frames: total, written: done, skipped,
  elapsedSec: +el.toFixed(1), fps: +(done / el).toFixed(2),
  outDir: OUT, fileCount: files, missing: missing.slice(0, 20), missingCount: missing.length,
};
await fsp.writeFile(path.join(OUT, '..', 'progress.json'), JSON.stringify(report, null, 2));
console.log('FAST_RECORD_RESULT ' + JSON.stringify(report));
for (const w of workers) { try { await w.browser.close(); } catch { } }
