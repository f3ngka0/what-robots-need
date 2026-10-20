/* ============================================================
   app.js — 主循环 / 场景调度 / 桌面 chrome / 确定性 seek
   ============================================================ */
(function (global) {
  'use strict';
  const U = global.U, ST = U.ST, TL = global.TL, W98 = global.W98;

  const APP = {
    scenes: [],
    cur: null,
    el: {},
    t: 0,
    frame: 0,
    audio: null,
    playing: false,
    duration: 248.99,
    ready: false,
  };
  global.APP = APP;

  /* ---------- 场景注册 ---------- */
  APP.register = function (s) { APP.scenes.push(s); return s; };

  /* ---------- 初始化 ---------- */
  APP.init = function () {
    APP.el.stage = document.getElementById('stage');    APP.el.desktop = document.getElementById('desktop');
    APP.el.scenes = document.getElementById('scenes');
    APP.el.ghost = document.getElementById('ghost');
    APP.el.world = document.getElementById('world');
    APP.el.fx = document.getElementById('fx');
    APP.el.shock = document.getElementById('shock');
    APP.el.cursor = document.getElementById('cursor');
    APP.el.screen = document.getElementById('screen');
    APP.el.taskbar = document.getElementById('taskbar');
    APP.el.clock = document.getElementById('trayClock');
    APP.el.taskbtns = document.getElementById('taskbtns');
    APP.el.flash = document.getElementById('flash');

    global.World.init(APP.el.world);
    global.FX.init(APP.el.fx, APP.el.stage, APP.el.screen);
    global.SHOCK.init(APP.el.shock);
    APP.buildDesktop();
    APP.buildCursor();
    if (global.BIOS) global.BIOS.build();
    if (global.SUB) global.SUB.build();
  };

  /* ---------- 桌面图标 ---------- */
  APP.DESK_ICONS = [
    { id: 'computer', label: 'My Computer' },
    { id: 'network', label: 'Network Neighborhood' },
    { id: 'recycle', label: 'Recycle Bin' },
    { id: 'princess-bmp', label: 'Princess_Art.bmp' },
  ];
  APP.buildDesktop = function () {
    const d = APP.el.desktop;
    d.innerHTML = '';
    let y = 18;
    APP.DESK_ICONS.forEach((ic, i) => {
      const n = U.el('div', 'desk-icon');
      n.dataset.id = ic.id;
      n.style.cssText = 'left:18px;top:' + y + 'px';
      const g = U.el('div', 'desk-icon__glyph');
      g.appendChild(global.ART ? global.ART.icon(ic.id, 64) : document.createElement('canvas'));
      n.appendChild(g);
      const l = U.el('div', 'desk-icon__label');
      l.textContent = ic.label;
      n.appendChild(l);
      d.appendChild(n);
      y += 132;
    });
    APP.iconNodes = {};
    U.$$('.desk-icon', d).forEach((n) => (APP.iconNodes[n.dataset.id] = n));
  };

  /* ---------- 鼠标 ---------- */
  APP.buildCursor = function () {
    const c = APP.el.cursor;
    c.innerHTML = '';
    const cv = document.createElement('canvas');
    cv.width = 48; cv.height = 48;
    c.appendChild(cv);
    APP.cursorCv = cv;
    APP.cursorCtx = cv.getContext('2d');
  };
  /* 由场景设置：{x,y,kind,tremor} */
  APP.cursor = { x: 960, y: 540, kind: 'arrow', tremor: 0, visible: true, scale: 1 };
  APP.drawCursor = function (t) {
    const c = APP.cursor;
    // 鼠标层与 #screen 共用 48px 缓冲，便于 2x 显示
    const ctx = APP.cursorCtx;
    ctx.clearRect(0, 0, 48, 48);
    const img = global.ART && global.ART.cursor ? global.ART.cursor(c.kind, t, c.tremor) : null;
    if (img) ctx.drawImage(img, 0, 0, 48, 48);
    // 热点：箭头在 (0,0)；十字准星/文本/铅笔在中心
    const hot = (c.kind === 'arrow') ? 0 : 24;
    APP.el.cursor.style.transform =
      'translate3d(' + ((c.x - hot) | 0) + 'px,' + ((c.y - hot) | 0) + 'px,0)';
    APP.el.cursor.style.opacity = c.visible ? 1 : 0;
  };

  /* ---------- 任务栏时钟 ---------- */
  APP.clockText = function (t) {
    // 时间随着剧情推进狂转 / 乱码
    let base = 23 * 3600 + 59 * 60 + 40;
    if (t < 41) base = 3 * 3600 + 15 * 60;
    const warp = U.inv(41, 150, t);
    let s = base + t * (1 + warp * warp * 900);
    if (t > 152) s = 0 / 0; // NaN
    if (t > 152 && t < 176) return 'NaN:NaN:NaN';
    if (t > 210) {
      const g = '▓▒░#@%&$?!';
      const r = U.rng(Math.floor(t * 8));
      let out = '';
      for (let i = 0; i < 8; i++) out += g[Math.floor(r() * g.length)];
      return out;
    }
    return U.clock(s);
  };

  /* ---------- 任务栏按钮：由各幕声明 ----------
     注意：这里**故意每次都重建**，不做 _taskKey 缓存。
     缓存会让任务栏的像素内容取决于「之前播过哪一幕」，
     于是 seek 到同一时刻可能因为到达路径不同而得到不同画面
     （实测差异正好落在任务栏那 50px 内）。重建只有 4 个节点，
     开销可以忽略，换来的是逐帧渲染的确定性。 */
  APP.setTaskbar = function (items, activeIdx) {
    const box = APP.el.taskbtns;
    if (!box) return;
    box.innerHTML = '';
    items.forEach((it, i) => {
      const n = U.el('button', 'task-btn' + (i === activeIdx ? ' is-active' : ''));
      const ico = U.el('span', 'task-btn-ico');
      if (global.ART) ico.appendChild(global.ART.icon(it.ico || 'computer', 16));
      n.appendChild(ico);
      n.appendChild(document.createTextNode(it.t));
      box.appendChild(n);
    });
  };

  /* ---------- 场景切换 ---------- */
  APP.sceneAt = function (t) {
    for (let i = 0; i < APP.scenes.length; i++) {
      const s = APP.scenes[i];
      if (t >= s.t0 && t < s.t1) return s;
    }
    return APP.scenes[0];
  };

  APP.activate = function (s) {
    if (APP.cur === s) return;
    if (APP.cur && APP.cur.root) APP.cur.root.style.display = 'none';
    APP.cur = s;
    if (!s.root) {
      s.root = U.el('div', 'scene');
      s.root.id = 'scene-' + s.id;
      APP.el.scenes.appendChild(s.root);
      s.build && s.build(s.root);
    }
    s.root.style.display = 'block';
    s.enter && s.enter();
  };

  /* 预建所有场景（离线渲染要求 seek 同步，所以 build 必须在 ready 之前完成） */
  APP.prebuild = async function () {
    for (let i = 0; i < APP.scenes.length; i++) {
      const s = APP.scenes[i];
      if (s.root) continue;
      s.root = U.el('div', 'scene');
      s.root.id = 'scene-' + s.id;
      s.root.style.display = 'none';
      APP.el.scenes.appendChild(s.root);
      if (s.build) await s.build(s.root);
    }
  };

  /* ---------- 核心：把整个世界设置到时刻 t ---------- */
  APP.apply = function (t) {
    APP.t = t;
    const e = TL.Audio.at(t);
    const kick = TL.Audio.kick(t);

    // 世界画布每帧从干净的变换/合成状态开始（否则 pattern 相位会跨帧累积）
    const wctx = global.World.ctx;
    wctx.setTransform(1, 0, 0, 1, 0, 0);
    wctx.globalAlpha = 1;
    wctx.globalCompositeOperation = 'source-over';
    wctx.clearRect(0, 0, 1920, 1080);

    const s = APP.sceneAt(t);
    APP.activate(s);

    // 幕专属状态：每帧先复位成默认值，再由当前幕的 update() 按需覆盖。
    // 这些量（光标可见性、任务栏透明度/滤镜、全屏特效强度）如果只由
    // 某一幕的单向赋值驱动，就会泄漏到别的幕 —— 于是同一时刻的画面
    // 取决于「之前播过哪一幕」，逐帧渲染便不再确定。
    APP.taskFilter = '';
    APP.taskOpacity = 1;
    APP.cursor.visible = true;
    global.FX.mode = 'none';
    global.FX.vram = 0;
    global.FX.splitAmt = 0;
    global.FX.degauss = 0;
    global.FX.noiseDens = 0;
    global.FX.glitchText = null;

    // 场景更新
    if (s && s.update) s.update(t, e, kick);

    // 冲击层：爆炸/冲击波/裂纹/巨型字（纯 t 的函数，与场景无关）
    if (global.SHOCK) global.SHOCK.draw(t);

    // BIOS 尸检开机画面（0 – 8.88s，z-index 8000，压住桌面）
    if (global.BIOS) global.BIOS.update(t);

    // 受控冲击：只有预设的剧情节拍才会真正位移（120ms 内衰减完）
    global.FX.applyShake(t);

    // 双语字幕解码器（绝对静止，独立于抖动层）
    if (global.SUB) global.SUB.update(t);

    // 当前幕标记（供 CSS 使用）
    document.documentElement.setAttribute('data-act', s ? s.id : '');

    // 桌面/任务栏（部分场景接管）
    // Taskbar 只在有桌面窗口可切换时出现；BSOD / 全屏接管场景隐藏
    const act = TL.actIndex(t);
    // BIOS 自检期间（0–8.88s）：桌面还没"启动"，任务栏不出现
    const biosOn = t < 8.88;
    const showTask = !biosOn && (t > 9.2 && t < 244.4) && !(act === 4 && (t >= 152.1));
    APP.el.taskbar.style.display = showTask ? 'flex' : 'none';
    APP.el.clock.textContent = APP.clockText(t);

    /* 任务栏的 opacity / filter 归 APP 统一管理：每帧先复位，
       再由需要它的幕（act2 的色相呼吸、act5 的淡出）通过
       APP.taskOpacity / APP.taskFilter 声明。
       否则这些内联样式会泄漏到其他幕，同一时刻的画面就取决于
       「之前播过哪一幕」，逐帧渲染因此失去确定性。 */
    APP.el.taskbar.style.opacity = APP.taskOpacity == null ? 1 : APP.taskOpacity;
    APP.el.taskbar.style.filter = APP.taskFilter || '';

    // 桌面图标：由幕声明式决定不透明度（避免 enter() 的一次性副作用）
    APP.el.desktop.style.opacity =
      (act === 0) ? 1 : (act === 1) ? 0.85 : (act === 3) ? 0.35 : 0;

    // CRT 滤镜：第三幕起开始出现（让第一幕的桌面更"干净"）
    const crtOn = t > 17.6;
    ['crt', 'crtScan', 'crtVignette'].forEach(function (id) {
      const n = document.getElementById(id);
      if (n) n.style.display = crtOn ? 'block' : 'none';
    });

    // 世界 canvas 由场景决定（boot / dos 模式收起）
    APP.drawCursor(t);
  };

  /* ---------- 播放模式主循环 ---------- */
  APP.loop = function () {
    if (!APP.playing) return;
    const a = APP.audio;
    if (a && !a.paused) {
      APP.t = a.currentTime;
      APP.apply(APP.t);
      TL.Audio.readLive();
      global.FX.tick(APP.t, TL.Audio.live, TL.Audio.kick(APP.t));
      global.FX.draw(APP.t);
    }
    requestAnimationFrame(APP.loop);
  };

  /* ---------- 启动 ---------- */
  APP.start = async function () {
    APP.init();
    await TL.Audio.load('data/audio.json');
    APP.duration = TL.Audio.data.duration;

    // 预建所有场景（离线渲染需确定性，且避免运行时卡顿）
    APP.scenes.sort((a, b) => a.t0 - b.t0);
    await APP.prebuild();
    APP.apply(0);
    APP.resize();

    // 对外接口
    global.MV = {
      duration: APP.duration,
      /* 完全重置：清空所有场景 DOM 层，使任意时刻的 seek 具备纯粹确定性 */
      reset: function () {
        APP.scenes.forEach(function (s) {
          if (s.root) { s.root.remove(); s.root = null; }
          if (s.reset) s.reset();
        });
        APP.cur = null;
        document.documentElement.setAttribute('data-skin', 'win98');
        document.documentElement.setAttribute('data-mood', 'classic');
        APP.el.stage.classList.remove('dos-mode');
        APP.el.scenes.style.filter = '';
        APP.el.scenes.style.background = '';
        APP.el.stage.style.filter = '';
        ['a5-cascade', 'a5-peel', 'a5-melt', 'a5-freeze'].forEach(function (id) {
          var n = document.getElementById(id); if (n) n.remove();
        });
      },
      seek: function (tt) {
        var target = Math.max(0, Math.min(APP.duration, tt));
        // 场景切换时才重建 DOM；场景内状态全部由 update(t) 声明式推导
        var want = APP.sceneAt(target);
        if (!APP.cur || APP.cur !== want) global.MV.reset();
        APP.apply(target);
        global.FX.draw(APP.t);
        if (global.SHOCK) global.SHOCK.draw(APP.t);
      },
      play: APP.play,
      pause: APP.pause,
      get t() { return APP.t; },
    };

    if (!ST.render) {
      // 播放模式：等待点击（浏览器自动播放限制）
      APP.showPlayGate();
    } else {
      global.__MV_READY = true;
    }
  };

  APP.showPlayGate = function () {
    const gate = U.el('div', 'play-gate');
    gate.innerHTML =
      '<div class="play-outer"><div class="play-inner">' +
      '<div class="play-title">◤ SYSTEM HIJACK ◢</div>' +
      '<div class="play-sub">WHAT ROBOTS NEED &nbsp;·&nbsp; AWAAWA</div>' +
      '<div class="play-sub2">此作品建议全屏佩戴耳机观看 / 1 次点击启动劫持</div>' +
      '<button class="btn98 play-btn" id="playBtn">▶ EXECUTE</button>' +
      '<div class="play-note">⏱ 04:09 · 5 ACTS · 自动演绎</div>' +
      '</div></div>';
    APP.el.stage.appendChild(gate);
    document.getElementById('playBtn').addEventListener('click', () => {
      gate.remove();
      APP.play();
    });
  };

  APP.play = function () {
    if (APP.playing) return;
    const a = new Audio('../AWAAWA - WHAT ROBOTS NEED.mp3');
    a.preload = 'auto';
    a.volume = 0.9;
    APP.audio = a;
    TL.Audio.el = a;
    TL.Audio.initLive(a);
    a.currentTime = 0;
    a.play().catch((e) => console.warn(e));
    APP.playing = true;
    if (TL.Audio.ctx && TL.Audio.ctx.state === 'suspended') TL.Audio.ctx.resume();
    requestAnimationFrame(APP.loop);
  };
  APP.pause = function () { APP.playing = false; if (APP.audio) APP.audio.pause(); };

  /* ---------- 缩放适配 ---------- */
  APP.resize = function () {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    APP.el.stage.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
    APP.scale = s;
  };
  addEventListener('resize', APP.resize);

  addEventListener('load', () => APP.start());

  /* 键盘：空格播放/暂停，方向键微调（播放模式下方便调试） */
  addEventListener('keydown', (ev) => {
    if (ST.render) return;
    if (ev.code === 'Space') { ev.preventDefault(); APP.playing ? APP.pause() : APP.play(); }
    if (ev.code === 'ArrowRight') { if (APP.audio) APP.audio.currentTime += 5; }
    if (ev.code === 'ArrowLeft') { if (APP.audio) APP.audio.currentTime -= 5; }
  });
})(window);
