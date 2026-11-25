// 主題套裝的總表：每一套一個檔案（src/rig/sets/<套裝>.js），這裡把它們接到畫圖的程式。
// 一套的外觀代號（gear.js 的 look）是「套裝代號＋部位」：例如甲蟲女王套裝是 beetleweapon、beetlehelm、beetlebody、beetlefeet。
// 要新增一套：寫一個檔案，加進 LIST；data.js 的 SETS、gear.js 各加對應的資料。
import { weaponCanvas, aura } from './kit.js';
import beetle from './beetle.js';
import wolf from './wolf.js';
import spore from './spore.js';
import goblin from './goblin.js';

const LIST = [beetle, wolf, spore, goblin];

export const THEMES = Object.fromEntries(LIST.map((t) => [t.key, t]));
export const lookOf = (key, part) => key + part;   // part：weapon、helm、body、feet
// 外觀代號 → 這一套
const BY_LOOK = {};
for (const t of LIST) for (const p of ['weapon', 'helm', 'body', 'feet']) BY_LOOK[lookOf(t.key, p)] = t;
export const themeOfLook = (look) => BY_LOOK[look] || null;

// 給 rig.js：上衣、鞋子的畫法、額外零件、武器、光環
export const SET_BODY_LOOKS = Object.fromEntries(LIST.filter((t) => t.body).map((t) => [lookOf(t.key, 'body'), t.body]));
export const SET_FEET_LOOKS = Object.fromEntries(LIST.filter((t) => t.feet).map((t) => [lookOf(t.key, 'feet'), t.feet]));
export const SET_EXTRAS = {};
for (const t of LIST) {
  if (t.bodyExtras) SET_EXTRAS[lookOf(t.key, 'body')] = t.bodyExtras;
  if (t.feetExtras) SET_EXTRAS[lookOf(t.key, 'feet')] = t.feetExtras;
}
export const SET_WEAPONS = Object.fromEntries(LIST.filter((t) => t.weapon).map((t) => [lookOf(t.key, 'weapon'), (it, ink) => weaponCanvas(t.weapon, it, ink)]));
export const SET_AURA_FNS = Object.fromEntries(LIST.filter((t) => t.aura).map((t) => [t.key, (ctx, env, n) => (t.auraFx ? t.auraFx(ctx, env, n) : aura(ctx, env, n, t.aura.kind, t.aura.cols))]));
// 給 hats.js：頭飾的畫法（全罩式的另外列出）
export const SET_HATS = Object.fromEntries(LIST.filter((t) => t.helm).map((t) => [lookOf(t.key, 'helm'), (g, A, m, r) => t.helm(g, A, r)]));
export const SET_FULL_HATS = LIST.filter((t) => t.helmFull).map((t) => lookOf(t.key, 'helm'));
export const SET_ICON_LOOKS = Object.keys(BY_LOOK);
