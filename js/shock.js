/* ============================================================
   shock.js — 大尺度冲击渲染器（爆炸/冲击波/裂纹/碎片/巨字）
   ------------------------------------------------------------
   设计原则：
   1. 纯函数：draw(t) 只依赖绝对时间 t，不保存任何跨帧状态，
      所以任意顺序 seek 都能得到完全一致的画面。
   2. 持久：一次冲击的生命周期是 2.4–3.2 秒，分 5 个阶段，
      绝不出现「只有一两帧」的一闪而过。
   3. 与字幕层完全隔离：只画在 #shock 画布上，不动文字。
   ============================================================ */
(function (global) {
  'use strict';
  const U = global.U;
  const W = 1920, H = 1080;

  const SH = {};
  let cv = null, ctx = null;

  /* 每种冲击的默认生命周期（秒）—— 关键：足够长，观众能看见 */
  const LIFE = {
    boom: 3.0,      // 高潮爆炸：闪光→冲击波→裂纹→碎片→余烬
    breach: 2.2,    // 破屏
    pig: 1.1,       // 猪叫闷响
    slam: 0.9,      // 画框砸落
  };

  /* ---------- 注册表：按 owner 分组，便于整幕重置 ---------- */
  const SETS = {};
  SH.define = function (owner, list) {
    SETS[owner] = (list || []).map(function (e, i) {
      return {
        owner: owner,
        t: e.t,
        dur: e.dur || LIFE[e.kind] || 1.6,
        power: e.power == null ? 1 : e.power,
        label: e.label || '',
        sub: e.sub || '',
        kind: e.kind || 'boom',
        seed: 90210 + i * 613,
      };
    });
  };
  SH.clear = function (owner) { delete SETS[owner]; };

  SH.init = function (canvas) {
    cv = canvas;
    ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
  };

  /* ---------- 包络工具（供各幕复用） ---------- */
  SH.env = function (t, t0, dur) {
    const d = t - t0;
    if (d < 0 || d > dur) return 0;
    const k = 1 - d / dur;
    return k * k;
  };
  /* 0..1 的攻击-保持-衰减包络 */
  SH.hold = function (t, t0, attack, hold, release) {
    const d = t - t0;
    if (d < 0) return 0;
    if (d < attack) return d / attack;
    if (d < attack + hold) return 1;
    if (d < attack + hold + release) return 1 - (d - attack - hold) / release;
    return 0;
  };
  /* 当前所有冲击的合成强度 0..1（给各幕做联动用） */
  SH.amount = function (t) {
    let m = 0;
    for (const k in SETS) {
      const list = SETS[k];
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        const d = t - e.t;
        if (d < 0 || d > e.dur) continue;
        const v = e.power * (1 - d / e.dur);
        if (v > m) m = v;
      }
    }
    return m;
  };
  /* 距离下一次冲击还有多久（没有则返回 Infinity） */
  SH.timeToNext = function (t) {
    let m = Infinity;
    for (const k in SETS) {
      const list = SETS[k];
      for (let i = 0; i < list.length; i++) {
        const d = list[i].t - t;
        if (d >= 0 && d < m) m = d;
      }
    }
    return m;
  };

  /* ============================================================
     主绘制
     ============================================================ */
  SH.draw = function (t) {
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);

    for (const k in SETS) {
      const list = SETS[k];
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        const d = t - e.t;
        if (d < 0 || d > e.dur) continue;
        if (e.kind === 'pig') this.drawPig(t, d, e);
        else this.drawBlast(t, d, e);
      }
    }
  };

  /* ---------- 大爆炸：5 阶段 ---------- */
  SH.drawBlast = function (t, d, e) {
    const c = ctx;
    const P = e.power;
    const cx = W * 0.5, cy = H * 0.44;
    const rnd = U.rng(e.seed);

    /* 阶段 1：全屏闪光（0 – 110ms），白 → 血橙 */
    const fl = 1 - Math.min(1, d / 0.11);
    if (fl > 0.001) {
      c.globalAlpha = fl * 0.95 * P;
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, W, H);
      c.globalAlpha = fl * 0.55 * P;
      c.fillStyle = '#ff2a00';
      c.fillRect(0, 0, W, H);
      c.globalAlpha = 1;
    }

    /* 阶段 2：冲击波同心环（0 – 1.3s） */
    for (let r = 0; r < 4; r++) {
      const t0 = r * 0.085;
      const p = (d - t0) / (1.15 + r * 0.12);
      if (p <= 0 || p >= 1) continue;
      const rad = 120 + p * (1180 + r * 130);
      const a = (1 - p) * (1 - p) * 0.85 * P;
      c.globalAlpha = a;
      c.strokeStyle = r % 2 ? '#fff2b0' : '#ff3a00';
      c.lineWidth = Math.max(2, 30 * (1 - p) * (1 - r * 0.12));
      c.beginPath();
      c.arc(cx, cy, rad, 0, Math.PI * 2);
      c.stroke();
      /* 内层细环，做出「玻璃震碎」的高频感 */
      c.globalAlpha = a * 0.7;
      c.strokeStyle = '#ffffffe0';
      c.lineWidth = Math.max(1, 6 * (1 - p));
      c.beginPath();
      c.arc(cx, cy, rad * 0.82, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;

    /* 阶段 3：放射状裂纹（0 – 2.4s，缓慢淡出，保证「持久」） */
    const cr = U.clamp(d / 0.20, 0, 1);
    const crA = (1 - U.clamp((d - 0.3) / 2.1, 0, 1)) * 0.9 * P;
    if (crA > 0.01) {
      c.save();
      c.lineCap = 'square';
      for (let i = 0; i < 26; i++) {
        const ang = (i / 26) * Math.PI * 2 + rnd() * 0.22;
        const len = (420 + rnd() * 900) * U.easeOut(cr);
        const wid = 1 + rnd() * 5;
        c.globalAlpha = crA * (0.55 + rnd() * 0.45);
        c.strokeStyle = i % 4 === 0 ? '#ff3a00' : '#12000a';
        c.lineWidth = wid;
        c.beginPath();
        let x = cx, y = cy;
        c.moveTo(x, y);
        const segs = 5;
        for (let s = 1; s <= segs; s++) {
          const rr = (len * s) / segs;
          const jitter = (rnd() - 0.5) * 0.22;
          x = cx + Math.cos(ang + jitter) * rr;
          y = cy + Math.sin(ang + jitter) * rr;
          c.lineTo(x, y);
        }
        c.stroke();
      }
      c.restore();
      c.globalAlpha = 1;
    }

    /* 阶段 4：碎片抛射（0 – 2.2s，带重力） */
    c.save();
    for (let i = 0; i < 46; i++) {
      const ang = rnd() * Math.PI * 2;
      const spd = 380 + rnd() * 1250;
      const sz = 8 + rnd() * 54;
      const rot = rnd() * 6.28;
      const vr = (rnd() - 0.5) * 14;
      const px = cx + Math.cos(ang) * spd * d;
      const py = cy + Math.sin(ang) * spd * d + 900 * d * d;
      if (py > H + 120 || px < -160 || px > W + 160) continue;
      const a = U.clamp(1 - (d - 0.6) / 1.6, 0, 1) * P;
      if (a <= 0.01) continue;
      c.save();
      c.translate(px, py);
      c.rotate(rot + vr * d);
      c.globalAlpha = a;
      const kind = i % 5;
      if (kind === 0) {           // 窗口碎片
        c.fillStyle = '#c0c0c0'; c.fillRect(-sz / 2, -sz * 0.35, sz, sz * 0.7);
        c.fillStyle = '#000080'; c.fillRect(-sz / 2 + 2, -sz * 0.35 + 2, sz - 4, 6);
      } else if (kind === 1) {    // 红色警示碎片
        c.fillStyle = '#ff2a00'; c.fillRect(-sz / 2, -sz / 2, sz, sz);
        c.fillStyle = '#ffe000'; c.fillRect(-sz / 2, -sz / 6, sz, sz / 6);
      } else if (kind === 2) {    // 像素块
        c.fillStyle = i % 2 ? '#00ffff' : '#ff00aa';
        c.fillRect(-sz / 3, -sz / 3, sz * 0.66, sz * 0.66);
      } else if (kind === 3) {    // 火星
        c.fillStyle = '#fff6b0';
        c.beginPath(); c.arc(0, 0, sz * 0.18, 0, 6.29); c.fill();
      } else {                    // 黑色弹片
        c.fillStyle = '#160008';
        c.beginPath();
        c.moveTo(-sz / 2, 0); c.lineTo(0, -sz / 2); c.lineTo(sz / 2, 0);
        c.closePath(); c.fill();
      }
      c.restore();
    }
    c.restore();
    c.globalAlpha = 1;

    /* 阶段 5：故障横切条（0 – 0.9s，用绝对时间做种子） */
    if (d < 0.9) {
      const n = 14;
      const r2 = U.rng(e.seed + Math.floor(d * 30));
      c.save();
      for (let i = 0; i < n; i++) {
        const y = r2() * H;
        const h = 2 + r2() * 34;
        const dx = (r2() - 0.5) * 220 * (1 - d / 0.9);
        c.globalAlpha = (1 - d / 0.9) * (0.10 + r2() * 0.30) * P;
        c.fillStyle = r2() < 0.5 ? '#ff00aa' : '#00ffff';
        c.fillRect(dx, y, W, h);
      }
      c.restore();
      c.globalAlpha = 1;
    }

    /* 阶段 6：巨型字（0 – 2.0s，砸入 → 保持 → 淡出） */
    if (e.label) {
      const p = U.clamp(d / 0.16, 0, 1);
      /* 1.45 → 1.0：只做「砸进来」的收束，不能让字冲出画面。
         190px 基准已接近画面 1/5 高，再乘 3.4 会直接被裁掉。 */
      const sc = U.lerp(1.45, 1, U.easeOutBack ? U.easeOutBack(p) : U.easeOut(p));
      const outA = U.clamp(1 - (d - 1.35) / 0.65, 0, 1);
      if (outA > 0.01) {
        c.save();
        c.translate(cx, cy);
        c.scale(sc, sc);
        c.globalAlpha = outA;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = 'bold 150px "Arial Black","Microsoft YaHei",Impact,sans-serif';
        c.lineWidth = 14;
        c.strokeStyle = '#12000a';
        c.strokeText(e.label, 0, 0);
        c.fillStyle = '#ffe000';
        c.fillText(e.label, 0, 0);
        c.lineWidth = 6;
        c.strokeStyle = '#ff2a00';
        c.strokeText(e.label, 0, 0);
        c.restore();
        c.globalAlpha = 1;

        if (e.sub) {
          c.save();
          c.translate(cx, cy + 118);
          c.globalAlpha = outA * 0.95;
          c.textAlign = 'center';
          c.font = 'bold 42px "Microsoft YaHei",Tahoma,sans-serif';
          c.lineWidth = 9;
          c.strokeStyle = '#12000a';
          c.strokeText(e.sub, 0, 0);
          c.fillStyle = '#ffffff';
          c.fillText(e.sub, 0, 0);
          c.restore();
          c.globalAlpha = 1;
        }
      }
    }

    /* 阶段 7：红色暗角呼吸（0 – 3s，让冲击「留」在画面里） */
    const vig = (1 - d / e.dur) * 0.55 * P;
    if (vig > 0.01) {
      const g = c.createRadialGradient(cx, cy, 180, cx, cy, 1250);
      g.addColorStop(0, 'rgba(255,30,0,0)');
      g.addColorStop(0.65, 'rgba(140,0,0,' + (vig * 0.35).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(30,0,0,' + vig.toFixed(3) + ')');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }
  };

  /* ---------- 轻量「闷响」：用来做猪叫，短促但有体积 ---------- */
  SH.drawPig = function (t, d, e) {
    const c = ctx;
    const p = d / e.dur;
    if (p >= 1) return;

    /* 低频径向抖动环（不是位移，避免文字晃眼） */
    const cx = W * 0.5, cy = H * 0.42;
    const rad = 120 + U.easeOut(p) * 820;
    c.globalAlpha = (1 - p) * 0.55 * e.power;
    c.strokeStyle = '#ffd24a';
    c.lineWidth = Math.max(2, 26 * (1 - p));
    c.beginPath();
    c.arc(cx, cy, rad, 0, Math.PI * 2);
    c.stroke();

    c.globalAlpha = (1 - p) * 0.30 * e.power;
    c.strokeStyle = '#ff2a00';
    c.lineWidth = Math.max(1, 10 * (1 - p));
    c.beginPath();
    c.arc(cx, cy, rad * 0.72, 0, Math.PI * 2);
    c.stroke();
    c.globalAlpha = 1;

    /* 向外喷的「哼」气团 */
    const r = U.rng(e.seed);
    for (let i = 0; i < 14; i++) {
      const ang = r() * Math.PI * 2;
      const spd = 260 + r() * 620;
      const dist = spd * U.easeOut(p);
      const a = (1 - p) * 0.5;
      if (a <= 0.01) continue;
      c.globalAlpha = a;
      c.fillStyle = i % 3 === 0 ? '#ffffff' : (i % 3 === 1 ? '#ffd24a' : '#ff6a00');
      const sz = 6 + r() * 20;
      c.fillRect(cx + Math.cos(ang) * dist - sz / 2, cy + Math.sin(ang) * dist - sz / 2, sz, sz);
    }
    c.globalAlpha = 1;
  };

  global.SHOCK = SH;
})(window);
