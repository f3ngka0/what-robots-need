/* ============================================================
   windows.js — Win98 窗口工厂 / 层管理 / 死机残影拖尾
   ============================================================ */
(function (global) {
  'use strict';
  const U = global.U;
  const W = {};

  /* ---------- 窗口构造 ---------- */
  let uid = 0;
  /**
   * opts: {x,y,w,h,title,cls,titleCls,icon,noResize,body,bodyHtml,menubar,status,appId}
   */
  W.make = function (o) {
    o = o || {};
    const win = document.createElement('div');
    win.className = 'win98-window ' + (o.cls || '');
    win.dataset.wid = 'w' + (++uid);
    win.style.cssText =
      'position:absolute;left:' + (o.x | 0) + 'px;top:' + (o.y | 0) + 'px;' +
      (o.w ? 'width:' + (o.w | 0) + 'px;' : '') +
      (o.h ? 'height:' + (o.h | 0) + 'px;' : '') +
      (o.z != null ? 'z-index:' + o.z + ';' : '') +
      (o.extra || '');

    let h = '';
    // titlebar
    h += '<div class="titlebar ' + (o.titleCls || 'titlebar--classic') + '">' +
      (o.icon ? '<span class="tb-icon" data-ico="' + o.icon + '"></span>' : '') +
      '<span class="tb-title">' + (o.title || '') + '</span>' +
      '<div class="tb-btns">' +
      (o.noResize ? '' : '<button class="tb-btn tb-min" aria-label="min">_</button>') +
      (o.noResize ? '' : '<button class="tb-btn tb-max" aria-label="max">□</button>') +
      '<button class="tb-btn tb-close" aria-label="close">✕</button>' +
      '</div></div>';
    if (o.menubar) h += o.menubar;
    h += '<div class="win-body' + (o.bodyCls ? ' ' + o.bodyCls : '') + '">' + (o.bodyHtml || '') + '</div>';
    if (o.status) h += o.status;
    win.innerHTML = h;
    return win;
  };

  W.menubar = function (items) {
    return '<div class="menubar">' + items.map((m) => '<span class="menu-item">' + m + '</span>').join('') + '</div>';
  };
  W.statusbar = function (cells) {
    return '<div class="statusbar">' + cells.map((c) => '<div class="status-cell">' + c + '</div>').join('') + '</div>';
  };
  W.progress = function (pct, cls) {
    return '<div class="progress98 ' + (cls || '') + '"><div class="progress98__fill" style="width:' + U.clamp(pct, 0, 100) + '%"></div></div>';
  };

  /* ============================================================
     聚光灯层级管理：同屏只允许一个核心主窗口
     核心窗口 -> .is-focus（z-index 500，全不透明）
     其余窗口 -> .is-dimmed（opacity .3 + brightness .5 + blur 2px）
     ============================================================ */
  W.spotlight = function (rootEl, focusEl) {
    if (!rootEl) return;
    const wins = rootEl.querySelectorAll('.win98-window');
    for (let i = 0; i < wins.length; i++) {
      const w = wins[i];
      const on = (w === focusEl);
      w.classList.toggle('is-focus', on);
      w.classList.toggle('is-dimmed', !on && focusEl != null);
    }
  };
  W.clearSpotlight = function (rootEl) {
    if (!rootEl) return;
    const wins = rootEl.querySelectorAll('.win98-window');
    for (let i = 0; i < wins.length; i++) {
      wins[i].classList.remove('is-focus');
      wins[i].classList.remove('is-dimmed');
    }
  };

  /* ---------- 图层（每个 scene 自己一个 DOM 层） ---------- */
  W.layer = function (id, z) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = 'layer';
      document.getElementById('stage').appendChild(el);
    }
    el.style.zIndex = z != null ? z : 10;
    return el;
  };
  W.clearLayer = function (id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  };

  /* ============================================================
     死机残影拖尾引擎（Solitaire Ghosting）
     每个 ghost source 用一个离屏 canvas 记录窗口快照；
     不清屏，只在窗口移动时把新位置盖印上去。
     ============================================================ */
  class GhostTrail {
    constructor(canvas, opts) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.opts = opts || {};
      this.decay = this.opts.decay != null ? this.opts.decay : 0.06; // 每帧淡出
      this.maxAge = this.opts.maxAge || 0;
      this.stamps = [];
      this.mode = (this.opts.mode || 'accumulate');
    }
    resize(w, h) {
      this.cv.width = w; this.cv.height = h;
      this.ctx.clearRect(0, 0, w, h);
    }
    clear() { this.ctx.clearRect(0, 0, this.cv.width, this.cv.height); this.stamps.length = 0; }
    /* 盖印一张快照（HTMLCanvasElement 或 ImageBitmap） */
    stamp(img, x, y, w, h, alpha, tint) {
      const c = this.ctx;
      c.save();
      c.globalAlpha = alpha == null ? 1 : alpha;
      if (tint) {
        c.globalCompositeOperation = 'source-over';
        c.drawImage(img, x, y, w, h);
        c.globalCompositeOperation = 'source-atop';
        c.fillStyle = tint; c.fillRect(x, y, w, h);
      } else {
        c.drawImage(img, x, y, w, h);
      }
      c.restore();
    }
    /* 每帧衰减：把整张画布轻微擦掉一层（保留阶梯长龙） */
    fade(k) {
      const c = this.ctx;
      c.save();
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = 'rgba(0,0,0,' + (k == null ? this.decay : k) + ')';
      c.fillRect(0, 0, this.cv.width, this.cv.height);
      c.restore();
    }
  }

  /* 把任意 DOM 节点快照到离屏 canvas（用于窗口残影）。
     注意：在离线渲染模式下由场景显式调用，保证确定性。 */
  W.snapDOM = function (node, scale) {
    // DOM 无法直接光栅化；用 window 自身的重绘模拟：抓取其几何+外观
    return null; // 由具体场景用 "矩形残影" 或 canvas 绘制的假窗口代替
  };

  /* ---------- 假窗口栅格化 ---------- */
  /* 在 canvas 上画一个 Win98 窗口（用于成百上千个残影窗口的高性能表现） */
  W.drawWinRect = function (ctx, x, y, w, h, opt) {
    opt = opt || {};
    const tb = opt.titleH || 16;
    const grey = opt.bodyFill || '#c0c0c0';
    // 外框
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(x, y, w, h);
    // 3D 倒角（2px）
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, h);
    ctx.fillStyle = '#dfdfdf'; ctx.fillRect(x + 1, y + 1, w - 1, 1); ctx.fillRect(x + 1, y + 1, 1, h - 1);
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x + w - 1, y, 1, h);
    ctx.fillStyle = '#808080'; ctx.fillRect(x + 1, y + h - 2, w - 2, 1); ctx.fillRect(x + w - 2, y + 1, 1, h - 2);
    // 标题栏
    const g = ctx.createLinearGradient(x + 3, 0, x + w - 3, 0);
    const c0 = opt.titleFrom || '#000080', c1 = opt.titleTo || '#1084d0';
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.fillRect(x + 3, y + 3, w - 6, tb);
    // 标题文字（像素感：直接 fillText 小字号）
    if (opt.title) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x + 4, y + 3, w - 22, tb); ctx.clip();
      ctx.fillStyle = opt.titleColor || '#ffffff';
      ctx.font = (opt.titleFont || 'bold 9px Tahoma,MS Sans Serif,sans-serif');
      ctx.textBaseline = 'middle';
      ctx.fillText(opt.title, x + 6, y + 3 + tb / 2 + 0.5);
      ctx.restore();
    }
    // 三个小按钮
    let bx = x + w - 6 - 14;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#c0c0c0'; ctx.fillRect(bx, y + 4, 14, 12);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(bx, y + 4, 14, 1); ctx.fillRect(bx, y + 4, 1, 12);
      ctx.fillStyle = '#0a0a0a'; ctx.fillRect(bx, y + 15, 14, 1); ctx.fillRect(bx + 13, y + 4, 1, 12);
      if (i === 2) { // ✕
        ctx.fillStyle = '#000';
        ctx.fillRect(bx + 5, y + 9, 5, 1); ctx.fillRect(bx + 7, y + 7, 1, 5);
      }
      bx -= 16;
    }
    // 内部凹陷客户区
    if (opt.body) {
      ctx.fillStyle = opt.bodyFill || '#ffffff';
      ctx.fillRect(x + 4, y + 4 + tb, w - 8, h - 8 - tb);
      ctx.fillStyle = '#808080';
      ctx.fillRect(x + 4, y + 4 + tb, w - 8, 1); ctx.fillRect(x + 4, y + 4 + tb, 1, h - 8 - tb);
    }
    // 标题栏高频闪烁（红蓝）
    if (opt.flash) {
      ctx.globalAlpha = opt.flash * 0.55;
      ctx.fillStyle = opt.flashColor || '#ff0000';
      ctx.fillRect(x + 3, y + 3, w - 6, tb);
      ctx.globalAlpha = 1;
    }
  };

  W.GhostTrail = GhostTrail;
  global.W98 = W;
})(window);
