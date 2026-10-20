/* tools/photo.mjs — 快速对 index.html 的任意时刻截图，用于查看与迭代 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:\\Users\\fengkao\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
const BASE = 'http://127.0.0.1:8899/index.html?render=1';
const args = process.argv.slice(2);
const times = (args.filter((a) => !a.startsWith('--')).join(',') || '5')
  .split(',').map(Number).filter((n) => !isNaN(n));
const tag = (args.find((a) => a.startsWith('--tag=')) || '--tag=shot').split('=')[1];
const outDir = path.resolve('tools/_phot');

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--force-color-profile=srgb', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required',
    '--force-device-scale-factor=1', '--disable-lcd-text',
    // GPU compositing adds a +-1 LSB dither to screenshots, which makes
    // pixel-hash regressions flaky.  Software compositing is deterministic
    // (same reason tools/record.mjs carries this flag).
    '--disable-gpu-compositing'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
try {
  await page.waitForFunction('window.__MV_READY === true', null, { timeout: 30000 });
} catch (e) {
  console.log('NOT READY. errors:\n' + errs.join('\n'));
  await browser.close();
  process.exit(1);
}

for (const t of times) {
  await page.evaluate((tt) => window.MV.seek(tt), t);
  const file = path.join(outDir, `${tag}_${String(t).replace('.', 'p')}.png`);
  await page.screenshot({ path: file, animations: 'disabled', caret: 'hide' });
  console.log('shot', file);
}
if (errs.length) console.log('ERRORS:\n' + errs.slice(0, 20).join('\n'));
await browser.close();
