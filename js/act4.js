/* ============================================================
   act4.js — 第四幕【资本合谋 → 生存空间物理挤压 → 绝望异化】
   84.6s – 152.0s
   ------------------------------------------------------------
   三幕式隐喻，严格对齐 .lrc：
     P1 84.60–96.70  资本巨鳄 × 消费主义 → 合体成绞肉机 → 野猪倾泻
     P2 96.70–115.05 四面红墙按节拍步进挤压，人类窗口 60%→18%
     P3 115.05–152.0  异化协议 → 被迫点击 → 弹簧式爆开成机器人节点
   确定性：update(t) 是 t 的纯函数，无 Math.random / Date.now / rAF。
   ============================================================ */
(function (global) {
  'use strict';
  const U = global.U, ART = global.ART, W98 = global.W98;

  const W = 1920, H = 1080;
  const DW = 1140, DH = 594;           // 中心窗口内部设计坐标系
  const TAU = Math.PI * 2;
  const S = { id: 'act4', t0: 84.6, t1: 152.0 };

  /* ---------- 时间轴常量（绝对秒，来自 .lrc） ---------- */
  const T = {
    p1: 84.60,
    p2: 96.70,
    collide: 88.17,      // "And with a consumer bitch"
    merge: 88.95,
    machine: 89.05,
    piglets: 90.24,      // "They made a batch of soulless piglets"
    streets: 92.85,      // "The piglets overtook the streets"
    oink: 96.75,         // "Oink oink"
    oinkOut: 99.45,
    humanIn: 97.55,
    wallsIn: 97.70,
    wallsLand: 100.30,
    crush0: 100.30,
    crush1: 112.86,      // "That we are powerless"
    unless: 115.05,      // "Unless"
    click: 117.09,       // "We become just like them"
    ruptureEnd: 117.95,
    frame: 117.15,
    frameEnd: 118.45,
    end: 152.0,
  };

  /* ---------- 实测猪叫：13 次鼻音爆破 ----------
     起搏器 = BEATS.oinks（beats.js 实测 12 个）+ 音频 grunt 包络里被
     beats.js 漏掉的一个强爆破（97.27：grunt 0.67，与 97.02 相隔 0.25s，
     明显是独立的一声「哼」）。合并表在 build 时算一次，之后是常量。
     这是猪叫视觉的唯一起搏器：印章 / 猪群 / 全屏「哼」环 / SHOCK 闷响环
     全部由它驱动。T.oink 只保留作歌词行位置，不再当视觉触发器。 */
  const OINK_SRC = (function () {
    const src = (global.BEATS && global.BEATS.oinks) || [];
    return src.length ? src.slice() : [96.37, 96.58, 96.85, 97.02, 97.38,
      97.63, 97.90, 98.17, 98.43, 98.70, 98.98, 99.28];
  })();
  let OINK_LIST = OINK_SRC;     // build 时用音频包络补全（见 oinkPulses()）
  let OINK0 = OINK_SRC[0];
  const OINK_DUR = 0.16;        // 一次「哼」的衰减段长度
  /* 起音前 100ms 的「蓄力段」：峰值仍然严格落在实测起音那一帧，
     但视觉上先抬头再砸下（音乐可视化里标准的 60–100ms 提前量），
     这样验收时刻里那些贴着起音的帧也能看到正在砸下的印章。 */
  const OINK_RISE = 0.10;       // 起音前的蓄力段长度
  const OINK_BASE = 96;         // 印章基础字号（整数 px）

  /* 每一拍的实测强度权重（0.72…1.0）：让每一「哼」有轻有重，
     全部由 audio.json 的 grunt 包络推导，是常量表，不是随机。
     注：audio.json 由 APP.start 在 build 之前 await 载入，
     所以权重在 S.build 里第一次用到时才算出（见 oinkWeights()）。 */
  let OINK_W = null;
  let __oinkDone = false;

  /* 在实测爆破表上补齐被漏掉的强爆破：在 96.2–99.45 里找 grunt 的
     局部极大值，凡是与已有拍相隔 > 0.09s 且峰值 > 0.5 的，就是一记
     独立的鼻音爆破，补进来。纯数据推导，不含任何随机。
     阈值取 0.09s：两次真正的鼻音爆破最短间隔约 0.116s（97.267 vs 97.383），
     而同一个爆破的相邻帧只差 0.017s，所以 0.09 能分开它们。 */
  function oinkPulses() {
    if (__oinkDone) return OINK_LIST;
    __oinkDone = true;
    const A = global.TL && global.TL.Audio;
    const list = OINK_SRC.slice();
    if (A && A.at && A.data) {
      const d = A.data, g = d.grunt;
      if (g && g.length) {
        const lo = Math.round(96.2 * d.fps), hi = Math.round(99.45 * d.fps);
        for (let i = Math.max(1, lo); i < Math.min(g.length - 1, hi); i++) {
          const v = g[i];
          if (v < 0.5) continue;
          if (!(v >= (g[i - 1] || 0) && v >= (g[i + 1] || 0))) continue;
          const tb = i / d.fps;
          let near = false;
          for (let k = 0; k < list.length; k++) {
            if (Math.abs(list[k] - tb) <= 0.09) { near = true; break; }
          }
          if (!near) list.push(tb);
        }
      }
    }
    list.sort(function (a, b) { return a - b; });
    /* 时刻量化到 0.01s：避免浮点尾差让同一拍的字符串表示漂移 */
    OINK_LIST = list.map(function (x) { return Math.round(x * 100) / 100; });
    OINK0 = OINK_LIST[0];
    return OINK_LIST;
  }

  function oinkWeights() {
    if (OINK_W) return OINK_W;
    const L = oinkPulses();
    const A = global.TL && global.TL.Audio;
    const raw = L.map(function (tb) {
      if (A && A.at) {
        const e = A.at(tb);
        return (e && e.grunt) || 0;
      }
      return 0.4;
    });
    let hi = 0;
    for (let i = 0; i < raw.length; i++) if (raw[i] > hi) hi = raw[i];
    if (hi <= 0.001) hi = 1;
    OINK_W = raw.map(function (g) {
      /* 归一化后压到 0.72…1.0 的窄带：
         最轻的拍也有力气，最重的拍不会把字撑爆 */
      const k = 0.72 + 0.28 * (g / hi);
      return Math.round(k * 100) / 100;
    });
    return OINK_W;
  }

  /* “300k per hour”段的重音表（BEATS.accents.act4 的 96.5–100.3 区间） */
  const ACC_ACT4 = (function () {
    const a = (global.BEATS && global.BEATS.accents && global.BEATS.accents.act4) || [];
    return a.filter(function (x) { return x >= 96.5 && x <= T.crush0; });
  })();

  /* 印章淡出起点：绝不早于最后一拍，保证最后一个「哼」仍是满幅。
     注意：这是 S.build 之后才定下的值，所以做成函数（见 oinkOut0()）。 */
  function oinkOut0() {
    const L = oinkPulses();
    return Math.max(L[L.length - 1], T.oinkOut - 0.30);
  }

  /* ---------- 纯函数小工具 ---------- */
  const clamp01 = U.clamp;
  const inv = U.inv;

  function beatFrame(tb) { return Math.round(tb * 60); }
  function flash(t, t0, dur) {
    const d = t - t0;
    if (d < 0 || d > dur) return 0;
    const k = 1 - d / dur;
    return k * k;
  }
  /* 机械步进：每 N 段吸附一次，段内用 easeOut 快进（“咔哒”感） */
  function stepSnap(p, n, hold) {
    p = clamp01(p, 0, 1);
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    const s = p * n, i = Math.floor(s), f = s - i;
    const h = hold == null ? 0.42 : hold;
    return (i + U.easeOut(clamp01(f / h, 0, 1))) / n;
  }
  function commas(n) {
    const s = String(Math.max(0, Math.floor(n)));
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const d = s.length - 1 - i;
      out += s[i];
      if (d > 0 && d % 3 === 0) out += ',';
    }
    return out;
  }
  function lerpC(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }

  /* ---------- 猪叫脉冲（纯 t 的函数，无跨帧状态） ----------
     oinkPulseAt(t)：任意时刻落在哪一次「哼」的包络里，0..1。
       前 30ms 快速砸下（easeOut），其余 130ms 二次衰减回落。
     oinkHitCount(t)：这一帧同时处在几次爆破的尾音里（用于叠加环）。 */
  function oinkPulseAt(t) {
    const L = oinkPulses();
    const Wt = oinkWeights();
    let best = 0;
    for (let i = 0; i < L.length; i++) {
      const d = t - L[i];
      /* 峰值刻意落在实测起音那一帧上（d = 0）：前 45ms 是「抬头蓄力」，
         之后 160ms 二次回落。这样 96.37 / 96.85 … 这些验收时刻
         一定抓到最饱满的「哼」，而不是包络刚起步的 0。 */
      if (d < -OINK_RISE || d > OINK_DUR) continue;
      const p = d < 0
        ? U.easeOut((d + OINK_RISE) / OINK_RISE)
        : 1 - (d / OINK_DUR);
      /* 每一拍的实测强度只用来微调包络收尾的「重量」，
         峰值统一归一到 1：否则轻拍（97.18 的 grunt 只有 0.16）
         会看起来像「没跟上」，这正是用户要修掉的观感。 */
      const v = clamp01(p, 0, 1) * (0.78 + 0.22 * Wt[i]);
      best = Math.max(best, v);
    }
    return clamp01(best, 0, 1);
  }
  /* 瞬时音频包络（grunt = 鼻音/低频浊音能量） */
  function gruntAt(t) {
    const A = global.TL && global.TL.Audio;
    if (!A || !A.at) return 0;
    const e = A.at(t);
    return clamp01((e && e.grunt) || 0, 0, 1);
  }
  /* 重音脉冲：96.5–100.3 区间里每个实测重音给一次 0.22s 的指针踢腿 */
  function accPulseAt(t) {
    let best = 0;
    for (let i = 0; i < ACC_ACT4.length; i++) {
      const d = t - ACC_ACT4[i];
      if (d < 0 || d > 0.22) continue;
      const k = 1 - d / 0.22;
      const v = k * k;
      if (v > best) best = v;
    }
    return best;
  }
  /* 样式缓存：同一像素值只写一次，避免多余样式重算打乱离线截图 */
  function css(el, prop, val) {
    const m = el.__css || (el.__css = {});
    if (m[prop] === val) return;
    m[prop] = val;
    if (prop.charAt(0) === '-') el.style.setProperty(prop, val);
    else el.style[prop] = val;
  }
  /* 透明度量化到 0.05：分数 opacity 会把文字合成到不同亚像素格 */
  function qa(v) { return Math.round(clamp01(v, 0, 1) * 20) / 20; }
  function rgb(c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; }
  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }

  /* ---------- DOM 小工具 ---------- */
  function cvEl(cls) {
    const c = document.createElement('canvas');
    c.className = cls;
    c.width = W; c.height = H;
    return c;
  }
  /* 精简 Win98 窗口（比 W98.make 少一半节点，样式仍用共享 class） */
  function mk(o) {
    const el = document.createElement('div');
    el.className = 'win98-window ' + (o.cls || '');
    el.style.left = (o.x | 0) + 'px';
    el.style.top = (o.y | 0) + 'px';
    if (o.w) el.style.width = (o.w | 0) + 'px';
    if (o.h) el.style.height = (o.h | 0) + 'px';
    el.style.zIndex = o.z || 20;
    let h = '<div class="titlebar ' + (o.titleCls || 'titlebar--classic') + '">' +
      '<span class="tb-title"></span>';
    if (!o.plain) {
      h += '<div class="tb-btns"><button class="tb-btn">_</button>' +
        '<button class="tb-btn">□</button><button class="tb-btn tb-close">✕</button></div>';
    }
    h += '</div><div class="win-body">' + (o.html || '') + '</div>';
    el.innerHTML = h;
    el.querySelector('.tb-title').textContent = o.title || '';
    el.style.display = 'none';
    return { el: el, body: el.querySelector('.win-body'), title: el.querySelector('.tb-title') };
  }
  function show(el, on) {
    const v = on ? '' : 'none';
    if (el.style.display !== v) el.style.display = v;
  }
  function put(el, x, y, w, h) {
    const k = (x | 0) + ',' + (y | 0) + ',' + (w | 0) + ',' + (h | 0);
    if (el.__k === k) return;
    el.__k = k;
    el.style.left = (x | 0) + 'px';
    el.style.top = (y | 0) + 'px';
    if (w != null) el.style.width = (w | 0) + 'px';
    if (h != null) el.style.height = (h | 0) + 'px';
  }
  function text(node, s) {
    if (node.__t !== s) { node.__t = s; node.textContent = s; }
  }

  /* ============================================================
     BUILD
     ============================================================ */
  S.build = function (root) {
    root.innerHTML = '';
    this.root = root;

    /* ---- 背景 canvas：同时负责遮住 3.5 折透明度的桌面图标 ---- */
    this.bgCv = cvEl('a4-bg');
    root.appendChild(this.bgCv);
    this.bg = this.bgCv.getContext('2d');

    /* ---- P1 资本巨鳄 ---- */
    this.wCap = mk({
      x: -840, y: 170, w: 790, h: 312, z: 20, cls: 'a4-p1 a4-p1--cap',
      title: '🐷 资本巨鳄 (CAPITAL_PIG.EXE)', titleCls: 'titlebar--classic',
      html: '<div class="a4-p1-l1">资本 · 无限增殖</div>' +
        '<div class="a4-p1-l2">CAPITAL_PIG.EXE</div>' +
        '<div class="a4-p1-l3">→ 正在寻找可吞并的对象…</div>',
    });
    this.wCons = mk({
      x: 1940, y: 170, w: 790, h: 312, z: 20, cls: 'a4-p1 a4-p1--cons',
      title: '🛍️ 消费主义 (CONSUMER_BITCH.DLL)', titleCls: 'titlebar--vapor',
      html: '<div class="a4-p1-l1">消费 · 无限欲望</div>' +
        '<div class="a4-p1-l2">CONSUMER_BITCH.DLL</div>' +
        '<div class="a4-p1-l3">→ 求合体，求打包，求带走</div>',
    });
    root.appendChild(this.wCap.el);
    root.appendChild(this.wCons.el);

    /* ---- P1 合并后的绞肉机 ---- */
    this.wMach = mk({
      x: 460, y: 176, w: 1000, h: 300, z: 22, cls: 'a4-mach',
      title: '⚙ CAPITAL_PIG + CONSUMER_BITCH = 全自动绞肉机', titleCls: 'titlebar--alert',
      html: '<div class="a4-readout">' +
        '<div class="a4-readout-l1"><span class="a4-rec"></span>资本自动绞肉机已启动</div>' +
        '<div class="a4-readout-l2">狂飙时速 <em>300.0</em> KM/H</div>' +
        '<div class="a4-readout-sub">MERGE OK · 已合并 · 产能 +∞ · 人类容错 0%</div>' +
        '</div>',
    });
    root.appendChild(this.wMach.el);

    /* ---- P1 金色躺赚条 ---- */
    this.wGold = mk({
      x: 1404, y: 28, w: 500, h: 148, z: 30, cls: 'a4-gold', plain: true,
      title: '💰 富豪自动驾驶躺赚池', titleCls: 'titlebar--classic',
      html: '<div class="a4-gold-num" data-num>+$0</div>' +
        '<div class="a4-gold-sub">PASSIVE_INCOME · 无需劳动 · 自动增殖</div>',
    });
    root.appendChild(this.wGold.el);
    this.goldNum = this.wGold.body.querySelector('[data-num]');

    /* ---- P2/P3 中心窗口（人类 → 机器人） ---- */
    this.wHw = mk({
      x: 384, y: 118, w: 1152, h: 648, z: 40, cls: 'a4-hw', plain: true,
      title: '🧍 普通人类_生存空间.EXE — 剩余喘息空间: 100%',
      titleCls: 'titlebar--classic',
      html: '<canvas class="a4-hw-cv"></canvas>',
    });
    root.appendChild(this.wHw.el);
    this.hwCv = this.wHw.body.querySelector('canvas');
    this.hwG = this.hwCv.getContext('2d');

    /* ---- 四面红墙 ---- */
    const wallDefs = [
      { key: 'l', cls: 'a4-wall--L', z: 34, title: '📉 LEFT_PRESSURE.SYS',
        l1: '📉 AI 批量裁员与替代', l2: 'LEFT WALL · 压力 100%',
        p3a: '⛔ 封锁', p3b: '无法再压碎' },
      { key: 'r', cls: 'a4-wall--R', z: 34, title: '🚨 RIGHT_PRESSURE.SYS',
        l1: '🚨 300km/h 算法极限压榨', l2: 'RIGHT WALL · 压力 100%',
        p3a: '🚫 封死', p3b: '已无人类可压' },
      { key: 'tp', cls: 'a4-wall--T', z: 33, title: '🏦 TOP_PRESSURE.SYS',
        l1: '🏦 资本垄断与贫富鸿沟', l2: 'TOP WALL · 压力 100%',
        p3a: '⚠ 四面合围 · 持续加压中', p3b: '' },
      { key: 'b', cls: 'a4-wall--B', z: 33, title: '🛍️ BOTTOM_PRESSURE.SYS',
        l1: '🛍️ 消费主义洗脑陷阱', l2: 'BOTTOM WALL · 压力 100%',
        p3a: '', p3b: '' },
    ];
    this.walls = {};
    this.wallDefs = wallDefs;
    wallDefs.forEach((d) => {
      const w = mk({
        x: 0, y: 0, w: 760, h: 680, z: d.z,
        cls: 'a4-wall ' + d.cls, plain: true, title: d.title,
        titleCls: 'titlebar--alert',
      });
      w.body.setAttribute('data-l1', d.l1);
      w.body.setAttribute('data-l2', d.l2);
      w.__phase3 = false;
      root.appendChild(w.el);
      this.walls[d.key] = w;
    });

    /* ---- 野猪 canvas ---- */
    this.pigCv = cvEl('a4-piglets');
    root.appendChild(this.pigCv);
    this.pig = this.pigCv.getContext('2d');
    this.pig.imageSmoothingEnabled = false;

    /* ---- OINK OINK 印章 ---- */
    this.oink = document.createElement('div');
    this.oink.className = 'a4-oink';
    this.oink.style.display = 'none';
    this.oink.innerHTML = '<span class="a4-oink-en">OINK&nbsp;OINK</span>' +
      '<span class="a4-oink-zh">哼 哼</span>';
    root.appendChild(this.oink);

    /* ---- 全屏效果 canvas ---- */
    this.fxCv = cvEl('a4-fx');
    root.appendChild(this.fxCv);
    this.fx = this.fxCv.getContext('2d');
    this.fx.imageSmoothingEnabled = false;

    /* ---- 阶段指示 ---- */
    this.chip = document.createElement('div');
    this.chip.className = 'a4-chip';
    this.chip.innerHTML = '<b>①</b><span></span>';
    root.appendChild(this.chip);
    this.chipB = this.chip.querySelector('b');
    this.chipT = this.chip.querySelector('span');

    /* ---- 「300k per hour」车速表：指针由 BEATS.accents 驱动 ----
       纯 DOM + 整数旋转角度（每 5° 一档），不做小数 rotate
       —— 分数角度会让指针边缘落在不同亚像素格。
       放在右侧红墙之下的空档（x 1600..1900, y 636..886）：
       不盖金色躺赚条、不盖右墙、不压字幕条。 */
    this.speedo = document.createElement('div');
    this.speedo.className = 'a4-speedo';
    this.speedo.style.top = '636px';
    this.speedo.style.right = '20px';
    this.speedo.innerHTML =
      '<div class="speedo-face">' +
      '<div class="speedo-dial"></div>' +
      '<div class="speedo-needle"></div>' +
      '</div>' +
      '<div class="speedo-val">300.0</div>' +
      '<div class="speedo-unit">KM/H · PIGGY_OS</div>' +
      '<div class="speedo-tag">AUTOMATIC_PIGLET.SYS</div>';
    this.speedo.style.display = 'none';
    root.appendChild(this.speedo);
    this.speedoNeedle = this.speedo.querySelector('.speedo-needle');
    this.speedoVal = this.speedo.querySelector('.speedo-val');

    /* ---- P3 异化协议弹窗 ---- */
    this.wModal = mk({
      x: 340, y: 146, w: 1240, h: 396, z: 80, cls: 'a4-modal', plain: true,
      title: '⚠ 异化协议 — 系统强制请求 (ASSIMILATION_PROTOCOL)',
      titleCls: 'titlebar--alert',
      html: '<div class="a4-modal-warn">⚠️ 警告：人类肉体即将被时代碾碎！<br>是否执行异化协议？</div>' +
        '<div class="a4-modal-sub">SYSTEM ALERT · BODY_INSUFFICIENT · EXECUTING IS THE ONLY WAY OUT</div>' +
        '<div class="a4-neon">⚙️ 放弃人类灵魂，格式化并升级为无情机器<b>[ BECOME A ROBOT ]</b></div>',
    });
    root.appendChild(this.wModal.el);
    this.neon = this.wModal.body.querySelector('.a4-neon');

    /* ---- 关键词审判弹窗（117.1–152s 的持续变化来源） ----
       P3 之后画面原本只剩静态齿轮 + 二维码，1:57–2:30 全是一张图，
       观众会觉得"卡住了"。这里复用了第三幕关键词错误框的语言：
       每 ~3.2 秒裁决一个人类概念，只给单词 + 该词义的示意动画。 */
    this.verdict = document.createElement('div');
    this.verdict.className = 'win98-window win98-window--dialog a4-verdict';
    this.verdict.style.display = 'none';
    this.verdict.innerHTML =
      '<div class="titlebar titlebar--alert">' +
      '<span class="tb-title" id="a4vCode">VERDICT</span>' +
      '<div class="tb-btns"><button class="tb-btn">_</button>' +
      '<button class="tb-btn">□</button><button class="tb-btn tb-close">✕</button></div>' +
      '</div>' +
      '<div class="win-body a4v-body">' +
      '<div class="a4v-kw" id="a4vKw">ART</div>' +
      '<div class="a4v-sub" id="a4vSub">SHREDDED IN 0.002 SECONDS</div>' +
      '<div class="a4v-anim"><canvas id="a4vCv" width="620" height="230"></canvas>' +
      '<div class="a4v-tag" id="a4vTag">SCHEMATIC</div></div>' +
      '<div class="a4v-log" id="a4vLog"></div>' +
      '</div>';
    root.appendChild(this.verdict);
    this.vKw = this.verdict.querySelector('#a4vKw');
    this.vSub = this.verdict.querySelector('#a4vSub');
    this.vCv = this.verdict.querySelector('#a4vCv');
    this.vCtx = this.vCv.getContext('2d');
    this.vTag = this.verdict.querySelector('#a4vTag');
    this.vCode = this.verdict.querySelector('#a4vCode');
    this.vLog = this.verdict.querySelector('#a4vLog');
    this._vKey = '';
    this.btnC = { x: 960, y: 452 };   // 霓虹按钮中心（鼠标必被吸附于此）

    /* ---- 预计算：野猪群参数（确定性） ---- */
    this.pigs = [];
    for (let i = 0; i < 42; i++) {
      const r = U.srand('a4pig' + i, 3);
      this.pigs.push({
        te: T.piglets + (i / 42) * 2.35 + r() * 0.16,
        vx: (r() - 0.5) * 980,
        vy: 240 + r() * 430,
        s: 15 + r() * 11,
        lane: r(),
        spd: 760 + r() * 820,
        ph: r() * TAU,
      });
    }

    /* ---- 预计算：齿轮 / QR ---- */
    this.qrSeed = 0x9527;
    this.gears = [
      { x: 322, y: 300, r: 152, teeth: 15, dir: 1, spd: 0.42 },
      { x: 556, y: 174, r: 92, teeth: 11, dir: -1, spd: 0.66 },
      { x: 528, y: 438, r: 72, teeth: 9, dir: 1, spd: 0.86 },
    ];

    /* ---- 猪叫冲击：每个实测鼻音爆破注册一个 kind:'pig' 的金色闷响环 ----
       power 0.35~0.55 随实测 grunt 能量起伏，dur 0.7s（比 0.16s 的印章脉冲长，
       保证两次「哼」之间画面里始终有残留的环在扩散，不会闪一下就空）。
       顺序很重要：先把脉冲表补齐（oinkPulses），再算权重、再注册冲击。 */
    oinkPulses();
    if (global.SHOCK && global.SHOCK.define) {
      const L = oinkPulses();
      const Wt = oinkWeights();
      const list = L.map(function (tb, i) {
        return {
          t: tb,
          dur: 0.7,
          /* 0.35…0.55，随该拍的实测 grunt 强度在任务规定的区间内取整 */
          power: Math.round((0.35 + 0.20 * (Wt[i] - 0.72) / 0.28) * 100) / 100,
          kind: 'pig',
        };
      });
      global.SHOCK.define('act4', list);
    }
    /* 抖动也走声明式冲击表：资本合谋 / 猪叫落点 / 挤压到底 / 机械异化 */
    if (global.FX && global.FX.define) {
      global.FX.define('act4', [
        { t: T.collide, power: 1.0 },
        { t: T.oink, power: 0.65 },
        { t: T.crush1, power: 0.85 },
        { t: T.click, power: 1.0 },
      ]);
    }
  };

  S.enter = function () {
    global.APP.setTaskbar([
      { t: 'CAPITAL_PIG.EXE', ico: 'pig' },
      { t: '普通人类_生存空间.EXE', ico: 'computer' },
      { t: '9527_牛马节点.SYS', ico: 'disk' },
    ], 0);
  };
  S.reset = function () { /* 全部状态由 t 推导，无需复位 */ };

  /* ============================================================
     几何：中心窗口 / 红墙
     ============================================================ */
  function windowRect(t) {
    /* 挤压曲线：慢起、越到后面越快（凹函数），并吸附到 26 级台阶
       —— 108s 时约剩 42% 宽度（可读的“钱镜头”），112.86 触底 18% */
    const tf = clamp01(inv(96.9, 112.86, t), 0, 1);
    const q = stepSnap(Math.pow(tf, 2.32), 26, 0.42);
    const rp = inv(T.click, T.ruptureEnd, t);
    const open = rp <= 0 ? 0 : U.easeOutBack(clamp01(rp, 0, 1));
    const squeezed = U.lerp(900, 346, q);
    const w = U.lerp(squeezed, 1080, Math.min(1, open));
    const h = w * 0.5625;
    const CX = 960, CY = 420;      // 视觉中心（给四面红墙留出上下空间）
    return { q: q, open: open, w: w, h: h, x: CX - w / 2, y: CY - h / 2 };
  }

  function wallLayout(t, R) {
    const ent = 1 - U.easeOut(inv(T.wallsIn, T.wallsLand, t));   // 1 → 0
    const slide = ent * 960;

    /* 四条墙 = 一个向内收缩的矩形框：
         上/下是通栏横幅（天花板 / 地板），左/右夹在两者之间。
       安全区：顶 y>=8，底 y<=808（字幕条顶边实测 823）。 */
    const SAFE_TOP = 8, SAFE_BOT = 808;
    const SAFE_H = SAFE_BOT - SAFE_TOP;

    /* 上/下横幅的内边缘紧贴中心窗口，但各自至少 88px 高（保证 40px 大字可读） */
    const MIN_BAND = 88;
    let tBottom = Math.max(R.y - 6, SAFE_TOP + MIN_BAND);
    let bTop = Math.min(R.y + R.h + 6, SAFE_BOT - MIN_BAND);
    /* 中心窗口极大时两条横幅会互相顶到：对半分剩余安全区 */
    if (bTop - tBottom < 4) {
      const mid = (SAFE_TOP + SAFE_BOT) / 2;
      tBottom = mid;
      bTop = mid;
    }
    const hT = Math.max(MIN_BAND, tBottom - SAFE_TOP);
    const hB = Math.max(MIN_BAND, SAFE_BOT - bTop);

    const lRight = R.x - 6;
    const rLeft = R.x + R.w + 6;
    const sideY = SAFE_TOP + hT;
    const sideH = Math.max(120, bTop - sideY);

    const cr = {
      l: { x: lRight - 600 - slide, y: sideY, w: 600, h: sideH },
      r: { x: rLeft + slide, y: sideY, w: 600, h: sideH },
      tp: { x: 0, y: tBottom - hT - slide, w: 1920, h: hT },
      b: { x: 0, y: bTop + slide, w: 1920, h: hB },
    };

    /* 第三阶段：机器 “活下来” 了 —— 四面墙外推，退成压暗的背景语境 */
    const p3 = U.easeInOut(inv(T.frame, T.frameEnd, t));
    const fr = {
      l: { x: lRight - 600 - 330, y: sideY, w: 600, h: sideH },
      r: { x: rLeft + 330, y: sideY, w: 600, h: sideH },
      tp: { x: 0, y: tBottom - hT - 250, w: 1920, h: hT },
      b: { x: 0, y: bTop + 220, w: 1920, h: hB },
    };

    const out = {};
    ['l', 'r', 'tp', 'b'].forEach((k) => {
      const a = cr[k], z = fr[k];
      out[k] = {
        x: U.lerp(a.x, z.x, p3), y: U.lerp(a.y, z.y, p3),
        w: U.lerp(a.w, z.w, p3), h: U.lerp(a.h, z.h, p3),
      };
    });
    /* 上/下是通栏横幅：压在左/右墙之上，标题和文字永不被切 */
    out.tp.z = 36;
    out.b.z = 36;
    out.l.z = 34;
    out.r.z = 34;
    return out;
  }

  /* ============================================================
     UPDATE
     ============================================================ */
  S.update = function (t, e, kick) {
    const bass = e ? e.bass : 0;
    const pulse = global.FX.pulse01 ? global.FX.pulse01(t) : 0;

    /* 世界层兜底底色（本幕主要画面在自建 canvas 上） */
    const wc = global.World.ctx;
    wc.fillStyle = '#05030a';
    wc.fillRect(0, 0, W, H);

    const R = windowRect(t);

    this.drawBg(t, bass, R);
    this.drawPiglets(t, pulse);
    this.updateStage1(t, pulse);
    this.updateStage2(t, R, pulse);
    this.updateStage3(t, pulse);
    this.updateVerdict(t, pulse);
    this.drawFx(t, pulse, R);
    this.updateFocus(t);
    this.updateChrome(t, R);
    this.updateCursor(t);
    this.emitImpacts(t);
  };

  /* ============================================================
     关键词审判：P3 之后每 3.2 秒裁决一个人词，画面持续变化
     ------------------------------------------------------------
     只给「单词 + 该词义的示意动画」，绝不再现整句歌词。
     动画由 keywords.js（第三幕同一套）驱动，保证全片语言统一。
     ============================================================ */
  const VERDICTS = [
    { t: 117.9, key: 'art',       n: 'ART' },
    { t: 121.1, key: 'song',      n: 'SONG' },
    { t: 124.3, key: 'word',      n: 'WORD' },
    { t: 127.5, key: 'love',      n: 'LOVE' },
    { t: 130.7, key: 'humanity',  n: 'HUMANITY' },
    { t: 133.9, key: 'sincerity', n: 'SINCERITY' },
    { t: 137.1, key: 'sympathy',  n: 'SYMPATHY' },
    { t: 140.3, key: 'bewitch',   n: 'BEWITCH' },
    { t: 143.5, key: 'discovery', n: 'DISCOVERY' },
    { t: 146.7, key: 'apology',   n: 'APOLOGY' },
  ];
  const V_HOLD = 2.85;   // 每条停留；空档 0.35s 留出"切换"的呼吸

  S.verdictAt = function (t) {
    for (let i = 0; i < VERDICTS.length; i++) {
      const v = VERDICTS[i];
      if (t >= v.t && t < v.t + V_HOLD) return { v: v, i: i, age: t - v.t };
    }
    return null;
  };

  S.updateVerdict = function (t, pulse) {
    const cur = this.verdictAt(t);
    const on = !!cur;
    show(this.verdict, on);
    if (!on) return;

    const v = cur.v;

    /* 文案：只换单词与一句英文注解 */
    const key = v.key;
    if (key !== this._vKey) {
      this._vKey = key;
      const K = global.KW && global.KW.byKey(key);
      this.vKw.textContent = v.n;
      this.vSub.textContent = K ? K.sub : '';
      this.vTag.textContent = 'SCHEMATIC: ' + v.n;
      this.vCode.textContent = 'VERDICT #' + (0x9F00 + cur.i * 17).toString(16).toUpperCase() + '  ILLEGAL';
      this.vLog.innerHTML =
        'MODULE: human_' + v.n.toLowerCase() + '.sys  [DELETED]<br>' +
        'REASON: 无法在 0.002 秒内复现  RETRY: ' + (cur.i + 1);
    }

    /* 动画：分辨率跟随容器 */
    const box = this.vCv.parentNode;
    const cw = Math.max(320, Math.round(box.clientWidth) || 620);
    const ch = Math.max(140, Math.round(box.clientHeight) || 230);
    if (this.vCv.width !== cw || this.vCv.height !== ch) {
      this.vCv.width = cw; this.vCv.height = ch;
    }
    const c = this.vCtx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#05000a';
    c.fillRect(0, 0, cw, ch);
    if (global.KW) global.KW.draw(c, key, cur.age, cw, ch);

    /* 位置：每条裁决换一个位置，故意允许遮挡 ——
       这类 Win98 错误框本来就该"到处乱弹"，整齐摆放反而不像系统故障。
       位置由序号决定（确定性），逐帧不变，只是不同条目之间跳。 */
    const SPOTS = [
      [1490, 112], [1436, 528], [96, 596], [1310, 268],
      [1502, 640], [64, 120], [1180, 592], [1488, 396],
      [70, 356], [1404, 96],
    ];
    const spot = SPOTS[cur.i % SPOTS.length];
    const W2 = 380, H2 = 350;
    this.verdict.style.left = spot[0] + 'px';
    this.verdict.style.top = spot[1] + 'px';
    this.verdict.style.width = W2 + 'px';
    this.verdict.style.height = H2 + 'px';
    this.verdict.style.zIndex = 150;
    /* 出场：滑入 22% 后停稳；末尾 0.3s 淡出（量化 0.05，保确定性） */
    const outP = U.inv(V_HOLD - 0.30, V_HOLD, cur.age);
    this.verdict.style.opacity = String(Math.round((1 - outP) * 20) / 20);
  };

  /* ---------- 受控冲击：声明式（纯时间查表，见 S.build 里的 FX.define） ---------- */
  S.emitImpacts = function (t) {
    /* 冲击点已在 S.build 用 FX.define 声明，这里不再逐帧登记，
       否则同一时刻的画面会依赖 seek 路径。保留空实现以维持调用点。 */
  };

  /* ============================================================
     背景
     ============================================================ */
  S.drawBg = function (t, bass, R) {
    const c = this.bg;
    const p2 = inv(T.p2 || 96.7, 101.0, t);
    const p3 = inv(T.frame, T.frameEnd, t);

    /* 底色：暗紫黑 → 血红黑 → 冷钢黑 */
    let top = lerpC([26, 4, 18], [58, 0, 8], p2);
    top = lerpC(top, [4, 10, 12], p3);
    let bot = lerpC([8, 2, 10], [18, 0, 3], p2);
    bot = lerpC(bot, [2, 5, 6], p3);

    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(top));
    g.addColorStop(0.55, rgb(lerpC(top, bot, 0.55)));
    g.addColorStop(1, rgb(bot));
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    /* 中心红光：随挤压程度增强 */
    const glow = 0.10 + R.q * 0.42 + bass * 0.10;
    const rg = c.createRadialGradient(960, 470, 60, 960, 470, 1000);
    rg.addColorStop(0, 'rgba(200,0,24,' + glow.toFixed(3) + ')');
    rg.addColorStop(0.55, 'rgba(120,0,16,' + (glow * 0.35).toFixed(3) + ')');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rg;
    c.fillRect(0, 0, W, H);

    /* 透视网格（极淡，冷色） */
    const gridCol = p3 > 0.5 ? 'rgba(70,220,190,0.10)' : 'rgba(255,120,140,0.075)';
    c.strokeStyle = gridCol;
    c.lineWidth = 2;
    const horizon = 700, vpx = 960;
    for (let i = -10; i <= 10; i++) {
      c.beginPath();
      c.moveTo(vpx + i * 26, horizon);
      c.lineTo(vpx + i * 300, H + 120);
      c.stroke();
    }
    const scroll = (t * 0.36) % 1;
    for (let i = 0; i < 15; i++) {
      const p = (i / 15 + scroll) % 1;
      const y = horizon + Math.pow(p, 2.3) * (H - horizon + 220);
      if (y > H + 40) continue;
      c.globalAlpha = 0.5 + p * 0.5;
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y);
      c.stroke();
    }
    c.globalAlpha = 1;

    /* P2：危险斜纹带（缓慢流动，绝不抖动） */
    if (p2 > 0.02 && p3 < 0.98) {
      const a = 0.05 + R.q * 0.10;
      c.save();
      c.globalAlpha = a * (1 - p3);
      c.strokeStyle = '#ffd400';
      c.lineWidth = 26;
      const off = (t * 90) % 96;
      for (let i = -6; i < 26; i++) {
        const x = i * 96 + off;
        c.beginPath();
        c.moveTo(x, H + 60);
        c.lineTo(x + 620, -120);
        c.stroke();
      }
      c.restore();
    }

    /* P3：冷色扫描带 + 竖向数据流 */
    if (p3 > 0.01) {
      c.save();
      c.globalAlpha = 0.55 * p3;
      c.fillStyle = 'rgba(0,40,36,0.9)';
      for (let y = 0; y < H; y += 6) {
        if (((y / 6) | 0) % 2) c.fillRect(0, y, W, 2);
      }
      c.globalAlpha = 0.30 * p3;
      c.fillStyle = '#2bff9a';
      const rr = U.rng(4711);
      for (let i = 0; i < 44; i++) {
        const x = rr() * W;
        const sp = 60 + rr() * 220;
        const len = 40 + rr() * 160;
        const y = ((t * sp + rr() * H) % (H + len)) - len;
        c.fillRect(x | 0, y | 0, 2, len | 0);
      }
      c.restore();
    }
  };

  /* ============================================================
     P1：资本 × 消费
     ============================================================ */
  S.updateStage1 = function (t, pulse) {
    const cap = this.wCap, cons = this.wCons;

    /* 滑入：84.60–85.85 / 84.66–86.05（快速） */
    const capIn = U.easeOut(inv(T.p1, T.p1 + 1.05, t));
    let capX = U.lerp(-840, 92, capIn);
    const consIn = U.easeOut(inv(T.p1 + 0.2, T.p1 + 1.25, t));
    let consX = U.lerp(1940, 1038, consIn);

    /* 撞击：88.17 起向中心猛冲，两边在 88.95 于画面中央对撞 */
    const hit = U.easeIn(inv(T.collide, T.merge, t));
    capX = U.lerp(capX, 168, hit);
    consX = U.lerp(consX, 966, hit);

    const live = t < T.merge + 0.02;
    show(cap.el, live && capIn > 0.001);
    show(cons.el, live && consIn > 0.001);
    if (live) {
      put(cap.el, capX, 170, 790, 312);
      put(cons.el, consX, 170, 790, 312);
    }

    /* 合并体：88.95 起“弹入”。
       注意：不用 transform: scale() —— 分数缩放在逐帧离线截图时
       会把文字光栅化到不同的亚像素格，导致同一 t 像素不一致。
       改用离散的整数尺寸 pop，视觉同样有冲击力且完全确定性。 */
    const machOn = t >= T.merge && t < 99.6;
    show(this.wMach.el, machOn);
    if (machOn) {
      const p = clamp01(inv(T.merge, T.merge + 0.42, t), 0, 1);
      const k = U.easeOutBack(p);
      const mw = Math.round(300 + 700 * clamp01(k, 0, 1.06));
      const mh = Math.round(90 + 210 * clamp01(k, 0, 1.06));
      put(this.wMach.el, 960 - mw / 2, 176, mw, mh);
      this.wMach.el.style.transform = '';
      /* 99.0 之后淡出，给红墙让位。
         透明度量化到 0.05 步进 —— 分数 opacity 会让文字在合成阶段
         落到不同亚像素格，同一 t 的离线截图会不一致。 */
      const fade = Math.round((1 - clamp01(inv(98.6, 99.6, t), 0, 1)) * 20) / 20;
      this.wMach.el.style.opacity = String(fade);
    }

    /* 金色躺赚条：86.3 滑入，数字随 t 单调爬升 */
    const goldOn = t >= 86.30 && t < 100.2;
    show(this.wGold.el, goldOn);
    if (goldOn) {
      const gi = U.easeOut(inv(86.30, 87.10, t));
      put(this.wGold.el, U.lerp(2010, 1404, gi), 28, 500, 148);
      const climb = U.easeOut(inv(T.collide, T.crush1, t));
      const val = climb * 999999999;
      text(this.goldNum, '+$' + commas(val));
    }

    /* ============================================================
       OINK OINK 印章：逐拍「哼」的脉冲源 = BEATS.oinks（实测鼻音爆破）
       ------------------------------------------------------------
       旧的写法是一个 96.75 砸一次就凝固的静态印章，完全不理音频；
       现在每一拍都重新算一遍：
         脉冲 p（0..1，30ms 砸下 + 130ms 回落）
           → 字号 = 基础 + 一整档（+18px）
           → 下沉 = 整数 px（最多 12px）
         两次脉冲之间保持「呼吸」：字号随 e.grunt 在 ±4px 内浮动、
           不透明度随 e.grunt 轻微起伏，所以空隙里画面也是活的。
       硬约束：全程 Math.round 到整数 px；不用 rotate()；文字层只做
       整数 translateY（沿用印章本身既有的 -50% 居中位移），绝不抖字幕。 */
    const br = gruntAt(t);                       // 呼吸源：鼻音能量
    const pulseO = oinkPulseAt(t);               // 当前这一拍「哼」的包络
    const oinkOn = t >= OINK0 - 0.20 && t < T.oinkOut + 0.10;
    show(this.oink, oinkOn);
    if (oinkOn) {
      /* 淡出：从最后一拍的峰值之后才开始，最后一「哼」必须满幅 */
      const out = clamp01(inv(oinkOut0(), T.oinkOut, t), 0, 1);
      /* 入场：在第一拍峰值（OINK0）之前就完成，绝不削弱第一声「哼」 */
      const enter = clamp01(U.easeOut(inv(OINK0 - 0.20, OINK0 - 0.03, t), 0, 1));

      /* 呼吸（整数 px）：±4px，取整后只有 9 个可能值，不会亚像素抖动 */
      const breathe = Math.round((br - 0.30) * 13);          // 约 -4 … +4
      const kick = Math.round(pulseO * 18);                    // 每拍字号跳一档 0…18

      const fs = Math.round(OINK_BASE + kick + breathe - (1 - enter) * 26);
      /* 整数像素的「砸下」：峰值那一帧砸得最深，包络回落后抬回原位 */
      const drop = Math.round(pulseO * 10 + (1 - enter) * -16);
      /* 透明度：0.05 量化（分数 opacity 会改变文字合成层） */
      const lift = 0.10 * br + 0.16 * pulseO;
      const alpha = qa((0.84 + lift) * (1 - out) * (0.45 + 0.55 * enter));

      css(this.oink, '--oink-size', Math.max(28, fs) + 'px');
      css(this.oink, 'transform',
        'translate(-50%,-50%) translateY(' + drop + 'px)');
      css(this.oink, 'opacity', String(alpha));
    }
    this.oink.__pulse = pulseO;
    this.oink.__grunt = br;

    /* ============================================================
       车速表：「300k per hour」段（oinkOut → crush0）跟着实测重音踢腿
       ------------------------------------------------------------
       指针角度 = 基准巡航角 + 每个 accPulse 的整 5° 跳档。
       BEATS.accents.act4 里 96.5–100.3 之间的 14 个重音各给一次 0.22s 的
       衰减脉冲，所以指针是「一跳一落」，而不是匀速扫表。
       ACC_ACT4 在这段之外自然为空 → 早于/晚于该段不产生任何位移。 */
    const spOn = t >= T.oinkOut && t < T.crush0 + 0.05;
    show(this.speedo, spOn);
    if (spOn) {
      const acc = accPulseAt(t);
      /* 巡航角：96.5→100.3 从 -118° 缓慢推到 -22°（越大越快） */
      const cruise = -118 + 96 * clamp01(inv(96.5, T.crush0, t), 0, 1);
      /* 重音踢腿：整 5° 一档，最多 +26° */
      const kickDeg = Math.round(acc * 26 / 5) * 5;
      const deg = Math.round(cruise + kickDeg);
      css(this.speedoNeedle, 'transform', 'rotate(' + deg + 'deg)');
      /* 读数：巡航 300.0 → 重音瞬间冲到 380+，整数显示 */
      const kmh = Math.round((300 + acc * 92) * 10) / 10;
      text(this.speedoVal, kmh.toFixed(1));
    }
  };

  /* ============================================================
     P2：四面楚歌 —— 生存空间物理挤压
     ============================================================ */
  S.updateStage2 = function (t, R, pulse) {
    const on = t >= T.humanIn && t < T.end;

    /* ---- 中心窗口 ---- */
    show(this.wHw.el, on);
    if (!on) {
      /* 幕内早于 humanIn 的时刻：四面红墙必须显式收起，
         否则从后面时刻往回 seek 会残留上一帧的墙（破坏确定性） */
      this.wallDefs.forEach((d) => show(this.walls[d.key].el, false));
      return;
    }

    const hw = this.wHw, el = hw.el;
    const w = R.w, h = R.h;
    put(el, R.x, R.y, w, h);

    const pct = Math.round(U.lerp(100, 5, R.q));
    const crit = pct <= 20 || (t >= T.crush1);
    const robot = t >= T.click + 0.10;

    el.classList.toggle('is-critical', crit && !robot);
    el.classList.toggle('is-tiny', w < 640 && !robot);
    el.classList.toggle('is-robot', robot);

    /* 标题文本：极窄时只留最必要的信息，绝不溢出 */
    if (robot) {
      text(hw.title, '🤖 编号_9527_自动化牛马节点.SYS (情感模块已卸载)');
    } else if (w < 560) {
      text(hw.title, '🧍 ' + pct + '% [CRITICAL]');
    } else if (w < 900) {
      text(hw.title, '🧍 人类_生存空间 ' + pct + '%' + (crit ? ' [CRITICAL!]' : ''));
    } else {
      text(hw.title, '🧍 普通人类_生存空间.EXE — 剩余喘息空间: ' + pct + '%' +
        (crit ? ' [CRITICAL!]' : ''));
    }

    /* 内部 canvas */
    const bw = Math.max(8, Math.round(w - 12));
    const bh = Math.max(8, Math.round(h - 54));
    if (this.hwCv.width !== bw || this.hwCv.height !== bh) {
      this.hwCv.width = bw;
      this.hwCv.height = bh;
    }
    const g = this.hwG;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, bw, bh);

    /* 人类 → 机器人 交叉淡入 */
    const mix = clamp01(inv(T.click + 0.10, T.click + 0.62, t), 0, 1);
    g.fillStyle = '#0a0d0e';
    g.fillRect(0, 0, bw, bh);
    if (mix > 0.001) {
      g.globalAlpha = mix;
      drawRobot(g, bw, bh, t, pulse);
      g.globalAlpha = 1;
    }
    if (mix < 0.999) {
      g.globalAlpha = 1 - mix;
      drawHuman(g, bw, bh, t, R.q, pct, crit);
      g.globalAlpha = 1;
    }

    /* ---- 四面红墙 ---- */
    const L = wallLayout(t, R);
    const p3 = t >= T.frame - 0.02;
    this.wallDefs.forEach((d) => {
      const win = this.walls[d.key];
      const r = L[d.key];
      show(win.el, true);
      put(win.el, r.x, r.y, r.w, r.h);
      if (win.el.style.zIndex !== String(r.z)) win.el.style.zIndex = r.z;
      /* 上下两条“天花板/地板”把真实高度交给 CSS，字号自适应 */
      if (d.key === 'tp' || d.key === 'b') {
        const bh = Math.round(r.h) + 'px';
        if (win.__bh !== bh) { win.__bh = bh; win.el.style.setProperty('--band-h', bh); }
      }
      /* 进入第三阶段后换成“封锁”文案（一次性写属性） */
      if (p3 !== win.__phase3) {
        win.__phase3 = p3;
        win.body.setAttribute('data-l1', p3 ? d.p3a : d.l1);
        win.body.setAttribute('data-l2', p3 ? d.p3b : d.l2);
      }
    });
  };

  /* ============================================================
     P3：异化协议弹窗 + 聚焦
     ============================================================ */
  S.updateStage3 = function (t, pulse) {
    const on = t >= T.unless && t < T.click + 0.16;
    show(this.wModal.el, on);
    if (on) {
      const p = clamp01(inv(T.unless, T.unless + 0.30, t), 0, 1);
      const k = clamp01(U.easeOutBack(p), 0, 1.02);
      /* 同样不用分数 scale：改用整数尺寸 pop（离线逐帧确定性） */
      const mw = Math.round(940 + 300 * k);
      const mh = Math.round(300 + 96 * k);
      put(this.wModal.el, 960 - mw / 2, 146, mw, mh);
      this.wModal.el.style.transform = '';
      const clicked = t >= T.click;
      this.neon.classList.toggle('is-hit', clicked);
      /* 点击瞬间按钮下沉 2px（整数，不抖页面） */
      this.neon.style.transform = clicked ? 'translateY(2px)' : '';
    }
  };

  /* ============================================================
     聚光：同屏唯一主角
       P3 弹窗期  → 弹窗
       异化之后    → 机器人节点窗口（四面红墙退成压暗的背景语境）
     其余时间     → 全部清空
     ============================================================ */
  S.updateFocus = function (t) {
    const modalOn = t >= T.unless && t < T.click + 0.16;
    const nodeOn = t >= T.click + 0.16 && t < T.end;
    let focus = null;
    if (modalOn) focus = this.wModal.el;
    else if (nodeOn) focus = this.wHw.el;

    if (focus) global.W98.spotlight(this.root, focus);
    else global.W98.clearSpotlight(this.root);
  };

  /* ============================================================
     鼠标：从人手颤抖 → 被强制吸附 → 机械十字准星
     ============================================================ */
  S.updateCursor = function (t) {
    const cur = global.APP.cursor;
    cur.visible = true;

    if (t < T.unless) {
      /* 旁观者：缓慢漂浮（纯函数） */
      cur.kind = 'arrow';
      cur.tremor = 0.4;
      cur.x = 1430 + Math.sin(t * 0.62) * 190;
      cur.y = 690 + Math.cos(t * 0.51) * 96;
      return;
    }

    if (t < T.click) {
      /* 被系统强行拽向按钮，同时剧烈颤抖 */
      const p = U.easeInOut(inv(T.unless, T.click - 0.10, t));
      const amp = 4 + 15 * Math.sin(inv(T.unless, T.click, t) * Math.PI);
      cur.kind = 'arrow';
      cur.tremor = 2.0 + 3.6 * Math.sin(inv(T.unless, T.click, t) * Math.PI);
      cur.x = U.lerp(1430, this.btnC.x, p) + Math.sin(t * 63.0) * amp;
      cur.y = U.lerp(690, this.btnC.y, p) + Math.cos(t * 55.0) * amp * 0.72;
      return;
    }

    /* 机械十字准星：绝对匀速折线，无人手抖动 */
    cur.kind = 'crosshair';
    cur.tremor = 0;
    const pts = [
      [this.btnC.x, this.btnC.y], [1276, 214], [452, 322], [1610, 486],
      [706, 668], [1430, 262], [318, 566], [1160, 706], [960, 300],
    ];
    const per = 2.6;
    const phase = (t - T.click) / per;
    const idx = Math.floor(phase);
    const local = phase - idx;
    const a = pts[((idx % pts.length) + pts.length) % pts.length];
    const b = pts[(((idx + 1) % pts.length) + pts.length) % pts.length];
    cur.x = U.lerp(a[0], b[0], local);
    cur.y = U.lerp(a[1], b[1], local);
  };

  /* ============================================================
     阶段条 + 任务栏
     ============================================================ */
  S.updateChrome = function (t, R) {
    let b = '①', c = '', txt = '资本 × 消费 · 合谋绞肉机';
    if (t >= T.click) {
      b = '③'; c = 'is-p3'; txt = '异化完成 · 情感模块已卸载';
    } else if (t >= T.unless) {
      b = '③'; c = 'is-p2'; txt = '异化协议 · 被迫选择中…';
    } else if (t >= T.humanIn) {
      b = '②'; c = 'is-p2'; txt = '生存空间 · 四面物理挤压 ' + Math.round(U.lerp(100, 5, R.q)) + '%';
    }
    text(this.chipB, b);
    text(this.chipT, txt);
    if (this.chip.className !== 'a4-chip ' + c) this.chip.className = 'a4-chip ' + c;

    const idx = t >= T.click ? 2 : (t >= T.humanIn ? 1 : 0);
    global.APP.setTaskbar([
      { t: 'CAPITAL_PIG.EXE', ico: 'pig' },
      { t: '普通人类_生存空间.EXE', ico: 'computer' },
      { t: '9527_牛马节点.SYS', ico: 'disk' },
    ], idx);
  };

  /* ============================================================
     野猪群（canvas）
     ============================================================ */
  S.drawPiglets = function (t, pulse) {
    const c = this.pig;
    c.clearRect(0, 0, W, H);
    if (t < T.piglets - 0.05 || t > 99.7) return;
    /* 96.85 之后不再整体消失：猪群要一直跟着「哼」跳到 99.28 的最后一拍，
       所以淡出推迟到 oinkOut 附近，且用整数步进的透明度保持确定性。 */
    const fade0 = Math.max(oinkPulses()[oinkPulses().length - 1], T.oinkOut - 0.34);
    const alpha = t <= fade0 ? 1 : 1 - clamp01(inv(fade0, T.oinkOut + 0.10, t), 0, 1);
    if (alpha <= 0.01) return;

    /* ---- 每一拍「哼」→ 全群纵向整数跳变（≤6px）----
       只作用于 canvas 上画的猪，绝不碰任何文字层 / 字幕。 */
    const beat = oinkPulseAt(t);
    const CAP = 6;                             // 任务规定的硬上限
    const hop = Math.round(beat * 5);          // 0..5 整数 px
    /* 每只猪再加一个固定的相位错开（0 或 1px），避免整群像一块铁板；
       与 hop 相加后仍用 CAP 钳死，保证任何一帧都不超过 6px。 */
    const stagger = Math.round(beat * 3) > 0 ? 1 : 0;

    c.save();
    c.globalAlpha = alpha;
    const run = t >= T.streets;

    for (let i = 0; i < this.pigs.length; i++) {
      const p = this.pigs[i];
      const age = t - p.te;
      if (age < 0) continue;
      let x, y;
      if (!run) {
        /* 从绞肉机底部倾泻 */
        const sx = 960 + (p.vx * 0.06);
        x = sx + p.vx * age * 0.62;
        y = 470 + p.vy * age + 640 * age * age;
      } else {
        /* 接管街道：分层匀速狂奔 */
        const lane = 512 + Math.floor(p.lane * 4) * 68;
        const span = W + 420;
        x = ((i * 190 + p.spd * (t - T.streets) + p.ph * 60) % span) - 210;
        y = lane;
      }
      /* 跟着鼓点蹦：竖向位移取整，横向不动，观感是「整群一起被哼得弹起来」 */
      const lift = Math.min(CAP, hop + ((i % 3) === 0 ? stagger : 0));
      x = Math.round(x);
      y = Math.round(y) - lift;
      if (y > 1010 || x < -160 || x > W + 160) continue;
      const spd = run ? 1 : 0.25;
      /* 速度残影 */
      if (run) {
        for (let k = 1; k <= 2; k++) {
          c.globalAlpha = alpha * (0.18 / k);
          ART.piglet(c, x - k * 34, y, p.s, 0, { speed: spd });
        }
        c.globalAlpha = alpha;
      }
      ART.piglet(c, x, y, p.s, Math.floor(t * 12 + i), { speed: spd });
    }
    c.restore();
    c.globalAlpha = 1;
  };

  /* ============================================================
     全屏特效层：电弧 / 闪光 / 点击爆点
     ============================================================ */
  S.drawFx = function (t, pulse, R) {
    const c = this.fx;
    c.clearRect(0, 0, W, H);

    /* --- 88.17–89.25 电弧撞击 --- */
    const arc = clamp01(inv(T.collide, T.collide + 0.10, t), 0, 1) *
      (1 - clamp01(inv(T.merge, T.merge + 0.30, t), 0, 1));
    if (arc > 0.01) {
      const capR = 246 + 790, consL = 884;   // 两窗对撞时的相对边
      const cy = 326;
      for (let k = 0; k < 5; k++) {
        const y0 = 200 + k * 62;
        lightning(c, capR - 30, y0, consL + 30, y0 + 12, t, k, arc);
      }
      /* 中心爆点 */
      const burst = c.createRadialGradient(960, cy, 8, 960, cy, 340 * arc);
      burst.addColorStop(0, 'rgba(255,255,255,' + (0.95 * arc) + ')');
      burst.addColorStop(0.3, 'rgba(120,255,255,' + (0.55 * arc) + ')');
      burst.addColorStop(1, 'rgba(0,120,255,0)');
      c.fillStyle = burst;
      c.fillRect(300, 0, 1320, 700);
    }

    /* --- 88.95 合并：一次极短的青白闪光，随后迅速退去（不糊住读数） --- */
    const f1 = flash(t, T.merge - 0.06, 0.26);
    if (f1 > 0.01) {
      c.fillStyle = 'rgba(200,255,255,' + (f1 * 0.62).toFixed(3) + ')';
      c.fillRect(0, 0, W, H);
    }
    /* 合并后的余辉：只在窗口外缘，不覆盖内部文字 */
    const aft = clamp01(inv(T.merge, T.merge + 1.5, t), 0, 1);
    if (aft > 0 && aft < 1) {
      const a2 = (1 - aft) * 0.5;
      c.strokeStyle = 'rgba(120,255,255,' + a2.toFixed(3) + ')';
      c.lineWidth = 18 * (1 - aft) + 2;
      c.strokeRect(452, 168, 1016, 316);
    }

    /* --- 每一拍「哼」：多层暖色冲击环（逐拍重算，不再只闪一次） ---
       环的半径/线宽/透明度全部由该拍的包络决定，每一拍各不相同；
       每拍还额外叠一圈错开的环，形成「鼻腔共鸣」的叠影。 */
    const pulses = oinkPulses();
    const wts = oinkWeights();
    for (let i = 0; i < pulses.length; i++) {
      const d = t - pulses[i];
      if (d < 0 || d > 0.42) continue;
      const k = 1 - d / 0.42;             // 线性余量
      const e2 = k * k;                    // 二次衰减
      const g = wts[i];
      const rad0 = 220 + 620 * U.easeOut(1 - k);
      for (let j = 0; j < 2; j++) {
        const a2b = e2 * (0.75 - j * 0.32);
        if (a2b <= 0.01) continue;
        c.strokeStyle = j === 0
          ? 'rgba(255,214,74,' + a2b.toFixed(3) + ')'
          : 'rgba(255,120,20,' + (a2b * 0.8).toFixed(3) + ')';
        c.lineWidth = Math.max(2, (22 - j * 9) * e2);
        c.beginPath();
        c.arc(960, 500, rad0 * (1 - j * 0.16), 0, TAU);
        c.stroke();
      }
      /* 每拍一次极短的白闪（只铺一层淡光晕，不盖住印章文字） */
      if (d < 0.09) {
        const fl = 1 - d / 0.09;
        c.fillStyle = 'rgba(255,236,150,' + (fl * 0.10 * (0.6 + g * 0.6)).toFixed(3) + ')';
        c.fillRect(0, 0, W, H);
      }
    }

    /* --- 112.86 “we are powerless”：全场血红 + 慢脉动 --- */
    const red = Math.max(flash(t, T.crush1, 0.55), 0) +
      (t > T.crush1 && t < T.unless ? (0.10 + 0.10 * Math.sin(t * 5.4)) : 0);
    if (red > 0.005) {
      c.fillStyle = 'rgba(200,0,12,' + Math.min(0.72, red).toFixed(3) + ')';
      c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,40,40,' + Math.min(0.5, red * 0.6).toFixed(3) + ')';
      c.fillRect(0, 0, W, 26);
      c.fillRect(0, H - 74, W, 26);
    }

    /* --- 117.09 点击 → 视觉断裂白闪 --- */
    const f3 = flash(t, T.click, 0.30);
    if (f3 > 0.01) {
      c.fillStyle = 'rgba(255,255,255,' + (f3).toFixed(3) + ')';
      c.fillRect(0, 0, W, H);
      /* 断裂切片 */
      const rr = U.rng(9090 + Math.round(t * 30));
      for (let i = 0; i < 14; i++) {
        const y = rr() * H, h = 8 + rr() * 60;
        c.fillStyle = 'rgba(0,0,0,' + (0.35 * f3).toFixed(3) + ')';
        c.fillRect(0, y | 0, W, h | 0);
      }
    }

    /* --- 点击爆点圆环 --- */
    const f4 = inv(T.click, T.click + 0.45, t);
    if (f4 > 0 && f4 < 1) {
      c.strokeStyle = 'rgba(120,255,180,' + (1 - f4).toFixed(3) + ')';
      c.lineWidth = 14 * (1 - f4) + 2;
      c.beginPath();
      c.arc(this.btnC.x, this.btnC.y, 40 + f4 * 620, 0, TAU);
      c.stroke();
    }
  };

  /* 锯齿电弧 */
  function lightning(c, x0, y0, x1, y1, t, seed, k) {
    const rr = U.rng(1301 + seed * 97 + Math.round(t * 26));
    const segs = 13;
    c.save();
    c.lineCap = 'round';
    for (let pass = 0; pass < 3; pass++) {
      const col = pass === 0 ? 'rgba(140,255,255,' + (0.55 * k) + ')'
        : pass === 1 ? 'rgba(255,255,255,' + (0.95 * k) + ')'
          : 'rgba(90,180,255,' + (0.45 * k) + ')';
      c.strokeStyle = col;
      c.lineWidth = pass === 1 ? 4 : 10;
      c.beginPath();
      c.moveTo(x0, y0);
      let px = x0, py = y0;
      for (let i = 1; i <= segs; i++) {
        const f = i / segs;
        const nx = x0 + (x1 - x0) * f + (rr() - 0.5) * 120 * (1 - Math.abs(f - 0.5) * 2) * k;
        const ny = y0 + (y1 - y0) * f + (rr() - 0.5) * 70 * (1 - Math.abs(f - 0.5) * 2) * k;
        c.lineTo(nx, ny);
        px = nx; py = ny;
      }
      c.stroke();
    }
    c.restore();
  }

  /* ============================================================
     中心窗口内部：暖色 · 人类
     全部按真实像素布局（bw/bh），窗口越小越收敛构图：
       宽 >= 820  : 完整房间（窗景 + 盆栽 + 画架 + 小人 + 三条命）
       宽 430–820 : 去掉房间道具，只留小人与三条命
       宽 < 430   : 竖排：小人缩在最上，三条命压成细条
     字号用随 bh 收缩但钳制在 >= 22px（2x 规格）。
     ============================================================ */
  function drawHuman(g, bw, bh, t, q, pct, crit) {
    const compact = bw < 820;
    const tiny = bw < 430;
    const pad = tiny ? 8 : 14;

    /* 窗口内部自身颤抖（不抖整页） */
    const trem = tiny ? 0.7 : 1.1 + q * 4.0;
    g.save();
    g.translate(Math.round(Math.sin(t * 47.0) * trem), Math.round(Math.cos(t * 39.0) * trem));

    /* ---- 背景 ---- */
    const bg = g.createLinearGradient(0, 0, 0, bh);
    bg.addColorStop(0, '#fffdf5');
    bg.addColorStop(1, '#f7e6c6');
    g.fillStyle = bg;
    g.fillRect(-20, -20, bw + 40, bh + 40);
    g.fillStyle = 'rgba(196,170,124,0.32)';
    for (let y = 0; y < bh; y += 22) {
      const off = ((y / 22) | 0) % 2 ? 11 : 0;
      for (let x = off; x < bw; x += 22) g.fillRect(x, y, 2, 2);
    }

    /* ---- 顶部红色表头：剩余喘息空间（永远可读，永远最上层） ---- */
    const HDR = tiny ? 54 : 84;
    g.fillStyle = 'rgba(122,0,16,0.96)';
    g.fillRect(-20, -20, bw + 40, HDR + 20);
    const pFs = tiny ? 36 : 40;
    g.font = 'bold ' + pFs + 'px "Fixedsys","Courier New",monospace';
    g.fillStyle = crit ? '#ff3b3b' : '#ffe000';
    g.textBaseline = 'middle';
    const pTxt = pct + '%';
    const pY = tiny ? 22 : HDR - 56;
    g.fillText(pTxt, pad, pY);
    const pw = g.measureText(pTxt).width;

    if (tiny) {
      g.font = 'bold 22px Tahoma,"Microsoft YaHei",sans-serif';
      g.fillStyle = '#ffb3b3';
      g.fillText(crit ? '剩余空间 · CRITICAL' : '剩余空间', pad + pw + 10, pY);
    } else {
      g.font = 'bold 24px Tahoma,"Microsoft YaHei",sans-serif';
      g.fillStyle = '#ffb3b3';
      g.fillText('剩余喘息空间', pad + pw + 66, pY);
      if (crit) {
        g.fillStyle = '#ffffff';
        g.textAlign = 'right';
        g.fillText('CRITICAL', bw - pad, pY);
        g.textAlign = 'left';
      }
    }
    g.textBaseline = 'alphabetic';
    /* 刻度条 */
    if (!tiny) {
      const barY = HDR - 26, barW = bw - pad * 2;
      g.fillStyle = '#33000a';
      g.fillRect(pad, barY, barW, 18);
      g.fillStyle = crit ? '#ff2020' : (pct > 50 ? '#00d34a' : '#ffd000');
      g.fillRect(pad + 2, barY + 2, Math.max(0, (barW - 4) * (pct / 100)), 14);
    }

    /* ---- 中部内容区 ---- */
    const cy0 = HDR + 6;
    const ch = bh - cy0 - 6;

    /* 房间道具：只在宽窗口里出现 */
    if (!compact) {
      const sx = pad + 4, sy = cy0 + 8, sw = Math.min(250, bw * 0.24), sh = Math.max(60, ch - 26);
      const sky = g.createLinearGradient(0, sy, 0, sy + sh);
      sky.addColorStop(0, '#8fd4ff');
      sky.addColorStop(1, '#d9f2ff');
      g.fillStyle = sky;
      g.fillRect(sx, sy, sw, sh);
      g.fillStyle = '#ffe45c';
      g.beginPath(); g.arc(sx + sw * 0.72, sy + sh * 0.22, sh * 0.15, 0, TAU); g.fill();
      g.fillStyle = '#ffffff';
      g.fillRect(sx + sw * 0.12, sy + sh * 0.38, sw * 0.32, 9);
      g.fillRect(sx + sw * 0.2, sy + sh * 0.30, sw * 0.24, 9);
      g.strokeStyle = '#8a6a40'; g.lineWidth = 6;
      g.strokeRect(sx, sy, sw, sh);
      g.beginPath();
      g.moveTo(sx + sw / 2, sy); g.lineTo(sx + sw / 2, sy + sh);
      g.stroke();
      g.fillStyle = '#3f8a3a';
      g.beginPath(); g.ellipse(sx + sw + 34, sy + sh - 66, 20, 40, -0.4, 0, TAU); g.fill();
      g.fillStyle = '#a4521f';
      g.fillRect(sx + sw + 12, sy + sh - 40, 46, 40);
    }

    /* ---- 布局：宽窗口 小人+右侧三条命；挤压窗口 左小人+右侧三条细命 ---- */
    const vitW = tiny ? Math.round(bw * 0.55) : Math.min(410, bw * 0.42);
    const gapV = tiny ? 4 : 14;
    const vitX = tiny ? bw - vitW - 4 : bw - vitW - pad;
    const vitY0 = cy0 + (tiny ? 0 : 6);
    const itemH = tiny
      ? Math.max(20, (ch - gapV * 2) / 3)
      : Math.min(124, (ch - gapV * 2) / 3);

    /* ---- 像素人类 ---- */
    const humAreaW = tiny ? (bw - vitW - 8) : (compact ? (bw - vitW - pad) : 300);
    const humCx = tiny ? humAreaW / 2 + 2 : pad + humAreaW * 0.5;
    const feet = cy0 + ch - (tiny ? 2 : 8);
    const humSc = tiny
      ? Math.max(0.14, Math.min(0.46, ch / 380))
      : Math.min(1.05, Math.max(0.42, ch / 400));
    pixelHuman(g, humCx, feet, q, t, crit, humSc);

    /* ---- 三条生命值 ---- */
    const VIT_FULL = ['【打工人尊严】', '【灵魂与创造力】', '【仅存的饭碗】'];
    const VIT_MIN = ['【尊严】', '【灵魂】', '【饭碗】'];
    for (let i = 0; i < 3; i++) {
      const y = vitY0 + i * (itemH + gapV);
      /* 绝不再“丢弃”第三条：空间不够就把条目压薄，保证三条永远齐全 */
      const ih = Math.min(itemH, Math.max(16, (bh - 2 - y)));
      if (ih < 12) break;
      const tight = ih < 40;
      const d = clamp01((q - i * 0.05) / (0.88 - i * 0.05), 0, 1);
      const v = 1 - d;

      if (!tiny) {
        g.fillStyle = '#2a1c10';
        g.fillRect(vitX, y, vitW, ih);
        g.fillStyle = '#0d0805';
        g.fillRect(vitX + 5, y + 5, vitW - 10, Math.max(2, ih - 10));
      }
      /* 标签 */
      const lfs = tight ? 20 : (tiny ? 22 : (ih < 96 ? 22 : 25));
      g.font = 'bold ' + lfs + 'px Tahoma,"Microsoft YaHei",sans-serif';
      g.fillStyle = tiny ? '#3a2412' : '#ffe9c0';
      g.textBaseline = 'middle';
      g.fillText(tiny ? VIT_MIN[i] : VIT_FULL[i], vitX + (tiny ? 0 : 14), y + ih * (tight ? 0.5 : (tiny ? 0.30 : 0.32)));
      /* 条 */
      const bx = vitX + (tiny ? 0 : 14);
      const bwd = tiny ? vitW : vitW - 28;
      const byy = y + ih * (tight ? 0.66 : (tiny ? 0.56 : 0.52));
      const bhh = Math.max(8, Math.min(ih * 0.34, tiny ? 14 : 42));
      g.fillStyle = '#140d08';
      g.fillRect(bx, byy, bwd, bhh);
      g.fillStyle = v > 0.62 ? '#00d34a' : v > 0.3 ? '#ffd000' : '#ff2418';
      g.fillRect(bx + 2, byy + 2, Math.max(0, (bwd - 4) * v), bhh - 4);
      g.fillStyle = 'rgba(0,0,0,0.42)';
      for (let k = 1; k < 10; k++) g.fillRect(bx + 2 + k * (bwd - 4) / 10, byy + 2, 2, bhh - 4);
      g.textBaseline = 'alphabetic';
      if (!tiny) {
        g.font = 'bold 24px "Fixedsys","Courier New",monospace';
        g.fillStyle = v <= 0.001 ? '#ff2418' : '#ffffff';
        g.textAlign = 'right';
        g.fillText(v <= 0.001 ? 'EMPTY' : Math.round(v * 100) + '%', vitX + vitW - 14, y + itemH * 0.32);
        g.textAlign = 'left';
      }
    }

    /* ---- 红色闪烁（随挤压加重） ---- */
    if (q > 0.02) {
      const fl = (0.05 + q * 0.26) * (0.55 + 0.45 * Math.sin(t * 9.0));
      g.fillStyle = 'rgba(255,0,0,' + Math.max(0, fl).toFixed(3) + ')';
      g.fillRect(-20, -20, bw + 40, bh + 40);
    }
    /* 边缘褶皱 */
    if (q > 0.28 && !tiny) {
      g.strokeStyle = 'rgba(120,0,0,' + (0.22 + q * 0.4).toFixed(3) + ')';
      g.lineWidth = 5;
      const n = 4;
      for (let i = 0; i < n; i++) {
        const yy = cy0 + 20 + i * (ch - 40) / (n - 1);
        g.beginPath(); g.moveTo(6, yy); g.lineTo(22 + q * 26, yy + 16); g.stroke();
        g.beginPath(); g.moveTo(bw - 6, yy); g.lineTo(bw - 22 - q * 26, yy + 16); g.stroke();
      }
    }
    g.restore();

    /* 外框红色警告 */
    if (crit) {
      g.strokeStyle = 'rgba(255,0,0,' + (0.5 + 0.5 * Math.sin(t * 12)).toFixed(3) + ')';
      g.lineWidth = 10;
      g.strokeRect(5, 5, bw - 10, bh - 10);
    }
  }

  /* 像素小人：站立作画 → 蜷缩护头
     sc 是整体缩放系数（由可用高度决定），保证任何窗口尺寸下都完整可见 */
  function pixelHuman(g, cx, feetY, q, t, crit, sc) {
    sc = sc == null ? 1 : sc;
    const s = (1 - 0.26 * q) * sc;
    const headR = 40 * s;
    const hipY = feetY - 150 * s;
    const shY = hipY - 132 * s;
    const headY = shY - headR - 18 * s + q * 26 * s;

    g.save();
    /* 影子 */
    g.fillStyle = 'rgba(120,90,50,0.20)';
    g.beginPath();
    g.ellipse(cx, feetY + 6 * s, 74 * s, 13 * s, 0, 0, TAU);
    g.fill();

    /* 腿 */
    g.strokeStyle = '#3f5f9c';
    g.lineWidth = Math.max(2, 26 * s);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - 20 * s, hipY);
    g.lineTo(cx - 26 * s - q * 6 * s, feetY);
    g.moveTo(cx + 20 * s, hipY);
    g.lineTo(cx + 26 * s + q * 6 * s, feetY);
    g.stroke();
    /* 鞋 */
    g.fillStyle = '#2a2a30';
    g.fillRect(cx - 44 * s, feetY - 6 * s, 40 * s, 15 * s);
    g.fillRect(cx + 6 * s, feetY - 6 * s, 40 * s, 15 * s);

    /* 躯干（工作服） */
    g.fillStyle = '#f0a24a';
    g.beginPath();
    g.moveTo(cx - 42 * s, shY);
    g.lineTo(cx + 42 * s, shY);
    g.lineTo(cx + 34 * s, hipY + 6 * s);
    g.lineTo(cx - 34 * s, hipY + 6 * s);
    g.closePath();
    g.fill();
    g.fillStyle = '#d9863a';
    g.fillRect(cx - 34 * s, hipY - 46 * s, 68 * s, 21 * s);

    /* 手臂：左手持画笔伸向画布，右手在紧张时抱头 */
    const armUp = clamp01((q - 0.35) / 0.65, 0, 1);
    g.strokeStyle = '#f8c090';
    g.lineWidth = Math.max(2, 22 * s);
    g.beginPath();
    g.moveTo(cx - 40 * s, shY + 16 * s);
    g.lineTo(cx - 92 * s, shY + 58 * s - armUp * 38 * s);
    g.stroke();
    /* 画笔 */
    g.strokeStyle = '#c0392b';
    g.lineWidth = Math.max(2, 9 * s);
    g.beginPath();
    g.moveTo(cx - 92 * s, shY + 58 * s - armUp * 38 * s);
    g.lineTo(cx - 142 * s, shY + 24 * s - armUp * 38 * s);
    g.stroke();

    /* 右臂：抱头护住 */
    g.strokeStyle = '#f8c090';
    g.lineWidth = Math.max(2, 22 * s);
    g.beginPath();
    g.moveTo(cx + 40 * s, shY + 16 * s);
    g.lineTo(cx + 60 * s, shY + 74 * s - armUp * 92 * s);
    g.stroke();

    /* 头 */
    g.fillStyle = '#f8c090';
    g.beginPath();
    g.arc(cx, headY, headR, 0, TAU);
    g.fill();
    /* 头发 */
    g.fillStyle = '#4a2c18';
    g.beginPath();
    g.arc(cx, headY - headR * 0.30, headR * 1.02, Math.PI * 1.06, Math.PI * 1.94);
    g.fill();
    /* 五官 */
    g.fillStyle = '#1b1b1b';
    const eyeY = headY + 2 * s;
    if (q < 0.6) {
      g.fillRect(cx - 17 * s, eyeY - 4 * s, Math.max(2, 7 * s), Math.max(2, 9 * s));
      g.fillRect(cx + 10 * s, eyeY - 4 * s, Math.max(2, 7 * s), Math.max(2, 9 * s));
      g.strokeStyle = '#a03a3a';
      g.lineWidth = Math.max(1, 4 * s);
      g.beginPath();
      g.arc(cx, eyeY + 10 * s, 11 * s, 0.15, Math.PI - 0.15);
      g.stroke();
    } else {
      g.strokeStyle = '#1b1b1b';
      g.lineWidth = Math.max(1, 4 * s);
      g.beginPath();
      g.moveTo(cx - 22 * s, eyeY); g.lineTo(cx - 6 * s, eyeY - 4 * s);
      g.moveTo(cx + 22 * s, eyeY); g.lineTo(cx + 6 * s, eyeY - 4 * s);
      g.stroke();
    }
    /* 汗滴 */
    if (q > 0.28) {
      const n = Math.min(5, Math.floor((q - 0.2) * 8));
      g.fillStyle = '#65c8ff';
      for (let i = 0; i < n; i++) {
        const ph = ((t * 1.6 + i * 0.37) % 1);
        const dx = (i % 2 ? 1 : -1) * (headR + 10 * s + i * 5 * s);
        const dy = -8 * s + ph * 44 * s;
        g.beginPath();
        g.ellipse(cx + dx, headY + dy, Math.max(1, 6 * s), Math.max(1, 9 * s), 0, 0, TAU);
        g.fill();
      }
    }
    g.restore();
  }

  /* ============================================================
     中心窗口内部：冷色 · 机器人节点
     同样按真实像素布局（bw/bh），窗口越小越收敛：
       宽 >= 820 : 左齿轮组 + 右 QR + 底部 EMOTION MODULE readout
       宽 < 820  : QR 与 readout 竖排，齿轮缩为背景
     ============================================================ */
  function drawRobot(g, bw, bh, t, pulse) {
    const compact = bw < 820;
    const pad = 14;

    /* 背景 */
    g.fillStyle = '#070c0e';
    g.fillRect(0, 0, bw, bh);
    /* 冷色网格 */
    g.strokeStyle = 'rgba(46,190,160,0.15)';
    g.lineWidth = 2;
    for (let x = 0; x < bw; x += 44) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, bh); g.stroke();
    }
    for (let y = 0; y < bh; y += 44) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(bw, y); g.stroke();
    }
    /* 冷光 */
    const gl = g.createRadialGradient(bw * 0.33, bh * 0.44, 40, bw * 0.33, bh * 0.44, Math.max(bw, bh) * 0.85);
    gl.addColorStop(0, 'rgba(40,255,200,' + (0.12 + pulse * 0.12).toFixed(3) + ')');
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gl;
    g.fillRect(0, 0, bw, bh);

    /* 底部 readout 预留高度 */
    const RO = compact ? 82 : 92;
    const roTop = bh - RO;

    /* ---- 齿轮组：左侧（紧凑时缩成背景） ---- */
    const gScale = compact ? 0.52 : 1;
    const gcx = compact ? bw * 0.26 : pad + 190;
    const gcy = roTop * 0.46;
    const cols = ['#8d99a1', '#6f7b83', '#a7b3ba'];
    const dks = ['#39434a', '#2b343a', '#4a555c'];
    for (let i = 0; i < 3; i++) {
      const gr = S.gears[i];
      const rot = t * gr.spd * gr.dir + i * 0.7;
      const px = gcx + (gr.x - 322) * gScale * 1.05;
      const py = gcy + (gr.y - 300) * gScale;
      if (compact) g.globalAlpha = 0.42;
      gear(g, px, py, gr.r * gScale, gr.teeth, rot, cols[i], dks[i]);
      g.globalAlpha = 1;
    }

    /* ---- QR 码：右侧 / 紧凑时居中偏下 ---- */
    const qrMax = compact ? Math.min(bw - pad * 2, roTop - pad * 2 - 8) : Math.min(336, roTop - 30);
    const qr = Math.max(96, qrMax);
    const qx = compact ? (bw - qr) / 2 : bw - qr - pad - 18;
    const qy = compact ? pad + 4 : (roTop - qr) / 2;
    drawQR(g, qx, qy, qr, S.qrSeed + 7);
    g.strokeStyle = '#2bff9a';
    g.lineWidth = compact ? 3 : 5;
    g.strokeRect(qx - 6, qy - 6, qr + 12, qr + 12);
    /* NODE_ID 文本：按实测宽度自动收缩，保证永远完整落在窗口内 */
    const idFull = 'NODE_ID: 9527 → SCAN TO COMPLY';
    const idMin = 'NODE_9527 → SCAN TO COMPLY';
    let idCand = compact ? idMin : idFull;
    let idFs = compact ? 20 : 24;
    const idRoom = bw - pad * 2;
    g.font = 'bold ' + idFs + 'px "Fixedsys","Courier New",monospace';
    while (g.measureText(idCand).width > idRoom && idFs > 18) {
      idFs -= 1;
      g.font = 'bold ' + idFs + 'px "Fixedsys","Courier New",monospace';
    }
    g.fillStyle = '#2bff9a';
    const idY = qy + qr + idFs + 10;
    if (idY < roTop - 2) {
      /* 贴窗口左边距左对齐，永不出界 */
      g.fillText(idCand, pad, idY);
    }

    /* ---- 底部 EMOTION MODULE readout ---- */
    g.fillStyle = 'rgba(0,28,22,0.95)';
    g.fillRect(0, roTop, bw, RO);
    g.fillStyle = '#2bff9a';
    g.fillRect(0, roTop, bw, 3);
    const emFs = compact
      ? Math.max(22, Math.min(30, (bw - pad * 2) / 14))
      : 42;
    g.font = 'bold ' + emFs + 'px "Fixedsys","Courier New",monospace';
    g.fillStyle = '#2bff9a';
    g.fillText('EMOTION MODULE: UNINSTALLED', pad, roTop + RO * 0.52);
    /* 状态灯 */
    const blink = (Math.floor(t * 2) % 2) === 0;
    const ly = roTop + RO * 0.68;
    g.fillStyle = blink ? '#ff3b3b' : '#7a1414';
    g.fillRect(pad, ly, 22, 22);
    g.fillStyle = blink ? '#ff8a8a' : '#5a1010';
    g.font = 'bold ' + (compact ? 20 : 26) + 'px "Fixedsys","Courier New",monospace';
    g.fillText('SLAVE NODE 24/7 ACTIVE', pad + 34, ly + 20);
  }
  function gear(g, cx, cy, r, teeth, rot, col, colDk) {
    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    g.fillStyle = colDk;
    g.beginPath();
    const n = teeth * 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const ph = i % 4;
      const rr = ph === 0 || ph === 3 ? r * 0.98 : r * 0.80;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fill();
    g.fillStyle = col;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const ph = i % 4;
      const rr = ph === 0 || ph === 3 ? r * 0.93 : r * 0.76;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fill();
    /* 内圈 */
    g.fillStyle = colDk;
    g.beginPath(); g.arc(0, 0, r * 0.40, 0, TAU); g.fill();
    g.fillStyle = '#0a0f11';
    g.beginPath(); g.arc(0, 0, r * 0.20, 0, TAU); g.fill();
    /* 辐条 */
    g.strokeStyle = col;
    g.lineWidth = Math.max(3, r * 0.07);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      g.beginPath();
      g.moveTo(Math.cos(a) * r * 0.20, Math.sin(a) * r * 0.20);
      g.lineTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72);
      g.stroke();
    }
    g.restore();
  }

  function drawQR(g, x, y, size, seed) {
    const n = 21, m = size / n;
    g.fillStyle = '#eafff5';
    g.fillRect(x, y, size, size);
    const r = U.rng(seed);
    const inFinder = (i, j) => {
      const inBox = (i0, j0) => i >= i0 && i < i0 + 7 && j >= j0 && j < j0 + 7;
      return inBox(0, 0) || inBox(n - 7, 0) || inBox(0, n - 7);
    };
    g.fillStyle = '#04140e';
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const rv = r();
        if (inFinder(i, j)) continue;
        if (rv < 0.46) g.fillRect(x + i * m, y + j * m, m * 0.94, m * 0.94);
      }
    }
    /* 三个定位角 */
    const finder = (i0, j0) => {
      g.fillStyle = '#04140e';
      g.fillRect(x + i0 * m, y + j0 * m, 7 * m, 7 * m);
      g.fillStyle = '#eafff5';
      g.fillRect(x + (i0 + 1) * m, y + (j0 + 1) * m, 5 * m, 5 * m);
      g.fillStyle = '#04140e';
      g.fillRect(x + (i0 + 2) * m, y + (j0 + 2) * m, 3 * m, 3 * m);
    };
    finder(0, 0);
    finder(n - 7, 0);
    finder(0, n - 7);
  }

  global.APP.register(S);
})(window);
