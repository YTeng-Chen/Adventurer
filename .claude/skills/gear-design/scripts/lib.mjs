// 檢查腳本共用的小工具：開瀏覽器、讀參數、建立測試存檔。在專案根目錄執行，開發伺服器要先開著（npm run dev）。
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch (e) { pw = createRequire(path.resolve('package.json'))('playwright'); }
export const { chromium } = pw;

// --key value 形式的參數；沒有 -- 的放進 _
export function args(defaults = {}) {
  const out = { ...defaults, _: [] }, a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) { const k = a[i].slice(2), v = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; out[k] = v; }
    else out._.push(a[i]);
  }
  return out;
}
export const URL_BASE = (o) => o.url || 'http://localhost:5173';
const mod = (p) => import(pathToFileURL(path.resolve(p)).href);

// 測試存檔：等級夠高、所有地圖都能去、可以指定穿上某一套（--set）、在哪張地圖掛機（--area）
export async function testSave(o) {
  const { world: W } = await mod('src/core/world.js');
  const { data: D } = await mod('src/core/data.js');
  const s = W.newGame(Date.now(), 5);
  s.appearance = { gender: o.gender || 'm', color: '深棕' };
  s.hero.level = 60;
  s.guild.rep = D.RANKS[D.RANKS.length - 1].rep;
  s.bossKills = Object.fromEntries(D.AREAS.flatMap((a, i) => a.bosses.map((bo, b) => [`${i}-${b}`, 1])));   // 每張地圖每一段的頭目都打倒過（鍵是「地圖-段」）
  s.areaIdx = +(o.area ?? 0);
  if (o.set) W.giveSet(s, o.set, +(o.rarity ?? 4));
  return s;
}
// 開一頁遊戲，先把存檔塞進去（只塞一次，之後重新整理用遊戲自己存的）
export async function openGame(browser, o, save, viewport = { width: 700, height: 900 }) {
  const p = await browser.newPage({ viewport });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.addInitScript((v) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('adventurer-save-v1', v); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(save));
  await p.goto(URL_BASE(o) + '/');
  return { p, errors };
}
