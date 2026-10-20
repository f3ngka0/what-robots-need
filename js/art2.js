/* ============================================================
   js/art2.js — ADDITIVE art primitives (loads AFTER art.js)
   ------------------------------------------------------------
   Rules honoured here:
     * never overwrites an existing ART.* member (def() is a
       no-op when the name is already taken)
     * fully self-contained: local rng / helpers, no globals but
       ART
     * deterministic: no Math.random / Date.now / rAF
   New API: see the bottom of the file (ART.art2Manifest).
   ============================================================ */
(function (global) {
  'use strict';

  var ART = global.ART || (global.ART = {});
  var TAU = Math.PI * 2;

  /* ---------- only-add guard ---------- */
  var ADDED = [];
  function def(name, fn) {
    if (typeof ART[name] === 'function') return false; // never override
    ART[name] = fn;
    ADDED.push(name);
    return true;
  }

  /* ---------- deterministic random (self-contained) ---------- */
  function hash(s) {
    s = String(s);
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = (typeof seed === 'number' ? seed : hash(seed)) >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function h2(x, y, s) {
    var h = (s | 0) ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function poly(g, pts, c, close) {
    if (!pts.length) return;
    g.fillStyle = c; g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    if (close) g.closePath();
    g.fill();
  }
  function strokePts(g, pts, c, w) {
    if (pts.length < 2) return;
    g.strokeStyle = c; g.lineWidth = w || 1; g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.stroke();
  }
  function offscreen(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    var g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { c: c, g: g };
  }
  /* chunky, non-antialiased ellipse built from horizontal spans */
  function oval(g, cx, cy, rx, ry, col, step) {
    step = step || 1;
    if (rx <= 0 || ry <= 0) return;
    g.fillStyle = col;
    for (var y = -ry; y < ry; y += step) {
      var k = (y + step * 0.5) / ry;
      var wdt = rx * Math.sqrt(Math.max(0, 1 - k * k));
      if (wdt < 0.35) continue;
      g.fillRect(cx - wdt, cy + y, wdt * 2, step);
    }
  }
  function capsule(g, x1, y1, x2, y2, r, col) {
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var n = Math.max(1, Math.ceil(len / Math.max(0.8, r * 0.45)));
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      oval(g, x1 + dx * t, y1 + dy * t, r, r, col);
    }
  }

  /* ============================================================
     5x7 pixel font  (no web fonts, ever)
     ============================================================ */
  var FONT_SRC = {
    'A': '01110/10001/10001/11111/10001/10001/10001',
    'B': '11110/10001/10001/11110/10001/10001/11110',
    'C': '01110/10001/10000/10000/10000/10001/01110',
    'D': '11110/10001/10001/10001/10001/10001/11110',
    'E': '11111/10000/10000/11110/10000/10000/11111',
    'F': '11111/10000/10000/11110/10000/10000/10000',
    'G': '01110/10001/10000/10111/10001/10001/01111',
    'H': '10001/10001/10001/11111/10001/10001/10001',
    'I': '01110/00100/00100/00100/00100/00100/01110',
    'J': '00111/00010/00010/00010/10010/10010/01100',
    'K': '10001/10010/10100/11000/10100/10010/10001',
    'L': '10000/10000/10000/10000/10000/10000/11111',
    'M': '10001/11011/10101/10101/10001/10001/10001',
    'N': '10001/11001/11001/10101/10011/10011/10001',
    'O': '01110/10001/10001/10001/10001/10001/01110',
    'P': '11110/10001/10001/11110/10000/10000/10000',
    'Q': '01110/10001/10001/10001/10101/10010/01101',
    'R': '11110/10001/10001/11110/10100/10010/10001',
    'S': '01111/10000/10000/01110/00001/00001/11110',
    'T': '11111/00100/00100/00100/00100/00100/00100',
    'U': '10001/10001/10001/10001/10001/10001/01110',
    'V': '10001/10001/10001/10001/10001/01010/00100',
    'W': '10001/10001/10001/10101/10101/11011/10001',
    'X': '10001/10001/01010/00100/01010/10001/10001',
    'Y': '10001/10001/01010/00100/00100/00100/00100',
    'Z': '11111/00001/00010/00100/01000/10000/11111',
    '0': '01110/10001/10011/10101/11001/10001/01110',
    '1': '00100/01100/00100/00100/00100/00100/01110',
    '2': '01110/10001/00001/00010/00100/01000/11111',
    '3': '11111/00010/00100/00010/00001/10001/01110',
    '4': '00010/00110/01010/10010/11111/00010/00010',
    '5': '11111/10000/11110/00001/00001/10001/01110',
    '6': '00110/01000/10000/11110/10001/10001/01110',
    '7': '11111/00001/00010/00100/01000/01000/01000',
    '8': '01110/10001/10001/01110/10001/10001/01110',
    '9': '01110/10001/10001/01111/00001/00010/01100',
    ' ': '00000/00000/00000/00000/00000/00000/00000',
    '.': '00000/00000/00000/00000/00000/00000/00100',
    ',': '00000/00000/00000/00000/00100/00100/01000',
    ':': '00000/00100/00000/00000/00100/00000/00000',
    ';': '00000/00100/00000/00000/00100/00100/01000',
    '!': '00100/00100/00100/00100/00100/00000/00100',
    '?': '01110/10001/00001/00110/00100/00000/00100',
    '-': '00000/00000/00000/11111/00000/00000/00000',
    '+': '00000/00100/00100/11111/00100/00100/00000',
    '=': '00000/00000/11111/00000/11111/00000/00000',
    '/': '00001/00010/00010/00100/01000/01000/10000',
    '\\': '10000/01000/01000/00100/00010/00010/00001',
    '$': '00100/01111/10100/01110/00101/11110/00100',
    '%': '11001/11010/00010/00100/01000/01011/10011',
    '#': '01010/01010/11111/01010/11111/01010/01010',
    '@': '01110/10001/10111/10101/10111/10000/01110',
    '(': '00010/00100/01000/01000/01000/00100/00010',
    ')': '01000/00100/00010/00010/00010/00100/01000',
    '[': '01110/01000/01000/01000/01000/01000/01110',
    ']': '01110/00010/00010/00010/00010/00010/01110',
    '<': '00010/00100/01000/10000/01000/00100/00010',
    '>': '01000/00100/00010/00001/00010/00100/01000',
    '*': '00000/10101/01110/11111/01110/10101/00000',
    "'": '00100/00100/00000/00000/00000/00000/00000',
    '"': '01010/01010/00000/00000/00000/00000/00000',
    '^': '00100/01010/10001/00000/00000/00000/00000',
    '_': '00000/00000/00000/00000/00000/00000/11111',
    '|': '00100/00100/00100/00100/00100/00100/00100',
    '~': '00000/00000/01001/10110/00000/00000/00000',
    '&': '01100/10010/10100/01000/10101/10010/01101',
    '\u2191': '00100/01110/11111/00100/00100/00100/00100',
    '\u2193': '00100/00100/00100/00100/11111/01110/00100',
    '\u2588': '11111/11111/11111/11111/11111/11111/11111',
    '\u00b0': '01100/10010/10010/01100/00000/00000/00000'
  };
  var FONT = {};
  (function () { for (var k in FONT_SRC) FONT[k] = FONT_SRC[k].split('/'); })();

  function textWidth(text, size, spacing) {
    spacing = spacing == null ? 1 : spacing;
    size = size || 1;
    return text.length * (5 + spacing) * size - spacing * size;
  }

  /* ART.pixelText(ctx, text, x, y, size, col, opts) -> width */
  def('pixelText', function (ctx, text, x, y, size, col, opts) {
    opts = opts || {};
    size = size || 2;
    var spacing = opts.spacing == null ? 1 : opts.spacing;
    var upper = opts.keepCase ? text : String(text).toUpperCase();
    var w = textWidth(upper, size, spacing);
    var ox = x;
    if (opts.align === 'center') ox = x - w / 2;
    else if (opts.align === 'right') ox = x - w;
    var drawAt = function (dx, dy, c) {
      var cx = ox + dx;
      for (var i = 0; i < upper.length; i++) {
        var gl = FONT[upper.charAt(i)] || FONT['?'];
        for (var r = 0; r < 7; r++) {
          var row = gl[r];
          for (var q = 0; q < 5; q++) {
            if (row.charAt(q) === '1') { ctx.fillStyle = c; ctx.fillRect(cx + q * size, y + dy + r * size, size, size); }
          }
        }
        cx += (5 + spacing) * size;
      }
    };
    if (opts.shadow) drawAt(size, size, opts.shadow);
    if (opts.outline) {
      var oc = opts.outline;
      drawAt(-size, 0, oc); drawAt(size, 0, oc); drawAt(0, -size, oc); drawAt(0, size, oc);
    }
    drawAt(0, 0, col || '#ffffff');
    return w;
  });

  /* ============================================================
     ART.sprayDots — MS-Paint airbrush scatter
     ============================================================ */
  def('sprayDots', function (ctx, cx, cy, r, n, seed, col, opts) {
    opts = opts || {};
    var rand = rng((seed >>> 0) || 1);
    var cell = opts.cell || 2;              // snap grid -> chunky airbrush
    var size = opts.size || 1;              // dot size in cells
    var falloff = opts.falloff == null ? 1.5 : opts.falloff;
    var squash = opts.squash == null ? 1 : opts.squash;
    var baseA = opts.alpha == null ? 1 : opts.alpha;
    var ring = opts.ring || 0;              // 0..1 -> bias outward (halo)
    var rot = opts.rot || 0;
    var cols = opts.colors || null;
    var ca = Math.cos(rot), sa = Math.sin(rot);
    ctx.save();
    for (var i = 0; i < n; i++) {
      var a = rand() * TAU;
      var rr = Math.sqrt(rand());
      if (ring) rr = lerp(rr, 1 - (1 - rr) * 0.28, ring);
      var dens = 1 - Math.pow(rr, falloff);
      dens *= 0.55 + 0.45 * rand();
      if (rand() > (opts.cover == null ? 1 : opts.cover) * dens) continue;
      var lx = Math.cos(a) * rr * r;
      var ly = Math.sin(a) * rr * r * squash;
      var x = cx + lx * ca - ly * sa;
      var y = cy + lx * sa + ly * ca;
      var gx = Math.round(x / cell) * cell;
      var gy = Math.round(y / cell) * cell;
      ctx.globalAlpha = baseA * (0.30 + 0.70 * dens);
      ctx.fillStyle = cols ? cols[(i * 7919) % cols.length] : (col || '#ff00aa');
      ctx.fillRect(gx, gy, cell * size, cell * size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  });

  /* ============================================================
     ART.princessHand — a small pixel hand gripping a pencil
       s     = overall size in px (the sprite is s x s, centred)
       angle = rotation in radians (0 = pencil points down-left)
       opts  = { crisp, tremor, sleeve, skin, pencil, outline,
                 flip, alpha }
     ----------------------------------------------
     Painted as a real spinner-style pixel sprite: a 96x96 indexed
     grid, integer scanline spans, then a 1px dark dilate pass for
     the MS-Paint outline. No antialiasing ever, and it always fits
     its box. The sprite is cached; only the blit is per call.
     ============================================================ */
  var HX = 96;                       // sprite design grid
  var handCache = {};

  function buildHandSprite(cols) {
    var N = HX * HX;
    var g = new Uint8Array(N);
    var I = {
      out: 1, skin: 2, sh: 3, hi: 4, slv: 5, slvDk: 6, slvLt: 7,
      yel: 8, yelLt: 9, yelDk: 10, fer: 11, ferDk: 12,
      ers: 13, ersDk: 14, wood: 15, woodDk: 16, grf: 17, white: 18, dark: 19
    };
    function put(x, y, v) {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= HX || y >= HX) return;
      g[y * HX + x] = v;
    }
    function get(x, y) {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= HX || y >= HX) return 0;
      return g[y * HX + x];
    }
    function hspan(x0, x1, y, v) {
      if (x1 < x0) { var t2 = x0; x0 = x1; x1 = t2; }
      for (var x = Math.round(x0); x <= Math.round(x1); x++) put(x, y, v);
    }
    function ovalI(cx, cy, rx, ry, v) {
      for (var y = -ry; y <= ry; y++) {
        var f = y / ry;
        var wd = rx * Math.sqrt(Math.max(0, 1 - f * f));
        if (wd < 0.5) continue;
        hspan(cx - wd, cx + wd, cy + y, v);
      }
    }
    function barI(x0, y0, x1, y1, r, v) {
      var dx = x1 - x0, dy = y1 - y0;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var n = Math.max(1, Math.ceil(len / Math.max(0.7, r * 0.4)));
      for (var i = 0; i <= n; i++) {
        var t = i / n;
        ovalI(x0 + dx * t, y0 + dy * t, r, r, v);
      }
    }
    function polyI(pts, v) {
      var minY = 1e9, maxY = -1e9, i;
      for (i = 0; i < pts.length; i++) {
        if (pts[i][1] < minY) minY = pts[i][1];
        if (pts[i][1] > maxY) maxY = pts[i][1];
      }
      for (var y = Math.round(minY); y <= Math.round(maxY); y++) {
        var ym = y + 0.5, xs = [];
        for (i = 0; i < pts.length; i++) {
          var a = pts[i], b = pts[(i + 1) % pts.length];
          if ((a[1] <= ym && b[1] > ym) || (b[1] <= ym && a[1] > ym)) {
            xs.push(a[0] + (ym - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
          }
        }
        xs.sort(function (m, n) { return m - n; });
        for (var k = 0; k + 1 < xs.length; k += 2) hspan(xs[k], xs[k + 1], y, v);
      }
    }
    /* 1px dark outline around every filled shape (8-neighbour) */
    function dilate(v) {
      var src = g.slice();
      for (var y = 0; y < HX; y++) {
        for (var x = 0; x < HX; x++) {
          if (src[y * HX + x]) continue;
          var hit = 0;
          for (var dy = -1; dy <= 1 && !hit; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
              var nx = x + dx, ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= HX || ny >= HX) continue;
              if (src[ny * HX + nx] && dx * dx + dy * dy <= 2) { hit = 1; break; }
            }
          }
          if (hit) g[y * HX + x] = v;
        }
      }
    }

    /* ---- pencil (point lower-left, eraser upper-right) ----
       it is drawn FIRST and the fist then covers its middle: that
       occlusion is what makes it read as "being held".            */
    var G = [47, 51];                  // where the fist sits on the shaft
    var D = 0.70710678;
    var PW = 4.6;                      // pencil half width
    function along(t) { return [G[0] + D * t, G[1] - D * t]; }
    function at(t, q) { return [G[0] + D * t + D * q, G[1] - D * t + D * q]; }
    function pquad(t0, t1, hw, v) {
      polyI([at(t0, -hw), at(t0, hw), at(t1, hw), at(t1, -hw)], v);
    }

    /* ---- sleeve (behind everything; exits bottom-right) ---- */
    polyI([[60, 58], [96, 44], [96, 96], [50, 96]], I.slv);
    polyI([[78, 96], [96, 68], [96, 86], [90, 96]], I.slvDk);

    /* ---- pencil ---- */
    pquad(-58, -50, PW * 0.14, I.grf);
    pquad(-50, -44, PW * 0.50, I.grf);
    pquad(-44, -33, PW, I.wood);
    pquad(-33, 32, PW, I.yel);
    pquad(32, 37, PW, I.fer);
    pquad(37, 47, PW * 0.95, I.ers);
    for (var t = -33; t < 32; t += 0.4) {
      var cA = at(t, -PW * 0.55), cB = at(t, PW * 0.75);
      put(cA[0], cA[1], I.yelLt);
      put(cB[0], cB[1], I.yelDk);
      put(cB[0] + 1, cB[1], I.yelDk);
    }
    for (var t2 = 37; t2 < 47; t2 += 0.4) {
      var cE = at(t2, -PW * 0.5);
      put(cE[0], cE[1], I.white);
    }
    pquad(32, 33.6, PW, I.ferDk);
    pquad(35.4, 37, PW, I.ferDk);
    for (var q2 = -PW; q2 <= PW; q2 += 0.5) {
      var w0 = at(-33, q2); put(w0[0], w0[1], I.woodDk);
      var g0 = at(-56, q2 * 0.3); put(g0[0], g0[1], 20);
    }

    /* ---- fist: palm + finger mass, covering the shaft middle ---- */
    ovalI(G[0] + 3, G[1] + 4, 19, 17, I.skin);
    ovalI(G[0] + 1, G[1] + 2, 17, 15, I.skin);
    ovalI(G[0] - 5, G[1] - 4, 9, 7, I.hi);
    ovalI(G[0] + 9, G[1] + 8, 8, 6, I.sh);
    /* heel of the hand toward the sleeve */
    ovalI(G[0] + 13, G[1] + 13, 10, 9, I.skin);
    ovalI(G[0] + 15, G[1] + 15, 6, 5, I.sh);

    /* four finger bulges + curled tips, only on the near side */
    var FING = [
      { t: -6.0, q: -1.0, len: 11, r: 4.9 },
      { t: 4.5, q: -1.5, len: 11, r: 4.8 },
      { t: 15.0, q: -2.0, len: 10, r: 4.5 },
      { t: 25.0, q: -2.5, len: 9, r: 4.0 }
    ];
    for (var fi = 0; fi < FING.length; fi++) {
      var F = FING[fi];
      var top = at(F.t, -PW - 1.2);            // where the finger crosses the shaft
      var tip = at(F.t, -PW - 1.2 - F.len);    // curled over the far side
      barI(top[0], top[1], tip[0], tip[1], F.r, I.skin);
      ovalI(tip[0], tip[1], F.r * 0.95, F.r * 0.9, I.skin);
      ovalI(tip[0] - 0.8, tip[1] - 1.0, F.r * 0.48, F.r * 0.4, I.hi);
      /* the knuckle bulge sits on the palm side of the shaft */
      var kn = at(F.t, 3.5);
      ovalI(kn[0], kn[1], F.r * 1.12, F.r * 1.05, I.skin);
      ovalI(kn[0] - 1, kn[1] - 1.2, F.r * 0.55, F.r * 0.45, I.hi);
    }

    /* thumb: from the palm across the shaft toward the point */
    var th0 = at(14, 12), th1 = at(-12, 2.0);
    barI(th0[0], th0[1], th1[0], th1[1], 6.2, I.skin);
    ovalI(th1[0], th1[1], 5.4, 4.8, I.skin);
    ovalI(th1[0] - 1.4, th1[1] - 1.8, 3.4, 2.6, I.hi);
    barI(th0[0] - 1.5, th0[1] - 1.9, th1[0] - 1, th1[1] - 1.7, 1.9, I.hi);

    /* cuff frill last so it sits on top of the wrist */
    for (var f = 0; f < 7; f++) {
      var cf = at(30 + f * 1.6, 20 + f * 2.2);
      ovalI(cf[0], cf[1], 4.4, 4.0, I.slvLt);
      ovalI(cf[0] + 1, cf[1] + 1, 3.1, 2.7, I.slv);
      ovalI(cf[0] - 1, cf[1] - 1, 1.5, 1.2, '#ffd0e4');
    }

    /* ---- outline pass ---- */
    dilate(I.out);

    /* ---- detail pass: creases, nails, seams ---- */
    /* crease between each pair of fingers, on the near side of the shaft */
    for (var fs = 0; fs < FING.length - 1; fs++) {
      var gapT = (FING[fs].t + FING[fs + 1].t) / 2;
      for (var q5 = -PW - 4; q5 <= 6; q5 += 0.7) {
        var cp = at(gapT, q5);
        put(cp[0], cp[1], I.out);
      }
    }
    /* fingertip nails (curled over the far side) */
    for (var fn = 0; fn < FING.length; fn++) {
      var Ft = FING[fn];
      var npt = at(Ft.t, -PW - 1.2 - Ft.len + 1.4);
      ovalI(npt[0], npt[1], 2.5, 1.9, I.skin);
      ovalI(npt[0] - 0.4, npt[1] - 0.5, 1.7, 1.2, I.hi);
    }
    /* thumbnail */
    ovalI(th1[0] - 0.6, th1[1] - 2.8, 3.1, 2.2, I.skin);
    ovalI(th1[0] - 0.8, th1[1] - 3.0, 2.1, 1.4, I.hi);
    /* wrist crease into the cuff */
    for (var q4 = 0; q4 <= 1; q4 += 0.05) {
      var wA = at(26, 16), wB = at(20, 26);
      put(lerp(wA[0], wB[0], q4), lerp(wA[1], wB[1], q4), I.sh);
    }

    /* ---- to RGBA ---- */
    var pal = [];
    pal[0] = null;
    pal[1] = cols.outline; pal[2] = cols.skin; pal[3] = cols.sh; pal[4] = cols.hi;
    pal[5] = cols.sleeve; pal[6] = cols.sleeveDark; pal[7] = cols.sleeveLight;
    pal[8] = cols.pencil; pal[9] = '#ffe98a'; pal[10] = '#c09000';
    pal[11] = '#b0b0c0'; pal[12] = '#707080';
    pal[13] = '#ff7aa8'; pal[14] = '#c04070';
    pal[15] = '#e8b878'; pal[16] = '#b08040';
    pal[17] = '#303038'; pal[18] = '#ffffff';
    pal[19] = '#585868'; pal[20] = '#8a8a9a';
    var rgba = [];
    for (var pi = 0; pi < pal.length; pi++) rgba[pi] = pal[pi] ? hexRgba(pal[pi]) : [0, 0, 0, 0];

    var o = offscreen(HX, HX);
    var img = o.g.createImageData(HX, HX);
    var d = img.data;
    for (var yy = 0; yy < HX; yy++) {
      for (var xx = 0; xx < HX; xx++) {
        var v = g[yy * HX + xx];
        var c = rgba[v] || [0, 0, 0, 0];
        var off = (yy * HX + xx) * 4;
        d[off] = c[0]; d[off + 1] = c[1]; d[off + 2] = c[2]; d[off + 3] = c[3];
      }
    }
    o.g.putImageData(img, 0, 0);
    return o.c;
  }

  function hexRgba(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
  }

  def('princessHand', function (ctx, cx, cy, s, angle, opts) {
    opts = opts || {};
    s = s || 64;
    var cols = {
      skin: opts.skin || '#f8c090',
      sh: opts.shadow || '#dfa070',
      hi: opts.highlight || '#ffdcb8',
      outline: opts.outline || '#4a1a00',
      sleeve: opts.sleeve || '#d04090',
      sleeveDark: opts.sleeveDark || '#902060',
      sleeveLight: opts.sleeveLight || '#ff8ac0',
      pencil: opts.pencil || '#ffd700'
    };
    var key = cols.skin + cols.sleeve + cols.pencil + cols.outline + cols.hi;
    if (!handCache[key]) handCache[key] = buildHandSprite(cols);
    var sprite = handCache[key];

    var crisp = opts.crisp !== false;
    var ang = +angle || 0;
    if (crisp) ang = Math.round(ang / (Math.PI / 16)) * (Math.PI / 16);
    if (opts.tremor) ang += Math.sin((cx + cy) * 0.05) * 0.02 * opts.tremor;

    /* snap the scale to 1/2 px steps so sprites stay chunky */
    var kq = Math.max(0.5, Math.round((s / HX) * 2) / 2);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    if (opts.flip) ctx.scale(-1, 1);
    ctx.scale(kq, kq);
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    ctx.drawImage(sprite, -HX / 2, -HX / 2);
    ctx.globalAlpha = 1;
    ctx.restore();
  });

  /* ============================================================
     ART.wireDavidSkull — red-eyed burning wireframe skull bust
       s = height in px; slow rotation driven by t
     ============================================================ */
  /* v: 0 = crown, 1 = base of the bust.  r = half width normalised to
     the widest part of the cranium (1.0).  The head occupies v 0..0.72
     so it keeps a real skull's ~1.35 : 1 height/width ratio.        */
  var SKULL_PROFILE = [
    [0.000, 0.20], [0.025, 0.46], [0.060, 0.66], [0.105, 0.81],
    [0.160, 0.92], [0.220, 0.98], [0.285, 1.00], [0.350, 1.00],
    [0.410, 0.99], [0.455, 0.98], [0.495, 0.96], [0.525, 0.93],
    /* zygomatic arch then a hard taper into the jaw */
    [0.555, 0.88], [0.585, 0.81], [0.615, 0.72], [0.645, 0.62],
    [0.670, 0.51], [0.690, 0.41], [0.705, 0.33], [0.720, 0.27],
    /* neck: ~45% of the head width */
    [0.745, 0.30], [0.775, 0.33], [0.805, 0.38],
    /* shoulder flare -> bust base */
    [0.840, 0.62], [0.875, 0.98], [0.910, 1.30], [0.945, 1.52],
    [0.975, 1.64], [1.000, 1.68]
  ];
  function skullRadius(v) {
    var p = SKULL_PROFILE;
    if (v <= p[0][0]) return p[0][1];
    for (var i = 0; i < p.length - 1; i++) {
      if (v <= p[i + 1][0]) {
        var t = (v - p[i][0]) / (p[i + 1][0] - p[i][0]);
        return lerp(p[i][1], p[i + 1][1], t);
      }
    }
    return p[p.length - 1][1];
  }

  def('wireDavidSkull', function (ctx, cx, cy, s, t, opts) {
    opts = opts || {};
    s = s || 400;
    var rot = opts.spin == null ? Math.sin(t * 0.55) * 0.62 : opts.spin;
    var H = s * 1.60, HW = s * 0.40;
    var bone = opts.color || '#9fe8ff';
    var front = opts.color2 || '#00ffff';
    var back = opts.back || '#ff00aa';
    var emberCol = opts.ember || '#ff2a55';
    var top = cy - s * 0.5;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    /* burning backlight */
    var glow = ctx.createRadialGradient(cx, cy - s * 0.12, s * 0.05, cx, cy - s * 0.12, s * 0.9);
    glow.addColorStop(0, 'rgba(255,40,80,0.34)');
    glow.addColorStop(0.45, 'rgba(180,0,60,0.15)');
    glow.addColorStop(1, 'rgba(40,0,20,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - s, cy - s, s * 2, s * 2);

    function proj(bx, by, bz) {
      var ca = Math.cos(rot), sa = Math.sin(rot);
      var X = bx * ca + bz * sa;
      var Z = -bx * sa + bz * ca;
      var p = 1 / (1 - Z / (s * 2.6));
      return { x: cx + X * p, y: cy + by * p, z: Z, p: p };
    }
    function surf(v, theta) {
      var r = skullRadius(v) * HW;
      var by = (v - 0.5) * H;
      var bx = Math.sin(theta) * r;
      var bz = Math.cos(theta) * r * 1.12;
      return proj(bx, by, bz);
    }

    /* ---- solid silhouette so the skull reads, not just the cage ---- */
    var sil = [];
    for (var si2 = 0; si2 <= 30; si2++) {
      var vv = si2 / 30;
      var f = skullRadius(vv) * HW;
      sil.push([cx + f, cy - s * 0.59 + vv * H]);
    }
    for (var si3 = 30; si3 >= 0; si3--) {
      var vv2 = si3 / 30;
      var f2 = skullRadius(vv2) * HW;
      sil.push([cx - f2, cy - s * 0.59 + vv2 * H]);
    }
    poly(ctx, sil, 'rgba(14,0,12,0.92)', true);
    /* bone wash inside the silhouette */
    ctx.globalAlpha = 0.14;
    poly(ctx, sil, '#3a1030', true);
    ctx.globalAlpha = 1;

    var RINGS = 18, LAT = 22;
    var pathF = [], pathB = [];
    function seg(a, b) {
      var mid = (a.z + b.z) / 2;
      (mid >= 0 ? pathF : pathB).push([a.x, a.y, b.x, b.y]);
    }
    /* latitude rings */
    for (var ri = 0; ri <= RINGS; ri++) {
      var v = ri / RINGS;
      var prev = null;
      for (var li = 0; li <= LAT; li++) {
        var th = (li / LAT) * TAU;
        var pt = surf(v, th);
        if (prev) seg(prev, pt);
        prev = pt;
      }
    }
    /* meridians */
    for (var mi = 0; mi < 8; mi++) {
      var th2 = (mi / 8) * TAU;
      var prev2 = null;
      for (var vi = 0; vi <= 40; vi++) {
        var pt2 = surf(vi / 40, th2);
        if (prev2) seg(prev2, pt2);
        prev2 = pt2;
      }
    }
    function flush(segs, col, lw, alpha) {
      if (!segs.length) return;
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (var i = 0; i < segs.length; i++) { ctx.moveTo(segs[i][0], segs[i][1]); ctx.lineTo(segs[i][2], segs[i][3]); }
      ctx.stroke();
    }
    flush(pathB, back, 1.0, 0.40);
    flush(pathB, back, 3.0, 0.10);
    flush(pathF, front, 1.35, 0.85);
    flush(pathF, front, 4.0, 0.14);
    ctx.globalAlpha = 1;

    /* ---- eye sockets: big, sunken, angled, just under the brow ---- */
    var eyeTh = 0.52, eyeV = 0.400;
    for (var e = 0; e < 2; e++) {
      var sx = surf(eyeV, e ? eyeTh : -eyeTh);
      var rad = s * 0.088 * sx.p;
      var lit = 0.72 + 0.28 * Math.cos(rot + (e ? 0.5 : -0.5));
      ctx.globalAlpha = 1;
      /* brow ridge shadow above the socket */
      oval(ctx, sx.x, sx.y - rad * 1.30, rad * 1.45, rad * 0.46, 'rgba(0,0,0,0.6)');
      /* socket cavity: taller than wide, tilted outward like a real orbit */
      ctx.save();
      ctx.translate(sx.x, sx.y);
      ctx.rotate(e ? 0.20 : -0.20);
      oval(ctx, 0, 0, rad * 1.02, rad * 1.16, '#080006');
      oval(ctx, 0, rad * 0.3, rad * 0.86, rad * 0.7, '#15000a');
      ctx.restore();
      var eg = ctx.createRadialGradient(sx.x, sx.y, 0.5, sx.x, sx.y, rad * 2.0);
      eg.addColorStop(0, 'rgba(255,' + Math.round(50 + 60 * lit) + ',110,' + (0.8 * lit).toFixed(3) + ')');
      eg.addColorStop(0.4, 'rgba(255,0,70,' + (0.42 * lit).toFixed(3) + ')');
      eg.addColorStop(1, 'rgba(150,0,40,0)');
      ctx.fillStyle = eg;
      ctx.fillRect(sx.x - rad * 2.1, sx.y - rad * 2.1, rad * 4.2, rad * 4.2);
      oval(ctx, sx.x, sx.y, rad * 0.40, rad * 0.40, lit > 0.8 ? '#ff5570' : '#e02040');
      oval(ctx, sx.x, sx.y, rad * 0.19, rad * 0.19, '#fff2f2');
      /* socket rim */
      ctx.strokeStyle = bone; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(sx.x, sx.y, rad * 1.06, rad * 1.2, e ? 0.20 : -0.20, 0, TAU); ctx.stroke();
    }

    /* ---- cheekbones + temple lines ---- */
    ctx.globalAlpha = 0.55; ctx.strokeStyle = bone; ctx.lineWidth = 1.2;
    for (var cb = 1; cb >= -1; cb -= 2) {
      var c0 = surf(0.50, cb * 0.62), c1 = surf(0.60, cb * 1.0), c2 = surf(0.68, cb * 0.72);
      ctx.beginPath();
      ctx.moveTo(c0.x, c0.y); ctx.quadraticCurveTo(c1.x, c1.y, c2.x, c2.y);
      ctx.stroke();
      var t0 = surf(0.30, cb * 1.15), t1 = surf(0.46, cb * 1.12);
      ctx.beginPath(); ctx.moveTo(t0.x, t0.y); ctx.lineTo(t1.x, t1.y); ctx.stroke();
    }

    /* ---- nasal cavity ---- */
    ctx.globalAlpha = 1;
    var nz = surf(0.545, 0);
    var nw = s * 0.036 * nz.p, nh = s * 0.055 * nz.p;
    poly(ctx, [[nz.x, nz.y - nh], [nz.x + nw, nz.y + nh * 0.62], [nz.x + nw * 0.3, nz.y + nh * 0.2],
    [nz.x - nw * 0.3, nz.y + nh * 0.2], [nz.x - nw, nz.y + nh * 0.62]], '#080006', true);
    ctx.globalAlpha = 0.55; ctx.fillStyle = 'rgba(255,60,90,0.35)';
    ctx.fillRect(nz.x - nw * 0.7, nz.y + nh * 0.2, nw * 1.4, nh * 0.4);

    /* ---- teeth (upper + lower rows, slight zigzag) ---- */
    ctx.globalAlpha = 1;
    var tz = surf(0.665, 0);
    var tw = s * 0.0145 * tz.p, tht = s * 0.026 * tz.p;
    for (var tc = -4; tc <= 4; tc++) {
      var tx = tz.x + tc * tw * 2.1;
      px(ctx, tx - tw * 0.82, tz.y - tht * 0.35, tw * 1.64, tht, '#080006');
      ctx.strokeStyle = bone; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
      ctx.strokeRect(tx - tw * 0.82, tz.y - tht * 0.35, tw * 1.64, tht);
    }
    /* jaw line */
    var jaw = [];
    for (var j = 0; j <= 12; j++) {
      var th3 = -0.85 + (j / 12) * 1.7;
      var jp = surf(0.735, th3);
      jaw.push([jp.x, jp.y]);
    }
    ctx.globalAlpha = 0.65; strokePts(ctx, jaw, bone, 1.6);

    /* ---- embers ---- */
    ctx.globalAlpha = 1;
    var rand = rng(hash('skull-ember'));
    for (var q = 0; q < 44; q++) {
      var ex = (rand() - 0.5) * s * 0.72;
      var ey0 = rand() * s * 0.9;
      var sp = 0.18 + rand() * 0.45;
      var ey = ((ey0 - t * sp * s * 0.5) % (s * 0.9) + s * 0.9) % (s * 0.9);
      var col = rand() < 0.35 ? '#ffd0a0' : emberCol;
      var al = 0.25 + 0.6 * rand();
      ctx.globalAlpha = al * (1 - ey / (s * 0.95));
      ctx.fillStyle = col;
      var sz = rand() < 0.3 ? 2 : 1;
      ctx.fillRect(Math.round(cx + ex), Math.round(top + s * 0.95 - ey), sz, sz);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  });

  /* ============================================================
     ART.voodooCard — 3dfx Voodoo PCI card, spinning wireframe
       x,y,w,h = box on screen, t = seconds
       opts { rpm, angle, tilt, label, glow, seed }
     ============================================================ */
  def('voodooCard', function (ctx, x, y, w, h, t, opts) {
    opts = opts || {};
    var rpm = opts.rpm == null ? 420 : opts.rpm;      // "high RPM"
    var ang = opts.angle == null ? (t * rpm / 60) * TAU : opts.angle;
    var tilt = opts.tilt == null ? 0.30 : opts.tilt;
    var cx0 = x + w / 2, cy0 = y + h / 2;
    var S = Math.min(w * 0.80, h * 1.22);
    var label = opts.label || '3DFX';
    var green = opts.trace || '#00ff9c';
    var cyan = opts.chip || '#7fe8ff';
    var gold = opts.gold || '#ffcc33';
    var magenta = opts.glow || '#ff00aa';
    var ca = Math.cos(ang), sa = Math.sin(ang);
    var ct = Math.cos(tilt), st = Math.sin(tilt);

    function P(bx, by, bz) {
      var X = bx * ca + bz * sa;
      var Z = -bx * sa + bz * ca;
      var Y = by * ct - Z * st;
      var Z2 = by * st + Z * ct;
      var p = 1 / (1 + Z2 * 0.42);
      return { x: cx0 + X * S * p, y: cy0 + Y * S * p, z: Z2, p: p };
    }
    var line = function (a, b) { a.lineTo(b.x, b.y); };
    function pathOf(pts, col, lw, alpha, dash) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (var i = 0; i < pts.length; i++) {
        var q = P(pts[i][0], pts[i][1], pts[i][2] == null ? 0.02 : pts[i][2]);
        if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      }
      if (dash) ctx.setLineDash(dash); else ctx.setLineDash([]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    function quadOf(pts, col, alpha, stroke) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (var i = 0; i < pts.length; i++) {
        var q = P(pts[i][0], pts[i][1], pts[i][2] == null ? 0.02 : pts[i][2]);
        if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      }
      ctx.closePath();
      if (stroke) { ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke(); }
      else { ctx.fillStyle = col; ctx.fill(); }
    }
    function boxOf(x0, y0, x1, y1, z0, z1, col, alpha) {
      var c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      for (var i = 0; i < 4; i++) {
        var a = c[i], b = c[(i + 1) % 4];
        pathOf([[a[0], a[1], z1], [b[0], b[1], z1]], col, 1.1, alpha);
        pathOf([[a[0], a[1], z0], [b[0], b[1], z0]], col, 1.1, alpha * 0.5);
        pathOf([[a[0], a[1], z0], [a[0], a[1], z1]], col, 1.1, alpha * 0.7);
      }
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.lineJoin = 'round';

    /* glow halo */
    var gl = ctx.createRadialGradient(cx0, cy0, S * 0.05, cx0, cy0, S * 0.72);
    gl.addColorStop(0, 'rgba(255,0,170,0.16)');
    gl.addColorStop(1, 'rgba(255,0,170,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(cx0 - S, cy0 - S, S * 2, S * 2);

    /* ---- board outline + thickness ---- */
    boxOf(-0.5, -0.33, 0.5, 0.33, -0.02, 0.02, green, 0.85);
    /* faint fill so the card reads as a solid */
    quadOf([[-0.5, -0.33, 0.02], [0.5, -0.33, 0.02], [0.5, 0.33, 0.02], [-0.5, 0.33, 0.02]], 'rgba(0,40,25,0.55)', 1, false);

    /* ---- PCI edge connector (gold fingers) ---- */
    for (var f = 0; f < 21; f++) {
      var fx0 = -0.315 + f * 0.0304;
      quadOf([[fx0, 0.255, 0.021], [fx0 + 0.021, 0.255, 0.021], [fx0 + 0.021, 0.325, 0.021], [fx0, 0.325, 0.021]], gold, 0.75, false);
    }
    pathOf([[-0.33, 0.25, 0.023], [0.33, 0.25, 0.023]], gold, 1.2, 0.9);

    /* ---- GPU chip ---- */
    boxOf(-0.30, -0.11, -0.02, 0.13, 0.021, 0.075, cyan, 0.95);
    quadOf([[-0.285, -0.095, 0.022], [-0.035, -0.095, 0.022], [-0.035, 0.115, 0.022], [-0.285, 0.115, 0.022]], 'rgba(20,60,90,0.55)', 1, false);
    /* die */
    boxOf(-0.20, -0.03, -0.07, 0.06, 0.022, 0.028, '#b8f0ff', 0.8);
    /* tiny chip label projected onto the face */
    if (Math.cos(ang) > 0.34) {
      var gx = -0.265, gy = -0.055, cw = 0.0068, ch = 0.0072;
      var glyphs = label.split('');
      for (var gi = 0; gi < glyphs.length; gi++) {
        var gl2 = FONT[glyphs[gi].toUpperCase()] || FONT['?'];
        for (var gr = 0; gr < 7; gr++) {
          for (var gc = 0; gc < 5; gc++) {
            if (gl2[gr].charAt(gc) !== '1') continue;
            var x0 = gx + (gi * 6 + gc) * cw, y0 = gy + gr * ch;
            quadOf([[x0, y0, 0.024], [x0 + cw, y0, 0.024], [x0 + cw, y0 + ch, 0.024], [x0, y0 + ch, 0.024]], '#dffcff', 0.85 * Math.cos(ang), false);
          }
        }
      }
    }

    /* ---- texture RAM chips ---- */
    var ram = [[0.06, -0.20], [0.06, -0.075], [0.06, 0.05], [0.20, -0.06], [0.20, 0.065]];
    for (var r = 0; r < ram.length; r++) {
      boxOf(ram[r][0], ram[r][1], ram[r][0] + 0.12, ram[r][1] + 0.10, 0.021, 0.045, gold, 0.55);
    }
    /* ---- capacitors ---- */
    for (var cp = 0; cp < 4; cp++) {
      var ccx = 0.36, ccy = -0.20 + cp * 0.11;
      var rim = [], top = [];
      for (var ca2 = 0; ca2 < 12; ca2++) {
        var aa = (ca2 / 12) * TAU;
        rim.push([ccx + Math.cos(aa) * 0.035, ccy + Math.sin(aa) * 0.035, 0.021]);
        top.push([ccx + Math.cos(aa) * 0.028, ccy + Math.sin(aa) * 0.028, 0.055]);
      }
      pathOf(rim.concat([rim[0]]), gold, 1, 0.6);
      pathOf(top.concat([top[0]]), cyan, 1, 0.5);
      for (var sp = 0; sp < 4; sp++) pathOf([rim[sp * 3], top[sp * 3]], gold, 0.8, 0.4);
    }

    /* ---- PCB traces ---- */
    for (var tr = 0; tr < 9; tr++) {
      var ty = -0.09 + tr * 0.026;
      pathOf([[-0.02, ty, 0.022], [0.02, ty, 0.022], [0.035, ty - 0.03, 0.022], [0.06, ty - 0.03, 0.022]], green, 0.9, 0.42);
    }
    for (var tr2 = 0; tr2 < 6; tr2++) {
      var tx0 = -0.33 + tr2 * 0.021;
      pathOf([[tx0, 0.15, 0.022], [tx0 + 0.05, 0.15, 0.022], [tx0 + 0.07, 0.24, 0.022]], green, 0.8, 0.35);
    }

    /* ---- bracket + VGA connector (left edge) ---- */
    boxOf(-0.53, -0.35, -0.49, 0.35, -0.06, 0.06, '#b8c4cc', 0.9);
    boxOf(-0.49, -0.09, -0.40, 0.16, -0.05, 0.05, '#3355cc', 0.95);
    pathOf([[-0.40, -0.09, 0.05], [-0.40, 0.16, 0.05]], '#88aaff', 1.4, 0.8);
    /* screw tabs */
    pathOf([[-0.52, -0.33, 0.06], [-0.52, -0.26, 0.06]], '#e8f0f4', 2, 0.9);

    /* back face ghost */
    quadOf([[-0.5, -0.33, -0.02], [0.5, -0.33, -0.02], [0.5, 0.33, -0.02], [-0.5, 0.33, -0.02]], 'rgba(255,0,170,0.55)', 0.30, true);

    /* corner ticks */
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = magenta; ctx.lineWidth = 1.4;
    var tl = P(-0.5, -0.33, 0.02), br = P(0.5, 0.33, 0.02);
    ctx.beginPath();
    ctx.moveTo(tl.x - 10, tl.y); ctx.lineTo(tl.x, tl.y); ctx.lineTo(tl.x, tl.y - 10);
    ctx.moveTo(br.x + 10, br.y); ctx.lineTo(br.x, br.y); ctx.lineTo(br.x, br.y + 10);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.restore();
  });

  /* ============================================================
     ART.bsodCrop — crop of a Win98 blue screen
       x,y,w,h box; opts { scale, seed, cursor, blur, title }
     ============================================================ */
  def('bsodCrop', function (ctx, x, y, w, h, opts) {
    opts = opts || {};
    var rand = rng(opts.seed == null ? 1998 : opts.seed);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    px(ctx, x, y, w, h, opts.bg || '#0000aa');
    /* subtle vignette + scanlines */
    var vg = ctx.createLinearGradient(x, y, x, y + h);
    vg.addColorStop(0, 'rgba(0,0,60,0.25)');
    vg.addColorStop(0.5, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,40,0.35)');
    ctx.fillStyle = vg; ctx.fillRect(x, y, w, h);
    for (var sy = y; sy < y + h; sy += 3) { ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fillRect(x, sy, w, 1); }

    /* scale chosen so the longest line fits the box (never overflows) */
    var LINES = [
      'A fatal exception 0E has occurred at 0028:C0011E36',
      'in VXD VMM(01) + 00010E36. The current application',
      'will be terminated.',
      '',
      '*  Press any key to terminate the current application.',
      '*  Press CTRL+ALT+DEL again to restart your computer.',
      '   You will lose any unsaved information in all',
      '   applications.',
      '',
      '            Press any key to continue _'
    ];
    var padC = Math.max(4, Math.round(Math.min(w, h) * 0.045));
    var avail = w - padC * 2;
    var longest = 0, i;
    for (i = 0; i < LINES.length; i++) longest = Math.max(longest, LINES[i].length);
    var sc = opts.scale;
    if (!sc) sc = Math.max(1, Math.min(Math.floor(avail / (longest * 6)), Math.floor(h / 26)));
    else sc = Math.max(1, Math.min(sc, Math.floor(avail / (longest * 6))));

    /* "Windows" title tag */
    var tagW = textWidth('WINDOWS', sc);
    px(ctx, x + padC - 2, y + padC - 2, tagW + 4, sc * 7 + 4, '#c0c0c0');
    ART.pixelText(ctx, 'Windows', x + padC, y + padC, sc, '#0000aa');
    var ty = y + padC + sc * 7 + Math.round(sc * 2.5);
    var lh = sc * 9;

    for (i = 0; i < LINES.length; i++) {
      if (ty + sc * 7 > y + h - padC * 0.4) break;
      ART.pixelText(ctx, LINES[i], x + padC, ty, sc, '#e8e8e8');
      ty += lh;
    }
    /* corrupt tail: hex garbage in the same blue-screen voice */
    if (opts.hex !== false) {
      var hexs = '0123456789ABCDEF';
      for (var g2 = 0; g2 < 8 && ty + sc * 7 < y + h - padC * 0.4; g2++) {
        var line = '0x' + (0x400000 + g2 * 16).toString(16).toUpperCase() + '  ';
        for (var b = 0; b < 10; b++) line += hexs[(rand() * 16) | 0] + hexs[(rand() * 16) | 0] + ' ';
        ART.pixelText(ctx, line, x + padC, ty, sc, 'rgba(200,200,255,0.5)');
        ty += lh;
      }
    }
    /* block cursor on the "press any key" line */
    if (opts.cursor !== false && Math.floor((opts.t || 0) * 2) % 2 === 0) {
      px(ctx, x + padC + textWidth('PRESS ANY KEY TO CONTINUE', sc) - sc * 4,
        y + h - padC - sc * 9, sc * 5, sc * 7, '#e8e8e8');
    }
    ctx.restore();
  });

  /* ============================================================
     ART.stockTicker — scrolling market tape
       x,y,w,h box; t seconds; seed; opts {scale, speed, bg, items}
     ============================================================ */
  var tickCache = {};
  function tickItems(seed, n) {
    var key = 'tk' + seed + '_' + n;
    if (tickCache[key]) return tickCache[key];
    var rand = rng(seed >>> 0);
    var names = ['PIGS', 'VOODOO', '3DFX', 'PCLIP', 'WIN98', 'PRNCS', 'SNDBLT', 'MTX',
      'HEART', 'DIALUP', 'REGEDT', 'BSOD', 'NVRMND', 'DOOM', 'MMX', 'AGP', 'PENTM', 'TRIAD'];
    var out = [];
    for (var i = 0; i < n; i++) {
      var nm = names[(rand() * names.length) | 0];
      var price = (rand() * 900 + 3).toFixed(2);
      var chg = (rand() * 40 - 8);
      out.push({ sym: nm, price: price, chg: chg, up: chg >= 0 });
    }
    tickCache[key] = out;
    return out;
  }
  def('stockTicker', function (ctx, x, y, w, h, t, seed, opts) {
    opts = opts || {};
    var sc = opts.scale || 2;
    var items = opts.items || tickItems(seed == null ? 7 : seed, 14);
    var speed = opts.speed == null ? 90 : opts.speed;
    var colUp = opts.up || '#00ff66';
    var colDn = opts.down || '#ff3355';
    var sym = opts.symbol || '#ffe066';
    var gap = sc * 9;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    px(ctx, x, y, w, h, opts.bg || '#04120a');
    for (var sy = y; sy < y + h; sy += 3) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x, sy, w, 1); }
    /* top / bottom rails */
    px(ctx, x, y, w, Math.max(1, sc * 0.7), opts.rail || '#0a3a20');
    px(ctx, x, y + h - Math.max(1, sc * 0.7), w, Math.max(1, sc * 0.7), opts.rail || '#0a3a20');

    var measure = function (it) {
      var chgTxt = (it.up ? '+' : '') + it.chg.toFixed(2) + '%';
      return textWidth(it.sym, sc) + sc * 4 + textWidth(it.price, sc) + sc * 4 + textWidth(chgTxt, sc) + gap;
    };
    var total = 0, i;
    for (i = 0; i < items.length; i++) total += measure(items[i]);
    var off = ((t * speed) % total + total) % total;
    var ty = y + h / 2 - sc * 3.5;

    var drawRun = function (startX) {
      var cx = startX;
      for (var k = 0; k < items.length; k++) {
        var it = items[k];
        var chgTxt = (it.up ? '+' : '') + it.chg.toFixed(2) + '%';
        if (cx > x + w) break;
        if (cx + measure(it) > x) {
          ART.pixelText(ctx, it.sym, cx, ty, sc, sym);
          var px2 = cx + textWidth(it.sym, sc) + sc * 4;
          ART.pixelText(ctx, it.price, px2, ty, sc, '#dfe8ff');
          var px3 = px2 + textWidth(it.price, sc) + sc * 4;
          ART.pixelText(ctx, chgTxt, px3, ty, sc, it.up ? colUp : colDn);
          /* tiny sparkline */
          var sxx = px3 + textWidth(chgTxt, sc) + sc * 2;
          var pts = [];
          for (var s = 0; s < 9; s++) {
            var hv = h2(s, k, seed == null ? 7 : seed);
            pts.push([sxx + s * sc * 1.6, ty + sc * 3 + (hv - 0.5) * sc * 5 + (it.up ? -2 : 2)]);
          }
          strokePts(ctx, pts, it.up ? colUp : colDn, Math.max(1, sc * 0.55));
        }
        cx += measure(it);
      }
    };
    drawRun(x - off);
    drawRun(x - off + total);
    /* arrow that never lies */
    ctx.globalAlpha = 0.5;
    px(ctx, x + w - sc * 9, y + 2, sc * 7, h - 4, 'rgba(0,255,120,0.12)');
    ctx.globalAlpha = 1;
    ctx.restore();
  });

  /* ============================================================
     ART.neonSign — glowing tube sign
       cx,cy = centre, size = pixel cell, t seconds
       opts { color, core, flicker, sub, align }
     ============================================================ */
  def('neonSign', function (ctx, cx, cy, text, size, t, opts) {
    opts = opts || {};
    var col = opts.color || '#ff2a8d';
    var core = opts.core || '#ffe8f4';
    var sc = size || 6;
    var w = textWidth(text, sc);
    var x0 = opts.align === 'left' ? cx : cx - w / 2;
    var y0 = cy - sc * 3.5;
    /* deterministic flicker */
    var slot = Math.floor(t * 9);
    var f = 0.82 + 0.18 * Math.sin(t * 13.1) + 0.06 * Math.sin(t * 31.7);
    if (h2(slot, 3, 99) < (opts.dropout == null ? 0.06 : opts.dropout)) f *= 0.28;
    if (opts.flicker === false) f = 1;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    /* outer bloom */
    ctx.globalCompositeOperation = 'lighter';
    var passes = [
      { blur: sc * 4.5, a: 0.55, c: col },
      { blur: sc * 2.0, a: 0.75, c: col },
      { blur: sc * 0.8, a: 0.95, c: opts.hot || '#ff9ec8' }
    ];
    for (var p = 0; p < passes.length; p++) {
      ctx.save();
      ctx.shadowColor = passes[p].c;
      ctx.shadowBlur = passes[p].blur;
      ctx.globalAlpha = passes[p].a * f;
      ART.pixelText(ctx, text, x0, y0, sc, passes[p].c);
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = clamp(0.55 + 0.45 * f, 0, 1);
    ART.pixelText(ctx, text, x0, y0, sc, core);
    ctx.globalAlpha = 1;
    /* tube outline: skip a few segments so it reads as a bent tube */
    ctx.globalAlpha = 0.55 * f;
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, sc * 0.22);
    var pad = sc * 2;
    ctx.beginPath();
    ctx.moveTo(x0 - pad, y0 + sc * 7 + pad * 0.4);
    ctx.lineTo(x0 - pad, y0 - pad * 0.4);
    ctx.lineTo(x0 + w + pad * 0.4, y0 - pad * 0.4);
    ctx.stroke();
    ctx.globalAlpha = 1;
    /* reflection */
    ctx.globalAlpha = 0.16 * f;
    ctx.save();
    ctx.translate(0, (y0 + sc * 3.5) * 2);
    ctx.scale(1, -0.55);
    ctx.filter = 'none';
    ART.pixelText(ctx, text, x0, y0, sc, col);
    ctx.restore();
    /* wet-floor streaks */
    var rand = rng(hash(text + '|' + sc));
    ctx.globalAlpha = 0.13 * f;
    for (var s2 = 0; s2 < 14; s2++) {
      var sx = x0 + rand() * w;
      var sl = sc * (1 + rand() * 6);
      px(ctx, sx, y0 + sc * 8 + rand() * sc * 4, Math.max(1, sc * 0.3), sl, col);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  });

  /* ============================================================
     manifest + self-check
     ============================================================ */
  ART.art2Manifest = {
    version: 1,
    added: ADDED.slice(),
    signatures: {
      pixelText: 'ART.pixelText(ctx, text, x, y, size, col, opts) -> width',
      sprayDots: 'ART.sprayDots(ctx, cx, cy, r, n, seed, col, opts)',
      princessHand: 'ART.princessHand(ctx, cx, cy, s, angle, opts)',
      wireDavidSkull: 'ART.wireDavidSkull(ctx, cx, cy, s, t, opts)',
      voodooCard: 'ART.voodooCard(ctx, x, y, w, h, t, opts)',
      bsodCrop: 'ART.bsodCrop(ctx, x, y, w, h, opts)',
      stockTicker: 'ART.stockTicker(ctx, x, y, w, h, t, seed, opts)',
      neonSign: 'ART.neonSign(ctx, cx, cy, text, size, t, opts)'
    }
  };
  ART.art2TextWidth = textWidth;
})(window);
