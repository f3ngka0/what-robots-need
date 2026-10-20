/* ============================================================
   act1.js — 第一幕【画图板里的纯真年代】0.0s – 17.6s
   安静暗青桌面 · mspaint 手绘小公主 · notepad 真人打字 · 录音机波形
   ============================================================ */
(function (global) {
  'use strict';
  const U = global.U, TL = global.TL, W98 = global.W98;

  const S = {
    id: 'act1', t0: 0.0, t1: 17.6,
  };

  /* ---------- 预计算：打字机时间表（含错字 / 停顿 / 回删） ---------- */
  const NOTEPAD_SCRIPT = [
    { t: 9.4, txt: 'Once upon a time there was a little princess', note: false },
    { t: 12.5, txt: 'She liked to paint', note: false },
    { t: 13.6, txt: 'She liked to sing', note: false },
    { t: 14.6, txt: 'She liked to make some music', note: false },
    { t: 16.4, txt: '// 画了整整三个通宵，手好酸，但这是我的心血 :)', note: true },
  ];
  // 生成逐字事件（确定性）
  function buildTypeSchedule() {
    const ev = [];
    let clock = 9.3;
    NOTEPAD_SCRIPT.forEach((line, li) => {
      clock = Math.max(clock, line.t);
      const text = line.txt;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        // 真人节奏：词间停顿、偶尔错字回删
        let dt = 0.045 + (U.srand('ty' + li + i, 0)() * 0.055);
        if (ch === ' ') dt += 0.055;
        // 在第 2 行制造一次错字：把 "paint" 打成 "paimt" 再回删
        if (li === 1 && i === 4) {
          ev.push({ t: clock, type: 'char', ch: 'm' }); clock += 0.09;
          ev.push({ t: clock, type: 'back', n: 1 }); clock += 0.12;
        }
        if (li === 3 && i === 8) {
          ev.push({ t: clock, type: 'char', ch: 'z' }); clock += 0.1;
          ev.push({ t: clock, type: 'char', ch: 'x' }); clock += 0.09;
          ev.push({ t: clock, type: 'back', n: 2 }); clock += 0.16;
        }
        ev.push({ t: clock, type: 'char', ch: ch });
        clock += dt;
      }
      ev.push({ t: clock, type: 'newline' });
      clock += 0.22;
    });
    return ev;
  }
  const TYPE_EV = buildTypeSchedule();

  function typedTextAt(t) {
    let out = '';
    let line = 0;
    for (let i = 0; i < TYPE_EV.length; i++) {
      const e = TYPE_EV[i];
      if (e.t > t) break;
      if (e.type === 'char') out += e.ch;
      else if (e.type === 'back') out = out.slice(0, -e.n);
      else if (e.type === 'newline') out += '\n';
    }
    return out;
  }
  /* 光标闪烁 & 打字中判定 */
  function isTyping(t) {
    const i = TYPE_EV.findIndex((e) => e.t > t);
    if (i <= 0) return false;
    return t - TYPE_EV[i - 1].t < 0.35;
  }

  /* ---------- 构建 ---------- */
  S.build = function (root) {
    root.innerHTML = '';
    // 世界层：纯暗青
    this.canvasWrap = U.el('div', 'a1-world');
    root.appendChild(this.canvasWrap);

    // ---- mspaint 窗口（核心主舞台：居中占屏约 63%） ----
    const paint = W98.make({
      x: 40, y: 26, w: 1240, h: 700, title: 'Princess - Paint',
      cls: 'win98-window--paint', titleCls: 'titlebar--classic',
      icon: 'paint',
      menubar: W98.menubar(['File', 'Edit', 'View', 'Image', 'Options', 'Help']),
      status: W98.statusbar(['For Help, click Help Topics on the Help Menu.', ' ', '0,0']),
    });
    paint.style.zIndex = 500;
    root.appendChild(paint);
    this.paintWin = paint;

    const body = paint.querySelector('.win-body');
    body.innerHTML =
      '<div class="paint-layout">' +
      '<div class="paint-tools">' + this.toolButtons() + '</div>' +
      '<div class="paint-canvas-wrap">' +
      '<div class="paint-canvas" id="paintCanvas">' +
      '<canvas id="paintArt" width="1080" height="520"></canvas>' +
      '<div class="paint-marquee" id="paintMarquee"></div>' +
      '<div class="a1-ver" id="a1Ver">v01  0%</div>' +
      '</div>' +
      '<div class="paint-palette">' +
      '<div class="palette-cells">' +
      PALETTE.map((c) => '<i style="background:' + c + '"></i>').join('') +
      '</div>' +
      '<div class="palette-current"><div class="pc-fg"></div><div class="pc-bg"></div></div>' +
      '</div>' +
      '</div></div>';
    this.ver = paint.querySelector('#a1Ver');

    /* ---- 升级 2：黄色创作便签（贴在 paint 窗口右上角） ---- */
    this.sticky = U.el('div', 'a1-sticky');
    this.sticky.innerHTML =
      '<div class="st-title">📝 凌晨 03:42 创作手记</div>' +
      '<div class="st-line">手腕快断了，这是熬夜改的第 28 版线稿……</div>' +
      '<div class="st-line">虽然画得很慢，但每一笔都是我的心血与体温 :)</div>' +
      '<div class="st-sign">—— 第 28 次 Ctrl+Z 之后</div>';
    root.appendChild(this.sticky);

    /* ---- 漂浮气泡层 ---- */
    this.bubbleLayer = U.el('div', 'a1-bubbles');
    root.appendChild(this.bubbleLayer);
    this.bubbles = [];

    /* ---- Ctrl+Z 红浮窗 ---- */
    this.undo = U.el('div', 'a1-undo');
    this.undo.textContent = '⌫ Ctrl+Z 撤回重画 (线条不够有灵魂!)';
    root.appendChild(this.undo);

    /* ---- 400% 放大镜 ---- */
    this.loupe = U.el('div', 'a1-loupe');
    this.loupe.innerHTML = '<canvas width="220" height="160"></canvas>' +
      '<div class="loupe-tag">400%  放大镜</div>';
    root.appendChild(this.loupe);
    this.loupeCv = this.loupe.querySelector('canvas');
    this.loupeCtx = this.loupeCv.getContext('2d');
    this.loupeCtx.imageSmoothingEnabled = false;

    // ---- notepad 窗口（辅助窗：压暗退居次席） ----
    const np = W98.make({
      x: 1300, y: 90, w: 590, h: 470, title: 'lyrics_draft.txt - Notepad',
      cls: 'win98-window--notepad', titleCls: 'titlebar--classic',
      menubar: W98.menubar(['File', 'Edit', 'Search', 'Help']),
      status: W98.statusbar(['Ln 1, Col 1', '100%', 'Windows (CRLF)']),
    });
    np.style.zIndex = 24;
    root.appendChild(np);
    this.npWin = np;
    const npBody = np.querySelector('.win-body');
    npBody.innerHTML = '<pre class="notepad-text" id="npText"></pre>';
    this.npText = npBody.querySelector('#npText');

    // ---- 录音机（辅助窗） ----
    const sr = W98.make({
      x: 1300, y: 590, w: 560, h: 190, title: 'Sound Recorder', noResize: true,
      cls: 'a1-sndrec', titleCls: 'titlebar--classic',
      menubar: W98.menubar(['File', 'Edit', 'Effects', 'Help']),
      status: W98.statusbar(['Position:', '0.00 sec.', '']),
    });
    sr.style.zIndex = 30;
    root.appendChild(sr);
    this.srWin = sr;
    const srBody = sr.querySelector('.win-body');
    srBody.innerHTML =
      '<div class="sndrec-body">' +
      '<div class="sndrec-wave"><canvas id="sndWave" width="500" height="74"></canvas></div>' +
      '<div class="sndrec-btns">' +
      '<button class="btn98 snd-btn">◀◀</button>' +
      '<button class="btn98 snd-btn">▶</button>' +
      '<button class="btn98 snd-btn">▶▶</button>' +
      '<button class="btn98 snd-btn">■</button>' +
      '</div></div>';
    this.sndWave = srBody.querySelector('#sndWave');

    // 画布
    this.artCv = root.querySelector('#paintArt');
    this.artCtx = this.artCv.getContext('2d');
    this.artCtx.imageSmoothingEnabled = false;
    this.marquee = root.querySelector('#paintMarquee');
    this.canvasWrapEl = root.querySelector('#paintCanvas');

    // 任务栏按钮
    this.taskBtns = [
      { t: 'Princess - Paint', ico: 'paint', active: false },
      { t: 'lyrics_draft.txt - Notepad', ico: 'notepad', active: true },
      { t: 'Sound Recorder', ico: 'info', active: false },
    ];
    this.renderTaskbar();
  };

  const PALETTE = ['#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
    '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
    '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff',
    '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040'];

  S.toolButtons = function () {
    const tools = ['✂', '🖌', '🖍', '🖌', '🪣', '💧', '⌫', 'A', '📏', '✏'];
    let h = '<div class="tool-grid">';
    for (let i = 0; i < 14; i++) {
      const g = i < tools.length ? tools[i] : '&nbsp;';
      h += '<div class="tool-cell' + (i === 9 ? ' is-on' : '') + '">' + g + '</div>';
    }
    h += '</div>';
    return h;
  };

  S.renderTaskbar = function (t) {
    const idx = (t > 9.3) ? 1 : 0;
    global.APP.setTaskbar([
      { t: 'Princess - Paint', ico: 'paint' },
      { t: 'lyrics_draft.txt - Notepad', ico: 'notepad' },
      { t: 'Sound Recorder', ico: 'info' },
    ], idx);
  };

  /* ---------- 进入 ---------- */
  S.enter = function () {
    this.renderTaskbar(0);
    if (this.root) global.W98.spotlight(this.root, this.paintWin);
  };

  /* ---------- 每帧更新 ---------- */
  S.update = function (t, e, kick) {
    // 世界层
    const ctx = global.World.ctx;
    global.World.teal(ctx, 1920, 1080, t);
    // 桌面图标
    document.getElementById('desktop').style.opacity = 1;

    /* ============================================================
       画布：网格纸 + 40% 蓝色草图 + 延时摄影三阶段
       ------------------------------------------------------------
       A 4.0–5.8  蓝色辅助线快速勾勒轮廓 → 5.2 弹 Ctrl+Z 擦掉重画
       B 5.8–7.2  调色盘高亮，油漆桶/喷枪铺复古网点色
       C 7.2–8.85 400% 放大镜点眼睛高光 → 缩放回全局
       全部为 t 的纯函数，任意 seek 顺序一致。
       ============================================================ */
    const AW = 1080, AH = 520;
    const ACX = AW / 2, ACY = AH / 2;
    const art = this.artCtx;
    art.setTransform(1, 0, 0, 1, 0, 0);
    art.globalAlpha = 1;
    art.globalCompositeOperation = 'source-over';
    art.clearRect(0, 0, AW, AH);

    // ---- 1) 画纸底 + 像素辅助网格（不再是纯白） ----
    drawGridPaper(art, AW, AH);

    /* ---- 2) 作画进度：BIOS 铺到 8.88s，所以这里从 8.88 起画到 16.4 ---- */
    const pA = U.inv(8.95, 11.60, t);         // 草图勾勒
    const pB = U.inv(11.60, 14.10, t);        // 上色
    const pC = U.inv(14.10, 16.30, t);        // 高光精修
    const sketch = U.clamp(pA, 0, 1);

    if (global.ART) {
      /* 线稿阶段 sketchOnly 会跳掉大部分填充笔画，所以进度映射拉满，
         否则画面上只剩几根线（视觉上远不到 40%）。 */
      const draftBase = 0.40;
      const draftProg = U.clamp(0.55 + (draftBase + sketch * 0.60) * 0.45, 0, 1);
      global.ART.princess(art, ACX, ACY, 1.32, draftProg, {
        blink: (t * 0.6) % 6 > 5.7,
        mouth: 0.5 + Math.sin(t * 2.1) * 0.5,
        wobble: 0.45,
        sixFingers: false,
        sketchOnly: pB <= 0,          // B 阶段之前只有线稿
        blueDraft: true,              // 蓝色铅笔线
      });

      // B 阶段：网点上色（叠一层暖色 dither）
      if (pB > 0) {
        art.save();
        art.globalAlpha = U.clamp(pB * 1.15, 0, 1);
        global.ART.princess(art, ACX, ACY, 1.32, draftProg, {
          blink: false, mouth: 0.5, wobble: 0.45, sixFingers: false,
        });
        art.restore();
        art.save();
        art.globalAlpha = 0.16 * pB;
        global.ART.ditherNoise(art, AW, AH, 0.35, 77, ['#f0a060', '#f8d0a0', '#e08080']);
        art.restore();
      }

      // C 阶段：眼睛高光（一像素一像素点）
      if (pC > 0) {
        art.save();
        art.globalAlpha = U.clamp(pC * 1.4, 0, 1);
        drawEyeHighlights(art, ACX, ACY, 1.32, pC);
        art.restore();
      }
    }

    if (global.ART) {
      /* 草图阶段要"看起来已有 40%"，但 sketchOnly 会跳掉大部分填充笔画，
         所以这里把进度映射拉满：线稿部分直接按 0.55→1 推进，
         否则画面上只剩几根线（视觉上远不到 40%）。 */
      const draftBase = 0.40;
      const draftProg = U.clamp(0.55 + (draftBase + sketch * 0.60) * 0.45, 0, 1);
      global.ART.princess(art, ACX, ACY, 1.32, draftProg, {
        blink: (t * 0.6) % 6 > 5.7,
        mouth: 0.5 + Math.sin(t * 2.1) * 0.5,
        wobble: 0.45,
        sixFingers: false,
        sketchOnly: pB <= 0,          // B 阶段之前只有线稿
        blueDraft: true,              // 蓝色铅笔线
      });

      // B 阶段：网点上色（叠一层暖色 dither）
      if (pB > 0) {
        art.save();
        art.globalAlpha = U.clamp(pB * 1.15, 0, 1);
        global.ART.princess(art, ACX, ACY, 1.32, draftProg, {
          blink: false, mouth: 0.5, wobble: 0.45, sixFingers: false,
        });
        art.restore();
        // 复古网点纹理（dithering）：只在缩小图上有意义，用低透明度叠
        art.save();
        art.globalAlpha = 0.16 * pB;
        global.ART.ditherNoise(art, AW, AH, 0.35, 77, ['#f0a060', '#f8d0a0', '#e08080']);
        art.restore();
      }

      // C 阶段：眼睛高光（一像素一像素点）
      if (pC > 0) {
        art.save();
        art.globalAlpha = U.clamp(pC * 1.4, 0, 1);
        drawEyeHighlights(art, ACX, ACY, 1.32, pC);
        art.restore();
      }
    }

    // ---- 3) 当前工具笔触提示（铅笔/喷枪/油漆桶轮换） ----
    if (t >= 8.95 && t < 16.30) {
      const r = U.rng((t * 12) | 0);
      const px = ACX + (r() - 0.5) * 420, py = ACY + (r() - 0.5) * 330;
      art.fillStyle = 'rgba(0,0,0,0.55)';
      art.fillRect(px | 0, py | 0, 6, 6);
    }

    // ---- 4) 版本号 / 完成度 ----
    if (this.ver) {
      const pct = Math.round(U.clamp(draftPct(t), 0, 1) * 100);
      const v = Math.min(28, 1 + Math.floor(U.inv(8.95, 16.30, t) * 27));
      const s = 'v' + U.pad(v) + '  ' + pct + '%';
      if (this.ver.__s !== s) { this.ver.__s = s; this.ver.textContent = s; }
    }

    // ---- 5) 撤销红浮窗 / 放大镜 / 气泡 ----
    this.drawUndo(t);
    this.drawLoupe(t);
    this.drawBubbles(t);
    // 便签随鼓点轻微"呼吸"（整数像素，不抖）
    if (this.sticky) {
      const k = Math.round((0.94 + e.bass * 0.10) * 100) / 100;
      this.sticky.style.opacity = k > 1 ? '1' : String(k);
    }

    // 选区脉动
    if (t > 16.2 && t < 17.6) {
      this.marquee.style.display = 'block';
      this.marquee.style.opacity = 0.85;
    } else this.marquee.style.display = 'none';

    // notepad 打字
    const typed = typedTextAt(t);
    if (this.npText.textContent !== typed) this.npText.textContent = typed;
    const caretOn = isTyping(t) || (Math.floor(t * 2.4) % 2 === 0);
    this.npText.classList.toggle('caret', caretOn && t > 9.2);
    // 状态栏行/列
    const st = this.npWin.querySelectorAll('.status-cell');
    if (st.length) {
      const lastNL = typed.lastIndexOf('\n');
      st[0].textContent = 'Ln ' + (typed.split('\n').length) + ', Col ' + (typed.length - lastNL);
      st[2].textContent = typed.length + ' chars';
    }

    // 录音机波形（360x70）
    const wctx = this.sndWave.getContext('2d');
    const W = 360, H = 70;
    wctx.fillStyle = '#000';
    wctx.fillRect(0, 0, W, H);
    wctx.strokeStyle = '#00ff00';
    wctx.lineWidth = 2;
    wctx.beginPath();
    for (let x = 0; x < W; x++) {
      const tt = t - (W - x) * 0.012;
      const env = TL.Audio.at(Math.max(0, tt)).rms;
      const hum = Math.sin(x * 0.07 + t * 3) * 0.35 + Math.sin(x * 0.23) * 0.18;
      const y = H / 2 + hum * H * 0.28 * (0.35 + env * 1.6);
      x === 0 ? wctx.moveTo(x, y) : wctx.lineTo(x, y);
    }
    wctx.stroke();
    // 中央细线
    wctx.fillStyle = 'rgba(0,255,0,0.25)';
    wctx.fillRect(0, H / 2, W, 2);

    // 鼠标：从桌面移动到画布，边画边动
    const m = this.mouseAt(t);
    global.APP.cursor.x = m.x; global.APP.cursor.y = m.y;
    global.APP.cursor.kind = m.kind;
    global.APP.cursor.tremor = m.tremor;

    // 任务栏激活切换
    this.renderTaskbar(t);

    // 第一幕完全静止：不做任何位移抖动，画面只靠手绘笔触的自身动效呼吸
    global.FX.splitAmt = 0;
  };

  /* ---------- 画纸：淡蓝灰底 + 32px 主网格 + 8px 次网格 ---------- */
  function drawGridPaper(c, w, h) {
    c.fillStyle = '#e8ecf2';
    c.fillRect(0, 0, w, h);
    // 次网格
    c.fillStyle = 'rgba(150,170,200,0.30)';
    for (let x = 0; x < w; x += 8) c.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += 8) c.fillRect(0, y, w, 1);
    // 主网格
    c.fillStyle = 'rgba(110,140,185,0.55)';
    for (let x = 0; x < w; x += 32) c.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += 32) c.fillRect(0, y, w, 1);

    /* 草稿辅助线：中心十字 + 头/身比例线，让画面像"正在作业的草稿纸" */
    c.save();
    c.strokeStyle = 'rgba(220,80,80,0.42)';
    c.lineWidth = 2;
    c.setLineDash([10, 8]);
    // 垂直中轴
    c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke();
    // 水平中线
    c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
    // 头部比例框
    c.strokeStyle = 'rgba(220,80,80,0.32)';
    c.strokeRect(w / 2 - 130, h / 2 - 190, 260, 210);
    // 身体比例框
    c.strokeRect(w / 2 - 120, h / 2 + 10, 240, 190);
    c.restore();

    // 画布边界
    c.strokeStyle = 'rgba(80,110,160,0.65)';
    c.lineWidth = 2;
    c.setLineDash([]);
    c.strokeRect(1, 1, w - 2, h - 2);
  }

  /* ---------- 眼睛高光：一像素一像素点出来 ---------- */
  function drawEyeHighlights(c, cx, cy, sc, p) {
    // 与 ART.princess 的坐标一致：眼睛在 (-22,-28) 与 (22,-28)
    const eyes = [[-22, -30], [22, -30]];
    const px = 2;
    const n = Math.floor(p * 14);
    c.fillStyle = '#ffffff';
    for (let i = 0; i < n; i++) {
      for (let e = 0; e < eyes.length; e++) {
        const ex = cx + eyes[e][0] * sc;
        const ey = cy + eyes[e][1] * sc;
        // 沿一个小的 L 形路径逐点绘制，模拟"点高光"
        const seq = [[0, 0], [px, 0], [px * 2, 0], [0, px], [px, px],
          [px * 2, px], [0, px * 2], [-px, px], [-px * 2, px],
          [0, -px], [px, -px], [-px, 0], [-px, -px], [px * 2, -px]];
        const s = seq[i % seq.length];
        c.fillRect(ex + s[0], ey + s[1], px, px);
      }
    }
  }

  /* ---------- 完成度（供版本号显示） ---------- */
  function draftPct(t) {
    const pA = U.inv(8.95, 11.60, t);
    const pB = U.inv(11.60, 14.10, t);
    const pC = U.inv(14.10, 16.30, t);
    return U.clamp(0.40 + pA * 0.20 + pB * 0.25 + pC * 0.15, 0, 1);
  }

  /* ---------- Ctrl+Z 红浮窗：11.0–11.8 ---------- */
  S.drawUndo = function (t) {
    if (!this.undo) return;
    const on = t >= 11.00 && t < 11.85;
    this.undo.style.display = on ? 'block' : 'none';
    if (!on) return;
    this.undo.style.left = '210px';
    this.undo.style.top = '210px';
    const p = U.inv(11.00, 11.10, t);
    const o = 1 - U.inv(11.65, 11.85, t);
    this.undo.style.opacity = Math.min(p * 2, o).toFixed(2);
  };

  /* ---------- 400% 放大镜：14.3–15.7 ---------- */
  S.drawLoupe = function (t) {
    if (!this.loupe) return;
    const on = t >= 14.30 && t < 15.75;
    this.loupe.style.display = on ? 'block' : 'none';
    if (!on) return;

    const AX = 1080 / 2 - 30, AY = 520 / 2 - 52;
    const RW = 92, RH = 66;

    const c = this.loupeCtx;
    const LW = this.loupeCv.width, LH = this.loupeCv.height;
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#fff';
    c.fillRect(0, 0, LW, LH);
    c.drawImage(this.artCv, AX, AY, RW, RH, 0, 0, LW, LH);

    const z = U.inv(14.30, 15.45, t);
    const w = Math.round(U.lerp(520, 300, z));
    const h = Math.round(U.lerp(360, 208, z));
    this.loupe.style.width = w + 'px';
    this.loupe.style.height = h + 'px';
    this.loupe.style.left = Math.round(U.lerp(430, 620, z)) + 'px';
    this.loupe.style.top = Math.round(U.lerp(150, 200, z)) + 'px';
    this.loupe.style.opacity = Math.min(1, U.inv(14.30, 14.44, t) * 2).toFixed(2);
  };

  /* ---------- 漂浮气泡：跟随主歌前段 ---------- */
  S.drawBubbles = function (t) {
    if (!this.bubbleLayer) return;
    if (t < 8.95 || t > 15.6) {
      if (this._bubOn) { this.bubbleLayer.innerHTML = ''; this._bubOn = false; }
      return;
    }
    if (!this._bubOn) { this.bubbleLayer.innerHTML = ''; this._bubOn = true; }

    const POOL = [
      { t: 9.30, ico: '☕', txt: '咖啡因摄入 +200%', cls: 'is-hot' },
      { t: 10.20, ico: '✏️', txt: '手工像素描线 +128', cls: '' },
      { t: 11.10, ico: '❤️', txt: '注入人类真实情感... 99%', cls: 'is-hot' },
      { t: 12.40, ico: '☕', txt: '第 4 杯美式 已见底', cls: 'is-cool' },
      { t: 13.50, ico: '✏️', txt: 'Ctrl+Z 累计 47 次', cls: '' },
      { t: 14.60, ico: '❤️', txt: '体温 36.7℃ 都画进去了', cls: 'is-hot' },
    ];

    if (!this.bubbles.length) {
      for (let i = 0; i < POOL.length; i++) {
        const n = document.createElement('div');
        n.className = 'a1-bubble ' + POOL[i].cls;
        n.innerHTML = '<span class="b-ico">' + POOL[i].ico + '</span>' +
          '<span class="b-txt">' + POOL[i].txt + '</span>';
        n.style.display = 'none';
        this.bubbleLayer.appendChild(n);
        this.bubbles.push(n);
      }
    }
    for (let i = 0; i < POOL.length; i++) {
      const b = POOL[i], n = this.bubbles[i];
      const age = t - b.t;
      const life = 2.4;
      if (age < 0 || age > life) {
        if (n.style.display !== 'none') n.style.display = 'none';
        continue;
      }
      if (n.style.display !== 'block') n.style.display = 'block';
      const k = age / life;
      const x = Math.round(300 + (i % 3) * 250 + Math.sin(age * 1.4 + i) * 18);
      const y = Math.round(560 - k * 300);
      n.style.left = x + 'px';
      n.style.top = y + 'px';
      const a = Math.min(1, age * 4) * (1 - U.clamp((k - 0.65) / 0.35, 0, 1));
      n.style.opacity = Math.max(0, a).toFixed(2);
    }
  };

  /* 第一幕没有需要震动的剧情节拍（纯真年代应当稳如一张画纸） */
  S.impacts = [];

  /* 鼠标轨迹（确定性） */
  S.mouseAt = function (t) {
    // paint 窗口: x=40,y=26,w=1240,h=700；画布 1080x520
    const ACX = 40 + 118 + 1080 / 2;
    const ACY = 26 + 38 + 44 + 520 / 2;
    if (t < 8.95) {
      const p = U.inv(8.6, 8.95, t);
      return {
        x: U.lerp(900, 760, p) + Math.sin(t * 1.7) * 34,
        y: U.lerp(700, 420, p) + Math.cos(t * 1.4) * 30,
        kind: 'arrow', tremor: 0.6,
      };
    }
    if (t < 16.5) {
      const p = U.inv(8.95, 16.4, t);
      const ang = p * Math.PI * 2 * 2.4;
      const rad = 170 + Math.sin(p * 9) * 50;
      return {
        x: ACX + Math.cos(ang) * rad * 1.1,
        y: ACY + Math.sin(ang) * rad * 0.72,
        kind: 'pencil', tremor: 1.4,
      };
    }
    const p = U.inv(16.5, 17.4, t);
    return {
      x: U.lerp(800, 1500, U.easeInOut(p)),
      y: U.lerp(560, 330, U.easeInOut(p)),
      kind: 'arrow', tremor: 0.7,
    };
  };

  global.APP.register(S);
})(window);
