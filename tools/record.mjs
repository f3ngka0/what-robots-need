#!/usr/bin/env node
/**
 * record.mjs — offline frame capture driver for the MV render pipeline.
 *
 *   node tools/record.mjs [options]
 *
 *   --from <sec>        start time (default 0)
 *   --to <sec>          end time, exclusive (default: MV.duration || 248.99)
 *   --fps <n>           frames per second (default 60)
 *   --workers <n>       parallel browser pages (default 2)
 *   --out <dir>         frames directory (default <cwd>/frames)
 *   --resume            skip frames already on disk with valid PNG content + size>0
 *   --scale <0.1..1>    optional downscale: viewport + CSS zoom (default 1 = 1920x1080)
 *   --reload-every <k>  reload each worker page every K frames it captures (default 900, 0=never)
 *   --url <url>         page to capture (default http://127.0.0.1:<port>/index.html?render=1)
 *   --port <n>          server port (default 8899; 0 = pick a free port)
 *   --root <dir>        static root (default project root)
 *   --headless <new|shell>  headless flavour (default new)
 *   --shell-path <exe>  explicit chrome-headless-shell binary
 *   --ready-timeout <ms> wait for window.__MV_READY (default 120000)
 *   --keep-server       leave an in-process server state (no-op; kept for symmetry)
 *   --quiet / --verbose
 *
 * Contract: page exposes window.__MV_READY (bool) and window.MV.seek(t) which
 * synchronously paints one frame for absolute time t. Deterministic: same t =>
 * same pixels. This driver never uses requestAnimationFrame.
 *
 * Outputs: <out>/f00000.png ... , <out>/../progress.json, <out>/../logs/render-*.log
 */
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { parseArgs, startServer, probeHealth, DEFAULT_ROOT, DEFAULT_PORT } from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '..');
const DEFAULT_CHROME = 'C:\\Users\\fengkao\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
const DEFAULT_DURATION = 248.99;
const VIEW_W = 1920;
const VIEW_H = 1080;

const CHROMIUM_ARGS = [
  '--force-color-profile=srgb',
  '--disable-lcd-text',
  '--hide-scrollbars',
  '--autoplay-policy=no-user-gesture-required',
  '--force-device-scale-factor=1',
  '--disable-gpu-vsync',
  // DETERMINISM (measured, see README notes): GPU *compositing* of the layer tree
  // introduces +-1 LSB dithering noise between captures of the same frame, while
  // canvas raster itself is already bit-stable. Disabling GPU compositing makes
  // screenshots of identical state byte-identical. Costs ~13% throughput.
  '--disable-gpu-compositing',
  // stability / determinism helpers (no effect on layout)
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-features=CalculateNativeWinOcclusion',
  '--mute-audio',
];

/**
 * Injected at document-start into every worker page.
 * Playwright's `animations:'disabled'` does NOT reliably freeze *infinite* CSS
 * animations in this Chromium build (verified: a `animation: spin 1.7s infinite`
 * element still reports playState "running" and rotates between captures).
 * Killing animations/transitions outright makes the rasterised pixels stable.
 */
const FREEZE_CSS = '*,*::before,*::after{' +
  'animation:none !important;' +
  'animation-play-state:paused !important;' +
  'transition:none !important;' +
  'transition-duration:0s !important;' +
  'caret-color:transparent !important;' +
  '}';

const FREEZE_INIT = `(() => {
  const CSS = ${JSON.stringify(FREEZE_CSS)};
  const apply = () => {
    try {
      const s = document.createElement('style');
      s.setAttribute('data-mv-freeze', '1');
      s.textContent = CSS;
      (document.head || document.documentElement).appendChild(s);
    } catch (e) { /* ignore */ }
  };
  if (document.head) apply();
  else document.addEventListener('DOMContentLoaded', apply, { once: true });
})();`;

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function log(msg) { process.stdout.write(msg + '\n'); }
function warn(msg) { process.stderr.write(msg + '\n'); }
function nowIso() { return new Date().toISOString(); }
function fmtDur(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '--';
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  if (h) return `${h}h${String(m).padStart(2, '0')}m`;
  if (m) return `${m}m${String(x).padStart(2, '0')}s`;
  return `${x}s`;
}
const frameName = (i) => `f${String(i).padStart(5, '0')}.png`;

async function writeFileAtomic(file, text) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, text, 'utf8');
  await fsp.rename(tmp, file);
}

