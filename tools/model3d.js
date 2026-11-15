// 3D 角色設計稿：男生、女生並排，可以切換角度、動作、髮色。
import { PixelStage } from '../src/three/pixelStage.js';
import { Character3D, HAIR_COLORS } from '../src/three/character3d.js';

const LOW_W = 400, LOW_H = 236, PX = 1.7;   // 低解析度與每單位的像素數：角色約 165 格高
const VIEWS = [['game', '遊戲視角', 18], ['front', '正面', 0], ['q', '斜側', 45], ['side', '側面', 90], ['back', '背面', 180]];
const state = { view: 'game', action: 'idle', male: '深棕', female: '栗棕', outfit: 'base', solo: '' };
const params = new URLSearchParams(location.search);
for (const k of ['view', 'action', 'male', 'female', 'outfit', 'solo']) if (params.get(k)) state[k] = params.get(k);

const stage = new PixelStage(document.getElementById('c3d'), { w: LOW_W, h: LOW_H, pxPerUnit: PX, lookY: 53, pitch: 0.07 });
const yaw = document.getElementById('yaw');
let heroes = [];
function rebuild() {
  for (const h of heroes) stage.scene.remove(h.group);
  stage.skipInNormalPass.length = 0;
  heroes = [new Character3D({ gender: '男', color: state.male, outfit: state.outfit })];
  if (state.solo !== 'male') heroes.push(new Character3D({ gender: '女', color: state.female }));
  if (heroes.length === 2) { heroes[0].group.position.set(-36, 0, 0); heroes[1].group.position.set(36, 0, 0); }
  for (const h of heroes) {
    h.play(state.action === 'attack' ? 'idle' : state.action);
    stage.scene.add(h.group);
    stage.skipInNormalPass.push(h.model.shadow);
    if (params.get('noblink')) h.blinkAt = Infinity;   // 截圖比對用：不眨眼
  }
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
  seg('views', VIEWS.map(([k, n]) => [k, n]), 'view', (v) => { state.view = v; yaw.value = VIEWS.find((x) => x[0] === v)[2]; });
  seg('actions', [['idle', '待機'], ['walk', '走路'], ['attack', '攻擊']], 'action', (v) => {
    if (v === 'attack') { heroes.forEach((h) => h.play('attack')); return; }
    state.action = v; heroes.forEach((h) => h.play(v));
  });
  seg('outfit', [['base', '基本身體'], ['hoodie', '連帽外套']], 'outfit', (v) => { state.outfit = v; rebuild(); });
  const colors = Object.entries(HAIR_COLORS).map(([k, v]) => [k, k, v[1]]);
  seg('maleColor', colors, 'male', (v) => { state.male = v; rebuild(); });
  seg('femaleColor', colors, 'female', (v) => { state.female = v; rebuild(); });
}
yaw.addEventListener('input', () => { state.view = ''; renderOptions(); });

yaw.value = (VIEWS.find((x) => x[0] === state.view) || VIEWS[0])[2];
rebuild();
renderOptions();
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  for (const h of heroes) { h.update(dt); h.group.rotation.y = (+yaw.value * Math.PI) / 180; }
  stage.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__model3d = { state, rebuild, yaw, heroes: () => heroes };
