// 骨架動畫原型頁：播放動作、切換視角、髮色與裝備，旁邊放一隻史萊姆當目標。
import { Rig, ANIMS, HAIR_COLORS, GENDERS } from '../src/rig/rig.js';
import { sprites as SP } from '../src/ui/sprites.js';
import { data as D } from '../src/core/data.js';

const W = 240, H = 160, GROUND = 144, HERO_X = 84, FOE_X = 178;
const cv = document.getElementById('stage'), ctx = cv.getContext('2d');
cv.width = W; cv.height = H;
const params = new URLSearchParams(location.search);
const state = { anim: params.get('anim') || 'idle', view: params.get('view') || 'side', gender: params.get('gender') || 'm', hair: params.get('hair') || '深棕',
  gear: params.get('gear') ?? 'sword', rarity: +(params.get('rarity') ?? 3), tier: +(params.get('tier') ?? 3) };
const frozen = params.get('t') !== null ? +params.get('t') : null;   // 截圖用：停在動作的某個時間點（0–1）
const rig = new Rig(state.view);
const slime = SP.enemyGrid('slime', '#62c46a');
let start = performance.now(), base = 'idle', blinkAt = 2;

function apply() {
  rig.setView(state.view);
  rig.setLook({ gender: state.gender, color: state.hair });
  const set = OUTFITS[state.gear];
  if (!set) { rig.setEquip({}, true); return; }
  const it = (type, look) => ({ type, look, form: type === 'weapon' ? look : undefined, tier: state.tier, rarity: state.rarity });
  rig.setEquip(Object.fromEntries(Object.entries(set.looks).map(([type, look]) => [type, it(type, look)])), false);
}
// 預覽用的整套外觀（gear.js 的 look）；武器的 look 剛好等於它的形態
const OUTFITS = {
  sword: { n: '劍＋皮甲', looks: { weapon: 'sword', head: 'cap', body: 'leather', feet: 'boots' } },
  bow: { n: '弓＋皮甲', looks: { weapon: 'bow', head: 'cap', body: 'leather', feet: 'boots' } },
  hammer: { n: '鎚＋板甲', looks: { weapon: 'hammer', head: 'helm', body: 'plate', feet: 'greaves' } },
  staff: { n: '法杖＋法袍', looks: { weapon: 'staff', head: 'wizard', body: 'robe', feet: 'shoes' } },
};
function play(name) {
  if (ANIMS[name].loop) base = name;
  state.anim = name; start = performance.now();
  renderOptions();
}
function seg(id, items, cur, onPick) {
  const el = document.getElementById(id);
  el.innerHTML = items.map(([v, label, sw]) => `<button type="button" data-v="${v}" aria-pressed="${String(cur()) === String(v)}">${sw ? `<i style="background:${sw}"></i>` : ''}${label}</button>`).join('');
  el.onclick = (e) => { const b = e.target.closest('button'); if (b) { onPick(b.dataset.v); renderOptions(); } };
}
function renderOptions() {
  seg('anims', Object.entries(ANIMS).filter(([k]) => !k.startsWith('quick_')).map(([k, a]) => [k, a.name]), () => state.anim, (v) => play(v));
  seg('view', [['side', '側面'], ['front', '正面']], () => state.view, (v) => { state.view = v; apply(); });
  seg('gender', Object.entries(GENDERS), () => state.gender, (v) => { state.gender = v; apply(); });
  seg('hair', Object.entries(HAIR_COLORS).map(([k, v]) => [k, k, v[1]]), () => state.hair, (v) => { state.hair = v; apply(); });
  seg('gear', [['bare', '沒穿裝備'], ...Object.entries(OUTFITS).map(([k, o]) => [k, o.n])], () => state.gear, (v) => { state.gear = v; apply(); });
  seg('rarity', D.RARITY.map((r, i) => [i, r.n, r.color]), () => state.rarity, (v) => { state.rarity = +v; apply(); });
  seg('tier', [1, 2, 3, 4, 5].map((t) => [t, 'T' + t]), () => state.tier, (v) => { state.tier = +v; apply(); });
}

function frame(now) {
  let anim = ANIMS[state.anim];
  let t = frozen !== null ? frozen : (now - start) / 1000 / anim.dur;
  if (frozen === null) {
    if (anim.loop) t %= 1;
    else if (t >= 1) { play(base); anim = ANIMS[state.anim]; t = 0; }
  }
  const sec = now / 1000;
  let blink = false;
  if (frozen === null && sec > blinkAt) { blink = true; if (sec > blinkAt + 0.13) blinkAt = sec + 2 + Math.random() * 2.5; }
  if (params.get('blink')) blink = true;
  const pose = anim.pose(t, (FOE_X - HERO_X));
  const shake = pose.fx.find((f) => f.type === 'shake'), hit = pose.fx.find((f) => f.type === 'hit');
  const sx = shake ? Math.round((Math.random() - 0.5) * 2 * shake.amount) : 0, sy = shake ? Math.round((Math.random() - 0.5) * shake.amount) : 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#2a3554'; ctx.fillRect(0, 0, W, H);
  ctx.translate(sx, sy);
  ctx.fillStyle = '#4e6a3f'; ctx.fillRect(-4, GROUND, W + 8, H - GROUND + 4);
  ctx.fillStyle = '#42593a'; for (let x = 0; x < W; x += 16) ctx.fillRect(x, GROUND, 8, 2);
  ctx.fillStyle = 'rgba(10,13,19,.35)';
  ctx.fillRect(HERO_X - 14 + Math.round(pose.x), GROUND + 1, 28, 3);
  ctx.fillRect(FOE_X - 20, GROUND + 1, 44, 3);
  // 史萊姆：被打到時閃白、往後退
  const fx = FOE_X - 24 + (hit ? 4 * hit.power : 0), fy = GROUND - 46 + Math.round(Math.sin(now / 350) * 1.5);
  SP.draw(ctx, slime, fx, fy, 1.5, { flash: hit ? 0.8 : 0 });
  rig.draw(ctx, HERO_X, GROUND, pose, blink);
  rig.drawFx(ctx, HERO_X, GROUND, pose, sec);
  requestAnimationFrame(frame);
}
apply();
renderOptions();
requestAnimationFrame(frame);
window.__rig = { state, play };
