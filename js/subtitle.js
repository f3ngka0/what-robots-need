/* ============================================================
   subtitle.js — 固定置顶的「Win95 双语字幕与隐喻解码器」
   绝对静止：绝不参与任何抖动 / 碎裂 / 故障效果
   ============================================================ */
(function (global) {
  'use strict';
  const U = global.U, TL = global.TL;
  const SUB = {};

  SUB.build = function () {
    const host = document.getElementById('subtitle');
    if (!host) return;
    host.innerHTML =
      '<div class="sub-outer">' +
      '<div class="sub-titlebar">' +
      '<span class="sub-tb-icon">🎤</span>' +
      '<span class="sub-tb-title">VOCAL_DECODER.EXE</span>' +
      '<span class="sub-tb-btns"><i class="sub-tb-btn">_</i><i class="sub-tb-btn">□</i><i class="sub-tb-btn">✕</i></span>' +
      '</div>' +
      '<div class="sub-main">' +
      '<div class="sub-en" id="subEn">· · ·</div>' +
      '<div class="sub-zh" id="subZh">· · ·</div>' +
      '</div>' +
      '<div class="sub-status">' +
      '<div class="sub-cell sub-cell--note" id="subNote">' +
      '<span class="sub-note-icon">💭</span>' +
      '<span class="sub-note-text" id="subNoteText"></span>' +
      '<span class="sub-note-side">' +
      '<span class="sub-time" id="subTime">00:00 / 04:09</span>' +
      '<span class="sub-leds" id="subLeds"></span>' +
      '</span>' +
      '</div>' +
      '</div>' +
      '<div class="sub-prog"><div class="sub-prog-fill" id="subProg"></div></div>' +
      '</div>';
    SUB.el = {
      host: host,
      en: host.querySelector('#subEn'),
      zh: host.querySelector('#subZh'),
      noteText: host.querySelector('#subNoteText'),
      time: host.querySelector('#subTime'),
      prog: host.querySelector('#subProg'),
    };
    // 音频电平条（7 格），逐帧只改开关状态
    const leds = host.querySelector('#subLeds');
    SUB.leds = [];
    for (let i = 0; i < 7; i++) {
      const d = document.createElement('i');
      leds.appendChild(d);
      SUB.leds.push(d);
    }
    SUB._key = '';
  };

  /* 每帧调用；内部做 diff，避免无谓的 DOM 重排 */
  SUB.update = function (t) {
    if (!SUB.el) return;
    /* BIOS 自检阶段（0–8.88s）不显示字幕条：
       那几秒是纯黑开机画面的视觉抓手，字幕会稀释压迫感。 */
    const biosOn = t < 8.88;
    SUB.el.host.style.display = biosOn ? 'none' : 'block';
    if (biosOn) return;
    const ly = TL.activeLyric(t);
    const en = ly ? ly.s : '';
    const zh = en ? (global.zhOf(en) || '') : '';
    const note = global.beatNoteAt ? global.beatNoteAt(t) : '';

    const key = en + '|' + note;
    if (key !== SUB._key) {
      SUB._key = key;

      // 英文原词（空档期显示提示，避免空窗）
      SUB.el.en.textContent = en || '· · · · · ·';
      SUB.el.en.classList.toggle('is-idle', !en);

      // 中文翻译
      if (zh) {
        SUB.el.zh.textContent = zh;
        SUB.el.zh.classList.remove('is-idle');
      } else if (en) {
        SUB.el.zh.textContent = '（译文待补）';
        SUB.el.zh.classList.add('is-idle');
      } else {
        SUB.el.zh.textContent = '♪ 前奏 · 系统启动中 ♪';
        SUB.el.zh.classList.add('is-idle');
      }

      // 潜台词解读（唯一保留的解释行）
      SUB.el.noteText.textContent = note || '听。它在学你说话。';
    }

    // 时间码与进度（每帧更新，纯文本，开销可忽略）
    const dur = (global.MV && global.MV.duration) || 249;
    SUB.el.time.textContent = U.clock(t) + ' / ' + U.clock(dur);
    SUB.el.prog.style.width = (U.clamp(t / dur, 0, 1) * 100).toFixed(2) + '%';

    // 音频电平格：跟随 RMS，做出「正在解析语音」的仪表感
    const e = TL.Audio.at(t);
    const lit = Math.round(U.clamp(e.rms * 1.5 + 0.12, 0, 1) * SUB.leds.length);
    for (let i = 0; i < SUB.leds.length; i++) {
      SUB.leds[i].className = i < lit ? (i > 4 ? 'on hot' : 'on') : '';
    }
  };

  global.SUB = SUB;
})(window);
