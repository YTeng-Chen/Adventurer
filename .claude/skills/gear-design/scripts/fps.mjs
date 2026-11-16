// 量幀數（穿上某一套、在某張地圖掛機），順便抓腳本錯誤：node .claude/skills/gear-design/scripts/fps.mjs --set dragon [--area 0]
// 這台雲端機器沒有真的 GPU，數字會比手機低；看的是「穿之前 vs 穿之後」的落差，以及有沒有掉到 0（卡住）
import { chromium, args, testSave, openGame } from './lib.mjs';
const o = args();
const b = await chromium.launch();
for (const label of ['不穿', '穿上']) {
  const save = await testSave(label === '穿上' ? o : { ...o, set: undefined });
  const { p, errors } = await openGame(b, o, save);
  const samples = [];
  for (let k = 0; k < 5; k++) {
    await p.waitForTimeout(1000);
    samples.push(await p.evaluate(() => new Promise((res) => { const g = window.__game, f0 = g.loop.frame, t0 = performance.now(); setTimeout(() => res(Math.round(((g.loop.frame - f0) / (performance.now() - t0)) * 1000)), 1000); })));
  }
  console.log(label.padEnd(4), 'fps', samples.join(' '), errors.length ? '\n  ERRORS: ' + errors.join('\n  ') : '');
  await p.close();
}
await b.close();
