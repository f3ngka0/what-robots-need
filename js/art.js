/* ============================================================
   art.js — 程序化像素美术 / 蒸汽波图形生成器
   全部确定性（同参数 => 同像素），无 Math.random / Date.now
   ============================================================ */
(function (global) {
  'use strict';
  const U = global.U;
  const ART = {};

  /* 缓存 */
  const icoCache = {};
  const curCache = {};

  /* ---------- 调色板 ---------- */
  const P = {
    black: '#000000', dk: '#404040', grey: '#808080', lt: '#c0c0c0', white: '#ffffff',
    navy: '#000080', blue: '#0000ff', cyan: '#00ffff', teal: '#008080',
    red: '#ff0000', dkred: '#800000', green: '#008000', yellow: '#ffff00',
    magenta: '#ff00ff', skin: '#f8c090', hair: '#a04000', hairDk: '#5a2000',
    dress: '#d04090', crown: '#ffd700', gold: '#ffcc00',
  };

  /* ---------- 通用盒子 ---------- */
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return c;
  }
  function px(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }

  /* 从位图字符串数组绘制 */
  function blit(ctx, rows, map, ox, oy, s) {
    s = s || 1;
    ox = ox || 0; oy = oy || 0;
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        const col = map[ch];
        if (col) { ctx.fillStyle = col; ctx.fillRect(ox + x * s, oy + y * s, s, s); }
      }
    }
  }

  /* ============================================================
     图标：16/32 px Win98 桌面图标
     ============================================================ */
  const ICONS = {
    computer: [
      '................',
      '..dddddddddd....',
      '.dwwwwwwwwwd....',
      '.dwLLLLLLLwd....',
      '.dwLttttttLwd...',
      '.dwLtbbbttLwd...',
      '.dwLtbbbttLwd...',
      '.dwLttttttLwd...',
      '.dwLLLLLLLwd....',
      '.dwwwwwwwwwd....',
      '..dddddddddd....',
      '...dddddddd.....',
      '..dwwwwwwwwd....',
      '..dddddddddd....',
      '................',
      '................',
    ],
    network: [
      '................',
      '....dddd........',
      '...dwwwwd.......',
      '...dwbbwd.......',
      '...dwwwwd.......',
      '....dddd........',
      '......d.........',
      '...dddddddd.....',
      '..dwwwwwwwwd....',
      '..dwbbbbbbwd....',
      '..dwwwwwwwwd....',
      '...dddddddd.....',
      '....d....d......',
      '.....d..d.......',
      '......dd........',
      '................',
    ],
    recycle: [
      '................',
      '.....dddd.......',
      '....dwwwwd......',
      '.....dddd.......',
      '..dddddddddd....',
      '..dwwwwwwwwd....',
      '..dw.y..y.wd....',
      '..dw.y..y.wd....',
      '..dw.y..y.wd....',
      '..dw.y..y.wd....',
      '...dwwwwwwd.....',
      '....dddddd......',
      '................',
      '................',
      '................',
      '................',
    ],
    'princess-bmp': [
      '................',
      '..d..........d..',
      '..dd..dddd..dd..',
      '...ddddddddddd..',
      '...dh.h.h.h.hd..',
      '...dhhhhhhhhhd..',
      '...dhsssssshsd..',
      '...ds.s..s..sd..',
      '...dsssssssssd..',
      '....ds~~~~~sd...',
      '.....ddddddd....',
      '...ddddddddddd..',
      '..ddddddddddddd.',
      '..ddddddddddddd.',
      '..ddddddddddddd.',
      '................',
    ],
    notepad: [
      '................',
      '..ddddddddd.....',
      '..dwwwwwwwdd....',
      '..dw.bbbb.wdd...',
      '..dwwwwwwwwwd...',
      '..dw.bbbbbbwd...',
      '..dwwwwwwwwwd...',
      '..dw.bbbbbbwd...',
      '..dwwwwwwwwwd...',
      '..dw.bbbbb.wd...',
      '..dwwwwwwwwwd...',
      '..dwwwwwwwwwd...',
      '..ddddddddddd...',
      '................',
      '................',
      '................',
    ],
    paint: [
      '................',
      '....dddd........',
      '...dwwwwd.......',
      '..dwwwwwwd......',
      '.dwwwwwwwwd.....',
      '.dwwwwwwwwd..d..',
      '.dwwwwwwwwd.dd..',
      '..dwwwwwwdddd...',
      '...dwwwwdddd....',
      '....dddddddd....',
      '...drrryybbd....',
      '...drrryybbd....',
      '....dddddd......',
      '................',
      '................',
      '................',
    ],
    dos: [
      '................',
      'ddddddddddddddd.',
      'dbbbbbbbbbbbbbd.',
      'dbgggggggggggdb.',
      'dbgbbbbbbbbbgdb.',
      'dbgbgggggggggdb.',
      'dbgbgbbbbbbbbgd.',
      'dbgbgggggggbgd..',
      'dbgbbbbbbbbbbd..',
      'dbbbbbbbbbbbbd..',
      'dddddddddddddd..',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    regedit: [
      '................',
      '..dddddddd......',
      '..dwwwwwwd......',
      '..dw.d.d.dd.....',
      '..dwwwwwwwwd....',
      '..dw.d.d.dd.....',
      '..dwwwwwwwd.....',
      '..dw.d.d.dd.....',
      '..dwwwwwwwd.....',
      '..dddddddd......',
      '...d.....d......',
      '...ddddddd......',
      '................',
      '................',
      '................',
      '................',
    ],
    defrag: [
      '................',
      '.dddddddddddd...',
      '.dwwwwwwwwwwd...',
      '.dwbbyywwbbwd...',
      '.dwbyywwbbwwd...',
      '.dwwwwwwwwwwd...',
      '.dwbbrrrrwwbd...',
      '.dwbbrrrrwwbd...',
      '.dwwwwwwwwwwd...',
      '.dddddddddddd...',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    help: [
      '................',
      '....dddddd......',
      '...dwwwwwwd.....',
      '..dwwbbbbwwd....',
      '..dwbwwwwbwd....',
      '..dwwwwwwbwwd...',
      '..dwwwwwbbwwd...',
      '..dwwwwbbwwwd...',
      '..dwwwwbbwwwd...',
      '..dwwwwwwwwwd...',
      '..dwwwwbbwwwd...',
      '...dwwwwwwwd....',
      '....ddddddd.....',
      '................',
      '................',
      '................',
    ],
    warning: [
      '................',
      '.......dd.......',
      '......dwwd......',
      '......dwwd......',
      '.....dwwwwd.....',
      '.....dwwwwd.....',
      '....dwwyywwd....',
      '....dwwyywwd....',
      '...dwwwyywwwd...',
      '...dwwwyywwwd...',
      '..dwwwwwwwwwwd..',
      '..dwwwwyywwwwd..',
      '.dwwwwwwyywwwwd.',
      '.dwwwwwwwwwwwwd.',
      '.dddddddddddddd.',
      '................',
    ],
    error: [
      '................',
      '....dddddd......',
      '...drrrrrrd.....',
      '..drrrrrrrrd....',
      '.drrrwwwwrrrd...',
      '.drrwwrrrrwwrd..',
      '.drwrwwrrwwrwd..',
      '.drwrrwwwwrrwd..',
      '.drwrrrwwrrrwd..',
      '.drwrwwrrwwrwd..',
      '.drrwwrrrrwwrd..',
      '..drrrwwwwrrrd..',
      '...dddddddddd...',
      '................',
      '................',
      '................',
    ],
    info: [
      '................',
      '....dddddd......',
      '...dbbbbbbd.....',
      '..dbbbbbbbbd....',
      '.dbbbwwwwbbbd...',
      '.dbbbwwwwbbbd...',
      '.dbbbbwwbbbbd...',
      '.dbbbbwwbbbbd...',
      '.dbbbbwwbbbbd...',
      '.dbbbwwwwbbbd...',
      '.dbbbwwwwbbbd...',
      '..dbbbbbbbbbd...',
      '...dddddddddd...',
      '................',
      '................',
      '................',
    ],
    coin: [
      '................',
      '....dddddd......',
      '...dyyyyyyd.....',
      '..dyyooooooyd...',
      '..dyooyyoooyd...',
      '.dyooyooyoooyd..',
      '.dyoyooyooyyod..',
      '.dyoyooooooyod..',
      '.dyoyoooooooyd..',
      '.dyoyoooooooyd..',
      '.dyyoooooooooy..',
      '..dyyooooooyd...',
      '...dyyyyyyy d...',
      '....dddddd......',
      '................',
      '................',
    ],
    pig: [
      '................',
      '................',
      '..ddd.....ddd...',
      '.dpppd...dpppd..',
      '.dppppdddddpppd.',
      'dpppppppppppppd.',
      'dppppppppppppppd',
      'dpppeeepppeeeppd',
      'dpppeeepppeeeppd',
      'dppppppppppppppd',
      'dpppdddddddppppd',
      '.dppppppppppppd.',
      '..dd.dd.dd.dd...',
      '................',
      '................',
      '................',
    ],
    skull: [
      '................',
      '....dddddd......',
      '...dwwwwwwd.....',
      '..dwwwwwwwwd....',
      '..dwwwwwwwwd....',
      '..dwddwwddwd....',
      '..dwddwwddwd....',
      '..dwwwwwwwwd....',
      '..dwwwddwwwd....',
      '..dwwwwwwwwd....',
      '...dwdwdwdwd....',
      '...dwdwdwdwd....',
      '....dddddd......',
      '................',
      '................',
      '................',
    ],
    witch: [
      '................',
      '.......dd.......',
      '......dbbd......',
      '.....dbbbbd.....',
      '....dbbbbbbd....',
      '...dbbbbbbbbd...',
      '..dbbbbbbbbbbd..',
      '..dddddddddddd..',
      '..dggggggggggd..',
      '..dggeeggeeggd..',
      '..dggggggggggd..',
      '..dgggddddgggd..',
      '...dddddddddd...',
      '................',
      '................',
      '................',
    ],
    bomb: [
      '................',
      '.........yy.....',
      '........yoo.oo..',
      '.......yoo......',
      '......dddd......',
      '.....dkkkkd.....',
      '....dkkkkkkd....',
      '....dkkkkkkd....',
      '....dkkkkkkd....',
      '....dkkkkkkd....',
      '.....dkkkkd.....',
      '......dddd......',
      '................',
      '................',
      '................',
      '................',
    ],
    heart: [
      '................',
      '..dddd..dddd....',
      '.dppppddppppd...',
      'dppppppppppppd..',
      'dppppppppppppd..',
      'dppppppppppppd..',
      '.dppppppppppd...',
      '..dppppppppd....',
      '...dppppppd.....',
      '....dppppd......',
      '.....dppd.......',
      '......dd........',
      '................',
      '................',
      '................',
      '................',
    ],
    disk: [
      '................',
      '..dddddddddd....',
      '..dwwwwwwwwd....',
      '..dwkkkkkkwd....',
      '..dwkkkkkkwd....',
      '..dwkkkkkkwd....',
      '..dwwwwwwwwd....',
      '..dwbbbbbbwd....',
      '..dwbbbbbbwd....',
      '..dwbbbbbbwd....',
      '..dwbbbbbbwd....',
      '..dwwwwwwwwd....',
      '..dddddddddd....',
      '................',
      '................',
      '................',
    ],
    modem: [
      '................',
      '...ddddddddd....',
      '...dwwwwwwwd....',
      '...dwbbbbbwd....',
      '...dwwwwwwwd....',
      '...dddddddddd...',
      '...dggggggggd...',
      '...dggggggggd...',
      '...dddddddddd...',
      '....d.d..d.d....',
      '...dd.ddd.dd....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    trash: [
      '................',
      '.....dddd.......',
      '....dwwwwd......',
      '.....dddd.......',
      '..dddddddddd....',
      '..dwwwwwwwwd....',
      '..dw.y..y.wd....',
      '..dw.y..y.wd....',
      '...dwwwwwwd.....',
      '....dddddd......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    wizard: [
      '................',
      '.......y........',
      '......yoy.......',
      '.....yoooo......',
      '....yooooo......',
      '...dwwwwwwd.....',
      '..dwwbbbbwwd....',
      '..dwwbbbbwwd....',
      '..dwwbbbbwwd....',
      '..dwwwwwwwwd....',
      '...dddddddd.....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    clip: [
      '................',
      '.....dddd.......',
      '....d....d......',
      '....d....d......',
      '....d....d......',
      '....d....d......',
      '....d....d......',
      '....d....d......',
      '....d....d......',
      '.....dddd.......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  };

  const ICO_MAP = {
    '.': null, d: '#000000', w: '#ffffff', b: '#000080', L: '#4a90d9',
    t: '#7ec8e3', g: '#00c000', y: '#ffff00', r: '#ff0000', o: '#ff9900',
    e: '#ffffff', s: '#f8c090', h: '#a04000', k: '#202020', p: '#ff88bb',
    '~': '#c04070',
  };
  const ICO_MAP_RECYCLE = Object.assign({}, ICO_MAP, { d: '#000000' });

  ART.icon = function (name, size) {
    const key = name + '@' + size;
    if (icoCache[key]) { const c = canvas(size, size); c.getContext('2d').drawImage(icoCache[key], 0, 0); return c; }
    const rows = ICONS[name] || ICONS.computer;
    const base = canvas(16, 16);
    const bx = base.getContext('2d');
    blit(bx, rows, ICO_MAP);
    const out = canvas(size, size);
    const ox = out.getContext('2d');
    ox.imageSmoothingEnabled = false;
    ox.drawImage(base, 0, 0, size, size);
    icoCache[key] = out;
    return out;
  };
  ART.pixelIcon = function (rows, map, size, scale) {
    const base = canvas(rows[0].length, rows.length);
    blit(base.getContext('2d'), rows, map || ICO_MAP);
    const out = canvas(size, size);
    const ox = out.getContext('2d');
    ox.imageSmoothingEnabled = false;
    ox.drawImage(base, 0, 0, size, size);
    return out;
  };

  /* ============================================================
     鼠标指针
     ============================================================ */
  const CURSOR_ROWS_ARROW = [
    'x...............',
    'xx..............',
    'xwx.............',
    'xwwx............',
    'xwwwx...........',
    'xwwwwx..........',
    'xwwwwwx.........',
    'xwwwwwwx........',
    'xwwwwwwwx.......',
    'xwwwwwwwwx......',
    'xwwwwwwwwwx.....',
    'xwwwwwwwwwwx....',
    'xwwwwwxxxxxx....',
    'xwwxwwx.........',
    'xwx.xwwx........',
    'xx...xwx........',
    'x.....x.........',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ];
  const CURSOR_MAP = { x: '#000000', w: '#ffffff', '.': null };

  function cursorCanvas(rows, hotx, hoty) {
    const c = canvas(32, 32);
    const x = c.getContext('2d');
    // 先画黑色描边（放大 1px 的白填充）
    blit(x, rows, CURSOR_MAP);
    c._hot = [hotx, hoty];
    return c;
  }

  ART.cursor = function (kind, t, tremor) {
    const jitter = tremor || 0;
    const key = 'c' + kind;
    let c = curCache[key];
    if (!c) {
      if (kind === 'crosshair') {
        c = canvas(32, 32);
        const x = c.getContext('2d');
        x.fillStyle = '#00ff00';
        x.fillRect(15, 0, 2, 10); x.fillRect(15, 24, 2, 8);
        x.fillRect(0, 15, 10, 2); x.fillRect(24, 15, 8, 2);
        x.fillRect(13, 13, 6, 1); x.fillRect(13, 18, 6, 1);
        x.fillRect(13, 13, 1, 6); x.fillRect(18, 13, 1, 6);
      } else if (kind === 'pencil') {
        c = canvas(32, 32);
        const x = c.getContext('2d');
        // 铅笔（画图板用）
        x.fillStyle = '#000';
        for (let i = 0; i < 14; i++) x.fillRect(4 + i, 24 - i, 4, 4);
        x.fillStyle = '#f8c090';
        for (let i = 0; i < 12; i++) x.fillRect(5 + i, 23 - i, 2, 2);
        x.fillStyle = '#000';
        x.fillRect(3, 27, 2, 2);
      } else if (kind === 'ibeam') {
        c = canvas(32, 32);
        const x = c.getContext('2d');
        x.fillStyle = '#000';
        x.fillRect(15, 8, 2, 16);
        x.fillRect(12, 7, 8, 2); x.fillRect(12, 23, 8, 2);
        x.fillRect(13, 9, 2, 1); x.fillRect(17, 9, 2, 1);
      } else if (kind === 'hand') {
        c = canvas(32, 32);
        const x = c.getContext('2d');
        x.fillStyle = '#fff';
        x.fillRect(12, 10, 8, 14);
        x.fillRect(9, 14, 4, 10);
        x.fillRect(20, 14, 4, 10);
        x.strokeStyle = '#000';
        x.strokeRect(11.5, 9.5, 9, 15);
      } else {
        c = cursorCanvas(CURSOR_ROWS_ARROW, 0, 0);
      }
      curCache[key] = c;
    }
    // 复制以便抖动
    const out = canvas(32, 32);
    const ox = out.getContext('2d');
    ox.imageSmoothingEnabled = false;
    if (jitter > 0) {
      const jx = Math.sin(t * 47) * jitter + (U.srand('cur' + ((t * 60) | 0), 1)() - 0.5) * jitter * 2;
      const jy = Math.cos(t * 39) * jitter + (U.srand('cur' + ((t * 60) | 0), 2)() - 0.5) * jitter * 2;
      ox.drawImage(c, Math.round(jx), Math.round(jy));
    } else {
      ox.drawImage(c, 0, 0);
    }
    return out;
  };

  /* ============================================================
     小公主（MS-Paint 手绘感）
     笔画列表预生成 -> progress 裁剪
     ============================================================ */
  ART._princessStrokes = null;
  function buildPrincessStrokes() {
    const S = [];
    const add = (x1, y1, x2, y2, col, w) => S.push({ x1, y1, x2, y2, col, w: w || 1 });
    // 坐标系：原点在头部中心，单位=1px（scale 后）
    // === 绘制顺序（从后到前，保证 progress 裁剪像真人画画）===
    // 1. 脸填充（需要先有一层底，后面才在它上面画眼睛嘴和头发）
    for (let y = -58; y < 20; y += 5) {
      const w = Math.sqrt(Math.max(0, 1 - Math.pow((y + 20) / 46, 2))) * 44;
      add(-w + 3, y, w - 3, y, P.skin, 4);
    }
    // 2. 裙子 / 肩（最外层）
    add(-58, 26, -70, 78, P.dress, 9);
    add(58, 26, 70, 78, P.dress, 9);
    for (let y = 30; y < 78; y += 6) {
      const w = 58 + (y - 26) * 0.28;
      add(-w, y, w, y, P.dress, 5);
    }
    // 3. 头发（大块）
    const hc = P.hair, hd = P.hairDk;
    let hp = null;
    for (let i = 0; i <= 40; i++) {
      const a = -Math.PI * 0.92 + (i / 40) * Math.PI * 0.86;
      const r = 74 + Math.sin(a * 7) * 7;
      const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.95 - 26;
      if (hp) add(hp[0], hp[1], x, y, hc, 7);
      hp = [x, y];
    }
    // 4. 脸轮廓
    const face = [];
    for (let i = 0; i <= 30; i++) {
      const a = -Math.PI * 0.55 + (i / 30) * Math.PI * 1.1;
      face.push([Math.cos(a) * 46, Math.sin(a) * 44 - 20]);
    }
    for (let i = 1; i < face.length; i++) add(face[i - 1][0], face[i - 1][1], face[i][0], face[i][1], '#c07850', 3);
    // 5. 五官
    add(-26, -30, -18, -30, '#000', 5); add(-26, -26, -18, -26, '#000', 3);
    add(18, -30, 26, -30, '#000', 5); add(18, -26, 26, -26, '#000', 3);
    add(-24, -36, -20, -36, '#fff', 2); add(20, -36, 24, -36, '#fff', 2);
    add(-28, -34, -24, -38, '#000', 2); add(-22, -38, -18, -34, '#000', 2);
    add(18, -34, 22, -38, '#000', 2); add(26, -34, 30, -38, '#000', 2);
    add(-9, 2, 9, 2, '#c03050', 4);
    add(-7, 5, 7, 5, '#c03060', 3);
    // 腮红
    const r = U.rng(4242);
    for (let i = 0; i < 70; i++) {
      const side = i % 2 ? 1 : -1;
      S.push({ dot: 1, x: side * (20 + r() * 22), y: -8 + r() * 14, col: '#f08080', size: 2 });
    }
    // 6. 前刘海（压在额头上）
    for (let i = 0; i <= 26; i++) {
      const a = Math.PI * 1.05 + (i / 26) * Math.PI * 0.9;
      add(Math.cos(a) * 66, Math.sin(a) * 60 - 26, Math.cos(a) * 52, Math.sin(a) * 44 - 18, hd, 8);
    }
    // 7. 皇冠（最后画，最亮）
    add(-30, -92, -30, -118, P.crown, 6);
    add(-30, -118, -14, -100, P.crown, 6);
    add(-14, -100, 0, -124, P.crown, 6);
    add(0, -124, 14, -100, P.crown, 6);
    add(14, -100, 30, -118, P.crown, 6);
    add(30, -118, 30, -92, P.crown, 6);
    add(-30, -92, 30, -92, P.crown, 6);
    S.push({ dot: 1, x: 0, y: -112, col: '#ff0040', size: 6 });
    S.push({ dot: 1, x: -22, y: -104, col: '#00c0ff', size: 4 });
    S.push({ dot: 1, x: 22, y: -104, col: '#00c0ff', size: 4 });
    // 8. 衣领
    add(-34, 22, 0, 40, '#ffffff', 5);
    add(34, 22, 0, 40, '#ffffff', 5);
    // 9. 喷枪网点阴影（最后 15%）
    const r2 = U.rng(999);
    for (let i = 0; i < 300; i++) {
      const x = (r2() - 0.5) * 150, y = (r2() - 0.5) * 180 + 6;
      const inHead = (x * x) / (68 * 68) + ((y + 18) * (y + 18)) / (66 * 66) < 1;
      const inBody = y > 26 && Math.abs(x) < 56 + (y - 26) * 0.26;
      if (inHead || inBody) S.push({ dot: 1, x, y, col: '#9a5050', size: 2 });
    }
    return S;
  }

  ART.princess = function (ctx, cx, cy, scale, progress, opts) {
    opts = opts || {};
    if (!ART._princessStrokes) ART._princessStrokes = buildPrincessStrokes();
    const S = ART._princessStrokes;
    const n = Math.floor(S.length * U.clamp(progress, 0, 1));
    const wob = opts.wobble || 0;
    const shift = opts.paletteShift || 0;
    /* sketchOnly：只留**轮廓与五官**的蓝色铅笔线（跳过所有大色块填充），
       这样 40% 阶段看起来是一张能认出"小公主"的线稿草图，而不是几根横线。
       blueDraft ：线条统一成蓝色工程图铅笔色 */
    const sketchOnly = !!opts.sketchOnly;
    const draftCol = opts.blueDraft ? '#3a6ea8' : null;
    // 需要跳过的"填充色"（脸底 / 裙子 / 头发块）
    const FILL = sketchOnly ? [P.skin, P.dress, P.hair, P.hairDk] : null;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = false;

    // 手抖：给每个笔画的坐标加确定性的偏移
    const jitter = (i) => (wob ? Math.sin(i * 12.9898) * wob : 0);

    for (let i = 0; i < n; i++) {
      const s = S[i];
      if (s.dot) {
        if (sketchOnly && s.size < 5) continue;
        ctx.fillStyle = draftCol || (shift ? hueShift(s.col, shift) : s.col);
        const sz = s.size || 2;
        const jx = jitter(i);
        ctx.fillRect((s.x + jx) | 0, (s.y + jx * 0.6) | 0, sz, sz);
      } else {
        if (sketchOnly) {
          // 只跳过「大色块填充」（脸底/裙子/头发的主体色），
          // 轮廓线（深色、细）与五官全部保留，这样线稿才认得出是小公主。
          if (FILL.indexOf(s.col) >= 0) continue;
        }
        ctx.strokeStyle = draftCol || (shift ? hueShift(s.col, shift) : s.col);
        ctx.lineWidth = sketchOnly ? 2 : s.w;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        const j = jitter(i);
        ctx.moveTo(s.x1 + j, s.y1 + j * 0.5);
        ctx.lineTo(s.x2 + j, s.y2 + j * 0.5);
        ctx.stroke();
      }
    }
    if (sketchOnly) { ctx.restore(); return; }

    // 六指（第二幕故障）
    if (opts.sixFingers && progress > 0.55) {
      ctx.fillStyle = P.skin;
      for (let f = 0; f < 6; f++) {
        const fx = 40 + f * 9, fy = 8 + Math.sin(f * 1.3) * 10;
        ctx.fillRect(fx, fy, 7, 34);
        ctx.fillStyle = '#c07850';
        ctx.fillRect(fx, fy + 30, 7, 2);
        ctx.fillStyle = P.skin;
      }
    }
    // 眨眼
    if (opts.blink) {
      ctx.fillStyle = P.skin;
      ctx.fillRect(-30, -34, 14, 10);
      ctx.fillRect(16, -34, 14, 10);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-29, -28); ctx.lineTo(-17, -28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(17, -28); ctx.lineTo(29, -28); ctx.stroke();
    }
    // 嘴型动画
    if (opts.mouth != null && opts.mouth > 0.2) {
      ctx.fillStyle = '#c03050';
      const mh = 2 + opts.mouth * 6;
      ctx.fillRect(-9, 2, 18, mh);
    }
    ctx.restore();
  };

  /* 简单色相偏移（用于故障调色板） */
  function hueShift(hex, deg) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 510;
    if (max === min) h = s = 0;
    else {
      const d = max - min;
      s = l > 0.5 ? d / (510 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    h = (h + deg / 360) % 1;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    let rr, gg, bb;
    if (s === 0) rr = gg = bb = l;
    else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      rr = hue2rgb(p, q, h + 1 / 3); gg = hue2rgb(p, q, h); bb = hue2rgb(p, q, h - 1 / 3);
    }
    const to = (v) => ('0' + Math.round(v * 255).toString(16)).slice(-2);
    return '#' + to(rr) + to(gg) + to(bb);
  }
  ART.hueShift = hueShift;

  /* ============================================================
     画布背景（MS Paint 白底 + 网格阴影）
     ============================================================ */
  ART.paintCanvasBg = function (ctx, w, h, frame, opts) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    // 极淡的蓝灰网点（手绘纸感）
    ctx.fillStyle = 'rgba(200,210,220,0.35)';
    for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
      if (((x >> 2) + (y >> 2)) % 2 === 0) ctx.fillRect(x, y, 1, 1);
    }
  };

  ART.ditherNoise = function (ctx, w, h, density, seed, colors) {
    const r = U.rng(seed || 3);
    const c = colors || ['#ffffff'];
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        if (r() < density) {
          ctx.fillStyle = c[Math.floor(r() * c.length)];
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }
  };

  /* ============================================================
     硬币
     ============================================================ */
  ART.coin = function (ctx, cx, cy, r, angle, s) {
    const w = Math.abs(Math.cos(angle)) * r + 2;
    ctx.save();
    ctx.translate(cx, cy);
    // 边缘厚度
    ctx.fillStyle = '#b8860b';
    ctx.beginPath();
    ctx.ellipse(0, 0, w, r, 0, 0, Math.PI * 2);
    ctx.fill();
    // 面
    const g = ctx.createLinearGradient(-w, -r, w, r);
    g.addColorStop(0, '#fff3a0');
    g.addColorStop(0.45, '#ffd700');
    g.addColorStop(1, '#c99700');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(1, w - 2), r - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // $ 符号（只在正面可见时）
    if (w > r * 0.35) {
      ctx.fillStyle = '#8a6100';
      ctx.font = 'bold ' + (r * 1.1) + 'px Tahoma, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = Math.min(1, (w / r - 0.35) * 2);
      ctx.fillText('$', 0, 1);
      ctx.globalAlpha = 1;
    }
    // 高光
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(1, w - 4), r - 4, 0, Math.PI * 1.1, Math.PI * 1.7);
    ctx.stroke();
    ctx.restore();
  };

  /* ============================================================
     K 线图（股市暴涨）
     ============================================================ */
  ART.kline = function (ctx, x, y, w, h, t, seed, opts) {
    opts = opts || {};
    const col = opts.color || '#00ff41';
    const r = U.rng(seed || 5);
    const n = 48;
    const pts = [];
    let v = 0.12;
    for (let i = 0; i < n; i++) {
      v = Math.min(1.15, v + (r() - 0.32) * 0.09 + 0.012);
      pts.push(v);
    }
    // 网格
    ctx.strokeStyle = 'rgba(0,255,65,0.18)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const yy = y + (h * i) / 4;
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
    }
    // 线
    const reveal = (t * 0.55) % 1.35;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = x + (w * i) / (n - 1);
      const py = y + h - pts[i] * h;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.shadowColor = col;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
    // 填充
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fillStyle = col.replace(')', ',0.14)').replace('rgb', 'rgba').replace('#00ff41', 'rgba(0,255,65,0.14)');
    ctx.fillStyle = opts.color ? 'rgba(255,0,170,0.14)' : 'rgba(0,255,65,0.14)';
    ctx.fill();
    // 发光端点
    const lastP = pts[Math.min(n - 1, Math.floor(n * Math.min(1, reveal)))];
    const lx = x + w * Math.min(1, reveal);
    const ly = y + h - lastP * h;
    ctx.fillStyle = '#fff';
    ctx.fillRect(lx - 2, ly - 2, 4, 4);
    ctx.restore();
  };

  /* ============================================================
     机械小猪
     ============================================================ */
  ART.piglet = function (ctx, cx, cy, s, frame, opts) {
    opts = opts || {};
    const speed = opts.speed || 0;
    const w = s * 2.6, h = s * 1.5;
    ctx.save();
    ctx.translate(cx, cy);
    // 身体（灰色 3D 倒角）
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-w / 2, -h / 2, w, 1);
    ctx.fillRect(-w / 2, -h / 2, 1, h);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(-w / 2, h / 2 - 1, w, 1);
    ctx.fillRect(w / 2 - 1, -h / 2, 1, h);
    // 头（右）
    ctx.fillStyle = '#b0b0b0';
    ctx.fillRect(w / 2 - s * 0.4, -h / 2 - s * 0.5, s * 1.5, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w / 2 - s * 0.4, -h / 2 - s * 0.5, s * 1.5, 1);
    // 鼻子
    ctx.fillStyle = '#ff88bb';
    ctx.fillRect(w / 2 + s * 1.0, -s * 0.2, s * 0.55, s * 0.6);
    ctx.fillStyle = '#c04070';
    ctx.fillRect(w / 2 + s * 1.15, -s * 0.05, s * 0.12, s * 0.3);
    ctx.fillRect(w / 2 + s * 1.38, -s * 0.05, s * 0.12, s * 0.3);
    // 红色报错眼
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(w / 2 + s * 0.2, -h / 2 - s * 0.25, s * 0.42, s * 0.42);
    ctx.fillStyle = '#000';
    ctx.fillRect(w / 2 + s * 0.32, -h / 2 - s * 0.13, s * 0.18, s * 0.18);
    // 耳朵
    ctx.fillStyle = '#909090';
    ctx.beginPath();
    ctx.moveTo(w / 2 - s * 0.35, -h / 2 - s * 0.5);
    ctx.lineTo(w / 2 + s * 0.1, -h / 2 - s * 1.15);
    ctx.lineTo(w / 2 + s * 0.4, -h / 2 - s * 0.5);
    ctx.fill();
    // 腿（动画）
    ctx.fillStyle = '#606060';
    const legPh = (frame % 4) * (Math.PI / 2);
    for (let i = 0; i < 4; i++) {
      const lx = -w / 2 + i * (w / 4) + 2;
      const off = Math.sin(legPh + i * 1.6) * s * 0.35 * (0.3 + speed);
      ctx.fillRect(lx, h / 2 - 1, s * 0.45, s * 0.8 + off);
    }
    // 尾巴（卷）
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = Math.max(1, s * 0.22);
    ctx.beginPath();
    ctx.arc(-w / 2 - s * 0.3, -s * 0.15, s * 0.32, 0, Math.PI * 1.6);
    ctx.stroke();
    // 速度线
    if (speed > 0.2) {
      ctx.strokeStyle = 'rgba(255,0,50,' + (0.25 + speed * 0.4) + ')';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const yy = -h / 2 + (i + 1) * (h / 4);
        ctx.beginPath();
        ctx.moveTo(-w / 2 - s * 2 - i * s, yy);
        ctx.lineTo(-w / 2 - s * 0.5, yy);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  /* ============================================================
     回形针助手
     ============================================================ */
  ART.clippy = function (ctx, cx, cy, s, t, opts) {
    opts = opts || {};
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(t * 1.5) * 0.08);
    ctx.strokeStyle = '#b0b0b0';
    ctx.lineWidth = s * 0.16;
    ctx.lineCap = 'round';
    // 纸夹外圈
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, s * 0.9);
    ctx.lineTo(-s * 0.5, -s * 0.55);
    ctx.arc(0, -s * 0.55, s * 0.5, Math.PI, 0);
    ctx.lineTo(s * 0.5, s * 0.35);
    ctx.arc(0, s * 0.35, s * 0.5, 0, Math.PI);
    ctx.lineTo(0, s * 0.1);
    ctx.stroke();
    // 内圈
    ctx.strokeStyle = '#dfdfdf';
    ctx.lineWidth = s * 0.1;
    ctx.beginPath();
    ctx.moveTo(s * 0.2, s * 0.85);
    ctx.lineTo(s * 0.2, -s * 0.5);
    ctx.stroke();
    // 眼睛
    ctx.fillStyle = '#fff';
    ctx.fillRect(-s * 0.22, -s * 0.62, s * 0.16, s * 0.2);
    ctx.fillRect(s * 0.06, -s * 0.62, s * 0.16, s * 0.2);
    ctx.fillStyle = '#000';
    ctx.fillRect(-s * 0.18, -s * 0.58, s * 0.07, s * 0.11);
    ctx.fillRect(s * 0.10, -s * 0.58, s * 0.07, s * 0.11);
    ctx.restore();
  };

  /* ============================================================
     巨型机械猪点阵
     ============================================================ */
  /* ============================================================
     巨型机械猪点阵（用椭圆并集生成，保证读得出侧视猪剪影）
     ============================================================ */
  function pigContains(x, y) {
    const inEllipse = (cx, cy, rx, ry) => {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      return dx * dx + dy * dy <= 1;
    };
    // 躯干
    if (inEllipse(0.53, 0.50, 0.30, 0.21)) return true;
    // 臀（后部更圆）
    if (inEllipse(0.74, 0.52, 0.15, 0.19)) return true;
    // 头
    if (inEllipse(0.235, 0.435, 0.135, 0.135)) return true;
    // 吻部（前突）
    if (inEllipse(0.115, 0.485, 0.075, 0.075)) return true;
    // 下颌
    if (inEllipse(0.19, 0.545, 0.10, 0.06)) return true;
    // 耳朵（更饱满的圆角三角）
    if (inEllipse(0.255, 0.345, 0.055, 0.065)) return true;
    if (y > 0.27 && y < 0.40 && x > 0.215 && x < 0.285) {
      if (x - 0.215 > (0.40 - y) * 1.15) return true;
    }
    // 四条腿
    const legs = [0.33, 0.45, 0.62, 0.74];
    for (let i = 0; i < legs.length; i++) {
      if (x > legs[i] - 0.035 && x < legs[i] + 0.035 && y > 0.60 && y < 0.90) return true;
      // 蹄
      if (x > legs[i] - 0.045 && x < legs[i] + 0.045 && y >= 0.86 && y < 0.93) return true;
    }
    // 卷尾
    const tx = 0.885, ty = 0.40;
    const dx = x - tx, dy = y - ty;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > 0.045 && r < 0.075 && y < 0.50) return true;
    return false;
  }

  ART.pigSculpture = function (n) {
    const out = [];
    const r = U.rng(20250);
    const cols = 58, rows = 33;
    const cells = [];
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const x = gx / cols, y = gy / rows;
        if (pigContains(x, y)) cells.push([x, y]);
      }
    }
    // 均匀遍历需要的格子（保证 n 个点按顺序铺满整个剪影）
    for (let i = 0; i < n; i++) {
      const c = cells[Math.floor((i / n) * cells.length) % cells.length];
      out.push({
        x: c[0],
        y: c[1],
        r: r(),
        rot: 0,
        // 让每个点是唯一格（便于按格去重）
        gx: Math.round(c[0] * cols),
        gy: Math.round(c[1] * rows),
      });
    }
    return out;
  };

  /* ============================================================
     网格 / 太阳 / 大卫 的轻量版本（world.js 有主实现）
     这里提供兼容实现以防 world 未定义
     ============================================================ */
  ART.wireGrid = function (ctx, w, h, t, opts) {
    if (global.World) return global.World.grid(ctx, w, h, t, (opts && opts.energy) || 0, opts || {});
  };
  ART.sun = function (ctx, cx, cy, r, t, opts) {
    if (global.World) return global.World.stripedSun(ctx, cx, cy, r, t, (opts && opts.energy) || 0);
  };
  ART.davidBust = function (ctx, cx, cy, s, t, opts) {
    if (global.World) return global.World.david(ctx, cx, cy, s, t, opts || {});
  };

  /* ============================================================
     DOS 十六进制垃圾
     ============================================================ */
  ART.hexDump = function (n, seed) {
    const r = U.rng(seed || 1);
    const hex = '0123456789ABCDEF';
    const out = [];
    for (let i = 0; i < n; i++) {
      let addr = '0x' + (0x400000 + i * 16).toString(16).toUpperCase().padStart(8, '0');
      let bytes = '';
      for (let b = 0; b < 12; b++) bytes += hex[Math.floor(r() * 16)] + hex[Math.floor(r() * 16)] + ' ';
      out.push(addr + '  ' + bytes + ' ...');
    }
    return out;
  };

  /* ============================================================
     故障贴片
     ============================================================ */
  ART.glitchSlab = function (w, h, seed) {
    const c = canvas(w, h);
    const x = c.getContext('2d');
    const r = U.rng(seed || 1);
    // 妖艳底色
    const hues = ['#ff00aa', '#00ffff', '#ffee00', '#7b00ff', '#ff5500'];
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, hues[Math.floor(r() * hues.length)]);
    g.addColorStop(1, hues[Math.floor(r() * hues.length)]);
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    // 公主
    ART.princess(x, w / 2, h * 0.58, Math.min(w, h) / 210, 1, {
      sixFingers: r() < 0.5, paletteShift: (r() * 320) | 0, mouth: r(), wobble: 1.2,
    });
    // 切片错位
    for (let i = 0; i < 7; i++) {
      const sy = r() * h, sh = 2 + r() * 10;
      const dx = (r() - 0.5) * w * 0.3;
      x.drawImage(c, 0, sy, w, sh, dx, sy, w, sh);
    }
    // 过曝
    x.fillStyle = 'rgba(255,255,255,0.18)';
    x.fillRect(0, 0, w, h);
    return c;
  };

  /* 性能计时（demo 用） */
  ART._bench = function () {
    const c = canvas(1920, 1080), x = c.getContext('2d');
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) global.World.grid(x, 1920, 1080, i * 0.1, 0.5, {});
    const t1 = performance.now();
    for (let i = 0; i < 10; i++) global.World.stripedSun(x, 960, 500, 200, i * 0.1, 0.5);
    const t2 = performance.now();
    for (let i = 0; i < 10; i++) global.World.david(x, 960, 500, 300, i * 0.1, {});
    const t3 = performance.now();
    return { grid: (t1 - t0) / 10, sun: (t2 - t1) / 10, david: (t3 - t2) / 10 };
  };

  global.ART = ART;
})(window);
