/* ============================================================
   timeline.js — 高精度时间轴状态机
   绑定 audio.currentTime + requestAnimationFrame（播放模式）
   或 MV.seek(t)（离线逐帧渲染模式）
   ============================================================ */
(function (global) {
  'use strict';
  const U = global.U;

  // ---- 幕与宏观事件（严格对齐 .lrc 时间戳 + 音频能量分析） ----
  const ACTS = [
    { id: 'act1', name: 'THE INNOCENT AGE', cn: '画图板里的纯真年代', t0: 0.0, t1: 17.6 },
    { id: 'act2', name: 'THE WITCH', cn: '算力女巫外挂与印钞机', t0: 17.6, t1: 41.2 },
    { id: 'act3', name: 'THE PURGE', cn: '死机弹窗瀑布与暴力处决', t0: 41.2, t1: 84.6 },
    { id: 'act4', name: 'THE PIG', cn: '磁盘碎片狂飙与进程野猪', t0: 84.6, t1: 152.0 },
    { id: 'act5', name: 'THE JUDGEMENT', cn: '蓝屏审判与源码自杀', t0: 152.0, t1: 248.99 },
  ];

  // ---- 关键节拍点（由 .lrc + 能量包络确定） ----
  const BEATS = {
    firstDraw: 8.9,
    witchInject: 17.6,       // "The witches came"
    massProduce: 21.27,      // "massively produced"
    cloneStorm: 24.5,
    bombs: 31.83,            // "Boom"
    becomeThem: 37.0,        // "That we want to be them"
    earnLike: 39.2,
    chorus3: 41.5,           // sympathy
    endTask: 57.1,           // "Won't let you replace me"
    bewitch: 73.9,           // second + third 副歌
    pigStory: 84.66,         // "capital pig"
    pigRun: 93.4,            // running at 300k
    hardwareLock: 115.0,     // "Unless we become"
    act4End: 150.0,          // 停滞
    bsod: 152.0,
    moralities: 176.2,
    intimacies: 191.2,
    mortalities: 209.8,
    formatStart: 214.0,
    halt: 244.5,
    crtOff: 246.0,
  };

  // ---- 歌词索引（供场景上下文查询） ----
  const L = global.LYRICS || [];
  const B = global.BEATS || null;

  /* ------------------------------------------------------------
     实测起音校正
     .lrc 标的是「词」的时间，不是「声」的时间：这首歌的网格最多
     偏 ±0.35s。所有「文字/特效该在哪一刻出现」都必须用实测起音，
     否则就会出现「音画不同步，后续特效全错」。
     ------------------------------------------------------------ */
  (function applyMeasuredOnsets() {
    if (!B || !B.lines) return;
    for (let i = 0; i < B.lines.length && i < L.length; i++) {
      const m = B.lines[i];
      if (Math.abs(m.t - L[i].t) < 0.02) L[i].onset = m.onset;
      else L[i].onset = L[i].t;      // 网格错位时不强改
    }
  })();

  // 第 i 句的实测起音（没有则退回原时间戳）
  function onsetOf(i) {
    const l = L[i];
    if (!l) return 0;
    return l.onset == null ? l.t : l.onset;
  }
  // 起音序列（严格递增，用于二分）
  const ONSETS = L.map(function (_, i) { return onsetOf(i); });

  const idx = {};
  function findLine(sub, from) {
    for (let i = from || 0; i < L.length; i++) if (L[i].s.toLowerCase().indexOf(sub.toLowerCase()) >= 0) return L[i];
    return null;
  }
  const KEY = {
    princess: findLine('little princess'),
    paint: findLine('liked to paint'),
    sing: findLine('liked to sing'),
    music: findLine('make some music'),
    witches: findLine('witches came'),
    massProduced: findLine('massively produced'),
    beatThem: findLine('beat them'),
    boom: findLine('Dropping bombs'),
    beThem: findLine('want to be them'),
    earn: findLine('Earn like them'),
    sympathy: findLine("robot's robot sympathy"),
    apology: findLine("robot's robot apology"),
    discovery: findLine("robot's robot discovery"),
    replace: findLine('replace me'),
    pussy: findLine('fake pussy'),
    sincerity: findLine('sincerity'),
    humanity: findLine('robot humanity'),
    bewitch: findLine('bewitch'),
    pig: findLine('capital pig'),
    piglets: findLine('soulless piglets'),
    oink: findLine('Oink'),
    threeHundred: findLine('300k'),
    crushing: findLine('Crushing all'),
    rich: findLine('rich ones get rich'),
    powerless: findLine('powerless'),
    become: findLine('just like them'),
    art: findLine("robot's robot art"),
    song: findLine("robot's robot song"),
    word: findLine("robot's robot word"),
    love: findLine("robot's love"),
    expect: findLine('what did you expect'),
    parenting: findLine("Parenting's not"),
    pretending: findLine('Pretending'),
    supremacy: findLine('supremacy'),
    moralities: findLine('Human moralities'),
    intimacies: findLine('Human intimacies'),
    mortalities: findLine('Human mortalities'),
    lalala: findLine('LALALA'),
  };

  // 当前唱到的歌词（按实测起音二分；文字绝不早于声音出现）
  function activeLyric(t) {
    let lo = 0, hi = ONSETS.length - 1, cur = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (ONSETS[mid] <= t + 0.012) { cur = L[mid]; lo = mid + 1; }
      else hi = mid - 1;
    }
    return cur;
  }
  function activeIndex(t) {
    let lo = 0, hi = ONSETS.length - 1, k = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (ONSETS[mid] <= t + 0.012) { k = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    return k;
  }
  function lyricAt(t, lookahead) {
    return activeLyric(t + (lookahead || 0));
  }
  // 这句从什么时候开始唱（实测）
  function lineStart(i) { return ONSETS[i] == null ? 0 : ONSETS[i]; }
  // 这句唱了多久（到下一句实测起音，封顶 given）
  function lineHold(i, cap) {
    const a = onsetOf(i);
    const b = i + 1 < ONSETS.length ? ONSETS[i + 1] : a + (cap || 6);
    return Math.min(b - a, cap == null ? 99 : cap);
  }
  function actAt(t) {
    for (let i = 0; i < ACTS.length; i++) if (t < ACTS[i].t1) return ACTS[i];
    return ACTS[ACTS.length - 1];
  }

  // ---- 音频适配器：离线模式读 audio.json，播放模式用 WebAudio ----
  const Audio = {
    ready: false,
    data: null,
    ctx: null, analyser: null, gain: null, el: null,
    live: { bass: 0, mid: 0, high: 0, rms: 0 },
    async load(url) {
      const res = await fetch(url);
      this.data = await res.json();
      this.ready = true;
      return this;
    },
    // 采样任意时刻的能量（带插值），离线/播放都可用
    at(t) {
      const d = this.data;
      if (!d) return { bass: 0, mid: 0, high: 0, rms: 0, sub: 0, grunt: 0, vocal: 0, flux: 0 };
      const f = t * d.fps;
      const i = Math.floor(f);
      const k = f - i;
      const g = (arr) => {
        if (!arr) return 0;
        const a = arr[Math.max(0, Math.min(arr.length - 1, i))];
        const b = arr[Math.max(0, Math.min(arr.length - 1, i + 1))];
        return a + (b - a) * k;
      };
      return {
        bass: g(d.bass), mid: g(d.mid), high: g(d.high), rms: g(d.rms),
        sub: g(d.sub), grunt: g(d.grunt), vocal: g(d.vocal), flux: g(d.flux),
      };
    },
    /* 瞬时起音强度：只取本帧相对前几帧的跃升，用于「打点」
       （直接读 flux 会把长音也当成重音） */
    accent(t) {
      const d = this.data;
      if (!d || !d.flux) return 0;
      const i = Math.round(t * d.fps);
      const cur = d.flux[Math.max(0, Math.min(d.flux.length - 1, i))];
      let prev = 0;
      for (let k = 2; k <= 8; k++) prev = Math.max(prev, d.flux[Math.max(0, i - k)] || 0);
      return Math.max(0, cur - prev * 0.82);
    },
    /* 最近的实测重音时刻（BEATS.hits 二分），以及距离下一拍的时间 */
    nearHit(t, back) {
      const b = global.BEATS;
      if (!b || !b.hits) return null;
      const h = b.hits;
      let lo = 0, hi = h.length - 1, k = -1;
      while (lo <= hi) {
        const m = (lo + hi) >> 1;
        if (h[m] <= t) { k = m; lo = m + 1; } else hi = m - 1;
      }
      if (k < 0) return null;
      if (back != null && t - h[k] > back) return null;
      return h[k];
    },
    // 低频冲击检测（打点）
    kick(t) {
      const d = this.data;
      if (!d) return 0;
      const i = Math.round(t * d.fps);
      const cur = d.bass[Math.max(0, Math.min(d.bass.length - 1, i))];
      let prev = 0;
      for (let k = 1; k <= 6; k++) prev = Math.max(prev, d.bass[Math.max(0, i - k)] || 0);
      return Math.max(0, cur - prev * 0.92);
    },
    // 实时 WebAudio 分析（仅播放模式）
    initLive(el) {
      if (this.ctx || typeof AudioContext === 'undefined') return;
      try {
        const ctx = new AudioContext();
        const src = ctx.createMediaElementSource(el);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.7;
        const gain = ctx.createGain();
        src.connect(analyser); analyser.connect(gain); gain.connect(ctx.destination);
        this.ctx = ctx; this.analyser = analyser; this.gain = gain; this.el = el;
        this.freq = new Uint8Array(analyser.frequencyBinCount);
      } catch (e) { console.warn('live audio failed', e); }
    },
    readLive() {
      if (!this.analyser) return;
      const a = this.analyser, f = this.freq;
      a.getByteFrequencyData(f);
      const binHz = this.ctx.sampleRate / a.fftSize;
      const avg = (lo, hi) => {
        const i0 = Math.max(0, Math.floor(lo / binHz)), i1 = Math.min(f.length, Math.ceil(hi / binHz));
        let s = 0; for (let i = i0; i < i1; i++) s += f[i];
        return s / Math.max(1, i1 - i0) / 255;
      };
      this.live.bass = avg(20, 120);
      this.live.mid = avg(120, 2000);
      this.live.high = avg(2000, 12000);
      let s = 0; for (let i = 0; i < f.length; i++) s += f[i];
      this.live.rms = s / f.length / 255;
    },
  };

  global.TL = {
    ACTS, BEATS, KEY, L, Audio, BEATS_DATA: B,
    activeLyric, lyricAt, actAt, onsetOf, activeIndex, lineStart, lineHold,
    actIndex(t) { for (let i = 0; i < ACTS.length; i++) if (t < ACTS[i].t1) return i; return ACTS.length - 1; },
    // 幕内进度
    actProgress(t) { const a = global.TL.actAt(t); return U.inv(a.t0, a.t1, t); },
  };
})(window);