/** True when `file` exists, is non-empty, and starts with the PNG signature. */
async function isGoodPng(file) {
  try {
    const st = await fsp.stat(file);
    if (!st.isFile() || st.size <= 0) return false;
    const fh = await fsp.open(file, 'r');
    try {
      const buf = Buffer.alloc(8);
      const { bytesRead } = await fh.read(buf, 0, 8, 0);
      return bytesRead === 8 && buf.equals(PNG_MAGIC) && st.size > 100;
    } finally { await fh.close(); }
  } catch { return false; }
}

async function findHeadlessShell() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH ||
    path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
  try {
    const dirs = (await fsp.readdir(base)).filter((d) => d.startsWith('chromium_headless_shell-'));
    dirs.sort();
    for (const d of dirs.reverse()) {
      for (const rel of [
        path.join(d, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
        path.join(d, 'chrome-headless-shell-win32', 'chrome-headless-shell.exe'),
        path.join(d, 'chrome-headless-shell-win64', 'headless_shell.exe'),
      ]) {
        const p = path.join(base, rel);
        if (fs.existsSync(p)) return p;
      }
    }
  } catch { /* ignore */ }
  return null;
}

/** Named log sink: writes to file and mirrors errors to stderr. */
class LogSink {
  constructor(file) {
    this.file = file;
    this.stream = fs.createWriteStream(file, { flags: 'a' });
    this.errors = 0;
  }
  raw(line) { this.stream.write(line + '\n'); }
  info(line) { this.raw(line); }
  error(line) { this.errors++; this.raw(line); warn(line); }
  async close() { await new Promise((r) => this.stream.end(r)); }
}

/** One worker = one browser page, strided frame set. */
class Worker {
  constructor(id, ctx, opts, shared) {
    this.id = id;
    this.ctx = ctx;
    this.opts = opts;
    this.shared = shared;
    this.page = null;
    this.captured = 0;
    this.reloads = 0;
  }

