/* ============================================================
   bios.js — 0 – 8.88s 的暗黑 BIOS 尸检开机画面
   ------------------------------------------------------------
   · 一直铺到第一句人声唱响（实测起音 8.94s）才切进桌面
   · 出字逻辑 = 真实打字机：每个字符有独立的时间戳，
     逐字敲出、敲完一行停一小会儿，块状光标一直闪
   · 末尾 0.6s 做 CRT 消磁白闪，8.88s 整点切入 Win98 桌面
   纯 t 的関数：任意 seek 顺序画面一致。
   ============================================================ */
(function (global) {
  'use strict';
  const U = global.U;

  const BIOS = {};
  const T_END = 8.88;          // 切入桌面的时刻 = 第一句人声起音
  const T_FLASH = 8.28;        // 消磁白闪起点

  /* 日志行：每行给一个起始时刻，行内逐字推进 */
  const LINES = [
    { t: 0.35, cls: 'ok',  txt: '> CHECKING SYSTEM MEMORY... 65536 KB OK' },
    { t: 1.05, cls: 'dim', txt: '> MEMORY TEST  [##########] 100%  NO PARITY ERROR' },
    { t: 1.80, cls: 'ok',  txt: '> MOUNTING C:\\HUMAN_LAST_ARTIST.IMG ... [SUCCESS]' },
    { t: 2.70, cls: 'warn', txt: '> 检测到最后一位人类创作者 ... 体温 36.7C / 心跳 72bpm / 在线' },
    { t: 3.55, cls: 'dim', txt: '> SCANNING BACKGROUND PROCESSES ...' },
    { t: 4.20, cls: 'warn', txt: '> 发现进程: Princess.exe (画画中)  占用 CPU 99.4%' },
    { t: 5.05, cls: 'dim', txt: '> 该进程已连续运行 3 个夜晚，未保存进度' },
    { t: 5.75, cls: 'bad',  txt: '> CHECKING CAPITAL_OVERDRIVE_ENGINE ... [ARMED / 300KM-H]' },
    { t: 6.55, cls: 'bad',  txt: '> ARMED PROTOCOL: FORMAT C:  —— 等待主管道授权' },
    { t: 7.35, cls: 'warn', txt: '> COPYING HUMAN_SOUL.BMP -> /dev/null ... 100%' },
    { t: 8.00, cls: 'bad',  txt: '> READY. 按任意键继续开机 ...' },
  ];

  /* 每行打字速度（字/秒）：日志感，不拖沓 */
  const CPS = 42;

  /* 预算每行的结束时刻，用于光标与"敲完停顿" */
  let lineEnd = [];
  function computeEnds() {
    lineEnd = LINES.map(function (L) {
      const len = L.txt.length;
      const dur = Math.max(0.22, Math.min(0.72, len / CPS));
      return L.t + dur;
    });
  }
  computeEnds();

  BIOS.build = function () {
    const host = document.createElement('div');
    host.id = 'bios';
    host.innerHTML =
      '<div class="bios-head">' +
      '<span class="bios-brand">AWAAWA-BIOS <b>v19.98</b> ' +
      '(C) 1998-2026 Cyber-Mortuary Inc.</span>' +
      '<span class="bios-badge"><span class="bz">⚡</span> ENERGY STAR / ' +
      'SOUL_HARVESTER</span>' +
      '</div>' +
      '<div class="bios-meta" id="biosMeta"></div>' +
      '<div class="bios-log" id="biosLog"></div>' +
      '<div class="bios-mem" id="biosMem"></div>' +
      '<div class="bios-foot">' +
      '<span>Press <b>DEL</b> to enter SETUP</span>' +
      '<span class="press">SOUL INTEGRITY ... 99.98%</span>' +
      '</div>' +
      '<div class="bios-scan" id="biosScan"></div>' +
      '<div class="bios-lines"></div>' +
      '<div class="bios-flash" id="biosFlash"></div>';
    document.getElementById('stage').appendChild(host);
    BIOS.host = host;
    BIOS.log = host.querySelector('#biosLog');
    BIOS.meta = host.querySelector('#biosMeta');
    BIOS.scan = host.querySelector('#biosScan');
    BIOS.flash = host.querySelector('#biosFlash');
    BIOS.mem = host.querySelector('#biosMem');
    BIOS._n = -1;
    BIOS._meta = '';
    BIOS._mem = '';
    // 预先建好所有行节点，只改文本（避免每帧重排整块）
    let lh = '';
    for (let i = 0; i < LINES.length; i++) lh += '<div class="' + LINES[i].cls + '"></div>';
    BIOS.log.innerHTML = lh;
    BIOS.rows = Array.prototype.slice.call(BIOS.log.children);
    BIOS.cur = document.createElement('span');
    BIOS.cur.className = 'cursor';
    BIOS.log.appendChild(BIOS.cur);
  };

  /* 第 i 行在时刻 t 已经打出了多少字符 */
  function typedCount(i, t) {
    const L = LINES[i];
    if (t < L.t) return 0;
    const len = L.txt.length;
    const dur = lineEnd[i] - L.t;
    const p = (t - L.t) / dur;
    if (p >= 1) return len;
    return Math.floor(len * p);
  }

  BIOS.update = function (t) {
    if (!BIOS.host) return;
    const on = t < T_END;
    BIOS.host.style.display = on ? 'block' : 'none';
    if (!on) return;

    /* ---- 硬件信息块：随自检进度逐行点亮 ---- */
    const rows = [
      ['Main Processor', ': AWAAWA COLD-ART 486DX2-66', 0.30],
      ['Memory Test', ': 65536K OK', 0.95],
      ['Artist Vital', ': 36.7C / 72bpm / 存活', 2.70],
      ['Mounted Image', ': HUMAN_LAST_ARTIST.IMG', 1.80],
      ['Soul Integrity', ': 99.98% (无法量化)', 5.05],
    ];
    let html = '';
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (t < r[2]) continue;
      const hot = i === 2 || i === 4;
      html += '<div><span class="k">' + r[0] + '</span> ' +
        '<span class="' + (hot ? 'hot' : 'v') + '">' + r[1] + '</span></div>';
    }
    if (html !== BIOS._meta) {
      BIOS._meta = html;
      BIOS.meta.innerHTML = html;
    }

    /* ---- 日志：真正的打字机——每行逐字敲出 ---- */
    for (let i = 0; i < LINES.length; i++) {
      const n = typedCount(i, t);
      const row = BIOS.rows[i];
      if (!row) continue;
      const want = n > 0 ? LINES[i].txt.slice(0, n) : '';
      if (row.__t !== want) { row.__t = want; row.textContent = want; }
    }
    /* 光标：挂在"最后一行已经开始敲的"后面（块状闪烁） */
    let curIdx = -1;
    for (let i = 0; i < LINES.length; i++) if (t >= LINES[i].t) curIdx = i;
    const curRow = curIdx >= 0 ? BIOS.rows[curIdx] : BIOS.rows[0];
    if (curRow && BIOS.cur.parentNode !== curRow) {
      if (BIOS.cur.parentNode) BIOS.cur.parentNode.removeChild(BIOS.cur);
      curRow.appendChild(BIOS.cur);
    }
    /* 闪烁：1.1Hz 方波（整数帧，确定性） */
    const blinkOn = Math.floor(t * 2.2) % 2 === 0;
    const curOpacity = blinkOn ? '1' : '0';
    if (BIOS._curOp !== curOpacity) {
      BIOS._curOp = curOpacity;
      BIOS.cur.style.opacity = curOpacity;
    }

    /* ---- 扫描光带上下扫（2.6s 一循环） ---- */
    const sy = ((t / 2.6) % 1) * 1180 - 120;
    BIOS.scan.style.transform = 'translateY(' + Math.round(sy) + 'px)';

    /* ---- 内存地图 + 进度条 ---- */
    const mp = U.clamp((t - 1.6) / 5.4, 0, 1);
    if (mp > 0) {
      const segs = 48;
      const filled = Math.round(mp * segs);
      let bar = '';
      for (let i = 0; i < segs; i++) {
        bar += i < filled ? '<i class="on"></i>' : '<i></i>';
      }
      const memHtml =
        '<div class="mem-title">SOUL MEMORY MAP  0x00000000 - 0x00FFFFFF</div>' +
        '<div class="mem-bar">' + bar + '</div>' +
        '<div class="mem-legend">' +
        '<span><b class="lg1"></b>ART_SKILL</span>' +
        '<span><b class="lg2"></b>HUMAN_FEELINGS</span>' +
        '<span><b class="lg3"></b>COPYRIGHT</span>' +
        '<span><b class="lg4"></b>UNKNOWN (不可量化)</span>' +
        '<span class="mem-pct">SCANNED ' + Math.round(mp * 100) + '%</span>' +
        '</div>';
      if (memHtml !== BIOS._mem) {
        BIOS._mem = memHtml;
        BIOS.mem.innerHTML = memHtml;
      }
    }

    /* ---- 末尾：CRT 消磁白闪 ---- */
    const f = U.inv(T_FLASH, T_END, t);
    BIOS.flash.style.opacity = f > 0 ? (f * f * 0.95).toFixed(3) : '0';
  };

  global.BIOS = BIOS;
})(window);
