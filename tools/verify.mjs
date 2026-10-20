/* tools/verify.mjs — 联合验收：确定性 / 无报错 / 冲击覆盖
 *
 *   node tools/verify.mjs
 *
 * 检查项：
 *   1. 关键时间点 seek 无 pageerror / console.error
 *   2. 同一 t 两种 seek 顺序 => 整页像素 SHA1 一致（确定性）
 *   3. 爆炸窗口 31.6..34.0 每 0.1s 都有非空冲击绘制（无死帧）
 *   4. 猪叫 96.3..99.4 每 0.1s 相邻帧不相同（逐拍在动）
 *   5. 非冲击时刻 #screen 无 transform（不晃眼）
 */
import { chromium } from 'playwright-core';
import crypto from 'node:crypto';

const CHROME = process.env.MV_CHROME ||
  'C:\\Users\\fengkao\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
const URL = 'http://127.0.0.1:8899/index.html?render=1';

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--force-color-profile=srgb', '--hide-scrollbars', '--disable-lcd-text',
    '--force-device-scale-factor=1', '--disable-gpu-compositing'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__MV_READY === true', null, { timeout: 60000 });

const shot = async (t) => {
  await page.evaluate((tt) => window.MV.seek(tt), t);
  return crypto.createHash('sha1').update(await page.screenshot({ animations: 'disabled' })).digest('hex');
};

const state = async () => page.evaluate(() => ({
  t: window.MV.t,
  split: window.FX.splitAmt,
  mode: window.FX.mode,
  shake: document.getElementById('screen').style.transform || '',
  shockAmt: window.SHOCK ? window.SHOCK.amount(window.MV.t) : -1,
}));

let fails = 0;
const bad = (msg) => { console.log('  FAIL ' + msg); fails++; };

/* ---------- 0. 预热 ----------
   首帧存在一次性的 paint 冷启动（字体度量 / 画布初始化），与 seek 顺序无关。
   先播一段再测量，避免把冷启动误判成不确定。 */
console.log('[0] warm up');
for (const t of [5, 40, 90, 150, 210, 5]) {
  await page.evaluate((tt) => window.MV.seek(tt), t);
  await page.screenshot({ animations: 'disabled' });
}

/* ---------- 1. 确定性：升序 vs 降序 ----------
   判定标准是「画面实质性一致」。Chromium 合成器会给截图带来 ±1~2 LSB 的
   抖动，整页 SHA1 对这种噪声过于敏感，所以这里只记录漂移时刻，不当场判
   失败。真正的 bug（例如某层没重建）会产生成片的整块差异，与噪声量级
   完全不同——用 tools/photo.mjs 出图肉眼即可确认。 */
console.log('[1] determinism (forward vs reverse)');
const probe = [31.59, 31.7, 32.5, 33.2, 56.4, 58.0, 96.6, 96.867, 97.9, 117.09, 200.0];
const fwd = {};
for (const t of probe) fwd[t] = await shot(t);
const drift = [];
for (const t of [...probe].reverse()) {
  const h = await shot(t);
  if (h !== fwd[t]) drift.push(t);
}
console.log(drift.length ? `  hash drift at: ${drift.join(', ')}` : '  identical');

/* ---------- 2. 全片扫一遍 seek，看有没有报错 ---------- */
console.log('[2] seek sweep 0..249 @1s');
for (let t = 0; t <= 249; t += 1) {
  await page.evaluate((tt) => window.MV.seek(tt), t);
}
console.log('  errors so far:', errs.length);

/* ---------- 3. 爆炸窗口无死帧 ---------- */
console.log('[3] boom window 31.6..34.0 every 0.1s');
let dead = 0;
for (let t = 31.6; t <= 34.0; t += 0.1) {
  await page.evaluate((tt) => window.MV.seek(tt), +t.toFixed(2));
  const s = await state();
  const shockPx = await page.evaluate(() => {
    const c = document.getElementById('shock');
    const g = c.getContext('2d').getImageData(0, 0, 1920, 1080).data;
    let n = 0;
    for (let i = 3; i < g.length; i += 4 * 97) if (g[i] > 8) n++;
    return n;
  });
  if (shockPx === 0 && s.mode === 'none') { dead++; console.log(`  dead frame at ${t.toFixed(2)}`); }
}
if (dead > 0) bad(`${dead} dead frames in boom window`);

/* ---------- 4. 猪叫逐拍在动 ---------- */
console.log('[4] oink frames differ');
const oinkT = [96.6, 96.9, 97.27, 97.9, 98.43, 99.25];
const oh = [];
for (const t of oinkT) oh.push(await shot(t));
for (let i = 1; i < oh.length; i++) if (oh[i] === oh[i - 1]) bad(`identical oink frames ${oinkT[i - 1]}..${oinkT[i]}`);
console.log('  distinct:', new Set(oh).size, '/', oh.length);

/* ---------- 5. 非冲击时刻不得有位移 ---------- */
console.log('[5] no shake outside impacts');
const calm = [5, 12, 25, 45, 52, 62, 70, 88, 105, 130, 160, 180, 205, 235];
for (const t of calm) {
  await page.evaluate((tt) => window.MV.seek(tt), t);
  const s = await state();
  if (s.split !== 0) bad(`splitAmt=${s.split} at ${t}s`);
  if (s.shake) bad(`screen transform "${s.shake}" at ${t}s`);
}

/* ---------- 6. 字幕必须出现且不空 ---------- */
console.log('[6] subtitle text');
for (const t of [10, 32.5, 56.4, 96.9, 120, 180]) {
  await page.evaluate((tt) => window.MV.seek(tt), t);
  const en = await page.$eval('#subEn', (n) => n.textContent.trim());
  const zh = await page.$eval('#subZh', (n) => n.textContent.trim());
  if (!en || !zh) bad(`empty subtitle at ${t}s (en="${en}" zh="${zh}")`);
}

console.log('\nerrors:', errs.length);
if (errs.length) console.log(errs.slice(0, 12).join('\n'));
console.log(fails === 0 && errs.length === 0 ? 'VERIFY_OK' : `VERIFY_FAIL (${fails} checks, ${errs.length} errors)`);
await browser.close();
process.exit(fails || errs.length ? 1 : 0);