  async open() {
    const { opts } = this;
    const page = await this.ctx.newPage();
    // Freeze CSS animation/transitions at document-start (see FREEZE_CSS notes).
    if (opts.freezeCss !== false) await page.addInitScript(FREEZE_INIT);
    page.on('pageerror', (err) => {
      this.shared.sink.error(`[w${this.id}] PAGEERROR ${err && err.stack || err}`);
    });
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || type === 'warning') {
        this.shared.sink.error(`[w${this.id}] console.${type}: ${text}`);
      } else {
        this.shared.sink.raw(`${nowIso()} [w${this.id}] console.${type}: ${text}`);
      }
    });
    page.on('crash', () => {
      this.shared.sink.error(`[w${this.id}] PAGE CRASHED`);
    });
    page.on('requestfailed', (req) => {
      this.shared.sink.error(`[w${this.id}] requestfailed ${req.url()} ${req.failure()?.errorText || ''}`);
    });
    this.page = page;
    await this.gotoAndReady();
    return page;
  }

  /** Navigate to opts.url and block until the page is ready to seek. */
  async gotoAndReady() {
    const { opts } = this;
    const page = this.page;
    await page.goto(opts.url, { waitUntil: 'domcontentloaded', timeout: opts.readyTimeout });
    return this.awaitReady();
  }

  /** Wait for __MV_READY + settle layout on the current document. */
  async awaitReady() {
    const { opts } = this;
    const page = this.page;
    try {
      await page.waitForFunction('window.__MV_READY === true', {
        timeout: opts.readyTimeout,
        polling: 50,
      });
    } catch (err) {
      const diag = await page.evaluate(() => ({
        ready: window.__MV_READY,
        hasMV: typeof window.MV,
        mvErr: window.__MV_ERROR || null,
        title: document.title,
        bodyLen: document.body ? document.body.innerHTML.length : -1,
        scripts: Array.from(document.scripts).map((s) => s.src),
      })).catch((e) => ({ evalError: String(e) }));
      this.shared.sink.error(`[w${this.id}] TIMEOUT waiting for window.__MV_READY after ${opts.readyTimeout}ms`);
      this.shared.sink.error(`[w${this.id}] diag: ${JSON.stringify(diag)}`);
      throw new Error(`worker ${this.id}: __MV_READY never became true (see log ${this.shared.sink.file})`);
    }
    // Make sure the seek contract exists, and fonts/layout are settled.
    const info = await page.evaluate(async () => {
      if (!window.MV || typeof window.MV.seek !== 'function') {
        throw new Error('window.MV.seek is missing');
      }
      if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch { } }
      return {
        duration: Number(window.MV.duration) || null,
        fps: Number(window.MV.fps) || null,
        width: Number(window.MV.width) || window.innerWidth,
        height: Number(window.MV.height) || window.innerHeight,
        dpr: window.devicePixelRatio,
      };
    });
    if (opts.scale !== 1) {
      await page.evaluate((s) => {
        document.documentElement.style.zoom = String(s);
      }, opts.scale);
    }
    return info;
  }

  /** Lazily create the CDP session used for the fast capture path. */
  async cdp() {
    if (!this._cdp) {
      const c = await this.ctx.newCDPSession(this.page);
      await c.send('Page.enable');
      this._cdp = c;
    }
    return this._cdp;
  }

  async capture(frameIdx, t, file) {
    const page = this.page;
    await page.evaluate((tt) => { window.MV.seek(tt); }, t);
    if (this.opts.fastCapture) {
      // Page.captureScreenshot(optimizeForSpeed) measured ~3x faster than
      // Playwright's screenshot (52ms vs 145ms @1920x1080) and stays byte-stable.
      // Writes to disk via a single buffer per frame, immediately released.
      const cdp = await this.cdp();
      const res = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        optimizeForSpeed: true,
        fromSurface: true,
        captureBeyondViewport: false,
      });
      const buf = Buffer.from(res.data, 'base64');
      if (buf.length === 0) throw new Error(`empty screenshot for frame ${frameIdx}`);
      await fsp.writeFile(file, buf);
    } else {
      // Screenshot directly to disk: no Buffer accumulation in Node's heap.
      await page.screenshot({
        path: file,
        type: 'png',
        animations: 'disabled',
        caret: 'hide',
      });
    }
    const st = await fsp.stat(file).catch(() => null);
    if (!st || st.size <= 0) throw new Error(`empty screenshot for frame ${frameIdx} -> ${file}`);
    if (!(await isGoodPng(file))) throw new Error(`invalid PNG for frame ${frameIdx} -> ${file}`);
    return st.size;
  }

  async run() {
    const { opts, shared } = this;
    // Strided assignment: worker k takes frames k, k+N, k+2N, ...
    const mine = [];
    for (let f = shared.startFrame + this.id; f < shared.endFrame; f += opts.workers) mine.push(f);
    if (opts.resume) {
      const keep = [];
      for (const f of mine) {
        const file = path.join(opts.out, frameName(f));
        if (await isGoodPng(file)) {
          keep.push(f);
          shared.markSkipped(f);
        }
      }
      const skip = new Set(keep);
      this.queue = mine.filter((f) => !skip.has(f));
      shared.log(`[w${this.id}] resume: ${keep.length} frame(s) already present, ${this.queue.length} to capture`);
    } else {
      this.queue = mine;
    }
    if (this.queue.length === 0) return;

    let sinceReload = 0;
    for (const f of this.queue) {
      if (shared.fatal) break;
      const t = f / opts.fps;
      const file = path.join(opts.out, frameName(f));

      if (opts.reloadEvery > 0 && sinceReload >= opts.reloadEvery) {
        // Guard against per-frame state leakage: fresh document, then re-seek.
        await this.page.reload({ waitUntil: 'domcontentloaded', timeout: opts.readyTimeout });
        await this.awaitReady();
        this.reloads++;
        sinceReload = 0;
        shared.counters.reloads++;
      }

      let attempt = 0;
      for (;;) {
        try {
          const bytes = await this.capture(f, t, file);
          this.captured++;
          sinceReload++;
          shared.noteFrame(f, bytes, this.id);
          break;
        } catch (err) {
          attempt++;
          shared.sink.error(`[w${this.id}] capture frame ${f} @t=${t.toFixed(4)} failed (attempt ${attempt}): ${err && err.message || err}`);
          if (attempt >= 3 || shared.fatal) {
            shared.fail(`worker ${this.id}: frame ${f} failed after ${attempt} attempts`);
            throw err;
          }
          try {
            await this.page.reload({ waitUntil: 'domcontentloaded', timeout: opts.readyTimeout });
            await this.awaitReady();
            sinceReload = 0;
            shared.counters.reloads++;
          } catch (e2) {
            shared.sink.error(`[w${this.id}] recover reload failed: ${e2 && e2.message || e2}`);
          }
        }
      }
    }
  }

  async close() {
    try { if (this.page) await this.page.close(); } catch { }
    this.page = null;
  }
}

