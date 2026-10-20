/* ============================================================
   act2.js — 第二幕【算力女巫外挂与"真香"印钞机】17.6s – 41.2s
   WITCH_SCRAPER 强注 · 标题篡改 · 64 宫格残影 · 炸弹抉择 · 叛变连击
   ============================================================ */
(function (global) {
  'use strict';
  const U = global.U, TL = global.TL, W98 = global.W98;

  const S = { id: 'act2', t0: 17.6, t1: 41.2 };

  const HEX_LINES = [
    'WITCH_SCRAPER.EXE  v9.8.1  (c) 1999 SATANIC SOFTWORKS',
    '> Initializing neural parasite ... OK',
    '> Scraping Human_Soul.bmp ................. 100%',
    '> Extracting Style Weights [w_001..w_9f3a] .. OK',
    '0x004A1F20  8B 45 FC 89 45 F8 8B 4D F8 8B 55 FC  ...  E\x03\x01\x00',
    '0x004A1F30  3B C8 7E 12 6A 00 E8 B4 FF FF FF 83 C4  ...  ...',
    '0x004A1F40  FF 15 8C 20 4A 00 8B E5 5D C3 90 90 90  ...  ..].....',
    '> Injecting into Princess.exe : HANDLE_ARTIST = 0xDEAD',
    '> Soul geometry tokenized ................. 2,481,003 tokens',
    '> COPY COMPLETE. Original artist deprecated.',
    '> Dropping table IMPORTANT_FEELINGS ... done',
    '> Patching conscience.dll -> conscience.dll.bak',
    '0x7FFE0320  FF FF 00 00 00 00 00 00  DE AD BE EF  ...  ........',
    '> REWRITING TITLEBAR -> AI_WITCH_GENERATOR_PRO_v98',
    '> Unregistered build. Nag screen scheduled.',
    '> Chunk 0x993A \"how she felt at 3am\" -> vector[512]',
    '> LOCATING market. FOUND. LOCATING soul. NOT FOUND.',
    '> ...',
    '> fork() fork() fork() fork() fork() fork() WARNING:',
    '> process table exhausted (ERR_EMFILE)',
  ];

  S.build = function (root) {
    root.innerHTML = '';
    this.root = root;

    // ---- 保留 paint 窗口（被篡改） ----
    const paint = W98.make({
      x: 40, y: 26, w: 1240, h: 700, title: 'Princess - Paint',
      cls: 'win98-window--paint', titleCls: 'titlebar--classic',
      icon: 'paint',
      menubar: W98.menubar(['File', 'Edit', 'View', 'Image', 'Options', 'Help']),
      status: W98.statusbar(['Ready', ' ', '0,0']),
    });
    paint.style.zIndex = 20;
    root.appendChild(paint);
    this.paintWin = paint;
    this.paintTitle = paint.querySelector('.tb-title');
    this.paintBody = paint.querySelector('.win-body');
    this.paintBody.innerHTML = '<div class="paint-canvas-wrap"><div class="paint-canvas"><canvas id="p2art" width="1080" height="520"></canvas></div></div>';
    this.artCv = root.querySelector('#p2art');
    this.artCtx = this.artCv.getContext('2d');
    this.artCtx.imageSmoothingEnabled = false;

    // ---- 64 宫格残影层（canvas 高性能） ----
    this.gridCv = U.el('canvas', 'a2-grid');
    this.gridCv.width = 1920; this.gridCv.height = 1080;
    root.appendChild(this.gridCv);
    this.gridCtx = this.gridCv.getContext('2d');

    // ---- DOS 窗口 ----
    const dos = W98.make({
      x: 980, y: 150, w: 880, h: 560, title: 'C:\\WINDOWS\\SYSTEM32\\WITCH_SCRAPER.EXE',
      cls: 'win98-window--dos', titleCls: 'titlebar--black', noResize: true,
      bodyHtml: '<pre class="dos-text" id="dosText"></pre>',
      extra: 'display:none',
    });
    dos.style.zIndex = 70;
    root.appendChild(dos);
    this.dosWin = dos;
    this.dosText = dos.querySelector('#dosText');

    // ---- 抉择框 ----
    const dlg = W98.make({
      x: 420, y: 250, w: 1080, h: 430, title: 'System Security Alert',
      cls: 'win98-window--dialog', titleCls: 'titlebar--alert', noResize: true,
      bodyHtml:
        '<div class="dlg-body">' +
        '<div class="dlg-row"><canvas class="dlg-icon" id="dlgIcon" width="32" height="32"></canvas>' +
        '<div class="dlg-text" id="dlgText">检测到算力女巫正在吞噬人类艺术，是否立即投下逻辑炸弹销毁？</div></div>' +
        '<div class="dlg-song" id="dlgSong">“Dropping bombs with our best intentions”</div>' +
        '<div class="dlg-btns" id="dlgBtns">' +
        '<button class="btn98 btn-default" id="btnBomb">💣 Drop Bombs (销毁集群)</button>' +
        '<button class="btn98" id="btnCancel">Cancel</button>' +
        '</div></div>',
      extra: 'display:none',
    });
    dlg.style.zIndex = 90;
    root.appendChild(dlg);
    this.dlg = dlg;
    this.dlgIcon = dlg.querySelector('#dlgIcon');
    this.dlgSong = dlg.querySelector('#dlgSong');

    // 破框长出的第三按钮
    const btn3 = U.el('button', 'btn98 btn98--money');
    btn3.id = 'btnMoney';
    btn3.innerHTML = '💸 BECOME THEM &amp; MAKE CRAZY MONEY<br><span class="money-sub">一键开启赛博印钞</span>';
    btn3.style.display = 'none';
    dlg.appendChild(btn3);
    this.btnMoney = btn3;

    // ---- 暴富弹窗（canvas 层批量绘制） ----
    this.moneyCv = U.el('canvas', 'a2-money');
    this.moneyCv.width = 1920; this.moneyCv.height = 1080;
    root.appendChild(this.moneyCv);
    this.moneyCtx = this.moneyCv.getContext('2d');
    this.moneyCtx.imageSmoothingEnabled = false;

    // 金币旋转种子
    this.coins = [];
    const r = U.rng(9182);
    for (let i = 0; i < 26; i++) {
      this.coins.push({ x: r() * 1920, y: r() * 1080, r: 22 + r() * 46, sp: 0.6 + r() * 2.2, ph: r() * 6.28 });
    }
    // 生成的贴图墙
    this.shards = [];
    for (let i = 0; i < 64; i++) {
      const c = document.createElement('canvas');
      c.width = 128; c.height = 96;
      const cx = c.getContext('2d');
      cx.imageSmoothingEnabled = false;
      global.ART.paintCanvasBg(cx, 128, 96, 0, {});
      // 妖艳渐变底
      const g = cx.createLinearGradient(0, 0, 128, 96);
      const hues = ['#ff00aa', '#00ffff', '#ffee00', '#7b00ff'];
      g.addColorStop(0, hues[i % 4]); g.addColorStop(1, hues[(i + 2) % 4]);
      cx.fillStyle = g; cx.fillRect(0, 0, 128, 96);
      global.ART.princess(cx, 64, 52, 0.30, 1, {
        sixFingers: i % 3 === 0, paletteShift: (i % 5) * 30, mouth: 1, wobble: 1,
      });
      // 过度曝光
      cx.fillStyle = 'rgba(255,255,255,0.16)'; cx.fillRect(0, 0, 128, 96);
      this.shards.push(c);
    }

    /* ---------- 爆炸冲击表：SHOCK 列表是唯一真源 ----------
       实测爆破声在 31.59（LRC 标的 31.83 是「词」不是「声」）。
       主爆炸生命周期 3s，余爆按 BEATS.boom.after 逐拍登记（不带 label，避免文字刷屏）。
       下面的 update(t) 不再写「某一帧登记一次 FX.impact」的跨帧状态，
       所有爆炸视觉/故障强度/抖动都从这张表推导，任意 seek 结果一致。 */
    const BOOM = (global.BEATS && global.BEATS.boom) ||
      { windup: 30.95, hit: 31.59, after: [31.95, 32.2, 32.37, 32.7, 32.91, 33.18, 33.4, 33.58] };
    this.boomHit = BOOM.hit;
    this.boomWindup = BOOM.windup;
    this.boomList = [
      { t: BOOM.hit, dur: 3.0, power: 1.0, kind: 'boom', label: 'BOOM', sub: '炸弹落地 · 算力集群蒸发' },
    ];
    // 余爆强度（确定性形状，0.36–0.60），dur 0.8s：一串闷响而不是一闪而过
    const AFTER_POW = [0.60, 0.52, 0.58, 0.46, 0.55, 0.42, 0.50, 0.36];
    (BOOM.after || []).forEach((tt, i) => {
      this.boomList.push({ t: tt, dur: 0.8, power: AFTER_POW[i % AFTER_POW.length], kind: 'boom' });
    });
    // 37.05「想成为他们」的叛变点击：单独一个重拍（特效走 SHOCK，文字不刷屏）
    this.moneyHit = 37.05;
    if (global.SHOCK) global.SHOCK.define('act2', this.boomList);
    // 抖动也走声明式表：31.59 主爆 + 37.05 叛变，两处各 150ms 衰减
    if (global.FX && global.FX.define) {
      global.FX.define('act2', [
        { t: this.boomHit, power: 1.0 },
        { t: this.moneyHit, power: 1.0 },
      ]);
    }
  };

  /* 重大冲击节点：只有这两个允许产生位移抖动。
     语义与 FX.impact 一致（命中后 150ms 内二次衰减、≤6px），
     但完全由 t 推导 —— 不保留「已经触发过」的跨帧标记，seek 到任意帧都同一结果。 */
  S.majorImpactAt = function (t) {
    const hits = [{ t: this.boomHit, power: 1.0 }, { t: this.moneyHit, power: 1.0 }];
    let best = null;
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i];
      const age = t - h.t;
      if (age >= 0 && age <= 0.16 && (!best || h.t > best.t)) best = h;
    }
    return best;
  };

  S.enter = function () {
    document.getElementById('desktop').style.opacity = 0.85;
    global.APP.setTaskbar([
      { t: 'AI_WITCH_GENERATOR_PRO_v98 (UNREGISTERED)', ico: 'paint' },
      { t: 'C:\\WINDOWS\\SYSTEM32\\WITCH_SCRAPER.EXE', ico: 'dos' },
    ], 0);
    if (this.root) global.W98.spotlight(this.root, this.paintWin);
  };

  S.update = function (t, e, kick) {
    const ctx = global.World.ctx;
    const root = this.root;
    const rel = t - 17.6;

    /* ---------- 冲击强度：唯一真源是 SHOCK 表（纯 t 的函数） ----------
       blast  —— 叠加了主爆炸 3s 生命周期与余爆的瞬时强度，用于驱动宫格炸开、
                故障强度、bomb 计数、DoW 残影；31.59–34.0 之间不会掉到 0。
       boomWin —— 蓄力→爆炸→余波的窗口（windup .. hit+2.4），窗口内强制重故障。
       hitAge  —— 距主爆炸的秒数（负数=还没爆）。
       注意：maj 必须在这里先算出来，因为下面 FX.pulse01(t) 依赖 FX._shakeAt，
       否则色差/抖动会读到上一帧留下的值 —— 那样画面就不再是 t 的纯函数。 */
    const SH = global.SHOCK;
    const blast = SH ? SH.amount(t) : 0;
    const hitAge = t - this.boomHit;
    // 蓄力期（windup..hit）轻量预压，爆后 2.4s 逐步收，末端保底不归零
    const windAge = t - this.boomWindup;
    const preBoom = (windAge >= 0 && hitAge < 0) ? U.clamp(windAge / (this.boomHit - this.boomWindup), 0, 1) : 0;
    const boomWin = (hitAge >= 0 && hitAge <= 2.4) ? (1 - hitAge / 2.4) : 0;
    // 主爆炸的「持续命中」包络：3 秒生命周期本身（0..1，线性）
    const boomLife = (hitAge >= 0 && hitAge <= 3.0) ? 1 - hitAge / 3.0 : 0;
    const boomCore = Math.max(blast, boomLife * 0.85);
    // 抖动包络：直接查 FX 的声明式冲击表（S.build 里 FX.define('act2')），
    // 不再手工写 _shakeAt —— 那是跨帧状态，会破坏 seek 确定性。
    const shakeP = global.FX.pulse01 ? global.FX.pulse01(t) : 0;

    /* ---------- 世界层：桌面裂开露出蒸汽波 ---------- */
    const crack = U.inv(17.6, 22.0, t);
    global.World.teal(ctx, 1920, 1080, t);
    if (crack > 0) {
      ctx.save();
      ctx.globalAlpha = crack;
      global.World.sky(ctx, 1920, 1080, t, e.bass);
      global.World.dither(ctx, 1920, 1080, 0.28 + e.high * 0.4, 21);
      ctx.restore();
      // 裂纹线
      ctx.strokeStyle = 'rgba(0,255,255,' + (0.5 * (1 - crack)) + ')';
      ctx.lineWidth = 2;
      const r = U.rng(55);
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        let x = r() * 1920, y = r() * 1080;
        ctx.moveTo(x, y);
        for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 260; y += (r() - 0.5) * 180; ctx.lineTo(x, y); }
        ctx.stroke();
      }
    }

    /* ---------- mspaint 画布：温柔 -> 被篡改 ---------- */
    const art = this.artCtx;
    art.fillStyle = '#fff'; art.fillRect(0, 0, 1080, 520);
    if (global.ART) {
      global.ART.paintCanvasBg(art, 1080, 520, t, {});
      const corrupt = U.inv(21.3, 25.5, t);
      global.ART.princess(art, 540, 250, 1.32, 1, {
        blink: false, mouth: 0.5, wobble: 0.4 + corrupt * 2.4,
        paletteShift: corrupt * 220, sixFingers: corrupt > 0.55,
      });
      if (corrupt > 0) {
        art.save();
        art.globalAlpha = corrupt * 0.4;
        art.fillStyle = '#ff00aa';
        art.fillRect(0, 0, 1080, 520);
        art.restore();
      }
    }

    /* ---------- 标题篡改 ---------- */
    const hacked = U.inv(20.8, 21.6, t);
    if (hacked > 0) {
      this.paintWin.className = 'win98-window win98-window--paint is-hacked';
      this.paintTitle.textContent = (t * 14) % 2 < 1
        ? '⚡ AI_WITCH_GENERATOR_PRO_v98 (UNREGISTERED) ⚡'
        : '⚡ AI_WITCH_GENERATOR_PRO_v98 (UNREGISTERED) ⚡';
      this.paintWin.querySelector('.titlebar').className = 'titlebar titlebar--vapor';
      this.paintTitle.style.letterSpacing = hacked > 0.5 ? (Math.sin(t * 9) * 1.2).toFixed(2) + 'px' : '0';
    } else {
      this.paintTitle.textContent = 'Princess - Paint';
      this.paintWin.querySelector('.titlebar').className = 'titlebar titlebar--classic';
    }

    /* ---------- DOS 滚屏 ---------- */
    const dosOn = U.inv(17.7, 18.2, t);
    this.dosWin.style.display = dosOn > 0 ? 'flex' : 'none';
    if (dosOn > 0) {
      // 强注抖动
      const jx = Math.sin(t * 90) * 3, jy = Math.cos(t * 77) * 2;
      this.dosWin.style.transform = 'translate(' + jx + 'px,' + jy + 'px)';
      const rate = 26 + e.high * 40;
      const n = Math.min(HEX_LINES.length, Math.floor((t - 17.7) * rate));
      let out = '';
      for (let i = 0; i < n; i++) out += HEX_LINES[i % HEX_LINES.length] + '\n';
      // 最后一行正在"打字"
      const cur = HEX_LINES[n % HEX_LINES.length] || '';
      const partial = cur.slice(0, Math.floor(((t - 17.7) * rate % 1) * cur.length));
      // 只渲染"最近 N 行"，用确定性的文本窗口代替 scrollTop
      // （scrollTop 是跨帧累积的 DOM 副作用，会破坏逐帧确定性）
      const allLines = (out + partial + '█').split('\n');
      const VISIBLE = 26;
      const tail = allLines.slice(Math.max(0, allLines.length - VISIBLE));
      this.dosText.textContent = tail.join('\n');
      this.dosText.scrollTop = 0;
    }

    /* ---------- 64 宫格级联（爆炸后延续到 34.0，并被逐格炸开） ----------
       旧版 cas = inv(24.4, 31.6) 在 31.6 就归零，正好卡在 31.59 爆炸前一帧，
       导致「爆炸时满屏宫格瞬间消失」。现在铺满进度与存活时长拆成两个量：
       casIn 只增不减（决定格数），存活期一路延续到 34.0 才收掉。 */
    const gc = this.gridCtx;
    gc.clearRect(0, 0, 1920, 1080);
    const casIn = U.inv(24.4, 31.6, t);                 // 铺满进度
    const gridFade = 1 - U.inv(33.2, 34.0, t);          // 34.0 平滑淡出（不留一帧突断）
    const cas = casIn * gridFade;
    if (cas > 0) {
      const count = Math.floor(64 * U.easeOut(casIn));
      const cols = 8;
      for (let i = 0; i < count; i++) {
        const r = U.srand('grid' + i, 3);
        const gx = (i % cols) * 240 + 4;
        const gy = Math.floor(i / cols) * 130 + 4;
        const w = 232, h = 122;
        /* 爆炸时每格被「炸开」：从画面中心向外推 + 自旋 + 残影拉开。
           全部画在 canvas 里，不碰任何文字层，也不产生 DOM translate。 */
        const cx0 = gx + w / 2, cy0 = gy + h / 2;
        const dirX = cx0 - 960, dirY = cy0 - 540;
        const dLen = Math.hypot(dirX, dirY) || 1;
        const spin = r() * 6.2832;
        const push = blast * 80 * (0.35 + r() * 0.95);   // 最多 +80px 以上
        const bx = (dirX / dLen) * push + Math.cos(spin) * push * 0.5;
        const by = (dirY / dLen) * push + Math.sin(spin) * push * 0.5;
        // 只有冲击才让格子自旋（blast=0 时与原始宫格完全一致，避免改坏爆炸前画面）
        const rot = blast * (r() - 0.5) * 1.1;
        // 残影：每格叠若干份错位副本；冲击瞬间偏移量随 blast 倍增
        const ghostN = 3 + Math.floor(e.high * 4);
        const gx2 = gx + bx, gy2 = gy + by;
        for (let g = ghostN; g >= 0; g--) {
          const off = g * (2 + e.bass * 6) + blast * 62 * (g / Math.max(1, ghostN));
          gc.globalAlpha = (0.12 + 0.10 * (ghostN - g)) * (g === 0 ? 1 : 0.85);
          const tint = g % 2 ? '#ff00aa' : '#00ffff';
          gc.fillStyle = tint;
          gc.fillRect(gx2 - off, gy2 - off * 0.5, w, h);
        }
        gc.globalAlpha = 1;
        // 贴图闪烁：每秒 20 帧
        const pick = Math.floor((t * 20 + i * 7) % this.shards.length);
        if (blast > 0.001) {
          // 被炸开：整格自旋后贴图（blast=0 时走下面那条不变形的原路径）
          gc.save();
          gc.translate(gx2 + w / 2, gy2 + h / 2);
          gc.rotate(rot + (i % 2 ? -1 : 1) * 0.18);
          gc.drawImage(this.shards[pick], -w / 2, -h / 2, w, h);
          gc.restore();
        } else {
          gc.drawImage(this.shards[pick], gx2, gy2, w, h);
        }
        // 水印（永远只旋转文字，不旋转贴图 —— 与爆炸前画面保持一致）
        gc.save();
        gc.translate(gx2 + w / 2, gy2 + h / 2);
        gc.rotate((i % 2 ? -1 : 1) * 0.18);
        gc.font = 'bold 11px Tahoma, sans-serif';
        gc.fillStyle = '#ffffff';
        gc.globalAlpha = 0.92;
        gc.textAlign = 'center';
        gc.fillText('GENERATED IN 0.002s · $0.0001', 0, 6);
        gc.restore();
        // 死机残影阶梯：向左上拖出（冲击时阶梯更长）
        gc.globalAlpha = 0.18;
        gc.fillStyle = '#c0c0c0';
        const step = 8 + blast * 26;
        for (let k = 1; k < 4; k++) gc.fillRect(gx2 - k * step, gy2 - k * step * 0.62, w, h);
        gc.globalAlpha = 1;
        /* 「被炸开的格子」：确定性白屏闪烁（每格独立相位，30Hz 切换）。
           概率与亮度都跟 blast 走，避免余波阶段整屏泛白。 */
        if (blast > 0.10) {
          const fr = U.srand('a2blastflash' + Math.floor(t * 30), i);
          if (fr() < blast * 0.42) {
            gc.globalAlpha = 0.28 + blast * 0.42;
            gc.fillStyle = '#ffffff';
            gc.fillRect(gx2, gy2, w, h);
            gc.globalAlpha = 1;
          }
        }
      }
      // 整体红蓝高频闪（爆炸期改为跟冲击强度走，避免爆炸后突然静默）
      const fl = Math.max(Math.max(0, e.high - 0.45) * 2, blast * 0.9);
      if (fl > 0) {
        gc.globalAlpha = fl * 0.18;
        gc.fillStyle = (Math.floor(t * 18) % 2) ? '#ff0000' : '#0000ff';
        gc.fillRect(0, 0, 1920, 1080);
        gc.globalAlpha = 1;
      }
      // 爆炸把宫格整体压向红色：给这段 2.4 秒一个稳定的底噪，不会「强度归零」
      if (blast > 0.02) {
        gc.globalAlpha = blast * 0.14;
        gc.fillStyle = '#ff2a00';
        gc.fillRect(0, 0, 1920, 1080);
        gc.globalAlpha = 1;
      }
      /* 整层淡出：33.2–34.0 用 destination-in 一次性收掉这一整层，
         避免「突然少几格」的台阶感（仍然只作用在 canvas 像素上，不碰 DOM）。 */
      if (gridFade < 0.999) {
        gc.save();
        gc.globalCompositeOperation = 'destination-in';
        gc.globalAlpha = 1;
        gc.fillStyle = 'rgba(255,255,255,' + gridFade.toFixed(4) + ')';
        gc.fillRect(0, 0, 1920, 1080);
        gc.restore();
      }
    }

    /* ---------- 抉择框 ---------- */
    const dlgOn = U.inv(31.6, 32.2, t);
    this.dlg.style.display = dlgOn > 0 ? 'flex' : 'none';
    if (dlgOn > 0) {
      if (global.ART) global.ART.icon('warning', 32).parentNode && null;
      const ic = this.dlgIcon;
      if (ic && !ic.dataset.done) {
        const src = global.ART.icon('warning', 32);
        const c2 = ic.getContext('2d');
        c2.imageSmoothingEnabled = false;
        c2.drawImage(src, 0, 0, 32, 32);
        ic.dataset.done = '1';
      }
      // 弹窗弹出抖动
      const pop = U.easeOutBack(U.inv(31.6, 32.05, t));
      this.dlg.style.transform = 'scale(' + (0.75 + 0.25 * pop) + ')';
      // 歌词
      const ly = TL.activeLyric(t);
      this.dlgSong.textContent = '“' + (ly ? ly.s : 'Dropping bombs...') + '”';

      // 按钮出现
      this.dlg.querySelector('#btnBomb').style.display = 'inline-block';
      this.dlg.querySelector('#btnCancel').style.display = 'inline-block';

      // 第三按钮：破框长出
      const moneyOn = U.inv(36.9, 37.6, t);
      if (moneyOn > 0) {
        this.btnMoney.style.display = 'block';
        const eo = U.easeOutBack(moneyOn);
        this.btnMoney.style.transform = 'translateY(' + ((1 - moneyOn) * 90) + 'px) scale(' + (0.6 + 0.4 * eo) + ')';
        this.btnMoney.style.opacity = Math.min(1, moneyOn * 2);
        // 霓虹金光
        this.btnMoney.style.boxShadow = 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, ' +
          '0 0 ' + (10 + Math.sin(t * 12) * 8) + 'px #ffd700, 0 0 40px #ff00aa';
      } else this.btnMoney.style.display = 'none';
    }

    /* ---------- 鼠标轨迹：移向 Drop Bombs，37s 后叛变 ----------
       必须无条件逐帧赋值：旧版只在抉择框可见时写 APP.cursor，
       于是「先 seek 到 32.5、再退回 31.4」会读到上一帧残留的鼠标坐标，
       update(t) 就不再是 t 的纯函数（同一 t 出两种画面）。
       现在无论弹窗在不在，坐标都由 t 唯一决定。 */
    let mx, my, tremor;
    if (t < 32.1) {
      mx = 900; my = 700; tremor = 0.6;
    } else if (t < 36.9) {
      const p = U.inv(32.1, 33.4, t);
      mx = U.lerp(900, 700, U.easeInOut(p));
      my = U.lerp(700, 560, U.easeInOut(p));
      tremor = 2.2 + e.high * 5;
    } else {
      const p = U.inv(36.9, 37.5, t);
      mx = U.lerp(700, 900, p);
      my = U.lerp(560, 610, p);
      // 连击抖动
      const click = Math.sin(t * 40);
      mx += click * 8; my += click * 4;
      tremor = 2.2 + e.high * 5;
    }
    global.APP.cursor.x = mx;
    global.APP.cursor.y = my;
    global.APP.cursor.kind = 'arrow';
    global.APP.cursor.tremor = tremor;
    global.APP.cursor.visible = true;
    global.APP.cursor.scale = 1;

    /* ---------- 暴富弹窗 ---------- */
    const mc = this.moneyCtx;
    mc.clearRect(0, 0, 1920, 1080);
    const moneyT = U.inv(37.2, 41.2, t);
    if (moneyT > 0) {
      const nWin = Math.floor(moneyT * 22);
      const r2 = U.rng(3311);
      for (let i = 0; i < nWin; i++) {
        const w = 300 + r2() * 220, h = 90 + r2() * 70;
        const x = r2() * (1920 - w), y = r2() * (1080 - h);
        const cls = ['#ff00aa', '#ffee00', '#00ffff', '#ff3300'][i % 4];
        W98.drawWinRect(mc, x, y, w, h, {
          title: i % 3 === 0 ? 'CONGRATULATIONS!' : (i % 3 === 1 ? 'YOU WON $999,999!' : 'MONEY.exe'),
          titleFrom: cls, titleTo: '#ffffff', flash: e.high, flashColor: '#ff0000',
        });
        mc.fillStyle = '#ffff00'; mc.fillRect(x + 6, y + 26, w - 12, h - 34);
        mc.fillStyle = '#000'; mc.font = 'bold 13px Tahoma,sans-serif';
        mc.fillText('YOU ARE THE 1,000,000th VISITOR!', x + 12, y + 46);
        mc.font = '11px Tahoma,sans-serif';
        mc.fillStyle = '#c00000';
        mc.fillText('CLICK HERE TO CLAIM >>>', x + 12, y + 64);
      }
      // 金币
      this.coins.forEach((c) => {
        global.ART.coin(mc, c.x, c.y + Math.sin(t * c.sp + c.ph) * 40, c.r, t * c.sp + c.ph, 1);
      });
      // K 线飙升
      global.ART.kline(mc, 60, 760, 900, 300, t, 9, {});
      global.ART.kline(mc, 1000, 640, 860, 420, t, 17, { color: '#ff00aa' });
      // 全屏霓虹闪光
      mc.globalAlpha = 0.10 + e.bass * 0.18;
      mc.fillStyle = '#ff00aa';
      mc.fillRect(0, 0, 1920, 1080);
      mc.globalAlpha = 1;
    } else if (cas > 0.3) {
      // 64 宫格时还不需要钱
    }

    /* ---------- D：《Dropping bombs with our best intentions》持续视觉 ----------
       31.59–34.0 这 2.4 秒必须「一直有事发生」，不能衰减到 0：
       1) 屏幕底部滚动 bomb 计数条（自绘在 money 画布，不碰字幕/任务栏）
       2) DoW 弹窗被炸飞的残影（向四周飞散、自旋、递减）
       3) 一行滚动的 bomb 落点标记
       全部画在 canvas 内，零 DOM 位移。
       歌词由 TL.activeLyric(t) 自动对齐实测起音（31.59 之后自动切到这句），
       这里只需要一个硬时间窗来保证强度不衰减。 */
    /* 硬保证：31.59–34.0 这 2.4 秒一定有画面（不依赖歌词切换时机），
       34.0 之后淡出，交给后面的 37.05 叛变节拍。 */
    const chantOn = U.inv(31.50, 31.72, t) * (1 - U.inv(34.0, 34.6, t));
    if (chantOn > 0) {
      const c2 = this.moneyCtx;
      const T0 = 31.59;
      const dt = t - T0;
      // --- 1) 底部滚动 bomb 计数条 ---
      // 注意：#subtitle 是 z-index 9000 的固定层，任何 scene 内 canvas 都在它下面。
      // 所以计数条画在字幕窗上沿的正上方那条通栏（y 764..800），
      // 视觉上就是「屏幕底部状态条」，且不会被字幕挡住。
      const barH = 36;
      const barY = 800;
      c2.save();
      c2.globalAlpha = chantOn;
      c2.fillStyle = 'rgba(0,0,0,0.86)';
      c2.fillRect(0, barY - barH, 1920, barH);
      c2.fillStyle = '#ff2a00';
      c2.fillRect(0, barY - barH, 1920, 3);
      c2.fillStyle = '#00ffff';
      c2.fillRect(0, barY - 2, 1920, 2);
      // 已投弹数：随 t 单调递增，确定性
      const drops = Math.floor((dt + 0.3) * 9.7);
      const scroll = (t * 220) % 1920;
      c2.font = 'bold 22px "Consolas","Courier New",monospace';
      c2.textBaseline = 'middle';
      c2.textAlign = 'left';
      const msg = '  BOMBS DROPPED: ' + String(drops).padStart(4, '0') +
        '   ·   CLUSTERS LOST: ' + String(Math.floor(drops * 3.7)).padStart(5, '0') +
        '   ·   INTENTIONS: BEST   ·   ';
      // 连播多遍做无缝滚动
      let xx = -scroll;
      while (xx < 1920) {
        c2.fillStyle = '#7a1200';
        c2.fillText(msg, xx + 2, barY - barH / 2 + 1);
        c2.fillStyle = (Math.floor(t * 10) % 2) ? '#ffee00' : '#ffffff';
        c2.fillText(msg, xx, barY - barH / 2);
        xx += c2.measureText(msg).width;
      }
      c2.restore();

      // --- 2) DoW 弹窗被炸飞（确定性残影：3 层逐渐变淡/位移/自旋） ---
      const r3 = U.rng(7771);
      for (let g = 0; g < 3; g++) {
        const k = U.clamp((dt - g * 0.06) / 1.15, 0, 1);
        if (k <= 0) continue;
        const ang = r3() * 6.2832 + g * 0.7;
        const dist = 240 + 720 * U.easeOut(k);
        const px = 960 + Math.cos(ang) * dist;
        const py = 520 + Math.sin(ang) * dist * 0.62 - 120 * k;
        const a = (1 - k) * 0.55 * U.clamp(1 - g * 0.28, 0, 1);
        if (a <= 0.01) continue;
        c2.save();
        c2.globalAlpha = a;
        c2.translate(px, py);
        c2.rotate(ang * 0.4 + k * 1.4 * (g % 2 ? 1 : -1));
        W98.drawWinRect(c2, -150, -46, 300, 92, {
          title: 'Dropping bombs?', titleFrom: '#800000', titleTo: '#ff2a00',
        });
        c2.fillStyle = '#ffffe1'; c2.fillRect(-146, -26, 292, 48);
        c2.fillStyle = '#000'; c2.font = 'bold 13px Tahoma,sans-serif';
        c2.fillText('with our best intentions', -138, -4);
        c2.restore();
      }

      // --- 3) 落点标记：一排向下砸的炸弹（确定性相位） ---
      const nb = 9;
      for (let i = 0; i < nb; i++) {
        const ph = ((t * 1.35 + i * 0.37) % 1);
        const bx = 130 + i * 205;
        const by = -80 + ph * 1000;
        c2.save();
        c2.globalAlpha = 0.85 * (1 - ph * 0.55) * chantOn;
        c2.fillStyle = '#111';
        c2.beginPath(); c2.ellipse(bx, by, 16, 20, 0, 0, 6.2832); c2.fill();
        c2.fillStyle = '#ff2a00';
        c2.fillRect(bx - 4, by - 22, 8, 8);
        c2.fillStyle = (Math.floor(t * 20 + i) % 2) ? '#ffee00' : '#ffffff';
        c2.font = 'bold 15px Tahoma,sans-serif';
        c2.textAlign = 'center';
        c2.fillText('💣', bx, by + 6);
        c2.restore();
      }
      c2.textAlign = 'left';
    }

    /* ---------- 全局效果（不位移，只做亮度/色相脉冲） ----------
       根因修复：旧版 inten = cas*0.6 + moneyT*1.4，31.83 时 cas 已在
       31.6 归零、moneyT=0 → inten=0，FX.mode 永远 'none'，爆炸期间
       glitch / vram / 切片全部没开，只剩 150ms 抖动 → 视觉「一闪而过」。
       现在：爆炸窗口内强制 'heavy'，vram 拉满，强度随冲击包络衰减。 */
    let inten = cas * 0.6 + moneyT * 1.4;
    inten = Math.max(inten, boomCore * 0.95);
    global.FX.noiseDens = 0.06 + inten * 0.22;
    if (boomWin > 0) {
      /* 爆炸窗口（hit .. hit+2.4）：重故障常开。
         vram 由 boomCore 决定，31.59 瞬间 1.0，到 34.0 仍有 ~0.5 —— 
         整段 2.4 秒都有花屏/切片，不再是「一闪而过」。 */
      global.FX.mode = 'heavy';
      global.FX.vram = U.clamp(0.55 + boomCore * 0.45, 0, 1.6);
    } else if (preBoom > 0) {
      /* 蓄力期（30.95..31.59）：不抢戏，只把 glitch 打开、
         vram 从 0 慢慢推到 0.35，让「要炸了」有预感而不是突然爆。 */
      global.FX.mode = 'heavy';
      global.FX.vram = 0.35 * preBoom;
    } else {
      global.FX.mode = inten > 0.75 ? 'heavy' : 'none';
      global.FX.vram = 0;
    }
    // splitAmt（RGB 色差）只在冲击瞬间非 0，其余时间必须为 0（眩晕元凶）
    global.FX.splitAmt = shakeP > 0.05 ? 8 * U.clamp(shakeP, 0, 1) : 0;

    /* 受控抖动：继续复用 Lead 的 FX.applyShake（#screen 单层、≤6px、150ms
       二次衰减、两次之间 2.5s 冷却规格不变），触发条件由 t 推导
       （maj / FX._shakeAt 已在本函数开头算好），不写 _impDone 这类跨帧标记。
       爆点从 LRC 的 31.83 改为实测 31.59，与冲击层对同一时刻。 */
    global.FX.applyShake(t);

    // 节拍反馈改为：桌面网格亮度脉冲 + 任务栏色相呼吸（零位移）
    // 只登记到 APP.taskFilter，由 APP.apply 统一写 DOM，
    // 这样离开本幕时会自动复位，不会泄漏到别的幕。
    const beat = global.FX.beatGlow(t, e);
    global.APP.taskFilter = moneyT > 0
      ? 'hue-rotate(' + (t * 300) + 'deg) brightness(' + (1 + beat * 0.25).toFixed(2) + ')'
      : 'brightness(' + (1 + beat * 0.12).toFixed(2) + ')';
  };

  /* 第二幕的剧情爆炸点（供文档/调试参考）
     爆点用实测爆破声 31.59（BEATS.boom.hit），不是 LRC 的 31.83。 */
  S.impacts = [31.59, 37.05];

  global.APP.register(S);
})(window);
