/* ============================================================
   world.js — 底层蒸汽波世界 (canvas): 桌面 / 网格 / 太阳 / 大卫 / 噪点
   ============================================================ */
(function (global) {
  'use strict';
  const U = global.U;
  const World = {};

  World.init = function (cv) {
    this.cv = cv;
    this.ctx = cv.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.W = cv.width; this.H = cv.height;
    this.mode = 'teal';
    this.energy = 0;
  };

  /* 桌面纯色 #008080 */
  World.teal = function (ctx, w, h, t) {
    ctx.fillStyle = '#008080';
    ctx.fillRect(0, 0, w, h);
    // 桌面壁纸的轻微 CRT 噪点由后期层负责
  };

  /* 蒸汽波天空 + 条纹落日 */
  World.sky = function (ctx, w, h, t, e, opt) {
    const horizon = h * (opt && opt.horizon || 0.56);
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, '#1a0838');
    g.addColorStop(0.35, '#3d0d63');
    g.addColorStop(0.62, '#8b1e8f');
    g.addColorStop(0.82, '#e03c7a');
    g.addColorStop(1, '#ff8a3d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, horizon + 1);

    // 星点
    const r = U.rng(1337);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 120; i++) {
      const x = r() * w, y = r() * horizon * 0.75;
      const s = r() < 0.85 ? 1 : 2;
      if ((r() * 1) < 0.75) ctx.fillRect(x | 0, y | 0, s, s);
    }

    // 落日（条纹）
    const sunR = Math.min(w, h) * 0.19 * (1 + e * 0.05);
    const cx = w * 0.5, cy = horizon - sunR * 0.32;
    World.stripedSun(ctx, cx, cy, sunR, t, e);
  };

  World.stripedSun = function (ctx, cx, cy, R, t, e) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createLinearGradient(0, cy - R, 0, cy + R);
    g.addColorStop(0, '#ffe66d');
    g.addColorStop(0.35, '#ff9f45');
    g.addColorStop(0.62, '#ff4d6d');
    g.addColorStop(1, '#c9184a');
    ctx.fillStyle = g;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    // 横向条纹（下半部渐宽）
    const bands = 14;
    const drift = (t * 10) % 40;
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < bands; i++) {
      const p = i / bands;
      const y = cy - R + (p * p * 2.4) * R * 2 + drift * p * 0.6;
      const hgt = 1 + p * 7;
      ctx.fillStyle = 'rgba(0,0,0,' + (0.55 + p * 0.45) + ')';
      ctx.fillRect(cx - R, y, R * 2, hgt);
    }
    ctx.restore();
    // 光晕
    const gg = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.9);
    gg.addColorStop(0, 'rgba(255,80,160,' + (0.30 + e * 0.2) + ')');
    gg.addColorStop(1, 'rgba(255,80,160,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);
  };

  /* 无限透视线框网格地面 */
  World.grid = function (ctx, w, h, t, e, opt) {
    const horizon = h * (opt && opt.horizon || 0.56);
    if (opt && opt.floor) {
      const fg = ctx.createLinearGradient(0, horizon, 0, h);
      fg.addColorStop(0, '#12021f');
      fg.addColorStop(1, '#2b0640');
      ctx.fillStyle = fg;
      ctx.fillRect(0, horizon, w, h - horizon);
    }
    const cx = w * 0.5;
    const speed = (opt && opt.speed || 1) * 0.55;

    ctx.save();
    ctx.lineWidth = 1;
    // 竖线（从消失点放射）
    const nv = 26;
    for (let i = 0; i <= nv; i++) {
      const p = (i / nv - 0.5) * 2;
      const a = 1 - Math.min(1, Math.abs(p) * 0.55);
      ctx.strokeStyle = p < 0 ? 'rgba(0,255,255,' + (0.30 * a) + ')' : 'rgba(255,0,170,' + (0.30 * a) + ')';
      ctx.beginPath();
      ctx.moveTo(cx + p * w * 0.06, horizon);
      ctx.lineTo(cx + p * w * 1.55, h);
      ctx.stroke();
    }
    // 横线（透视压缩 + 起伏）
    const rows = 26;
    for (let i = 0; i < rows; i++) {
      let p = ((i / rows) + (t * 0.18 * speed)) % 1;
      p = p * p * p; // 透视压缩
      const y = horizon + p * (h - horizon) * 1.08;
      if (y < horizon) continue;
      const amp = 1 + p * 9 * (1 + e * 2.2);
      const alpha = 0.10 + p * 0.5;
      ctx.strokeStyle = 'rgba(0,255,255,' + alpha + ')';
      ctx.beginPath();
      const seg = 12;
      for (let k = 0; k <= seg; k++) {
        const x = (k / seg) * w;
        const yy = y + Math.sin(k * 0.7 + t * 2.2 + i * 0.9) * amp * (e * 0.9 + 0.12);
        if (k === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
      // 品红描边（离屏 1px 制造色差感）
      ctx.strokeStyle = 'rgba(255,0,170,' + (alpha * 0.45) + ')';
      ctx.beginPath();
      for (let k = 0; k <= seg; k++) {
        const x = (k / seg) * w;
        const yy = y + 2 + Math.sin(k * 0.7 + t * 2.2 + i * 0.9) * amp * (e * 0.9 + 0.12);
        if (k === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  /* 半透明旋转线框大卫石膏像 */
  World.david = function (ctx, cx, cy, s, t, opt) {
    opt = opt || {};
    const col = opt.color || '#00ffff';
    const col2 = opt.color2 || '#ff00aa';
    ctx.save();
    ctx.translate(cx, cy);
    const rot = Math.sin(t * 0.35) * 0.55;
    ctx.scale(Math.cos(rot) * 1, 1); // 伪 3D 旋转（水平挤压）
    ctx.globalAlpha = opt.alpha == null ? 0.42 : opt.alpha;
    ctx.lineWidth = opt.lw || 1.4;
    ctx.strokeStyle = col;

    // 剪影轮廓（参数化）：头 + 颈 + 肩 + 胸
    const pts = [];
    const N = 46;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      // 头部椭圆 + 下巴收窄 + 卷发锯齿
      let rx = 0.30, ry = 0.40;
      let x = Math.cos(a) * rx, y = Math.sin(a) * ry - 0.42;
      // 下巴
      if (y > 0.10) { x *= 0.86 - (y - 0.1) * 0.5; }
      // 卷发轮廓抖动
      const hair = Math.sin(a * 9) * 0.018 + Math.sin(a * 5) * 0.012;
      x *= 1 + hair; y *= 1 + hair;
      pts.push([x, y]);
    }
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * s, p[1] * s) : ctx.moveTo(p[0] * s, p[1] * s)));
    ctx.closePath();
    ctx.stroke();

    // 颈部
    ctx.beginPath();
    ctx.moveTo(-0.10 * s, -0.02 * s); ctx.lineTo(-0.13 * s, 0.20 * s);
    ctx.lineTo(0.13 * s, 0.20 * s); ctx.lineTo(0.10 * s, -0.02 * s);
    ctx.stroke();
    // 肩 / 胸
    ctx.beginPath();
    ctx.moveTo(-0.13 * s, 0.20 * s);
    ctx.quadraticCurveTo(-0.62 * s, 0.26 * s, -0.74 * s, 0.72 * s);
    ctx.lineTo(-0.74 * s, 0.86 * s);
    ctx.lineTo(0.74 * s, 0.86 * s);
    ctx.lineTo(0.74 * s, 0.72 * s);
    ctx.quadraticCurveTo(0.62 * s, 0.26 * s, 0.13 * s, 0.20 * s);
    ctx.stroke();

    // 内部等值线（鼻梁 / 眼窝 / 唇 / 锁骨）
    ctx.strokeStyle = col2;
    ctx.globalAlpha = (opt.alpha == null ? 0.42 : opt.alpha) * 0.62;
    const inner = [
      [[-0.06, -0.62], [0.0, -0.46], [0.03, -0.34], [0.0, -0.28], [-0.05, -0.24]],
      [[0.10, -0.44], [0.16, -0.40], [0.14, -0.34], [0.08, -0.33]],
      [[-0.10, -0.44], [-0.16, -0.40], [-0.14, -0.34], [-0.08, -0.33]],
      [[-0.04, -0.20], [0.04, -0.20], [0.04, -0.16], [-0.04, -0.16]],
      [[-0.44, 0.44], [-0.20, 0.52], [0.0, 0.55], [0.20, 0.52], [0.44, 0.44]],
    ];
    inner.forEach((line) => {
      ctx.beginPath();
      line.forEach((p, i) => (i ? ctx.lineTo(p[0] * s, p[1] * s) : ctx.moveTo(p[0] * s, p[1] * s)));
      ctx.stroke();
    });

    // 扫描点阵（石膏质感）
    if (opt.points !== false) {
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.5;
      const rr = U.rng(77);
      for (let i = 0; i < 260; i++) {
        const px = (rr() - 0.5) * 1.5, py = (rr() - 0.5) * 1.75 - 0.05;
        if (Math.abs(px) < 0.30 && py < -0.02) continue;
        if (Math.abs(px) > 0.35 && py > 0.3) continue;
        ctx.fillRect(px * s, py * s, 1, 1);
      }
    }
    // 眼部激光（act3/5）
    if (opt.laser) {
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#ff0033';
      ctx.lineWidth = 2;
      const spread = opt.laser;
      ctx.beginPath();
      ctx.moveTo(-0.10 * s, -0.35 * s); ctx.lineTo(-0.10 * s - spread * 2.2, -0.75 * s);
      ctx.moveTo(0.10 * s, -0.35 * s); ctx.lineTo(0.10 * s + spread * 2.2, -0.75 * s);
      ctx.stroke();
    }
    ctx.restore();
  };

  /* 4x4 Bayer 抖动噪点（缓存） */
  World.ditherCache = {};
  World.dither = function (ctx, w, h, density, seed, tint) {
    const key = density.toFixed(2) + '|' + seed + '|' + (tint || '');
    let c = World.ditherCache[key];
    if (!c) {
      c = document.createElement('canvas');
      c.width = 256; c.height = 256;
      const cx = c.getContext('2d');
      const img = cx.createImageData(256, 256);
      const r = U.rng(seed || 7);
      const B = U.bayer4;
      for (let y = 0; y < 256; y++) {
        for (let x = 0; x < 256; x++) {
          const th = (B[y & 3][x & 3] + 0.5) / 16;
          const on = r() < density * th * 2.2;
          const i = (y * 256 + x) * 4;
          if (on) {
            img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255;
            img.data[i + 3] = tint ? 90 : 42;
          }
        }
      }
      cx.putImageData(img, 0, 0);
      World.ditherCache[key] = c;
    }
    const pat = ctx.createPattern(c, 'repeat');
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
  };

  global.World = World;
})(window);
