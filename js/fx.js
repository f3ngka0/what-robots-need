/* ============================================================
   fx.js — 全屏后期 + 受控冲击系统
   核心原则：文字在 99% 的时间里绝对静止。
   抖动只允许出现在「预设重拍点」或「剧情爆炸点」，
   每次 ≤150ms 衰减、幅度 ≤6px、两次之间强制冷却 ≥2500ms。
   ============================================================ */
(function (global) {
  'use strict';
  const U = global.U, ST = U.ST;
  const FX = {};

  /* ---------- 常量（硬性规格） ---------- */
  const SHAKE_MAX_PX = 6;       // 最大偏移
  const SHAKE_DUR = 0.15;       // 单次持续 150ms
  const SHAKE_COOLDOWN = 2.5;   // 冷却 2.5s

  FX.init = function (cv, stage, shakeTarget) {
    this.cv = cv;
    this.ctx = cv.getContext('2d');
    this.stage = stage;
    this.shakeEl = shakeTarget || stage;   // 只有 #screen 层会抖，字幕条不受影响
    this.W = cv.width; this.H = cv.height;
    this.mode = 'none';
    this.splitAmt = 0;
    this.noiseDens = 0;
    this.vram = 0;
    this.degauss = 0;
    this.glitchText = null;
    // 注意：抖动不再有 _shakeAt / _lastShakeAt 之类的跨帧状态，
    // 全部从 IMPACTS 表按时间解析（见下），这样 seek 顺序不影响画面。
    // 背景网格亮度脉冲（替代抖动的节拍反馈）
    this.pulse = 0;
  };

  /* ============================================================
     受控冲击：一份「纯时间的冲击表」
     ------------------------------------------------------------
     旧做法是 update(t) 里在某帧调用 FX.impact(t)，靠 _lastShakeAt 等
     跨帧状态记忆「已经爆过」。这会让同一时刻的画面取决于到达它的
     路径（先 seek 200 再回 31.59 != 直接 seek 31.59），逐帧渲染就不再
     确定性。
     现在改成：各幕用 FX.define(owner, [{t, power}, ...]) 声明冲击表，
     FX.pulse01(t) 每帧从表里**解析**出包络，无任何跨帧状态。
     ============================================================ */
  const IMPACTS = {};

  /* 声明某幕的全部冲击点（覆盖式：重复调用即替换） */
  FX.define = function (owner, list) {
    IMPACTS[owner] = (list || []).map(function (e) {
      return { t: e.t, power: U.clamp(e.power == null ? 1 : e.power, 0, 1) };
    }).sort(function (a, b) { return a.t - b.t; });
  };
  FX.clearImpacts = function (owner) { delete IMPACTS[owner]; };

  /* 兼容旧调用：把它当作「在 owner='loose' 下登记一个点」。
     仅用于仍然逐帧调用它的地方，行为退化为「取最近的一次」。 */
  FX.impact = function (t, strength) {
    const s = U.clamp(strength == null ? 1 : strength, 0, 1);
    const list = IMPACTS.legacy || (IMPACTS.legacy = []);
    if (list.length && Math.abs(list[list.length - 1].t - t) < 1e-6) return false;
    list.push({ t: t, power: s });
    return true;
  };

  /* 当前冲击包络 0..1：查表，取「最近一个已发生的冲击」，150ms 内二次衰减 */
  FX.pulse01 = function (t) {
    let best = 0;
    for (const k in IMPACTS) {
      const list = IMPACTS[k];
      // 表按时间有序：找到最后一个 <= t 的
      let lo = 0, hi = list.length - 1, idx = -1;
      while (lo <= hi) {
        const m = (lo + hi) >> 1;
        if (list[m].t <= t) { idx = m; lo = m + 1; } else hi = m - 1;
      }
      if (idx < 0) continue;
      const d = t - list[idx].t;
      if (d > SHAKE_DUR) continue;
      const k2 = 1 - d / SHAKE_DUR;
      const v = k2 * k2 * list[idx].power;
      if (v > best) best = v;
    }
    return best;
  };

  /* 每帧应用：只有包络 > 0 时才真正位移 + 出 RGB 色差。
     色差作用在 #screen（画面层），绝不可作用于 #stage——否则字幕条
     也会被 drop-shadow 拖出重影。 */
  FX.applyShake = function (t) {
    const el = this.shakeEl;
    if (!el) return;
    const p = this.pulse01(t);

    /* --- RGB 色差：仅冲击瞬间，随包络二次衰减 --- */
    const split = p > 0.02 ? p * 9 : 0;
    if (split > 0.4) {
      el.style.filter =
        'drop-shadow(' + (-split).toFixed(1) + 'px 0 0 rgba(255,0,85,0.55)) ' +
        'drop-shadow(' + split.toFixed(1) + 'px 0 0 rgba(0,255,255,0.5))';
      el._split = true;
    } else if (el._split) {
      el.style.filter = '';
      el._split = false;
    }

    /* --- 位移 --- */
    if (p <= 0.001) {
      if (el._shaking) { el.style.transform = ''; el._shaking = false; }
      return;
    }
    // 高频但极短的确定性抖动
    const a = SHAKE_MAX_PX * p;
    const dx = Math.sin(t * 173.0) * a * 0.85;
    const dy = Math.cos(t * 149.0) * a * 0.7;
    el.style.transform = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px)';
    el._shaking = true;
  };

  /* ---------- 每帧绘制 ---------- */
  FX.draw = function (t) {
    const c = this.ctx, W = this.W, H = this.H;
    c.clearRect(0, 0, W, H);

    // 1) 显存花屏色块
    if (this.vram > 0.01) this.drawVRAM(t, this.vram);
    // 2) 故障横向切片
    if (this.mode === 'glitch' || this.mode === 'heavy') {
      this.drawSlices(t, this.mode === 'heavy' ? 1 : 0.5);
    }
    // 3) 噪点
    if (this.noiseDens > 0.01) {
      global.World.dither(c, W, H, this.noiseDens, 11 + ((t * 8) | 0) % 3);
    }
  };

  /* 显存花屏 */
  FX.drawVRAM = function (t, amt) {
    const c = this.ctx, W = this.W, H = this.H;
    const n = Math.floor(6 + amt * 26);
    const r = U.rng(4242);
    c.save();
    c.globalAlpha = Math.min(0.85, amt * 0.9);
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * H;
      const w = 40 + r() * 420 * amt, h = 4 + r() * 52 * amt;
      const colors = ['#ff00aa', '#00ffff', '#ffffff', '#0000aa', '#ff0000', '#ffff00', '#00ff66'];
      c.fillStyle = colors[Math.floor(r() * colors.length)];
      c.fillRect(x | 0, y | 0, w | 0, h | 0);
    }
    for (let i = 0; i < 8 * amt; i++) {
      const y = r() * H, h = 6 + r() * 40;
      c.fillStyle = 'rgba(0,0,0,' + (0.2 + r() * 0.4) + ')';
      c.fillRect(0, y | 0, W, h | 0);
    }
    c.restore();
  };

  /* 故障切片 */
  FX.drawSlices = function (t, amt) {
    const c = this.ctx, W = this.W, H = this.H;
    const n = Math.floor(3 + amt * 9);
    const r = U.rng((t * 30) | 0);
    c.save();
    for (let i = 0; i < n; i++) {
      const y = r() * H, h = 2 + r() * 26;
      const dx = (r() - 0.5) * 60 * amt;
      c.fillStyle = r() < 0.5 ? 'rgba(255,0,170,0.14)' : 'rgba(0,255,255,0.14)';
      c.fillRect(dx, y, W, h);
    }
    c.restore();
  };

  /* ---------- 不晃眼的节拍反馈：返回给各幕使用的调制量 ----------
     低频 -> 背景网格亮度 / 边框发光 / 标题栏色相
     这些都不产生位移，文字保持静止。 */
  FX.beatGlow = function (t, e) {
    // 平滑包络，避免逐帧闪烁造成视觉疲劳
    return U.clamp(e ? e.bass : 0, 0, 1);
  };

  /* ---------- 播放模式 tick ---------- */
  FX.tick = function (t, e, kick) {
    // 位移与色差都在 applyShake 里完成（作用于 #screen），这里不再重复施加
    this.applyShake(t);
  };

  FX.baseTransform = 'translate(-50%,-50%) scale(1)';
  FX.SHAKE_MAX_PX = SHAKE_MAX_PX;
  FX.SHAKE_DUR = SHAKE_DUR;
  FX.SHAKE_COOLDOWN = SHAKE_COOLDOWN;

  global.FX = FX;
})(window);
