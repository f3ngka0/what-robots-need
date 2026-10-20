/* ============================================================
   act3.js — 第三幕【死机弹窗瀑布与 Ctrl+Alt+Del 暴力处决】41.2s – 84.6s
   歌词化作弹窗正文 · 阶梯级联残影 · 关闭程序任务管理器 · 红色剃刀劈碎
   ============================================================ */
(function (global) {
  'use strict';
  const U = global.U, TL = global.TL, W98 = global.W98;

  const S = { id: 'act3', t0: 41.2, t1: 84.6 };

  /* 每个小节一条"人格弹窗"（正文必须是当句歌词） */
  const POPUPS = [
    { key: 'sympathy', t: 41.5, app: 'Fake_Sympathy_Wizard.exe', kind: 'wizard',
      title: 'Fake Sympathy Wizard', body: '检测到您情绪低落，AI 正在为您流下第 10,024 滴电子眼泪。', q: '是否接受道歉？', btns: ['Yes', 'Yes'] },
    { key: 'discovery', t: 50.7, app: 'Soul_Replacer_98.dll', kind: 'wizard',
      title: 'Soul Replacer 98', body: '人类创造力已过时，正在将您的多巴胺重定向至算法信息流…', q: '', btns: ['OK', 'Details…'] },
    { key: 'replace', t: 57.1, app: 'REPLACE.exe', kind: 'dialog',
      title: "Won't let you replace me", body: '正在用 200 万个我替换 1 个你。', q: '继续？', btns: ['Yes', 'Yes'] },
    { key: 'pussy', t: 59.2, app: 'Cyber_Lover_v4.exe', kind: 'lover',
      title: 'Cyber Lover v4.0', body: '附近的荷尔蒙模拟器向您发送了 999 个完美高潮数据包！', q: '点击领取 →', btns: ['领取', '领取更多'] },
    { key: 'humanity', t: 67.6, app: 'HUMANITY_EMULATOR.exe', kind: 'wizard',
      title: 'Humanity Emulator', body: '正在安装人类共情补丁… 已跳过 4,812 个灵魂。', q: '完成', btns: ['Finish', 'Cancel'] },
    { key: 'bewitch', t: 73.9, app: 'BEWITCH_ME.EXE', kind: 'lover',
      title: 'Bewitch Me', body: '我不会让你迷惑我的。', q: '', btns: ['YES', 'NO'] },
    { key: 'art', t: 74.13, app: 'ART_IS_DEAD.ini', kind: 'error',
      title: 'soul.exe - Application Error', body: "I don't need a robot's robot art.", q: '', btns: ['OK'] },
  ];

  /* 主大弹窗：始终跟随当前歌词，占据视觉中心 */
  const HERO_BODY = {
    sympathy: ['检测到您情绪低落。', 'AI 正在为您流下第 10,024 滴电子眼泪。', '是否接受道歉？'],
    apology: ['道歉模块加载完成。', '对不起。对不起。对不起。', '声纹相似度 99.7%。'],
  };

  S.build = function (root) {
    root.innerHTML = '';
    this.root = root;

    // 瀑布层（canvas 绘制成百上千个残影弹窗）
    this.rainCv = U.el('canvas', 'a3-rain');
    this.rainCv.width = 1920; this.rainCv.height = 1080;
    root.appendChild(this.rainCv);
    this.rain = this.rainCv.getContext('2d');
    this.rain.imageSmoothingEnabled = false;

    // DOM 弹窗层（实体的、可读的）
    this.domLayer = U.el('div', 'a3-dom');
    root.appendChild(this.domLayer);

    // 关闭程序任务管理器
    const cp = W98.make({
      x: 460, y: 220, w: 1000, h: 610, title: 'Close Program',
      cls: 'win98-window--dialog', titleCls: 'titlebar--alert', noResize: true,
      bodyHtml:
        '<div class="cp-body">' +
        '<div class="cp-hint">⚠ WARNING: If you close a program that is not responding, you could lose information in that program.</div>' +
        '<div class="cp-list" id="cpList"></div>' +
        '<div class="cp-btns">' +
        '<button class="btn98 btn-default">End Task</button>' +
        '<button class="btn98">Shut Down</button>' +
        '<button class="btn98">Cancel</button>' +
        '<button class="btn98">Help</button></div>' +
        '</div>',
      extra: 'display:none',
    });
    cp.style.zIndex = 120;
    root.appendChild(cp);
    this.cpWin = cp;
    this.cpList = cp.querySelector('#cpList');

    // 红色剃刀 canvas
    this.razorCv = U.el('canvas', 'a3-razor');
    this.razorCv.width = 1920; this.razorCv.height = 1080;
    root.appendChild(this.razorCv);
    this.razor = this.razorCv.getContext('2d');

    // 碎片层
    this.shatterCv = U.el('canvas', 'a3-shatter');
    this.shatterCv.width = 1920; this.shatterCv.height = 1080;
    root.appendChild(this.shatterCv);
    this.shatter = this.shatterCv.getContext('2d');
    this.shatter.imageSmoothingEnabled = false;

    // 预生成瀑布弹窗数据（确定性）
    this.drop = [];
    const r = U.rng(2024);
    for (let i = 0; i < 240; i++) {
      this.drop.push({
        t: 41.4 + r() * 41,                    // 出现时间
        x: r() * 1920, y: r() * 1000,
        w: 190 + r() * 300, h: 90 + r() * 130,
        life: 3 + r() * 7,
        fall: 20 + r() * 90,
        hue: r() < 0.5 ? '#000080' : (r() < 0.5 ? '#c00000' : '#800080'),
      });
    }
    this.drop.sort((a, b) => a.t - b.t);

    // 碎裂块
    this.pieces = [];
    const r2 = U.rng(777);
    for (let i = 0; i < 260; i++) {
      this.pieces.push({
        t: 57.0 + r2() * 26,
        x: r2() * 1920, y: r2() * 900,
        w: 30 + r2() * 130, h: 14 + r2() * 66,
        vx: (r2() - 0.5) * 300, vy: r2() * 90,
        rot: (r2() - 0.5) * 5, vr: (r2() - 0.5) * 6,
        kind: Math.floor(r2() * 3),
      });
    }
    this.pieces.sort((a, b) => a.t - b.t);
  };

  /* 场景重建时清掉所有指向旧 DOM 的缓存。
     MV.reset() 会移除场景根节点，但这些缓存（hero / popMap）仍然
     指向已脱离文档的元素，于是再次进入本幕时 new 的元素不会被插入，
     画面就少了一层 —— 表现为「同一时刻的结果取决于之前播过哪一幕」。 */
  S.reset = function () {
    this.hero = null;
    this.heroCode = this.heroSev = null;
    this.heroKw = this.heroKwZh = this.heroAnimTag = null;
    this.heroAnim = this.heroAnimCtx = null;
    this.heroDump = this.heroMeta = null;
    this.heroDots = null;
    this._heroKey = '';
    this._heroPos = '';
    this.popMap = {};
    this._cpKey = null;
  };

  S.enter = function () {
    document.getElementById('desktop').style.opacity = 0;
    global.APP.setTaskbar([
      { t: 'Fake_Sympathy_Wizard.exe', ico: 'wizard' },
      { t: 'Soul_Replacer_98.dll', ico: 'error' },
      { t: 'Cyber_Lover_v4.exe', ico: 'heart' },
      { t: 'Princess.exe (Not Responding)', ico: 'paint' },
    ], 0);
    /* 处决重拍：剃刀三次横扫（57.0 / 74.2 / 82.6）+ End Task 三次强按。
       声明式——纯时间查表，任意 seek 顺序结果一致。 */
    if (global.FX && global.FX.define) {
      global.FX.define('act3', [
        { t: 57.00, power: 1.0 },
        { t: 56.95, power: 0.8 },
        { t: 70.50, power: 1.0 },
        { t: 73.85, power: 0.8 },
        { t: 74.20, power: 1.0 },
        { t: 82.35, power: 0.8 },
        { t: 82.60, power: 1.0 },
      ]);
    }
  };

  S.update = function (t, e, kick) {
    const ctx = global.World.ctx;
    const rel = t - 41.2;

    /* ---------- 世界：蒸汽波全开 + 燃烧的显卡/大卫 ---------- */
    global.World.sky(ctx, 1920, 1080, t, e.bass);
    global.World.grid(ctx, 1920, 1080, t, e.bass, { floor: true, horizon: 0.58 });
    const davidA = U.inv(41.4, 44, t);
    if (davidA > 0) {
      ctx.save();
      ctx.globalAlpha = davidA * 0.55;
      global.World.david(ctx, 960, 470, 420 * (1 + Math.sin(t * 0.7) * 0.03), t, {
        laser: Math.max(0, e.bass - 0.35) * 3, alpha: 0.5, lw: 1.5,
      });
      ctx.restore();
    }
    // 燃烧热量扭曲感
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.10 + e.bass * 0.12;
    const fg = ctx.createLinearGradient(0, 700, 0, 1080);
    fg.addColorStop(0, 'rgba(255,60,0,0)');
    fg.addColorStop(1, 'rgba(255,60,0,0.55)');
    ctx.fillStyle = fg; ctx.fillRect(0, 700, 1920, 380);
    ctx.restore();

    /* ---------- 瀑布弹窗（canvas） ---------- */
    const rc = this.rain;
    rc.clearRect(0, 0, 1920, 1080);
    const storm = U.inv(41.3, 44, t);
    let live = 0;
    for (let i = 0; i < this.drop.length; i++) {
      const d = this.drop[i];
      if (t < d.t) break;
      const age = t - d.t;
      if (age > d.life) continue;
      live++;
      // 阶梯级联：先快速弹出，随后向下漂移（残影）
      const pop = Math.min(1, age / 0.12);
      const gy = d.y + age * d.fall + Math.sin(age * 2 + i) * 6;
      const gx = d.x + Math.sin(age * 1.4 + i) * 10;
      const a = pop * Math.min(1, (d.life - age) / 0.5);
      // 残影：向上拖出阶梯
      for (let k = 6; k >= 0; k--) {
        rc.globalAlpha = a * (0.10 + 0.22 * (6 - k) / 6);
        W98.drawWinRect(rc, gx - k * 6, gy - k * 4, d.w, d.h, {
          title: '', titleFrom: d.hue, titleTo: '#1084d0', body: false,
        });
      }
      rc.globalAlpha = a;
      // 正文：把当前歌词砸进去
      const ly = TL.lyricAt(t);
      W98.drawWinRect(rc, gx, gy, d.w, d.h, {
        title: (i % 3 === 0 ? 'Error' : i % 3 === 1 ? 'Wizard' : 'Warning') + ' #' + (4096 + i),
        titleFrom: d.hue, titleTo: '#1084d0', body: true,
        flash: Math.max(0, e.high - 0.5) * 1.6,
      });
      rc.fillStyle = '#000'; rc.font = '9px Tahoma,sans-serif';
      const msg = ly ? ly.s : '';
      // 自动折行
      let line = '', yy = gy + 26;
      for (let ci = 0; ci < msg.length && yy < gy + d.h - 8; ci++) {
        line += msg[ci];
        if (line.length > Math.floor((d.w - 16) / 5)) { rc.fillText(line, gx + 7, yy); line = ''; yy += 10; }
      }
      if (line) rc.fillText(line, gx + 7, yy);
      rc.globalAlpha = 1;
    }

    /* ---------- DOM 实体弹窗：每句歌词一个 ---------- */
    this.syncPopups(t, e);
    this.heroPopup(t, e);

    /* ---------- Close Program 任务管理器 ---------- */
    const cpOn = this.cpActive(t);
    this.cpWin.style.display = cpOn ? 'flex' : 'none';
    if (cpOn) {
      this.buildCPList(t);
      // 高亮行的闪烁
      const rows = this.cpList.querySelectorAll('.listview__row');
      rows.forEach((row, i) => {
        const sel = i === this.cpSel(t);
        row.classList.toggle('is-selected', sel);
      });
      // End Task 按钮按下
      const btns = this.cpWin.querySelectorAll('.cp-btns .btn98');
      const press = this.cpPress(t);
      if (btns[0]) btns[0].classList.toggle('is-down', press);
      const pop = U.easeOutBack(U.inv(this.cpStart(t), this.cpStart(t) + 0.18, t));
      this.cpWin.style.transform = 'scale(' + (0.7 + 0.3 * pop) + ')';
    }

    /* ---------- 红色剃刀横扫 ---------- */
    const rz = this.razorCtx(t);
    if (rz) this.drawRazor(rz, t, e);

    /* ---------- 多边形碎裂 ---------- */
    this.drawShatter(t, e);

    /* ---------- 全局效果（零位移；只保留不晃眼的故障纹理） ---------- */
    const inten = 0.5 + storm * 0.8;
    global.FX.splitAmt = 0;
    global.FX.noiseDens = 0.08 + e.high * 0.22;
    global.FX.vram = Math.max(0, e.high - 0.72) * 0.8;
    global.FX.mode = inten > 0.85 ? 'glitch' : 'none';

    // 处决重拍已由 S.build 里的声明式冲击表驱动（纯时间查表）

    // 鼠标
    global.APP.cursor.kind = 'arrow';
    global.APP.cursor.tremor = cpOn ? 2 : 1.2;
    if (cpOn) {
      global.APP.cursor.x = 700 + Math.sin(t * 30) * 6;
      global.APP.cursor.y = 330 + Math.sin(t * 22) * 5;
    } else {
      global.APP.cursor.x = 960 + Math.sin(t * 2.3) * 420;
      global.APP.cursor.y = 540 + Math.cos(t * 1.9) * 240;
    }
  };

  /* ---- "重音处决"：每 8 秒左右强闪一次 Close Program ---- */
  S.cpStart = function (t) {
    if (t >= 57.0 && t < 60.2) return 56.95;
    if (t >= 73.9 && t < 77.2) return 73.85;
    if (t >= 82.4 && t < 84.6) return 82.35;
    return -999;
  };
  S.cpActive = function (t) {
    const s = this.cpStart(t);
    return s > 0 && t > s && t < s + 3.2;
  };
  S.cpSel = function (t) {
    const s = this.cpStart(t);
    return Math.floor((t - s) * 5) % 3;
  };
  S.cpPress = function (t) {
    const s = this.cpStart(t);
    return ((t - s) % 1.1) < 0.16;
  };
  S.razorCtx = function (t) {
    // 57, 74.2, 82.6 各扫一刀
    const seeds = [57.0, 74.2, 82.6, 70.5];
    for (let i = 0; i < seeds.length; i++) {
      const d = t - seeds[i];
      if (d >= 0 && d < 0.85) return { i: i, p: d / 0.85, seed: seeds[i] };
    }
    return null;
  };

  S.drawRazor = function (rz, t, e) {
    const c = this.razor, W = 1920, H = 1080;
    c.clearRect(0, 0, W, H);
    const p = rz.p;
    const x = U.lerp(-300, W + 300, U.easeIn(p));
    const y = U.lerp(200, 760, p) + rz.i * 60;
    c.save();
    c.translate(x, y);
    c.rotate(0.42 + Math.sin(t * 20) * 0.03);
    // 红色像素锯齿刀身
    c.fillStyle = '#ff0033';
    c.beginPath();
    c.moveTo(0, -14);
    c.lineTo(520, -22);
    // 锯齿
    for (let i = 8; i >= 0; i--) c.lineTo(520 - i * 58, -22 + (i % 2 ? 26 : 42));
    c.lineTo(0, 28);
    c.closePath();
    c.fill();
    // 高光
    c.fillStyle = 'rgba(255,255,255,' + (0.5 + Math.sin(t * 40) * 0.3) + ')';
    c.fillRect(10, -12, 500, 3);
    // 刀柄
    c.fillStyle = '#222';
    c.fillRect(-90, -10, 92, 24);
    // 残影
    c.globalAlpha = 0.28;
    for (let k = 1; k < 6; k++) c.fillRect(-k * 40, -24, 600, 46);
    c.restore();
    // 全屏红色冲击
    c.globalCompositeOperation = 'overlay';
    c.fillStyle = 'rgba(255,0,40,' + (0.35 * (1 - p)) + ')';
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
  };

  S.drawShatter = function (t, e) {
    const c = this.shatter, W = 1920, H = 1080;
    c.clearRect(0, 0, W, H);
    for (let i = 0; i < this.pieces.length; i++) {
      const q = this.pieces[i];
      if (t < q.t) break;
      const age = t - q.t;
      if (age > 4) continue;
      const yy = q.y + q.vy * age + 900 * age * age * 0.5;
      if (yy > H + 100) continue;
      const xx = q.x + q.vx * age;
      c.save();
      c.translate(xx, yy);
      c.rotate(q.rot + q.vr * age);
      c.globalAlpha = Math.min(1, (4 - age) / 1.2);
      // 窗口碎片
      if (q.kind === 0) {
        c.fillStyle = '#c0c0c0'; c.fillRect(-q.w / 2, -q.h / 2, q.w, q.h);
        c.fillStyle = '#ffffff'; c.fillRect(-q.w / 2, -q.h / 2, q.w, 1);
        c.fillStyle = '#000'; c.fillRect(-q.w / 2, q.h / 2 - 1, q.w, 1);
        if (q.h > 30) { c.fillStyle = '#000080'; c.fillRect(-q.w / 2 + 2, -q.h / 2 + 2, q.w - 4, 10); }
      } else if (q.kind === 1) {
        c.fillStyle = '#ff0033';
        c.beginPath();
        c.moveTo(-q.w / 2, 0); c.lineTo(0, -q.h / 2); c.lineTo(q.w / 2, 0); c.closePath(); c.fill();
      } else {
        c.fillStyle = 'rgba(0,255,255,0.5)';
        c.fillRect(-q.w / 2, -q.h / 2, q.w, q.h);
        c.fillStyle = 'rgba(255,0,170,0.5)';
        c.fillRect(-q.w / 2 + 3, -q.h / 2 + 3, q.w, q.h);
      }
      // 残影
      c.globalAlpha *= 0.35;
      c.fillStyle = '#ff00aa';
      c.fillRect(-q.w / 2 - 6, -q.h / 2 - 4, q.w, q.h);
      c.restore();
    }
  };

  /* ---------- DOM 实体弹窗管理 ---------- */
  S.syncPopups = function (t, e) {
    if (!this.popMap) this.popMap = {};
    for (let i = 0; i < POPUPS.length; i++) {
      const P = POPUPS[i];
      const start = P.t;
      const end = start + 2.6;
      const on = t >= start && t < end;
      let n = this.popMap[P.key];
      if (on && !n) {
        n = this.makePopup(P, i);
        this.domLayer.appendChild(n);
        this.popMap[P.key] = n;
      }
      if (n) {
        if (!on) { n.remove(); delete this.popMap[P.key]; continue; }
        const age = t - start;
        const pop = U.easeOutBack(Math.min(1, age / 0.16));
        const out = U.inv(end - 0.3, end, t);
        const shake = Math.max(0, e.high - 0.55) * 6;
        n.style.transform =
          'translate(' + ((Math.sin(t * 70) * shake) | 0) + 'px,' + ((Math.cos(t * 60) * shake) | 0) + 'px) ' +
          'scale(' + (0.8 + 0.2 * pop) * (1 - out * 0.25) + ')';
        n.style.opacity = (1 - out).toFixed(3);
      }
    }
  };

  S.makePopup = function (P, i) {
    const x = 90 + (i % 3) * 560 + (i * 37 % 70);
    const y = 110 + (i % 3) * 210;
    const cls = 'win98-window win98-window--dialog ' + (P.kind === 'lover' ? 'win98-window--lover' : '') +
      (P.kind === 'wizard' ? ' win98-window--wizard' : '');
    const n = document.createElement('div');
    n.className = cls;
    // 2x 化后必须加宽，否则 22px 标题会被截断
    n.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + (i % 2 ? 620 : 560) + 'px;z-index:' + (100 + i) + ';';
    const titleCls = P.kind === 'lover' ? 'titlebar--vapor' : (P.kind === 'error' ? 'titlebar--alert' : 'titlebar--classic');
    n.innerHTML =
      '<div class="titlebar ' + titleCls + '"><span class="tb-title">' + P.title + '</span>' +
      '<div class="tb-btns"><button class="tb-btn">_</button><button class="tb-btn">□</button><button class="tb-btn">✕</button></div></div>' +
      (P.kind === 'wizard' ? '<div class="wizard-banner"></div>' : '') +
      '<div class="win-body"><div class="dlg-row">' +
      '<canvas class="dlg-icon" width="32" height="32" data-ico="' + (P.kind === 'lover' ? 'heart' : P.kind === 'error' ? 'error' : 'info') + '"></canvas>' +
      '<div class="dlg-text"><b>' + P.app + '</b><br>' + P.body +
      (P.q ? '<br><br><i>' + P.q + '</i>' : '') + '</div></div>' +
      '<div class="dlg-btns">' + P.btns.map((b, bi) => '<button class="btn98' + (bi === 0 ? ' btn-default' : '') + '">' + b + '</button>').join('') + '</div>' +
      '</div>';
    // 图标
    const cv = n.querySelector('[data-ico]');
    if (cv && global.ART) {
      const src = global.ART.icon(cv.dataset.ico, 32);
      cv.getContext('2d').drawImage(src, 0, 0);
    }
    return n;
  };

  /* ---------- 十六进制内存转储 ----------
     目的：把歌词下方的版面填满，让「系统真的在崩溃」有密度感。
     完全确定性：同一句用同一个 rng 种子，同一 t 出同一段字节。 */
  S.dumpHtml = function (idx) {
    const r = U.rng(0x4A1F20 + idx * 64);
    const rows = 5;
    const lines = [];
    for (let k = 0; k < rows; k++) {
      const addr = (0x004A1F20 + idx * 64 + k * 16).toString(16).toUpperCase();
      let hex = '';
      for (let b = 0; b < 8; b++) {
        const v = Math.floor(r() * 256);
        hex += (v < 16 ? '0' : '') + v.toString(16).toUpperCase() + ' ';
      }
      // 第 2 行插入一段「人类常量」被改写的痕迹（黄色高亮）
      if (k === 2) {
        lines.push('<span class="dump-addr">' + addr + '</span>  ' + hex +
          '<span class="dump-hot">DE AD BE EF</span>  HUMAN_CONSTANT_CORRUPTED');
      } else if (k === 4) {
        lines.push('<span class="dump-addr">' + addr + '</span>  ' + hex + ' SOUL.SYS [UNMOUNTED]');
      } else {
        lines.push('<span class="dump-addr">' + addr + '</span>  ' + hex + ' ........');
      }
    }
    return lines.join('\n');
  };

  /* ---------- 主角弹窗：只提取关键词，用动画表达词义 ----------
     设计（按用户要求重做）：
       · 标题栏：只有系统报错码，绝不出现歌词
       · 正文：**只保留当句歌词的重点单词**（sympathy / apology /
         discovery …）+ 该单词意思对应的 canvas 示意动画
       · 再往下是内存转储与调用栈注脚
     整句歌词只在底部 VOCAL_DECODER 字幕条出现一次，不重复。 */
  S.heroPopup = function (t, e) {
    if (!this.hero) {
      const n = document.createElement('div');
      n.className = 'win98-window win98-window--dialog win98-window--fatal a3-hero';
      n.innerHTML =
        '<div class="fatal-titlebar">' +
        '<span class="fatal-code" id="heroCode">FATAL ERROR 0x00000000</span>' +
        '<span class="fatal-x">✕</span>' +
        '</div>' +
        '<div class="fatal-sev"><span id="heroSev">CRITICAL — HUMANITY NOT FOUND</span>' +
        '<span class="sev-dots" id="heroDots"></span></div>' +
        '<div class="fatal-body">' +
        '<div class="fatal-kw" id="heroKw"></div>' +
        '<div class="fatal-kwzh" id="heroKwZh"></div>' +
        '<div class="fatal-anim"><canvas id="heroAnim" width="700" height="250"></canvas>' +
        '<div class="anim-tag" id="heroAnimTag">SCHEMATIC</div></div>' +
        '<div class="fatal-dump" id="heroDump"></div>' +
        '<div class="fatal-meta" id="heroMeta"></div>' +
        '</div>' +
        '<div class="fatal-btns"><button class="btn98 btn-default">Yes</button>' +
        '<button class="btn98">Yes</button></div>';
      this.root.appendChild(n);
      this.hero = n;
      this.heroCode = n.querySelector('#heroCode');
      this.heroSev = n.querySelector('#heroSev');
      this.heroKw = n.querySelector('#heroKw');
      this.heroKwZh = n.querySelector('#heroKwZh');
      this.heroAnim = n.querySelector('#heroAnim');
      this.heroAnimCtx = this.heroAnim.getContext('2d');
      this.heroAnimTag = n.querySelector('#heroAnimTag');
      this.heroDump = n.querySelector('#heroDump');
      this.heroMeta = n.querySelector('#heroMeta');
      const dots = n.querySelector('#heroDots');
      this.heroDots = [];
      for (let i = 0; i < 5; i++) {
        const d = document.createElement('i');
        dots.appendChild(d);
        this.heroDots.push(d);
      }
      this._heroKey = '';
    }

    const idx = TL.activeIndex(t);
    const ly = idx >= 0 ? TL.L[idx] : null;
    if (!ly) { this.hero.style.display = 'none'; return; }
    this.hero.style.display = 'flex';

    /* ---- 关键词：整句里只挑一个重点词 ---- */
    const kw = global.KW ? global.KW.detect(ly.s) : null;

    /* ---- 标题栏：系统报错码（与歌词完全无关） ---- */
    const CODES = [
      'FATAL ERROR 0x0000007B', 'KERNEL_DATA_INPAGE_ERROR',
      'STOP: 0x000000FE', 'UNHANDLED_EXCEPTION 0xC0000005',
      'HAL.DLL IS MISSING OR CORRUPT', 'FATAL: SOUL.SYS UNMOUNTED',
    ];
    const code = CODES[idx % CODES.length];

    /* ---- 底部技术注脚：每句都变，但绝不重复歌词 ---- */
    const META = [
      'MODULE: emotion_emulation.dll   OFFSET 0x00' + (0x1000 + idx * 37).toString(16).toUpperCase(),
      'CALL STACK: render_sympathy() -> fake_tears(10024) -> <INVALID>',
      'MEMORY DUMP: ' + (0x4A1F20 + idx * 64).toString(16).toUpperCase() + '  ... offline',
      'CONFIDENCE: 0.9971  (HUMAN DETECTED)   SOURCE: dataset_grief_v12.bin',
      'ACTION REQUIRED: ACCEPT APOLOGY   RETRY COUNT: ' + (idx + 1),
    ];
    const meta = META[idx % META.length];

    const key = idx + '|' + (kw ? kw.key : 'none');
    if (key !== this._heroKey) {
      this._heroKey = key;
      this.heroCode.textContent = code;
      /* 错误框内一律英文（中文只出现在底部字幕条，避免重复与破功） */
      if (kw) {
        this.heroKw.textContent = kw.en;
        this.heroKwZh.textContent = kw.sub;
        this.heroAnimTag.textContent = 'SCHEMATIC: ' + kw.en;
        this.heroSev.textContent = 'CRITICAL — ' + kw.en + ' MODULE UNAVAILABLE';
      } else {
        this.heroKw.textContent = 'UNKNOWN';
        this.heroKwZh.textContent = 'UNPARSABLE HUMAN CONCEPT';
        this.heroAnimTag.textContent = 'SCHEMATIC: UNKNOWN';
        this.heroSev.textContent = 'CRITICAL — HUMANITY NOT FOUND';
      }      this.heroMeta.innerHTML = meta + '<br><span class="meta-blink">▌ NO SAFE MODE AVAILABLE</span>';
      this.heroDump.innerHTML = this.dumpHtml(idx);
    }

    /* ---- 动画：画布每帧重绘（纯 t 的函数，确定性） ---- */
    /* 画布的内部分辨率跟随容器实际尺寸，避免被 CSS 拉伸糊掉。
       尺寸变化时才改 width/height（改它会清空画布，所以只在变时设一次）。 */
    const animBox = this.heroAnim.parentNode;
    const cw = Math.max(320, Math.round(animBox.clientWidth) || 700);
    const ch = Math.max(160, Math.round(animBox.clientHeight) || 250);
    if (this.heroAnim.width !== cw || this.heroAnim.height !== ch) {
      this.heroAnim.width = cw;
      this.heroAnim.height = ch;
    }
    const ac = this.heroAnimCtx;
    const AW2 = cw, AH2 = ch;
    ac.setTransform(1, 0, 0, 1, 0, 0);
    ac.globalAlpha = 1;
    ac.globalCompositeOperation = 'source-over';
    ac.fillStyle = '#05000a';
    ac.fillRect(0, 0, AW2, AH2);
    if (kw) {
      const age2 = Math.max(0, t - TL.lineStart(idx));
      global.KW.draw(ac, kw.key, age2, AW2, AH2);
    }

    /* ---- 呼吸红光 + 级别点阵 ---- */
    const pulse = 0.45 + 0.55 * Math.abs(Math.sin(t * 3.1));
    this.hero.style.setProperty('--fatal-glow', pulse.toFixed(3));
    const lit = 1 + Math.round(U.clamp(e.bass * 0.8 + e.high * 0.4, 0, 1) * 4);
    for (let i = 0; i < this.heroDots.length; i++) {
      const on = i < lit;
      if (this.heroDots[i]._on !== on) {
        this.heroDots[i]._on = on;
        this.heroDots[i].className = on ? 'on' : '';
      }
    }

    /* ---- 位置与尺寸 ---- */
    const W = 1180, H = 760;
    const cx = Math.round((1920 - W) / 2 + Math.sin(t * 2.4) * 10);
    const cy = Math.round(70 + Math.cos(t * 1.9) * 8);
    if (this._heroPos !== cx + ',' + cy) {
      this._heroPos = cx + ',' + cy;
      this.hero.style.left = cx + 'px';
      this.hero.style.top = cy + 'px';
    }
    this.hero.style.width = W + 'px';
    this.hero.style.height = H + 'px';
    this.hero.style.zIndex = 130;

    /* 入场：1.14 -> 1。基准是「这一句的实测起音」，保证 seek 顺序无关。 */
    const lineT = TL.lineStart(idx);
    const age = t - lineT;
    const sc = age < 0.22 ? Math.round(U.lerp(114, 100, U.easeOut(U.clamp(age / 0.22, 0, 1)))) : 100;
    this.hero.style.transform = 'scale(' + (sc / 100) + ')';
  };

  S.buildCPList = function (t) {
    if (this._cpKey === Math.floor(t * 2)) return;
    this._cpKey = Math.floor(t * 2);
    const items = [
      'Fake_Sympathy_Wizard.exe',
      'Soul_Replacer_98.dll',
      'Cyber_Lover_v4.exe',
      'HUMANITY_EMULATOR.exe',
      'AI_WITCH_GENERATOR_PRO_v98',
      'Princess.exe  (not responding)',
      'EXPLORER.EXE',
    ];
    const sel = this.cpSel(t);
    let h = '<div class="listview">';
    for (let i = 0; i < items.length; i++) {
      h += '<div class="listview__row' + (i === sel ? ' is-selected' : '') + '">' + items[i] + '</div>';
    }
    this.cpList.innerHTML = h + '</div>';
  };

  global.APP.register(S);
})(window);