function computeFrameRange({ from, to, fps, duration }) {
  const d = Number.isFinite(to) ? Math.min(to, duration) : duration;
  const startFrame = Math.max(0, Math.round(from * fps));
  const endFrame = Math.min(Math.floor(d * fps), Math.floor(duration * fps + 1e-6));
  return { startFrame, endFrame: Math.max(startFrame, endFrame), effectiveTo: d, duration };
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.help) {
    process.stdout.write(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8')
      .split('\n').filter((l) => l.startsWith(' *') || l.startsWith('/**')).join('\n').slice(0, 3000) + '\n');
    process.exit(0);
  }

  const fps = Number(a.fps ?? 60);
  const workers = Math.max(1, Number(a.workers ?? 2));
  const from = Number(a.from ?? 0);
  const toArg = a.to === undefined ? NaN : Number(a.to);
  const out = path.resolve(a.out || path.join(PROJECT_ROOT, 'frames'));
  const scale = Number(a.scale ?? 1);
  const reloadEvery = Number(a.reloadEvery ?? 900);
  const port = a.port === undefined ? DEFAULT_PORT : Number(a.port);
  const root = path.resolve(a.root || PROJECT_ROOT);
  const headlessMode = String(a.headless || 'new').toLowerCase();
  const readyTimeout = Number(a.readyTimeout ?? 120_000);
  const verbose = !!a.verbose;
  const quiet = !!a.quiet;

  if (!Number.isFinite(fps) || fps <= 0) throw new Error(`invalid --fps ${a.fps}`);
  if (!(scale > 0 && scale <= 1)) throw new Error(`invalid --scale ${a.scale} (use 0<x<=1)`);
  if (!Number.isFinite(from) || from < 0) throw new Error(`invalid --from ${a.from}`);

  await fsp.mkdir(out, { recursive: true });
  const logDir = path.resolve(a.logDir || path.join(PROJECT_ROOT, 'logs'));
  await fsp.mkdir(logDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(logDir, `render-${stamp}.log`);
  const sink = new LogSink(logFile);
  const progressFile = path.resolve(a.progress || path.join(PROJECT_ROOT, 'progress.json'));

  // ---------- server ----------
  let serverHandle = null;
  let baseUrl = null;
  let reused = false;
  if (port > 0) {
    const health = await probeHealth(port);
    if (health) {
      const sameRoot = path.resolve(health.root || '') === root;
      if (sameRoot) {
        reused = true;
        baseUrl = `http://127.0.0.1:${port}/`;
        if (!quiet) log(`[rec] reusing server on port ${port} (pid ${health.pid}, root ${health.root})`);
      } else if (!quiet) {
        log(`[rec] port ${port} has a server for ${health.root}; starting our own on another port`);
      }
    }
  }
  if (!baseUrl) {
    try {
      serverHandle = await startServer({ root, port: port > 0 ? port : 0, logLevel: 'quiet' });
    } catch (err) {
      if (err && err.code === 'EADDRINUSE') {
        throw new Error(`port ${port} is in use by a non-MV process; pass --port 0 or another --port`);
      }
      throw err;
    }
    baseUrl = serverHandle.url;
    if (!quiet) log(`[rec] server started ${baseUrl} root=${root}`);
  }
  const url = a.url || `${baseUrl}index.html?render=1`;

  // ---------- browser ----------
  const executablePath = a.executable || DEFAULT_CHROME;
  let browserPath = executablePath;
  if (headlessMode === 'shell') {
    const shell = a.shellPath || await findHeadlessShell();
    if (!shell) throw new Error('chrome-headless-shell not found; pass --shell-path or use --headless new');
    browserPath = shell;
  }
  if (!fs.existsSync(browserPath)) throw new Error(`browser binary not found: ${browserPath}`);

  const t0 = Date.now();
  const args = CHROMIUM_ARGS.slice();
  if (a.softwareCanvas) args.push('--disable-accelerated-2d-canvas', '--disable-gpu');
  if (a.noSandbox) args.push('--no-sandbox');

  sink.raw(`${nowIso()} [rec] start url=${url} out=${out} fps=${fps} workers=${workers} ` +
    `from=${from} to=${Number.isFinite(toArg) ? toArg : 'duration'} scale=${scale} reloadEvery=${reloadEvery} headless=${headlessMode}`);
  sink.raw(`${nowIso()} [rec] browser=${browserPath} args=${JSON.stringify(args)}`);

  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args,
    timeout: 60_000,
  });
  if (!quiet) log(`[rec] chromium launched (${headlessMode}) ${browser.version()}`);

  // Shared coordination state.
  const shared = {
    startFrame: 0, endFrame: 0, fatal: false, fatalReason: null,
    sink, completed: new Set(), skipped: 0, bytes: 0, perWorker: {},
    counters: { reloads: 0, retries: 0 },
    log: (m) => { if (!quiet) log(m); sink.raw(`${nowIso()} [rec] ${m}`); },
    fail(reason) {
      if (this.fatal) return;
      this.fatal = true;
      this.fatalReason = reason;
      sink.error(`${nowIso()} [rec] FATAL ${reason}`);
    },
    markSkipped(f) { this.skipped++; this.completed.add(f); },
    noteFrame(f, bytes, wid) {
      this.completed.add(f);
      this.bytes += bytes;
      this.perWorker[wid] = (this.perWorker[wid] || 0) + 1;
    },
  };

  // ---------- probe duration from worker 0, then plan ----------
  const vw = Math.round(VIEW_W * scale);
  const vh = Math.round(VIEW_H * scale);
  const context = await browser.newContext({
    viewport: { width: vw, height: vh },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: 'dark',
  });
  context.setDefaultTimeout(60_000);

  const probeWorker = new Worker(0, context, {
    url, out, fps, workers, scale, readyTimeout, reloadEvery, resume: false,
    fastCapture: a.fastCapture !== false, freezeCss: a.freezeCss !== false,
  }, shared);
  let info;
  try {
    await probeWorker.open();
    info = await probeWorker.page.evaluate(() => ({
      duration: Number(window.MV.duration) || null,
      width: Number(window.MV.width) || null,
      height: Number(window.MV.height) || null,
      dpr: window.devicePixelRatio,
      innerW: window.innerWidth,
      innerH: window.innerHeight,
    }));
  } catch (err) {
    await probeWorker.close().catch(() => { });
    await context.close().catch(() => { });
    await browser.close().catch(() => { });
    if (serverHandle) await serverHandle.close().catch(() => { });
    await sink.close();
    throw err;
  }

  const duration = Number.isFinite(info.duration) && info.duration > 0 ? info.duration : DEFAULT_DURATION;
  const { startFrame, endFrame, effectiveTo } = computeFrameRange({ from, to: toArg, fps, duration });
  shared.startFrame = startFrame;
  shared.endFrame = endFrame;

  const totalPlanned = endFrame - startFrame;
  if (totalPlanned <= 0) {
    await probeWorker.close();
    await context.close();
    await browser.close();
    if (serverHandle) await serverHandle.close();
    await sink.close();
    throw new Error(`empty frame range: from=${from}s to=${Number.isFinite(toArg) ? toArg : duration}s @ ${fps}fps`);
  }

  if (!quiet) {
    log(`[rec] duration=${duration.toFixed(3)}s frames=${startFrame}..${endFrame - 1} (${totalPlanned}) ` +
      `viewport=${vw}x${vh} dpr=${info.dpr} workers=${workers}`);
    if (info.width && (info.width !== VIEW_W || info.height !== VIEW_H)) {
      warn(`[rec] WARN page reports stage ${info.width}x${info.height}, expected ${VIEW_W}x${VIEW_H}`);
    }
    if (info.innerW !== vw || info.innerH !== vh) {
      warn(`[rec] WARN inner viewport is ${info.innerW}x${info.innerH}, expected ${vw}x${vh}`);
    }
  }

  // Probe worker becomes worker 0 (keeps its page; avoids a throwaway load).
  const workerInstances = [];
  const makeOpts = () => ({
    url, out, fps, workers, scale, readyTimeout, reloadEvery,
    resume: !!a.resume,
    fastCapture: a.fastCapture !== false,
    freezeCss: a.freezeCss !== false,
  });
  const opts = makeOpts();
  probeWorker.opts = opts;
  workerInstances.push(probeWorker);
  for (let i = 1; i < workers; i++) {
    const w = new Worker(i, context, opts, shared);
    await w.open();
    workerInstances.push(w);
  }
  if (!quiet) log(`[rec] ${workerInstances.length} worker page(s) ready`);

  // ---------- progress reporter ----------
  let lastReport = Date.now();
  let lastCompleted = shared.completed.size;
  let reporting = true;
  const startedAt = Date.now();

  const writeProgress = async (final = false) => {
    const done = shared.completed.size;
    const elapsed = (Date.now() - startedAt) / 1000;
    const rate = elapsed > 0 ? done / elapsed : 0;
    const remaining = Math.max(0, totalPlanned - done);
    const eta = rate > 0 ? remaining / rate : null;
    const payload = {
      state: shared.fatal ? 'failed' : final ? 'done' : 'running',
      error: shared.fatalReason,
      updatedAt: nowIso(),
      url,
      fps, workers, duration,
      startFrame, endFrame,
      totalFrames: totalPlanned,
      completed: done,
      skipped: shared.skipped,
      failed: shared.fatal ? remaining : 0,
      percent: totalPlanned ? +(done / totalPlanned * 100).toFixed(2) : 0,
      framesPerSec: +rate.toFixed(2),
      elapsedSec: +elapsed.toFixed(1),
      etaSec: eta === null ? null : Math.round(eta),
      bytes: shared.bytes,
      perWorker: shared.perWorker,
      reloads: shared.counters.reloads,
      logFile,
      out,
      finalFile: null,
    };
    await writeFileAtomic(progressFile, JSON.stringify(payload, null, 2));
    return payload;
  };

  const reporter = setInterval(async () => {
    if (!reporting) return;
    const t = Date.now();
    if (t - lastReport < 2000) return;
    lastReport = t;
    const done = shared.completed.size;
    const inst = (done - lastCompleted) / ((t - startedAt - (lastCompleted ? 0 : 0)) / 1000 || 1);
    lastCompleted = done;
    try {
      const p = await writeProgress();
      if (!quiet) {
        const per = Object.entries(shared.perWorker).map(([k, v]) => `w${k}:${v}`).join(' ');
        log(`[rec] ${String(done).padStart(6)}/${totalPlanned} ${p.percent.toFixed(1).padStart(5)}% ` +
          `${p.framesPerSec.toFixed(2)} fps avg eta ${fmtDur(p.etaSec)}  ${per}`);
      }
    } catch (e) { sink.error(`[rec] progress write failed: ${e && e.message || e}`); }
    void inst;
  }, 500);
  reporter.unref?.();

  // ---------- run workers ----------
  let runError = null;
  const running = workerInstances.map((w) => w.run().catch((err) => {
    shared.fail(`worker ${w.id}: ${err && err.message || err}`);
    if (!runError) runError = err;
  }));
  await Promise.all(running);
  reporting = false;
  clearInterval(reporter);

  const elapsed = (Date.now() - startedAt) / 1000;
  const done = shared.completed.size;

  // Verify the frame set is contiguous and complete.
  const missing = [];
  for (let f = startFrame; f < endFrame; f++) if (!shared.completed.has(f)) missing.push(f);
  if (missing.length) {
    shared.fail(`${missing.length} frame(s) missing, first: ${missing.slice(0, 10).join(', ')}`);
  }

  const finalProgress = await writeProgress(true);

  for (const w of workerInstances) await w.close();
  await context.close();
  await browser.close();
  if (serverHandle) await serverHandle.close();
  sink.raw(`${nowIso()} [rec] finished frames=${done}/${totalPlanned} elapsed=${elapsed.toFixed(1)}s ` +
    `rate=${(done / Math.max(elapsed, 1e-9)).toFixed(2)}fps missing=${missing.length}`);
  await sink.close();

  const summary = {
    ok: !shared.fatal,
    out, url, fps, workers, duration,
    startFrame, endFrame, effectiveTo,
    totalFrames: totalPlanned,
    captured: done - shared.skipped,
    skipped: shared.skipped,
    missing: missing.length,
    missingFirst: missing.slice(0, 10),
    elapsedSec: +elapsed.toFixed(2),
    framesPerSec: +(done / Math.max(elapsed, 1e-9)).toFixed(2),
    bytes: shared.bytes,
    reloads: shared.counters.reloads,
    logFile, progressFile,
    perWorker: shared.perWorker,
  };
  if (!quiet) {
    log(`[rec] ${summary.ok ? 'OK' : 'FAILED'} ${done}/${totalPlanned} frames in ${fmtDur(elapsed)} ` +
      `(${summary.framesPerSec} fps) -> ${out}`);
    log(`[rec] log: ${logFile}`);
    log(`[rec] progress: ${progressFile}`);
  }
  // Machine-readable single line for run-all.mjs.
  log(`MV_RECORD_RESULT ${JSON.stringify(summary)}`);
  if (!summary.ok || missing.length) {
    warn(`[rec] FAILED: ${shared.fatalReason || 'incomplete frame set'}`);
    process.exitCode = 1;
  }
  void finalProgress;
}

main().catch((err) => {
  warn(`[rec] ERROR: ${err && err.stack || err}`);
  process.exitCode = 1;
});
