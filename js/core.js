/* ============================================================
   core.js — 基础工具 / 确定性随机 / 像素级辅助
   Win98 Vaporwave MV engine
   ============================================================ */
(function (global) {
  'use strict';

  const U = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    inv: (a, b, v) => U.clamp((v - a) / (b - a || 1e-9), 0, 1),
    smooth: (t) => t * t * (3 - 2 * t),
    easeIn: (t) => t * t,
    easeOut: (t) => 1 - (1 - t) * (1 - t),
    easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    easeOutBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
    easeOutElastic: (t) => {
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    // 确定性伪随机（mulberry32）
    rng: function (seed) {
      let a = seed >>> 0;
      return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    hash: function (str) {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return h >>> 0;
    },
    // 由字符串 + 序号得到稳定随机数
    srand: function (str, i) {
      const r = U.rng(U.hash(str + '|' + i));
      return r;
    },
    pad: (n, w) => String(n).padStart(w || 2, '0'),
    clock: function (sec) {
      sec = Math.max(0, sec);
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
      return U.pad(h) + ':' + U.pad(m) + ':' + U.pad(s);
    },
    el: function (tag, cls, html) {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html != null) e.innerHTML = html;
      return e;
    },
    $: (sel, root) => (root || document).querySelector(sel),
    $$: (sel, root) => Array.from((root || document).querySelectorAll(sel)),
    css: function (node, obj) { for (const k in obj) node.style[k] = obj[k]; return node; },
    attr: function (node, obj) { for (const k in obj) node.setAttribute(k, obj[k]); return node; },
    key: (o) => Object.keys(o).map((k) => k + '=' + o[k]).join('&'),
    fmtMoney: (n) => '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
    // Bayer 4x4 抖动矩阵 -> 用于 dither 纹理
    bayer4: [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]],
  };

  /* 全局状态：渲染模式（离线逐帧）与实时播放 */
  const ST = {
    render: /[?&]render=1/.test(location.search),
    t: 0,
    frame: 0,
    fps: 60,
    dpr: 1,
    W: 1920, H: 1080,
    reduced: /[?&]lowres=1/.test(location.search),
  };

  U.ST = ST;
  global.U = U;

  /* ---- 通用像素/故障字工具 ---- */
  const FX = {
    // 把文字打散为可独立动画的 span
    split: function (node, text) {
      node.innerHTML = '';
      const out = [];
      for (const ch of text) {
        const s = document.createElement('span');
        s.className = 'gl';
        s.textContent = ch === ' ' ? '\u00a0' : ch;
        node.appendChild(s);
        out.push(s);
      }
      return out;
    },
    glitchText: function (s, seed) {
      const pool = '!<>-_\\/[]{}—=+*^?#________░▒▓█▄▀■□▪◾01';
      const r = U.rng(U.hash(s + seed));
      return s.replace(/[a-zA-Z0-9]/g, (c) => (r() < 0.35 ? pool[Math.floor(r() * pool.length)] : c));
    },
    // 确定性鼠标缓动（带人手抖动）
    mousePath: function (t, a, b, dur, jitter, seed) {
      const p = U.inv(a, a + dur, t);
      const e = U.easeInOut(p);
      const r = U.rng(U.hash(seed || 'mouse'));
      const j = jitter || 0;
      const wob = Math.sin(t * 13.7) * j + (r() - 0.5) * j * 1.6;
      return {
        x: U.lerp(b[0], b[2], e) + wob,
        y: U.lerp(b[1], b[3], e) + Math.cos(t * 9.3) * j * 0.8,
        p: p,
      };
    },
  };
  global.FX = FX;
})(window);
