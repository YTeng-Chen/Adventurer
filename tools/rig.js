// 骨架動畫原型頁：播放動作、切換裝備，旁邊放一隻史萊姆當目標。
import { Rig, ANIMS, SIZE } from '../src/rig/rig.js';
import { sprites as SP } from '../src/ui/sprites.js';

const W = 240, H = 160, GROUND = 144, HERO_X = 84, FOE_X = 178;
const cv = document.getElementById('stage'), ctx = cv.getContext('2d');
cv.width = W; cv.height = H;
const params = new URLSearchParams(location.search);
const state = { anim: params.get('anim') || 'idle', gear: params.get('gear') ?? 'leather', weapon: params.get('weapon') !== '0', bones: false };
const frozen = params.get('t') !== null ? +params.get('t') : null;   // 截圖用：停在動作的某個時間點（0–1）
const rig = new Rig();
const slime = SP.enemyGrid('slime', '#62c46a');
let start = performance.now(), base = 'idle';

function apply() { rig.setGear(state.gear || null); rig.weapon = state.weapon; }
function play(name) {
  if (ANIMS[name].loop) base = name;
  state.anim = name; start = performance.now();
  renderOptions();
}
function seg(id, items, cur, onPick) {
  const el = document.getElementById(id);
  el.innerHTML = items.map(([v, label]) => `<button type="button" data-v="${v}" aria-pressed="${String(cur()) === String(v)}">${label}</button>`).join('');
  el.onclick = (e) => { const b = e.target.closest('button'); if (b) { onPick(b.dataset.v); renderOptions(); } };
}
function renderOptions() {
  seg('anims', Object.entries(ANIMS).map(([k, a]) => [k, a.name]), () => state.anim, (v) => play(v));
  seg('gear', [['', '基本身體'], ['leather', '冒險者皮甲']], () => state.gear, (v) => { state.gear = v; apply(); });
  seg('weapon', [['1', '拿劍'], ['0', '空手']], () => (state.weapon ? '1' : '0'), (v) => { state.weapon = v === '1'; apply(); });
}

function frame(now) {
  let anim = ANIMS[state.anim];
  let t = frozen !== null ? frozen : (now - start) / 1000 / anim.dur;
  if (frozen === null) {
    if (anim.loop) t %= 1;
    else if (t >= 1) { play(base); anim = ANIMS[state.anim]; t = 0; }
  }
  const pose = anim.pose(t);
  const shake = pose.fx.find((f) => f.type === 'shake'), hit = pose.fx.find((f) => f.type === 'hit');
  const sx = shake ? Math.round((Math.random() - 0.5) * 2 * shake.amount) : 0, sy = shake ? Math.round((Math.random() - 0.5) * shake.amount) : 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#2a3554'; ctx.fillRect(0, 0, W, H);
  ctx.translate(sx, sy);
  ctx.fillStyle = '#4e6a3f'; ctx.fillRect(-4, GROUND, W + 8, H - GROUND + 4);
  ctx.fillStyle = '#42593a'; for (let x = 0; x < W; x += 16) ctx.fillRect(x, GROUND, 8, 2);
  // 影子
  ctx.fillStyle = 'rgba(10,13,19,.35)';
  ctx.fillRect(HERO_X - 16 + Math.round(pose.x), GROUND + 1, 32, 3);
  ctx.fillRect(FOE_X - 26, GROUND + 1, 52, 3);
  // 史萊姆：被打到時閃白、往後退
  const fx = FOE_X - 32 + (hit ? 4 * hit.power : 0), fy = GROUND - 62 + Math.round(Math.sin(now / 350) * 1.5);
  SP.draw(ctx, slime, fx + 8, fy + 16, 1.5, { flash: hit ? 0.8 : 0 });
  rig.draw(ctx, HERO_X, GROUND, pose);
  rig.drawFx(ctx, HERO_X, GROUND, pose);
  requestAnimationFrame(frame);
}
apply();
renderOptions();
requestAnimationFrame(frame);
window.__rig = { state, play, SIZE };
