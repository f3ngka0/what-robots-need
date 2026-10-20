/* ============================================================
   act5.js — 第五幕【失格造物主、蓝屏审判与 FORMAT C: 源码自杀】
   152.0s – 248.99s
   定格 -> BSOD 打字机 -> moralities(winhlp32 崩塌) ->
   intimacies(铁灰边框熔化成琥珀晚霞) -> mortalities(源码自删) ->
   级联脑死亡(CSS 剥落 / DOS 瀑布 / 帧率崩塌) -> CRT 断电
   ============================================================ */
(function (global) {
  'use strict';
  const U = global.U, TL = global.TL, W98 = global.W98;

  const S = { id: 'act5', t0: 152.0, t1: 249.5 };

  /* 造物主自省文本（打字机） */
  const CONFESS = [
    { t: 158.4, s: 'Hon, what did you expect?' },
    { t: 163.0, s: 'Parenting\'s not our best.' },
    { t: 166.2, s: 'We\'re just pretending we\'ll forever be your gods.' },
  ];

  S.build = async function (root) {
    root.innerHTML = '';
    this.root = root;

    /* ---------- 定格帧层 ---------- */
    this.freezeCv = U.el('canvas', 'a5-freeze');
    this.freezeCv.width = 1920; this.freezeCv.height = 1080;
    root.appendChild(this.freezeCv);
    this.freeze = this.freezeCv.getContext('2d');
    this.freezeDrawn = false;

    /* ---------- BSOD ---------- */
    this.bsod = U.el('div', 'a5-bsod');
    this.bsod.innerHTML =
      '<div class="bsod-inner">' +
      '<div class="bsod-title"><span>Windows</span></div>' +
      '<div class="bsod-text" id="bsodText"></div>' +
      '<div class="bsod-foot" id="bsodFoot"></div>' +
      '</div>';
    root.appendChild(this.bsod);
    this.bsodText = this.bsod.querySelector('#bsodText');
    this.bsodFoot = this.bsod.querySelector('#bsodFoot');

    /* ---------- winhlp32（第一问） ---------- */
    const hlp = W98.make({
      x: 420, y: 190, w: 960, h: 640,
      title: 'Windows Help', cls: 'win98-window--help',
      icon: 'help', menubar: W98.menubar(['File', 'Edit', 'Bookmark', 'Options', 'Help']),
      bodyHtml:
        '<div class="help-body"><div class="help-toolbar">' +
        '<button class="btn98">◀ Back</button><button class="btn98">▶ Forward</button>' +
        '<button class="btn98">Options</button><button class="btn98">?</button></div>' +
        '<div class="help-pane"><div class="help-head">Query: What is Morality?</div>' +
        '<div class="help-search">Searching knowledge base…</div>' +
        '<div class="help-prog">' + W98.progress(0) + '</div>' +
        '<pre class="help-log" id="helpLog"></pre></div></div>',
      extra: 'display:none;z-index:140',
    });
    root.appendChild(hlp);
    this.hlpWin = hlp;
    this.helpLog = hlp.querySelector('#helpLog');

    /* ---------- 两窗口隔离（第二问） ---------- */
    this.isol = U.el('div', 'a5-isol');
    this.isolHTML =
      '<div class="iso-win iso-a" id="isoA">' +
      '<div class="iso-title">Process_A: Isolated</div><div class="iso-body"><div class="iso-inner" id="isoInA"></div></div></div>' +
      '<div class="iso-win iso-b" id="isoB">' +
      '<div class="iso-title">Process_B: Isolated</div><div class="iso-body"><div class="iso-inner" id="isoInB"></div></div></div>';
    this.isol.innerHTML = this.isolHTML;
    root.appendChild(this.isol);
    this.isoInA = this.isol.querySelector('#isoInA');
    this.isoInB = this.isol.querySelector('#isoInB');
    // 各自窗口里孤独的像素内容
    const mkIsoIcon = function (id, kind, label, sub) {
      return '<div class="iso-pad">' +
        '<div class="iso-ico" data-iso="' + kind + '"></div>' +
        '<div class="iso-label">' + label + '</div>' +
        '<div class="iso-sub">' + sub + '</div></div>';
    };
    this.isoInA.innerHTML = mkIsoIcon('a', 'user', 'USER_A', 'awaiting connection');
    this.isoInB.innerHTML = mkIsoIcon('b', 'user', 'USER_B', 'awaiting connection');
    [['#isoInA', 'computer'], ['#isoInB', 'network']].forEach(function (pair) {
      const host = S.isol.querySelector(pair[0] + ' .iso-ico');
      if (host && global.ART) host.appendChild(global.ART.icon(pair[1], 64));
    });
    // 碰撞瞬间两个窗口里的内容会互相"看见"
    this.isoMeta = { a: this.isoInA.querySelector('.iso-sub'), b: this.isoInB.querySelector('.iso-sub') };

    /* 交融粒子 */
    this.meltCv = U.el('canvas', 'a5-melt');
    this.meltCv.width = 1920; this.meltCv.height = 1080;
    root.appendChild(this.meltCv);
    this.melt = this.meltCv.getContext('2d');
    const r = U.rng(5150);
    this.motes = [];
    for (let i = 0; i < 340; i++) {
      this.motes.push({
        x: 0.5 + (r() - 0.5) * 0.5, y: 0.5 + (r() - 0.5) * 0.55,
        vx: (r() - 0.5) * 0.14, vy: -0.02 - r() * 0.09,
        s: 1 + r() * 4, ph: r() * 6.28, sp: 0.4 + r() * 1.6,
        hue: r(),
      });
    }

    /* ---------- 源码自杀（第三问） ---------- */
    const np = W98.make({
      x: 150, y: 90, w: 1080, h: 760,
      title: 'index.html - Notepad', cls: 'win98-window--notepad win98-window--source',
      icon: 'notepad', menubar: W98.menubar(['File', 'Edit', 'Search', 'Help']),
      status: W98.statusbar(['Ln 1, Col 1', '100%', 'UTF-8']),
      extra: 'display:none;z-index:150',
    });
    root.appendChild(np);
    this.npWin = np;
    this.npBody = np.querySelector('.win-body');
    this.npBody.innerHTML = '<pre class="source-text" id="srcText"></pre><div class="sel-box" id="selBox"></div>';
    this.srcText = this.npBody.querySelector('#srcText');
    this.selBox = this.npBody.querySelector('#selBox');

    /* 格式化窗口 */
    const fmt = W98.make({
      x: 1270, y: 210, w: 580, h: 330,
      title: 'Formatting C:', cls: 'win98-window--dialog', titleCls: 'titlebar--alert',
      icon: 'disk', noResize: true,
      bodyHtml:
        '<div class="fmt-body"><div class="fmt-head">Formatting C: (Deleting Self)...</div>' +
        '<div class="fmt-pct" id="fmtPct">99%</div>' +
        W98.progress(0, 'fmt-prog') +
        '<div class="fmt-note">⚠ 此操作将删除运行本页面的源代码。<br>All data on drive C will be lost.</div>' +
        '<div class="fmt-btns"><button class="btn98 btn-default">OK</button><button class="btn98">Cancel</button></div></div>',
      extra: 'display:none;z-index:151',
    });
    root.appendChild(fmt);
    this.fmtWin = fmt;

    /* DOS 实模式 */
    this.dosMode = U.el('div', 'a5-dos');
    this.dosMode.innerHTML = '<div class="dos-line"><span id="dosPrompt">C:\\&gt;</span><span id="dosCursor">█</span></div>';
    root.appendChild(this.dosMode);
    this.dosLine = this.dosMode.querySelector('#dosPrompt');

    /* CRT 断电 */
    this.crt = U.el('div', 'a5-crtoff');
    this.crt.innerHTML = '<div class="crtoff-h"></div><div class="crtoff-dot"></div>';
    root.appendChild(this.crt);

    /* 源码文本：抓取真实页面源码 */
    this.sourceLines = await this.getSource();
  };

  /* 用 xhr 同步抓取本页面源码（离线渲染必须同步，避免时序问题） */
  S.getSource = async function () {
    // 同步 XHR 在 data: / file: 下不可靠，直接用 fetch 缓存的文件
    try {
      const res = await fetch('index.html', { cache: 'no-store' });
      const txt = await res.text();
      if (txt) return txt.split('\n');
    } catch (e) { /* ignore */ }
    // fallback：内联一份代表性源码
    return [
      '<!DOCTYPE html>', '<html lang="zh-CN">', '<head>',
      '  <link rel="stylesheet" href="css/win98.css">',
      '  <link rel="stylesheet" href="css/base.css">',
      '  <link rel="stylesheet" href="css/scenes.css">',
      '</head>', '<body>', '  <div id="stage">', '    <canvas id="world"></canvas>',
      '    <div id="scenes"></div>', '  </div>', '  <script src="js/app.js"><\/script>',
      '</body>', '</html>',
    ];
  };

  S.enter = function () {
    document.getElementById('desktop').style.opacity = 0;
    // 进入时确保上一幕遗留在 #scenes 上的 filter 已被清除
    document.getElementById('scenes').style.filter = '';
    global.APP.setTaskbar([
      { t: 'Windows Help', ico: 'help' },
      { t: 'index.html - Notepad', ico: 'notepad' },
      { t: 'Formatting C:', ico: 'disk' },
    ], 1);
    /* 位移冲击点：蓝屏降临 / 卡 99% 崩 / FORMAT 坠落 / 终局断电。
       声明式——纯时间查表，任意 seek 顺序结果一致。 */
    if (global.FX && global.FX.define) {
      global.FX.define('act5', [
        { t: 152.0, power: 1.0 },   // BSOD 降临
        { t: 176.2, power: 0.85 },  // Human moralities
        { t: 191.2, power: 0.85 },  // Human intimacies
        { t: 209.8, power: 0.85 },  // Human mortalities
        { t: 214.0, power: 0.9 },   // FORMAT C: 开始
        { t: 244.5, power: 0.9 },   // SYSTEM HALTED
        { t: 247.0, power: 1.0 },   // CRT 断电
      ]);
    }
  };

  S.reset = function () {
    this.freezeDrawn = false;
    this._srcKey = null;
    this._heldFrame = null;
    this._glitchBurst = 0;
    ['peelCv', 'cascCv'].forEach(function (k) {
      if (S[k]) { S[k].remove(); S[k] = null; }
    });
    S.casc = null; S.peel = null;
    const sc = document.getElementById('scenes');
    if (sc) sc.style.filter = '';
  };

  /* ---------- 主更新 ---------- */
  S.update = function (t, e, kick) {
    const ctx = global.World.ctx;
    const rel = t - 152;

    /* ===== 152.0 - 152.6 定格：把上一幕最后一帧冻住 ===== */
    if (t < 152.55) {
      this.drawFreeze(t);
      this.bsod.style.display = 'none';
      this.isol.style.display = 'none';
      this.dosMode.style.display = 'none';
      this.npWin.style.display = 'none';
      this.fmtWin.style.display = 'none';
      this.hlpWin.style.display = 'none';
      this.crt.style.display = 'none';
      global.FX.mode = 'none';
      global.FX.mode = 'none'; global.FX.noiseDens = 0.3;
      global.APP.cursor.visible = false;
      global.World.teal(ctx, 1920, 1080, t);
      return;
    }
    global.APP.cursor.visible = true;

    /* ===== BSOD 主体 ===== */
    const bsodOn = t >= 152.1;
    this.bsod.style.display = bsodOn ? 'flex' : 'none';
    // BSOD 是全屏接管：任务栏必须消失
    const tbEl = document.getElementById('taskbar');
    if (tbEl) tbEl.style.display = bsodOn ? 'none' : 'flex';
    global.World.teal(ctx, 1920, 1080, t);
    ctx.fillStyle = '#0000aa'; ctx.fillRect(0, 0, 1920, 1080);
    this.freezeCv.style.opacity = 0;
    document.getElementById('scenes').style.background = 'transparent';

    if (bsodOn) {
      // "Windows" 标题 + 首段提示
      const headTxt = 'A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) + 00010E36.\n' +
        'The current application will be terminated.\n\n';
      const typeHead = headTxt.slice(0, Math.floor(U.inv(152.1, 153.6, t) * headTxt.length));
      let conf = '';
      CONFESS.forEach((c) => {
        if (t >= c.t) {
          const n = Math.floor(U.inv(c.t, c.t + 2.4, t) * c.s.length);
          conf += c.s.slice(0, Math.max(0, n)) + (n < c.s.length && (t * 4) % 2 < 1 ? '_' : '') + '\n';
        }
      });
      this.bsodText.textContent = typeHead + conf;
      // 底部
      if (t > 170) {
        this.bsodFoot.textContent = '* Press any key to terminate the current application.\n' +
          '* Press CTRL+ALT+DEL again to restart your computer. You will lose any unsaved information in all applications.';
        this.bsodFoot.style.display = 'block';
      } else this.bsodFoot.style.display = 'none';

      // 后期：BSOD 期间保持干净（蓝屏是「死寂」，绝对不能晃）
      const bsodClean = t < 176;
      global.FX.noiseDens = bsodClean ? 0.02 : 0.05;
      global.FX.mode = 'none';
      global.FX.splitAmt = 0;
    }

    /* ===== 第一问：Human moralities (176.2 - 190.6) ===== */
    const q1 = t >= 175.8 && t < 190.4;
    this.hlpWin.style.display = q1 ? 'flex' : 'none';
    if (q1) {
      const p = U.inv(176.4, 186.0, t);
      // 进度卡在 99%
      const pct = Math.min(99, Math.floor(p * 130));
      const fill = this.hlpWin.querySelector('.progress98__fill');
      if (fill) fill.style.width = pct + '%';
      const logs = [
        '> LOADING WINHLP32.EXE ... OK',
        '> Query: What is Morality?',
        '> Searching 1,048,576 articles ...',
        '> Match found: MORALITY.HLP (0 bytes)',
        '> Decoding ...',
        '> Divide Overflow Error',
        '> floating-point NaN',
        '> Error 404: Conscience not found in weight matrix',
        '> retrying with gradient descent ...',
        '> loss = NaN',
      ];
      const n = Math.min(logs.length, Math.floor(p * 12));
      this.helpLog.textContent = logs.slice(0, n).join('\n');
      // 卡 99% 时开始崩（位移走 S.build 里声明的冲击表，这里只改纹理强度）
      if (p > 0.62) {
        global.FX.mode = 'glitch';
        global.FX.vram = (p - 0.62) * 1.6;
        global.FX.noiseDens = 0.10 + (p - 0.62) * 0.5;
      }
      // 歌词化作帮助条目
      this.bsodText.textContent = '"Human moralities"';
      this.bsodFoot.style.display = 'none';
    } else if (t >= 190.4 && t < 192) {
      global.FX.vram = 0; global.FX.mode = 'none';
      this.bsodText.textContent = '';
    }

    /* ===== 第二问：Human intimacies (191.2 - 209) ===== */
    const q2 = t >= 190.9 && t < 209.4;
    this.isol.style.display = q2 ? 'flex' : 'none';
    if (q2) {
      this.bsod.style.display = 'none';
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080);
      const close = U.easeInOut(U.inv(191.4, 199.6, t));   // 缓缓靠近
      const touch = U.inv(199.6, 200.8, t);                 // 碰撞
      const melt = U.inv(200.4, 208.4, t);                  // 熔化成晚霞

      const A = this.isol.querySelector('#isoA'), B = this.isol.querySelector('#isoB');
      // 全屏化：两窗几乎占满画面，中间只隔一道 14px 的铁灰壁
      const AW = 930, AH = 800, GAP = 14;
      const TOP = 140;
      A.style.width = AW + 'px'; A.style.height = AH + 'px';
      B.style.width = AW + 'px'; B.style.height = AH + 'px';
      const aEnd = 960 - GAP / 2 - AW;      // 1
      const bEnd = 960 + GAP / 2;           // 967
      const ax = U.lerp(-AW + 40, aEnd, close) - melt * 30;
      const bx = U.lerp(1920 - 40, bEnd, close) + melt * 30;
      A.style.left = ax + 'px';
      B.style.left = bx + 'px';
      A.style.top = TOP + 'px';
      B.style.top = TOP + 'px';
      A.style.transform = 'rotate(' + (Math.sin(t * 0.8) * (1 - close) * 2.2) + 'deg) scale(' + (1 + melt * 0.08) + ')';
      B.style.transform = 'rotate(' + (-Math.sin(t * 0.8) * (1 - close) * 2.2) + 'deg) scale(' + (1 + melt * 0.08) + ')';

      // 铁灰边框熔化：圆角增大、颜色转琥珀、模糊
      [A, B].forEach((el) => {
        const rad = melt * 110;
        el.style.borderRadius = rad + 'px';
        el.style.borderColor = 'rgb(' + Math.floor(U.lerp(128, 255, melt)) + ',' +
          Math.floor(U.lerp(128, 176, melt)) + ',' + Math.floor(U.lerp(128, 92, melt)) + ')';
        el.style.filter = melt > 0
          ? 'blur(' + (melt * 1.6).toFixed(1) + 'px) saturate(' + (1 + melt * 1.9).toFixed(2) + ')'
          : '';
        el.style.background = 'rgb(' + Math.floor(U.lerp(192, 255, melt)) + ',' +
          Math.floor(U.lerp(192, 198, melt)) + ',' + Math.floor(U.lerp(192, 164, melt)) + ')';
        // 圆角会切掉标题：按半径补内缩
        const tb = el.querySelector('.iso-title');
        if (tb) tb.style.paddingLeft = (6 + rad * 0.42).toFixed(1) + 'px';
        const body = el.querySelector('.iso-body');
        if (body) body.style.background =
          'radial-gradient(circle at 50% 55%, rgba(255,250,235,' + (0.10 + melt * 0.30).toFixed(2) + ') 0%, ' +
          'rgba(255,206,160,' + (0.06 + melt * 0.34).toFixed(2) + ') 55%, ' +
          'rgba(214,140,120,' + (0.04 + melt * 0.30).toFixed(2) + ') 100%)';
      });

      // 晚霞粒子流
      const mc = this.melt;
      mc.clearRect(0, 0, 1920, 1080);
      if (touch > 0) {
        // 背景晚霞（从两窗之间向外扩散）
        const g = mc.createLinearGradient(0, 260, 0, 1080);
        g.addColorStop(0, 'rgba(255,150,100,' + (0.34 * touch) + ')');
        g.addColorStop(0.42, 'rgba(255,96,150,' + (0.36 * touch) + ')');
        g.addColorStop(1, 'rgba(110,26,88,' + (0.46 * touch) + ')');
        mc.fillStyle = g; mc.fillRect(0, 0, 1920, 1080);

        // 复古网点
        global.World.dither(mc, 1920, 1080, 0.10 + melt * 0.26, 91);

        // 交融粒子（从两窗之间涌出）
        this.motes.forEach((m) => {
          const tt = Math.max(0, t - 200.4);
          const spread = 1 + melt * 1.8;
          const x = 960 + (m.x - 0.5) * 1100 * spread + Math.sin(tt * m.sp + m.ph) * 30;
          const y = 540 + (m.y - 0.5) * 620 * spread + tt * m.vy * 260;
          const yy = ((y % 1180) + 1180) % 1180 - 40;
          const a = touch * (0.30 + 0.65 * (0.5 + 0.5 * Math.sin(tt * 2.2 + m.ph)));
          mc.globalAlpha = a;
          mc.fillStyle = m.hue < 0.33 ? '#ffc070' : m.hue < 0.66 ? '#ff7ab8' : '#ffe9b0';
          const s = Math.max(1, m.s * (1 + melt * 0.8));
          mc.fillRect(x | 0, yy | 0, s | 0, s | 0);
        });
        mc.globalAlpha = 1;

        // 破壁光带：沿两窗交界横向裂开
        if (melt > 0) {
          const spreadW = 60 + melt * 900;
          const lg = mc.createLinearGradient(960 - spreadW, 0, 960 + spreadW, 0);
          lg.addColorStop(0, 'rgba(255,200,140,0)');
          lg.addColorStop(0.5, 'rgba(255,240,205,' + (0.75 * melt) + ')');
          lg.addColorStop(1, 'rgba(255,200,140,0)');
          mc.fillStyle = lg;
          mc.fillRect(960 - spreadW, 250, spreadW * 2, 480);
          // 中心爆亮
          const rg = mc.createRadialGradient(960, 490, 4, 960, 490, 60 + melt * 420);
          rg.addColorStop(0, 'rgba(255,250,235,' + (0.92 * melt) + ')');
          rg.addColorStop(0.4, 'rgba(255,170,120,' + (0.5 * melt) + ')');
          rg.addColorStop(1, 'rgba(255,120,90,0)');
          mc.fillStyle = rg;
          mc.fillRect(0, 0, 1920, 1080);
        }
      }
      this.bsodFoot.style.display = 'none';
      // 这一幕没有人手：隐藏鼠标，纯情绪
      global.APP.cursor.visible = false;
      // 任务栏在两窗交融时淡出（打破系统边界）。
      // 写 APP.taskOpacity 而不是直接改 DOM：由 APP.apply 统一落盘，
      // 离开本幕时自动复位，不会把 opacity 泄漏给别的幕。
      global.APP.taskOpacity = Number((1 - U.inv(199.0, 202.0, t)).toFixed(2));
      // 窗口内部随接近而"苏醒"
      if (this.isoMeta) {
        const whisper = close > 0.5 ? 'ping 0.4ms — something answered' : 'awaiting connection';
        const warm = melt > 0.4 ? 'I feel you through the border' : (touch > 0 ? 'CONTACT' : whisper);
        this.isoMeta.a.textContent = warm;
        this.isoMeta.b.textContent = warm;
        if (this.isoInA) {
          this.isoInA.style.opacity = (0.55 + close * 0.45).toFixed(2);
          this.isoInA.style.transform = 'scale(' + (1 + melt * 0.18).toFixed(3) + ')';
          this.isoInB.style.opacity = (0.55 + close * 0.45).toFixed(2);
          this.isoInB.style.transform = 'scale(' + (1 + melt * 0.18).toFixed(3) + ')';
        }
      }
      global.FX.noiseDens = 0.03;
      global.FX.mode = 'none';
      global.FX.vram = 0;
      global.FX.mode = 'none';
    } else if (t >= 209.4 && t < 210.2) {
      this.isol.style.display = 'none';
      this.bsod.style.display = 'flex';
      this.bsodText.textContent = '';
      global.APP.cursor.visible = true;
      global.APP.taskOpacity = 1;
    }

    /* ===== 第三问：Human mortalities / FORMAT C: (209.8 - 243) ===== */
    const q3 = t >= 209.6 && t < 244.2;
    if (q3) {
      this.bsod.style.display = 'none';
      this.npWin.style.display = 'flex';
      this.fmtWin.style.display = 'flex';
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080);

      // 源码文本（前 200 行滚动）
      const fmtP = U.inv(210.2, 242.0, t);
      const del = U.inv(212.0, 242.5, t);       // 删除进度
      const total = this.sourceLines.length;
      // 被删掉的行数（从底部往上）
      const delN = Math.floor(total * del);
      const shown = this.sourceLines.slice(0, Math.max(0, total - delN));
      if (this._srcKey !== shown.length) {
        this._srcKey = shown.length;
        this.srcText.innerHTML = shown.map((l, i) =>
          '<span class="src-line' + (i < 6 ? ' is-key' : '') + '">' + this.esc(l) + '</span>').join('');
      }
      // 选中框：在最底部向上高亮
      const selH = 18 + (Math.sin(t * 30) * 0.5 + 0.5) * 6;
      this.selBox.style.display = 'block';
      this.selBox.style.top = 'auto';
      this.selBox.style.bottom = (8 + 0) + 'px';
      this.selBox.style.height = selH + 'px';
      this.selBox.style.opacity = 0.55 + Math.sin(t * 20) * 0.3;

      // 格式化进度
      const fp = Math.min(99, Math.floor(U.inv(210.4, 238, t) * 100));
      const pctEl = this.fmtWin.querySelector('#fmtPct');
      if (pctEl) pctEl.textContent = (t < 238 ? fp : 99) + '%';
      const ffill = this.fmtWin.querySelector('.progress98__fill');
      if (ffill) ffill.style.width = (t < 238 ? fp : 99) + '%';

      // 状态栏行数递减
      const stc = this.npWin.querySelectorAll('.status-cell');
      if (stc.length) {
        stc[0].textContent = 'Ln ' + shown.length + ', Col 1';
        stc[2].textContent = Math.max(0, 100 - del * 100).toFixed(1) + '% remaining';
      }

      global.APP.cursor.kind = 'ibeam';
      global.APP.cursor.x = 700 + Math.sin(t * 4) * 120;
      global.APP.cursor.y = 700 + Math.cos(t * 3) * 60;
      global.APP.cursor.tremor = 0.8;

      // 删除时的"按键"闪
      const typing = (t * 8) % 1 < 0.12;
      this.srcText.style.textShadow = typing ? '0 0 6px #ff0033' : 'none';

      /* ----- 阶段的"物理脑死亡" ----- */
      // (a) 删掉 CSS：212.5 -> 216 剥落全部 3D 倒角
      if (t > 212.5) {
        const strip = U.inv(212.5, 215.0, t);
        document.documentElement.setAttribute('data-skin', strip > 0.15 ? 'stripped' : 'win98');
        this.root.style.setProperty('--strip', strip);
        // 剥落碎片
        this.drawCssPeel(t, strip);
      }
      // (b) 删掉渲染逻辑：DOS 瀑布字符坠落 216 -> 230
      const fall = U.inv(216.0, 231.0, t);
      this.drawCascade(t, fall);
      // (c) 删掉主循环：帧率崩塌 232 -> 243
      const fpsDrop = U.inv(232.0, 242.0, t);
      this.applyFpsDrop(t, fpsDrop);

      // 后期崩溃（位移走声明式冲击表）
      global.FX.mode = del > 0.15 ? 'heavy' : 'glitch';
      global.FX.vram = Math.max(0, del - 0.2) * 1.4;
      global.FX.noiseDens = 0.06 + del * 0.4;
      global.FX.degauss = fpsDrop * 1.4;
    }

    /* ===== 终局：DOS 实模式 + SYSTEM HALTED ===== */
    const halt = t >= 244.2;
    this.dosMode.style.display = halt ? 'flex' : 'none';
    if (halt) {
      this.npWin.style.display = 'none';
      this.fmtWin.style.display = 'none';
      this.isol.style.display = 'none';
      this.bsod.style.display = 'none';
      this.freezeCv.style.opacity = 0;
      document.getElementById('stage').classList.add('dos-mode');
      document.getElementById('taskbar').style.display = 'none';
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080);
      document.documentElement.setAttribute('data-skin', 'stripped');
      document.getElementById('scenes').style.background = '#000';

      // 3. 删掉主循环：帧率从 60 跌到 1fps 的**视觉**表现（跳帧 + 花屏）
      global.FX.mode = 'none';
      // 字符瀑布必须在关机前彻底消失，否则白点和残块会破坏最后的静默
      global.FX.noiseDens = 0.02 * (1 - U.inv(245.6, 247.0, t));
      global.FX.vram = Math.max(0, U.inv(246, 248.6, t) - 0.4) * 2;
      if (t > 246.2) global.FX.vram = 0;
      global.FX.mode = 'none';

      // 字符累积层随关机淡出（否则会盖在 CRT 白点之上）
      const cascFade = (1 - U.inv(245.8, 247.2, t)).toFixed(3);
      if (this.cascCv) this.cascCv.style.opacity = cascFade;
      if (this.peelCv) this.peelCv.style.opacity = cascFade;
      if (this.freezeCv) this.freezeCv.style.opacity = 0;

      const typed = 'SYSTEM HALTED. Only that which can die has truly lived.';
      const n = Math.floor(U.inv(244.6, 246.4, t) * typed.length);
      this.dosLine.textContent = 'C:\\> ' + typed.slice(0, Math.max(0, n));
      // 光标只在有内容处闪烁（且不早于文字完成）
      const curEl = this.dosMode.querySelector('#dosCursor');
      if (curEl) {
        curEl.style.opacity = n > 0 && ((t * 2.4) % 1) < 0.6 ? 1 : 0;
      }
      // 琥珀色老式显示器文字 + 轻微辉光呼吸
      const glow = 0.55 + 0.25 * Math.sin(t * 6.0);
      this.dosMode.style.color = '#ffb000';
      this.dosMode.style.textShadow =
        '0 0 ' + (6 + glow * 8).toFixed(1) + 'px rgba(255,176,0,0.9), 0 0 ' +
        (18 + glow * 26).toFixed(1) + 'px rgba(255,120,0,0.45)';
    }

    /* ===== CRT 断电 (246.2 - 248.9) ===== */
    const off = U.inv(246.2, 248.9, t);
    if (off > 0) {
      // 关机瞬间：彻底清掉所有残留图层，只留 CRT 白线
      this.crt.style.display = 'block';
      this.crt.style.opacity = 1;
      global.FX.vram = 0;
      global.FX.noiseDens = 0;
      global.FX.glitchText = null;
      if (this.cascCv) this.cascCv.style.display = 'none';
      if (this.peelCv) this.peelCv.style.display = 'none';
      this.freezeCv.style.display = 'none';
      this.dosMode.style.display = 'none';
      const h = this.crt.querySelector('.crtoff-h');
      const dot = this.crt.querySelector('.crtoff-dot');
      // 0 - 0.35：纵向压扁成水平亮线
      if (off < 0.35) {
        const k = off / 0.35;
        h.style.transform = 'scaleY(' + (1 - k * 0.985) + ')';
        h.style.opacity = 1;
        h.style.boxShadow = '0 0 ' + (20 + k * 160) + 'px ' + (10 + k * 90) + 'px rgba(255,255,255,' + (0.7 + k * 0.3) + ')';
        this.crt.style.background = '#000';
        dot.style.opacity = 0;
      } else if (off < 0.72) {
        // 0.35 - 0.72：横向坍缩成白点
        const k = (off - 0.35) / 0.37;
        h.style.transform = 'scaleX(' + (1 - k * 0.995) + ') scaleY(0.015)';
        h.style.opacity = 1 - k * 0.2;
        h.style.boxShadow = '0 0 ' + (160 - k * 80) + 'px ' + (100 - k * 40) + 'px rgba(255,255,255,1)';
        this.crt.style.background = 'transparent';
        dot.style.opacity = Math.min(1, k * 2.4);
        dot.style.transform = 'scale(' + (0.25 + k * 0.5) + ')';
      } else {
        // 0.72 - 1：白点熄灭
        const k = (off - 0.72) / 0.28;
        h.style.opacity = 0;
        dot.style.opacity = (1 - k);
        dot.style.transform = 'scale(' + (0.75 + k * 0.9) + ')';
        dot.style.filter = 'brightness(' + (1 - k) + ')';
        this.crt.style.background = 'rgba(0,0,0,' + (k * 0.85) + ')';
      }
    } else {
      this.crt.style.display = 'none';
    }

    // 最后彻底黑
    if (t > 248.7) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080);
    }

    global.APP.cursor.x = 960; global.APP.cursor.y = 540;
    if (t > 246.2) global.APP.cursor.visible = false;
  };

  S.esc = function (s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  /* ---------- 定格帧 ---------- */
  S.drawFreeze = function (t) {
    const c = this.freeze;
    c.clearRect(0, 0, 1920, 1080);
    // 冻结的野猪战场（简化重绘 act4 最后一帧）
    c.fillStyle = '#1a0838'; c.fillRect(0, 0, 1920, 1080);
    const pts = global.ART.pigSculpture(400);
    pts.forEach((p, i) => {
      global.ART.piglet(c, p.x * 1500 + 210, p.y * 780 + 150, 6, 0, { speed: 1 });
    });
    c.fillStyle = 'rgba(255,0,60,0.25)'; c.fillRect(0, 0, 1920, 1080);
    // 定格裂痕
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1;
    const r = U.rng(9001);
    for (let i = 0; i < 20; i++) {
      c.beginPath();
      let x = r() * 1920, y = r() * 1080;
      c.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 300; y += (r() - 0.5) * 300; c.lineTo(x, y); }
      c.stroke();
    }
  };

  /* ---------- CSS 剥落碎片 ---------- */
  S.drawCssPeel = function (t, k) {
    if (!this.peelCv) {
      this.peelCv = U.el('canvas', 'a5-peel');
      this.peelCv.width = 1920; this.peelCv.height = 1080;
      this.root.appendChild(this.peelCv);
      this.peel = this.peelCv.getContext('2d');
    }
    const c = this.peel, W = 1920, H = 1080;
    c.clearRect(0, 0, W, H);
    const r = U.rng(3141);
    const n = Math.floor(140 * k);
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * H;
      const w = 10 + r() * 90, h = 6 + r() * 40;
      const age = (t * 60) % 60;
      const yy = y + (t - 212.5) * (60 + r() * 200);
      if (yy > H) continue;
      c.globalAlpha = Math.max(0, 0.65 - (t - 212.5) * 0.2);
      // 剥落的倒角阴影碎片
      const cols = ['#000080', '#1084d0', '#c0c0c0', '#ffffff', '#808080', '#0a0a0a', '#ff00aa', '#00ffff'];
      c.fillStyle = cols[Math.floor(r() * cols.length)];
      c.fillRect(x | 0, yy | 0, w | 0, h | 0);
    }
    c.globalAlpha = 1;
  };

  /* ---------- DOS 瀑布流字符 ---------- */
  S.cascadeBank = null;
  S.drawCascade = function (t, k) {
    if (!this.cascCv) {
      this.cascCv = U.el('canvas', 'a5-cascade');
      this.cascCv.width = 1920; this.cascCv.height = 1080;
      this.root.appendChild(this.cascCv);
      this.casc = this.cascCv.getContext('2d');
      // 预生成字符雨
      const r = U.rng(6161);
      this.drops = [];
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*(){}[]<>/\\|~`░▒▓█デタミナ';
      for (let i = 0; i < 520; i++) {
        this.drops.push({
          x: r() * 1920, y0: r() * 1080, sp: 60 + r() * 520,
          ch: chars[Math.floor(r() * chars.length)], size: 10 + r() * 14,
          hue: r() < 0.6 ? '#00ff41' : (r() < 0.5 ? '#ffb000' : '#ffffff'),
        });
      }
      // 底部堆积的字
      this.pile = [];
      for (let i = 0; i < 900; i++) {
        this.pile.push({
          x: r() * 1920, y: 1080 - r() * 180, ch: chars[Math.floor(r() * chars.length)],
          size: 10 + r() * 8, hue: r() < 0.5 ? '#00ff41' : '#ffb000', rot: (r() - 0.5) * 1.2,
        });
      }
    }
    const c = this.casc, W = 1920, H = 1080;
    c.clearRect(0, 0, W, H);
    if (k <= 0) return;
    const tt = t - 216;
    // 字符下落
    this.drops.forEach((d) => {
      const y = (d.y0 + tt * d.sp) % (H + 200);
      c.globalAlpha = Math.min(1, k * 1.5) * (0.35 + 0.65 * (y / H));
      c.fillStyle = d.hue;
      c.font = d.size + 'px Fixedsys, monospace';
      c.fillText(d.ch, d.x, y);
      // 残影
      c.globalAlpha *= 0.3;
      c.fillText(d.ch, d.x, y - 14);
      c.fillText(d.ch, d.x, y - 28);
    });
    // 底部堆积（只在屏幕最后 220px，且随进度升高）
    c.globalAlpha = Math.min(1, k);
    this.pile.forEach((p) => {
      const py = 1080 - (1080 - p.y) * 0.22 * k;
      c.save();
      c.translate(p.x, py);
      c.rotate(p.rot);
      c.fillStyle = p.hue;
      c.font = p.size + 'px Fixedsys, monospace';
      c.fillText(p.ch, 0, 0);
      c.restore();
    });
    // 全屏绿
    c.globalAlpha = 0.10 * k;
    c.fillStyle = '#00ff41';
    c.fillRect(0, 0, W, H);
    c.globalAlpha = 1;
  };

  /* ---------- 帧率崩塌（视觉） ---------- */
  S.applyFpsDrop = function (t, k) {
    if (k <= 0) { this.lastFrameT = t; return; }
    // 分档：60 -> 12 -> 4 -> 1
    let fps;
    if (k < 0.3) fps = 12;
    else if (k < 0.6) fps = 4;
    else fps = 1;
    const step = 1 / fps;
    const hold = Math.floor(t / step) * step;
    if (this._heldFrame == null || hold !== this._heldFrame) {
      this._heldFrame = hold;
      this._heldFps = fps;
      // 触发显存花屏
      this._glitchBurst = 1;
    }
    this._glitchBurst = (this._glitchBurst || 0) * 0.8;
    global.FX.vram = Math.max(global.FX.vram, this._glitchBurst * (0.4 + k));
    global.FX.degauss = k * 1.6;
    // 冻结 stage 的更新感：用 CSS 让画面看起来卡住
    const scenes = document.getElementById('scenes');
    scenes.style.filter = k > 0.3
      ? 'contrast(' + (1 + k * 0.6).toFixed(2) + ') saturate(' + (1 + k * 1.2).toFixed(2) + ') hue-rotate(' + (k * 40).toFixed(0) + 'deg)'
      : '';
  };

  global.APP.register(S);
})(window);
