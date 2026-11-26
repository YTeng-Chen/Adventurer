// 在真的遊戲裡錄影（從遊戲內部每一格截圖，比螢幕截圖快很多）：
//   node .claude/skills/gear-design/scripts/record.mjs out/ --set dragon --area 4 --wait 4500 --ms 5600 [--hunt 4] [--prefix rec]
// --set 穿上哪一套；--area 在哪張地圖掛機；--wait 開始前等多久（魔物要跑到角色面前）；--ms 錄多久；
// --hunt i 改成錄第 i 張地圖最後一段的頭目戰（狩獵已經併進戰鬥地圖：頭目按鈕在「戰鬥地圖」頁，只列目前地圖的頭目）。輸出 <out>/<prefix>-000.png…（624×448），接著用 sheet.py 排成縮圖表
import fs from 'node:fs';
import { chromium, args, testSave, openGame } from './lib.mjs';
const o = args({ wait: 4500, ms: 5600, prefix: 'rec' }), out = o._[0];
if (o.hunt !== undefined) o.area = o.hunt;   // 頭目按鈕只列目前地圖的
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const { p, errors } = await openGame(b, o, await testSave(o));
await p.waitForTimeout(o.hunt !== undefined ? 1200 : +o.wait);
const info = await p.evaluate(() => (window.__game ? window.__game.renderer.type === 2 ? 'WebGL' : 'Canvas' : '找不到 window.__game（要用 npm run dev 開的開發伺服器）'));
if (o.hunt !== undefined) { await p.click('#tab-battle'); await p.waitForTimeout(300); await p.locator(`[data-act="hunt"][data-i="${o.hunt}"]`).last().click(); }
const frames = await p.evaluate((ms) => new Promise((res) => {
  const g = window.__game, list = [], t0 = performance.now();
  const f = () => {
    if (performance.now() - t0 > ms) { g.events.off('postrender', f); res(list); return; }
    if (!list.length || performance.now() - list[list.length - 1].t > 60) list.push({ t: performance.now() - t0, url: g.canvas.toDataURL() });
  };
  g.events.on('postrender', f);
}), +o.ms);
frames.forEach((f, i) => fs.writeFileSync(`${out}/${o.prefix}-${String(i).padStart(3, '0')}.png`, Buffer.from(f.url.split(',')[1], 'base64')));
console.log(`renderer ${info}, ${frames.length} frames → ${out}/${o.prefix}-*.png`);
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await b.close();
