// 量頭飾的大小（大格，側面朝右）：node .claude/skills/gear-design/scripts/hat-size.mjs [look ...]
// 一般頭盔大約 30 格寬；全罩式的側面最好不要超過 36 格，不然會顯得太寬
import { chromium, args, URL_BASE } from './lib.mjs';
const o = args(), looks = o._.length ? o._ : null;
const b = await chromium.launch(), p = await b.newPage();
await p.goto(`${URL_BASE(o)}/tools/rig.html`); await p.waitForTimeout(400);
const r = await p.evaluate(async (looks) => {
  const { hatCanvas } = await import('/src/rig/hats.js');
  const { data: D } = await import('/src/core/data.js');
  const c3 = { l: '#000', b: '#000', d: '#000', ramp: ['#000', '#000', '#000', '#000'] };
  const m = { leather: c3, metal: c3, cloth: c3, gold: '#000', trim: '#000', gem: '#000', orb: '#000', orbL: '#000' };
  const all = looks || [...new Set(D.GEAR.filter((g) => g.type === 'head').map((g) => g.look))];
  const out = {};
  for (const look of all) for (const g of ['m', 'f']) for (const v of ['side', 'front']) {
    const c = hatCanvas(g, v, { look, rarity: 4, tier: 5 }, m, '#000', 2);
    out[`${look} ${g} ${v}`] = `${c.canvas.width / 2}×${c.canvas.height / 2}`;
  }
  return out;
}, looks);
for (const [k, v] of Object.entries(r)) console.log(k.padEnd(24), v);
await b.close();
