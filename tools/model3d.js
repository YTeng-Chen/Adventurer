// 3D 角色原型頁：切換外觀、裝備、動作；旁邊畫同外觀的 2D 版對照。
import { PixelStage } from '../src/three/pixelStage.js';
import { Character3D } from '../src/three/character3d.js';
import { sprites as SP } from '../src/ui/sprites.js';
import { data as D } from '../src/core/data.js';

const LOW_W = 240, LOW_H = 170;
const YAW = 15;   // 遊戲裡的固定角度：接近正面，稍微轉向右邊的敵人
const state = { gender: '男', style: '中分', color: '栗棕', gear: 'blade', rarity: 3, tier: 3, action: 'idle', inspect: false };

// 地面在畫面 80% 的高度：y=0 要落在中心往下 30% 的位置
const stage = new PixelStage(document.getElementById('c3d'), { w: LOW_W, h: LOW_H, viewH: LOW_H, lookY: LOW_H * 0.3, pitch: 0.16 });
let hero = null;
function equip() {
  if (state.gear === 'none') return {};
  const it = (type) => ({ type, tag: state.gear, tier: state.tier, rarity: state.rarity });
  return { weapon: it('weapon'), head: it('head'), body: it('body'), feet: it('feet') };
}
function look() { return { gender: state.gender, style: state.style, color: state.color }; }

function rebuild() {
  if (hero) stage.scene.remove(hero.group);
  hero = new Character3D(look(), equip());
  hero.group.position.set(-30, 0, 0);
  hero.play(state.action === 'attack' ? 'idle' : state.action);
  stage.scene.add(hero.group);
  draw2d();
}
function draw2d() {
  const cv = document.getElementById('c2d');
  const g = SP.heroGrid(equip(), look());
  const wrap = document.getElementById('stage');
  const s = wrap.clientWidth / LOW_W;             // 和 3D 同樣的像素大小
  cv.width = SP.HERO_W; cv.height = SP.HERO_H;
  cv.style.width = SP.HERO_W * s + 'px'; cv.style.height = SP.HERO_H * s + 'px';
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  SP.draw(ctx, g, 0, 0, 1);
}

function seg(id, items, key, onPick) {
  const el = document.getElementById(id);
  el.innerHTML = items.map(([v, label, swatch]) => `<button type="button" data-v="${v}" aria-pressed="${String(state[key]) === String(v)}">${swatch ? `<i style="background:${swatch}"></i>` : ''}${label}</button>`).join('');
  el.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    onPick(b.dataset.v);
    renderOptions();
  };
}
function renderOptions() {
  seg('actions', [['idle', '待機'], ['walk', '走路'], ['attack', '攻擊']], 'action', (v) => {
    if (v === 'attack') { hero.play('attack'); return; }
    state.action = v; hero.play(v);
  });
  seg('gender', [['男', '男生'], ['女', '女生']], 'gender', (v) => {
    if (v !== state.gender) { state.gender = v; state.style = SP.GENDER_STYLES[v][0]; rebuild(); }
  });
  seg('styles', SP.GENDER_STYLES[state.gender].map((s) => [s, s]), 'style', (v) => { state.style = v; rebuild(); });
  seg('colors', Object.entries(SP.HAIR_COLORS).map(([k, v]) => [k, k, v[1]]), 'color', (v) => { state.color = v; rebuild(); });
  seg('gear', [['none', '無'], ...D.TAG_KEYS.map((t) => [t, D.TAGS[t].n])], 'gear', (v) => { state.gear = v; rebuild(); });
  seg('rarity', D.RARITY.map((r, i) => [i, r.n, r.color]), 'rarity', (v) => { state.rarity = +v; rebuild(); });
  seg('tier', [1, 2, 3, 4, 5].map((t) => [t, 'T' + t]), 'tier', (v) => { state.tier = +v; rebuild(); });
}

const inspect = document.getElementById('inspect'), yaw = document.getElementById('yaw');
yaw.value = YAW;
inspect.addEventListener('change', () => { state.inspect = inspect.checked; yaw.disabled = !inspect.checked; if (!inspect.checked) yaw.value = YAW; });
window.addEventListener('resize', draw2d);

rebuild();
renderOptions();
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  hero.update(dt);
  hero.group.rotation.y = (+yaw.value * Math.PI) / 180;
  stage.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__model3d = { state, rebuild, hero: () => hero };
