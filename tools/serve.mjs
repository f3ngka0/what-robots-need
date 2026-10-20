#!/usr/bin/env node
/**
 * serve.mjs — zero-dependency static file server for the offline MV render pipeline.
 *
 *   node tools/serve.mjs [--root <dir>] [--port 8899] [--host 127.0.0.1]
 *                        [--no-parent-fallback] [--quiet]
 *
 * Features
 *  - correct MIME for .html .js .css .mjs .json .png .mp3 .lrc (+ a few extras)
 *  - HTTP Range (206 / 416) so <audio> can seek; works for any file type
 *  - handles concurrent requests (node:http is concurrent; no shared mutable state)
 *  - serves files from --root (default: the mv project root = parent of tools/)
 *  - falls back to the parent directory of --root for files referenced as
 *    "../AWAAWA - WHAT ROBOTS NEED.mp3": browsers clamp "../" at the origin root,
 *    so the request arrives as "/AWAAWA%20-%20WHAT%20ROBOTS%20NEED.mp3" and we
 *    resolve it against --root first, then against its parent. Containment is
 *    checked for every candidate, so this cannot escape one directory up.
 *  - /__mv_health returns JSON {ok:true,...} (used by record.mjs to reuse a server)
 *
 * Exported: parseArgs, createServer, startServer, probeHealth.
 */
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ROOT = path.resolve(HERE, '..');
export const DEFAULT_PORT = 8899;
export const HEALTH_PATH = '/__mv_health';

const MIME = new Map(Object.entries({
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.lrc': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.srt': 'text/plain; charset=utf-8',
  '.vtt': 'text/vtt; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
}));

export function mimeFor(file) {
  return MIME.get(path.extname(file).toLowerCase()) || 'application/octet-stream';
}

/** Minimal `--flag value` / `--flag=value` / boolean-flag parser. */
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (typeof a !== 'string' || !a.startsWith('--')) { out._.push(a); continue; }
    const eq = a.indexOf('=');
    let key, val;
    if (eq !== -1) { key = a.slice(2, eq); val = a.slice(eq + 1); }
    else {
      key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !String(next).startsWith('--')) { val = next; i++; }
      else val = true;
    }
    out[key.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())] = val;
  }
  return out;
}

function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}

/** Decode a request pathname safely; returns null when it cannot be trusted. */
function safeUrlPath(rawUrl) {
  let p = String(rawUrl || '/').split('#')[0].split('?')[0];
  try { p = decodeURIComponent(p); } catch { return null; }
  if (p.includes('\0')) return null;
  return p.replace(/\\/g, '/');
}

/** Parse a single-range header. Returns null (ignore), {start,end} or {bad:true}. */
function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header || '').trim());
  if (!m) return null;
  const [, sa, sb] = m;
  if (sa === '' && sb === '') return null;
  if (size === 0) return { bad: true };
  let start, end;
  if (sa === '') {
    const suffix = Number(sb);
    if (!Number.isFinite(suffix) || suffix <= 0) return { bad: true };
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(sa);
    end = sb === '' ? size - 1 : Number(sb);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return { bad: true };
    if (start > end || start >= size) return { bad: true };
    end = Math.min(end, size - 1);
  }
  return { start, end };
}

