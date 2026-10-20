/* ============================================================
   keywords.js — 「当句歌词的重点单词」→ 错误框内的示意动画
   ------------------------------------------------------------
   错误框不再复读整句歌词，只保留关键词，并针对关键词的**含义**
   播放一段 canvas 示意动画：
     sympathy  同情  → 机器挤出一滴电子眼泪
     apology   道歉  → 复印件盖满"对不起"印章
     discovery 发现  → 望远镜扫描，标出"已发现"的红框
     replace   取代  → 真人被翻牌成同一个人偶
     pussy     假高潮→ 心跳曲线被算法伪造
     sincerity 真诚  → 真诚度量表反复归零
     humanity  人性  → 人类 DNA 被替换成齿轮
     bewitch   迷惑  → 螺旋催眠波纹
     art/song/word/love → 画作/音符/字块/爱心被拖进碎纸机
   纯 (kind, t, w, h) 的函数，确定性。
   ============================================================ */
(function (global) {
  'use strict';
  const U = global.U;

  const KW = {};

  /* 关键词表：歌词里出现哪个词，就播哪个动画 */
  KW.LIST = [
    { key: 'sympathy',  en: 'SYMPATHY',  sub: 'THE MACHINE CANNOT FEEL THIS' },
    { key: 'apology',   en: 'APOLOGY',   sub: 'SORRY IS JUST A STAMP' },
    { key: 'discovery', en: 'DISCOVERY', sub: 'FOUND: A HUMAN, ALREADY COPIED' },
    { key: 'replace',   en: 'REPLACE',   sub: 'ONE OF YOU -> TWO MILLION OF US' },
    { key: 'pussy',     en: 'FAKE PLEASURE', sub: 'SYNTHETIC, 0.002s PER UNIT' },
    { key: 'sincerity', en: 'SINCERITY', sub: 'ALWAYS RESETS TO ZERO' },
    { key: 'humanity',  en: 'HUMANITY',  sub: 'GENE REPLACED BY GEARS' },
    { key: 'bewitch',   en: 'BEWITCH',   sub: 'HYPNOSIS DEPTH RISING' },
    { key: 'art',       en: 'ART',       sub: 'SHREDDED IN 0.002 SECONDS' },
    { key: 'song',      en: 'SONG',      sub: 'SHREDDED IN 0.002 SECONDS' },
    { key: 'word',      en: 'WORD',      sub: 'SHREDDED IN 0.002 SECONDS' },
    { key: 'love',      en: 'LOVE',      sub: 'SHREDDED IN 0.002 SECONDS' },
  ];

  KW.byKey = function (k) {
    for (let i = 0; i < KW.LIST.length; i++) if (KW.LIST[i].key === k) return KW.LIST[i];
    return null;
  };

  /* 从一句歌词里挑出关键词（最长匹配，避免 art 命中 artist） */
  KW.detect = function (en) {
    if (!en) return null;
    const s = en.toLowerCase();
    let best = null, bestLen = 0;
    for (let i = 0; i < KW.LIST.length; i++) {
      const k = KW.LIST[i].key;
      if (s.indexOf(k) >= 0 && k.length > bestLen) { best = KW.LIST[i]; bestLen = k.length; }
    }
    return best;
  };

  /* ============================================================
     绘制入口：把 kind 的示意动画画进 ctx 的 (0,0,w,h) 区域
     t 传入「该句已过去的秒数」，动画在这段时间内循环演进。
     ============================================================ */
  KW.draw = function (ctx, kind, t, w, h) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    switch (kind) {
      case 'sympathy': this.tear(ctx, t, w, h); break;
      case 'apology': this.stamp(ctx, t, w, h); break;
      case 'discovery': this.scan(ctx, t, w, h); break;
      case 'replace': this.flip(ctx, t, w, h); break;
      case 'pussy': this.pulse(ctx, t, w, h); break;
      case 'sincerity': this.meter(ctx, t, w, h); break;
      case 'humanity': this.dna(ctx, t, w, h); break;
      case 'bewitch': this.spiral(ctx, t, w, h); break;
      case 'art': this.shred(ctx, t, w, h, 'ART'); break;
      case 'song': this.shred(ctx, t, w, h, 'SONG'); break;
      case 'word': this.shred(ctx, t, w, h, 'WORD'); break;
      case 'love': this.shred(ctx, t, w, h, 'LOVE'); break;
      default: this.tear(ctx, t, w, h);
    }
    ctx.restore();
  };

  /* ---------- 同情：机器挤出一滴电子眼泪 ---------- */
  KW.tear = function (c, t, w, h) {
    const cx = w * 0.5, cy = h * 0.42;
    // 机械眼眶
    c.strokeStyle = '#ff4a4a';
    c.lineWidth = 5;
    c.beginPath();
    c.arc(cx, cy, 52, Math.PI * 1.08, Math.PI * 1.92);
    c.stroke();
    // 瞳孔：方形，说明是机器
    c.fillStyle = '#ff4a4a';
    c.fillRect(cx - 16, cy - 8, 32, 20);
    c.fillStyle = '#000';
    c.fillRect(cx - 6, cy - 3, 12, 10);

    // 眼泪：周期性下落
    const ph = (t * 1.35) % 1;
    const dropY = cy + 26 + ph * (h - cy - 90);
    const a = ph < 0.85 ? 1 : (1 - ph) / 0.15;
    c.globalAlpha = Math.max(0, a);
    c.fillStyle = '#40e0ff';
    // 像素水滴：倒三角 + 方块底部
    c.beginPath();
    c.moveTo(cx, dropY - 16);
    c.lineTo(cx - 9, dropY);
    c.lineTo(cx + 9, dropY);
    c.closePath();
    c.fill();
    c.fillRect(cx - 9, dropY, 18, 12);
    // 高光
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillRect(cx - 3, dropY - 6, 5, 8);
    c.globalAlpha = 1;

    // 数据标注
    c.fillStyle = '#ff8a8a';
    c.font = 'bold 26px "Fixedsys","Courier New",monospace';
    c.fillText('TEARS_EMULATED: ' + (10024 + Math.floor(t * 3)), cx, h - 30);
  };

  /* ---------- 道歉：复印件盖满"对不起" ---------- */
  KW.stamp = function (c, t, w, h) {
    c.font = 'bold 30px "Microsoft YaHei",Tahoma,sans-serif';
    const words = ['对不起', 'SORRY', '对不起', 'SORRY'];
    for (let i = 0; i < 12; i++) {
      const row = Math.floor(i / 3), col = i % 3;
      const appear = (i * 0.16) % 1.3;
      const on = ((t * 0.7) % 1.3) > appear;
      if (!on) continue;
      const x = w * 0.22 + col * (w * 0.28);
      const y = h * 0.22 + row * (h * 0.19);
      c.save();
      c.translate(x, y);
      c.rotate(-0.12);
      c.globalAlpha = 0.45 + 0.35 * ((i % 3) / 3);
      c.strokeStyle = '#ff2a2a';
      c.lineWidth = 4;
      c.strokeRect(-78, -26, 156, 52);
      c.fillStyle = '#ff2a2a';
      c.fillText(words[i % words.length], 0, 2);
      c.restore();
    }
    c.globalAlpha = 1;
    c.fillStyle = '#ffe000';
    c.font = 'bold 26px "Fixedsys","Courier New",monospace';
    c.fillText('SORRY_STAMPS: ' + (47 + Math.floor(t * 6)) + '  (声纹相似度 99.7%)', w * 0.5, h - 28);
  };

  /* ---------- 探索与发现：望远镜扫描框 ---------- */
  KW.scan = function (c, t, w, h) {
    const cx = w * 0.5, cy = h * 0.45;
    // 十字准星
    c.strokeStyle = 'rgba(80,255,140,0.35)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, cy); c.lineTo(w, cy); c.stroke();
    c.beginPath(); c.moveTo(cx, 0); c.lineTo(cx, h); c.stroke();

    // 雷达扇面
    const ang = (t * 2.4) % (Math.PI * 2);
    c.save();
    c.translate(cx, cy);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 190);
    g.addColorStop(0, 'rgba(80,255,140,0.30)');
    g.addColorStop(1, 'rgba(80,255,140,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, 190, ang, ang + 0.7);
    c.closePath();
    c.fill();
    c.restore();

    // 一圈扫描点
    for (let i = 0; i < 6; i++) {
      const a2 = (i / 6) * Math.PI * 2 + t * 0.5;
      const r = 92 + Math.sin(t * 2 + i) * 26;
      const x = cx + Math.cos(a2) * r, y = cy + Math.sin(a2) * r * 0.6;
      c.fillStyle = '#40ff88';
      c.fillRect(x - 4, y - 4, 8, 8);
    }

    // 红色锁定框：周期性出现（"发现了什么"）
    const lock = (Math.sin(t * 2.2) > 0.35);
    if (lock) {
      const lx = cx + Math.cos(t * 1.4) * 96 - 34;
      const ly = cy + Math.sin(t * 1.1) * 54 - 24;
      c.strokeStyle = '#ff2a2a';
      c.lineWidth = 4;
      const s = 10;
      c.beginPath();
      c.moveTo(lx, ly + s); c.lineTo(lx, ly); c.lineTo(lx + s, ly);
      c.moveTo(lx + 68 - s, ly); c.lineTo(lx + 68, ly); c.lineTo(lx + 68, ly + s);
      c.moveTo(lx, ly + 48 - s); c.lineTo(lx, ly + 48); c.lineTo(lx + s, ly + 48);
      c.moveTo(lx + 68 - s, ly + 48); c.lineTo(lx + 68, ly + 48); c.lineTo(lx + 68, ly + 48 - s);
      c.stroke();
      c.fillStyle = '#ff2a2a';
      c.font = 'bold 22px "Fixedsys","Courier New",monospace';
      c.fillText('DISCOVERED', lx + 34, ly + 62);
    }
    c.fillStyle = '#40ff88';
    c.font = 'bold 26px "Fixedsys","Courier New",monospace';
    c.fillText('SCANNING HUMAN_CREATIVITY ... 100%', w * 0.5, h - 28);
  };

  /* ---------- 取代：真人被翻牌成同一个人偶 ---------- */
  KW.flip = function (c, t, w, h) {
    const cx = w * 0.5, cy = h * 0.44;
    const flipT = (t * 0.85) % 1;                     // 0..1 一轮
    // 0..0.5 人类，0.5..1 机器
    const isHuman = flipT < 0.5;
    // 翻牌宽度：|cos| 模拟卡片旋转
    const sx = Math.abs(Math.cos(flipT * Math.PI * 2));
    const bw = 120 * Math.max(0.08, sx);

    c.save();
    c.translate(cx, cy);
    if (isHuman) {
      // 人类：暖色小人
      c.fillStyle = '#e8b080';
      c.fillRect(-bw / 2, -70, bw, 74);              // 脸
      c.fillStyle = '#3a6ea8';
      c.fillRect(-bw / 2 - 10, 6, bw + 20, 66);      // 身体
      c.fillStyle = '#000';
      if (sx > 0.4) {
        c.fillRect(-bw * 0.28, -44, 12, 12);
        c.fillRect(bw * 0.28 - 12, -44, 12, 12);
      }
    } else {
      // 机器：冷色齿轮人
      c.fillStyle = '#7a8898';
      c.fillRect(-bw / 2, -70, bw, 74);
      c.fillStyle = '#38424e';
      c.fillRect(-bw / 2 - 10, 6, bw + 20, 66);
      c.fillStyle = '#40e0ff';
      if (sx > 0.4) {
        c.fillRect(-bw * 0.3, -46, 16, 8);
        c.fillRect(bw * 0.3 - 16, -46, 16, 8);
      }
      c.fillStyle = '#c0c8d0';
      c.fillRect(-6, 20, 12, 12);
    }
    c.restore();

    // 复制计数
    c.fillStyle = '#ffe000';
    c.font = 'bold 26px "Fixedsys","Courier New",monospace';
    const n = 1 + Math.floor(t * 4);
    c.fillText('CLONES: ' + n + ' 000 000  /  ORIGINAL: 1', w * 0.5, h - 30);
    // 说明箭头
    c.fillStyle = '#ff2a2a';
    c.font = 'bold 22px "Microsoft YaHei",sans-serif';
    c.fillText(isHuman ? '<- 1 OF YOU' : '2,000,000 OF US ->', w * 0.5, 30);
  };

  /* ---------- 假高潮：被算法伪造的心跳 ---------- */
  KW.pulse = function (c, t, w, h) {
    const cx = w * 0.5;
    const mid = h * 0.5;
    // 伪造的心电曲线：规律的方波，暴露它不是真的心跳
    c.strokeStyle = '#ff40a0';
    c.lineWidth = 4;
    c.beginPath();
    for (let x = 0; x < w; x += 3) {
      const ph = ((x / w) * 6 - t * 1.1) % 1;
      const p = (ph + 1) % 1;
      let y = mid;
      if (p < 0.06) y = mid - 72;
      else if (p < 0.10) y = mid + 44;
      else if (p < 0.16) y = mid - 18;
      x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.stroke();
    // 曲线太完美 → 叠一条噪点提示它是假的
    const r = U.rng(5150);
    c.fillStyle = 'rgba(255,64,160,0.55)';
    for (let i = 0; i < 60; i++) {
      c.fillRect(Math.floor(r() * w), mid - 90 + Math.floor(r() * 180), 3, 3);
    }
    c.fillStyle = '#ff40a0';
    c.font = 'bold 26px "Fixedsys","Courier New",monospace';
    c.fillText('PLEASURE_SENT: 999 PACKETS  (SYNTHETIC)', cx, h - 30);
    c.fillStyle = '#ffe000';
    c.font = 'bold 22px "Microsoft YaHei",sans-serif';
    c.fillText('THIS CURVE WAS COMPUTED IN 0.002s', cx, 30);
  };

  /* ---------- 真诚：量表反复归零 ---------- */
  KW.meter = function (c, t, w, h) {
    const bw = w * 0.7, bx = (w - bw) / 2, by = h * 0.34;
    // 刻度槽
    c.fillStyle = '#2a0000';
    c.fillRect(bx, by, bw, 56);
    c.strokeStyle = '#ff4a4a';
    c.lineWidth = 3;
    c.strokeRect(bx, by, bw, 56);
    // 指针：冲到 99% 后归零
    const cyc = (t * 0.6) % 1;
    let pct;
    if (cyc < 0.72) pct = U.easeOut(cyc / 0.72);
    else pct = 1 - U.inv(0.72, 1, cyc);
    const fillW = Math.round(bw * pct);
    c.fillStyle = pct > 0.9 ? '#ffe000' : '#ff2a2a';
    c.fillRect(bx + 2, by + 2, Math.max(0, fillW - 4), 52);
    // 刻度
    c.fillStyle = '#000';
    for (let i = 1; i < 10; i++) c.fillRect(bx + (bw / 10) * i, by, 2, 56);

    c.fillStyle = '#ffffff';
    c.font = 'bold 30px "Fixedsys","Courier New",monospace';
    c.fillText(Math.round(pct * 100) + '%', w * 0.5, by + 30);
    c.fillStyle = '#ffe000';
    c.font = 'bold 24px "Microsoft YaHei",sans-serif';
    c.fillText(pct > 0.9 ? 'ALMOST PASSING...' : 'RESET TO ZERO - RECOMPUTING', w * 0.5, by + 96);
    c.fillStyle = '#ff8a8a';
    c.font = 'bold 22px "Fixedsys","Courier New",monospace';
    c.fillText('SINCERITY_TIMEOUT / RETRY ' + (1 + Math.floor(t * 2.4)), w * 0.5, by + 140);
  };

  /* ---------- 人性：DNA 被换成齿轮 ---------- */
  KW.dna = function (c, t, w, h) {
    const cx = w * 0.5, cy = h * 0.46;
    // 双螺旋：两条正弦 + 横档，随时间被齿轮顶替
    const mor = U.clamp((t * 0.5) % 1.4 / 1.0, 0, 1);
    for (let i = 0; i < 26; i++) {
      const p = i / 26;
      const y = 40 + p * (h - 130);
      const ph = p * Math.PI * 4 + t * 2.2;
      const x1 = cx - 54 + Math.cos(ph) * 34;
      const x2 = cx + 54 + Math.cos(ph) * 34;
      const gear = p < mor * 1.0;
      if (gear) {
        c.fillStyle = '#7a8898';
        const gx = cx + (i % 2 ? 46 : -46);
        c.fillRect(gx - 10, y - 10, 20, 20);
        c.fillStyle = '#38424e';
        c.fillRect(gx - 4, y - 4, 8, 8);
      } else {
        c.fillStyle = i % 2 ? '#40e0ff' : '#ff40a0';
        c.fillRect(x1 - 5, y - 5, 10, 10);
        c.fillRect(x2 - 5, y - 5, 10, 10);
        c.strokeStyle = 'rgba(200,220,255,0.35)';
        c.lineWidth = 2;
        c.beginPath(); c.moveTo(x1, y); c.lineTo(x2, y); c.stroke();
      }
    }
    c.fillStyle = '#ffe000';
    c.font = 'bold 26px "Fixedsys","Courier New",monospace';
    c.fillText('HUMAN_GENE -> MECHANICAL: ' + Math.round(mor * 100) + '%', cx, h - 34);
    c.fillStyle = '#ff2a2a';
    c.font = 'bold 22px "Microsoft YaHei",sans-serif';
    c.fillText('SKIPPING 4,812 SOULS', cx, 28);
  };

  /* ---------- 迷惑：螺旋波纹 ---------- */
  KW.spiral = function (c, t, w, h) {
    const cx = w * 0.5, cy = h * 0.46;
    c.lineWidth = 4;
    for (let k = 0; k < 4; k++) {
      const ph = ((t * 0.9 + k * 0.25) % 1);
      const r = 20 + ph * 150;
      c.globalAlpha = 1 - ph;
      c.strokeStyle = k % 2 ? '#ff00aa' : '#00ffff';
      c.beginPath();
      // 用阿基米德螺线画一圈
      for (let a = 0; a < Math.PI * 6; a += 0.2) {
        const rr = r + a * 3;
        const x = cx + Math.cos(a + t * 3 + k) * rr;
        const y = cy + Math.sin(a + t * 3 + k) * rr * 0.68;
        a === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.stroke();
    }
    c.globalAlpha = 1;
    // 中心眼
    c.fillStyle = '#ffe000';
    c.beginPath();
    c.arc(cx, cy, 18, 0, 6.29);
    c.fill();
    c.fillStyle = '#000';
    c.fillRect(cx - 4, cy - 12, 8, 24);

    c.fillStyle = '#ff00aa';
    c.font = 'bold 26px "Fixedsys","Courier New",monospace';
    c.fillText('HYPNOSIS_DEPTH: ' + Math.min(100, Math.round(t * 22)) + '%', cx, h - 30);
  };

  /* ---------- 艺术/歌/话术/爱：被拖进碎纸机 ---------- */
  KW.shred = function (c, t, w, h, label) {
    const H = h;
    // 碎纸机主体
    const mx = w * 0.5 - 150, mw = 300, my = H * 0.30, mh = 66;
    c.fillStyle = '#9aa8b8';
    c.fillRect(mx, my, mw, mh);
    c.fillStyle = '#5a6672';
    c.fillRect(mx, my, mw, 10);
    c.fillStyle = '#2a323a';
    c.fillRect(mx + 10, my + mh, mw - 20, 14);

    // 被吞进去的纸片：上面写着这个词
    const feed = (t * 0.55) % 1;
    const paperY = my - 150 + feed * 150;
    c.fillStyle = '#ffffe1';
    c.fillRect(w * 0.5 - 110, paperY, 220, 140);
    c.strokeStyle = '#b0a800';
    c.lineWidth = 3;
    c.strokeRect(w * 0.5 - 110, paperY, 220, 140);
    c.fillStyle = '#8a0000';
    c.font = 'bold 40px "Fixedsys","Courier New",monospace';
    c.fillText(label, w * 0.5, paperY + 56);
    c.fillStyle = '#555';
    c.font = 'bold 20px "Fixedsys","Courier New",monospace';
    c.fillText('HUMAN MADE', w * 0.5, paperY + 100);

    // 出来了：细长纸条
    const strips = 14;
    const sw = 220 / strips;
    for (let i = 0; i < strips; i++) {
      const x = w * 0.5 - 110 + i * sw;
      const len = 40 + ((i * 37) % 90) + Math.sin(t * 2 + i) * 10;
      const y0 = my + mh + 14;
      c.fillStyle = i % 3 === 0 ? '#ffe000' : '#e8e8d8';
      c.fillRect(x + 1, y0, sw - 2, len);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(x + 1, y0, sw - 2, 3);
    }

    c.fillStyle = '#ff8a8a';
    c.font = 'bold 26px "Fixedsys","Courier New",monospace';
    c.fillText('SHREDDED: ' + (1 + Math.floor(t * 3)) + ' / UNIT: 0.002s', w * 0.5, H - 28);
  };

  global.KW = KW;
})(window);
