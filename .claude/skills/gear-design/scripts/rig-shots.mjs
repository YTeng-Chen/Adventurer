// 用骨架預覽頁（/tools/rig.html）截圖：每個參數是一組網址參數，例如
//   node .claude/skills/gear-design/scripts/rig-shots.mjs out/ "gear=dragon&anim=idle&t=0.2&rarity=4&tier=5" "gear=dragon&anim=combo_greatsword&t=0.8&view=front"
// gear 是服裝（bare、sword、bow、hammer、staff，或套裝代號）；anim 是動作（idle、walk、combo_<形態>、quick_<形態>、hurt）；
// t 停在動作的哪個時間點（0–1）；view side／front；gender m／f；rarity 0–4；tier 1–5。輸出 <out>/rig-<參數>.png
import fs from 'node:fs';
import { chromium, args, URL_BASE } from './lib.mjs';
const o = args(), [out, ...qs] = o._;
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch(), errors = [];
for (const q of qs) {
  const p = await b.newPage({ viewport: { width: 900, height: 900 } });
  p.on('pageerror', (e) => errors.push(q + ': ' + e.message));
  await p.goto(`${URL_BASE(o)}/tools/rig.html?${q}`); await p.waitForTimeout(700);
  const f = `${out}/rig-${q.replace(/[^a-z0-9.]+/gi, '_')}.png`;
  await p.locator('.stage').screenshot({ path: f }); console.log(f);
  await p.close();
}
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await b.close();