function sendJson(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

/**
 * @param {object} opts
 * @param {string} [opts.root]             directory to serve (absolute or cwd-relative)
 * @param {boolean} [opts.parentFallback]  also resolve misses against parent of root
 * @param {'quiet'|'normal'|'verbose'} [opts.logLevel]
 * @param {(line:string)=>void} [opts.log]
 */
export function createServer(opts = {}) {
  const root = path.resolve(opts.root || DEFAULT_ROOT);
  const parentFallback = opts.parentFallback !== false;
  const logLevel = opts.logLevel || (opts.quiet ? 'quiet' : 'normal');
  const log = opts.log || ((line) => process.stdout.write(line + '\n'));
  const startedAt = Date.now();
  const counters = { requests: 0, ranged: 0, errors: 0, bytes: 0 };

  // Serve --root first; optional parent directory is a second, contained root so that
  // "../AWAAWA - WHAT ROBOTS NEED.mp3" (clamped to "/AWAAWA...mp3" by the browser) resolves.
  const roots = [root];
  const parent = path.resolve(root, '..');
  if (parentFallback && parent !== root) roots.push(parent);

  let inFlight = 0;

  const server = http.createServer(async (req, res) => {
    counters.requests++;
    inFlight++;
    const t0 = Date.now();
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      inFlight--;
      if (logLevel === 'verbose') {
        log(`[serve] ${req.method} ${req.url} -> ${res.statusCode} ${Date.now() - t0}ms inflight=${inFlight}`);
      }
    };
    res.on('close', done);
    res.on('finish', done);

    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { Allow: 'GET, HEAD, OPTIONS', 'Cache-Control': 'no-store' });
        return res.end();
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        counters.errors++;
        return sendJson(res, 405, { ok: false, error: 'method not allowed' });
      }

      const urlPath = safeUrlPath(req.url);
      if (urlPath === null) {
        counters.errors++;
        return sendJson(res, 400, { ok: false, error: 'bad path' });
      }
      if (urlPath === HEALTH_PATH) {
        return sendJson(res, 200, {
          ok: true, pid: process.pid, root, parentFallback,
          uptimeSec: Math.round((Date.now() - startedAt) / 1000), counters,
        });
      }
      // Browsers always probe /favicon.ico; answer 204 so the capture log stays clean.
      if (urlPath === '/favicon.ico') {
        res.writeHead(204, { 'Cache-Control': 'no-store' });
        return res.end();
      }

      // Resolve candidate file: URL path is relative to each allowed root.
      const relRaw = urlPath.replace(/^\/+/, '');
      const rel = relRaw === '' ? 'index.html' : relRaw;
      let found = null;
      for (const base of roots) {
        const abs = path.resolve(base, rel);
        if (!isInside(base, abs)) continue;
        try {
          const st = await fsp.stat(abs);
          if (st.isFile()) { found = { abs, st, base }; break; }
          if (st.isDirectory()) continue; // no directory listing
        } catch { /* try next root */ }
      }
      if (!found) {
        if (logLevel !== 'quiet') log(`[serve] 404 ${req.method} ${urlPath}`);
        counters.errors++;
        return sendJson(res, 404, { ok: false, error: 'not found', path: urlPath });
      }

      const { abs, st } = found;
      const size = st.size;
      const type = mimeFor(abs);
      const baseHeaders = {
        'Content-Type': type,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Last-Modified': st.mtime.toUTCString(),
      };

      const rangeHeader = req.headers.range;
      const range = rangeHeader ? parseRange(rangeHeader, size) : null;
      if (range && range.bad) {
        counters.errors++;
        res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${size}`, 'Content-Length': 0 });
        return res.end();
      }
      if (range) {
        counters.ranged++;
        const len = range.end - range.start + 1;
        res.writeHead(206, {
          ...baseHeaders,
          'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
          'Content-Length': len,
        });
        if (req.method === 'HEAD') return res.end();
        const stream = fs.createReadStream(abs, { start: range.start, end: range.end });
        stream.on('error', (err) => {
          counters.errors++;
          if (!res.headersSent) sendJson(res, 500, { ok: false, error: String(err) });
          else res.destroy(err);
        });
        stream.on('data', (c) => { counters.bytes += c.length; });
        stream.pipe(res);
        return;
      }

      res.writeHead(200, { ...baseHeaders, 'Content-Length': size });
      if (req.method === 'HEAD') return res.end();
      const stream = fs.createReadStream(abs);
      stream.on('error', (err) => {
        counters.errors++;
        if (!res.headersSent) sendJson(res, 500, { ok: false, error: String(err) });
        else res.destroy(err);
      });
      stream.on('data', (c) => { counters.bytes += c.length; });
      stream.pipe(res);
    } catch (err) {
      counters.errors++;
      if (logLevel !== 'quiet') log(`[serve] 500 ${req.method} ${req.url}: ${err && err.stack || err}`);
      if (!res.headersSent) sendJson(res, 500, { ok: false, error: String(err) });
      else res.destroy(err);
    }
  });

  server.on('clientError', (err, socket) => {
    counters.errors++;
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });
  server.keepAliveTimeout = 10_000;
  server.requestTimeout = 0; // large asset reads must not be cut off
  server.headersTimeout = 60_000;

  server.on('listening', () => {
    if (logLevel !== 'quiet') {
      const a = server.address();
      log(`[serve] root=${root} parentFallback=${parentFallback} url=http://${a.address}:${a.port}/`);
    }
  });

  server.mvCounters = counters;
  server.mvRoot = root;
  return server;
}

/** Start a server and resolve once listening. port 0 picks a free port. */
export async function startServer(opts = {}) {
  const server = createServer(opts);
  const port = opts.port === undefined ? DEFAULT_PORT : Number(opts.port);
  const host = opts.host || '127.0.0.1';
  await new Promise((resolve, reject) => {
    const onErr = (err) => { server.off('listening', onOk); reject(err); };
    const onOk = () => { server.off('error', onErr); resolve(); };
    server.once('error', onErr);
    server.once('listening', onOk);
    server.listen(port, host);
  });
  const addr = server.address();
  return {
    server,
    port: addr.port,
    host,
    url: `http://${host}:${addr.port}/`,
    close: () => new Promise((resolve) => {
      server.closeAllConnections?.();
      server.close(() => resolve());
    }),
  };
}

/** Probe /__mv_health. Resolves to the parsed JSON, or null when nothing is listening. */
export async function probeHealth(port, host = '127.0.0.1', timeoutMs = 1000) {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: HEALTH_PATH, timeout: timeoutMs }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          resolve(j && j.ok ? j : null);
        } catch { resolve(null); }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

/* ------------------------------------------------------------------ CLI ---- */
const isMain = (() => {
  try {
    return path.resolve(process.argv[1] || '') === path.resolve(fileURLToPath(import.meta.url));
  } catch { return false; }
})();

if (isMain) {
  const a = parseArgs(process.argv.slice(2));
  if (a.help) {
    process.stdout.write('usage: node tools/serve.mjs [--root DIR] [--port 8899] [--host 127.0.0.1] [--no-parent-fallback] [--quiet]\n');
    process.exit(0);
  }
  const root = path.resolve(a.root || DEFAULT_ROOT);
  const port = a.port === undefined ? DEFAULT_PORT : Number(a.port);
  const host = a.host || '127.0.0.1';
  const logLevel = a.quiet ? 'quiet' : (a.verbose ? 'verbose' : 'normal');

  const server = createServer({ root, parentFallback: a.parentFallback !== false, logLevel });
  server.once('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      process.stderr.write(`[serve] port ${port} is already in use.\n` +
        `        Reuse it, or pick another: node tools/serve.mjs --port ${port + 1}\n`);
      process.exit(2);
    }
    process.stderr.write(`[serve] ${err && err.stack || err}\n`);
    process.exit(1);
  });
  server.listen(port, host, () => {
    const addr = server.address();
    process.stdout.write(`[serve] listening http://${host}:${addr.port}/  root=${root}\n`);
  });
  const shutdown = () => {
    try { server.closeAllConnections?.(); } catch { }
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
