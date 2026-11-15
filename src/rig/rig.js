// 2D 骨架動畫：角色拆成零件（頭、身體、左右手、左右腿），掛在關節上；動作是讓關節轉動、移動。
// 一件裝備只要畫對應零件的圖，所有動作都能用；一個動作做一次，所有裝備都適用。
// 全部畫在低解析度的 canvas 上（不做平滑），旋轉後仍然是一格一格的像素。
// 座標：零件用參考圖的像素座標（正面 60×109、側面 50×99）；角度單位是度，正值為順時針，0 度表示自然下垂。
import { RIG_PARTS } from './parts-data.js';

const RAD = Math.PI / 180;
const INK = RIG_PARTS.front.ink;
// 兩種視角：正面（六個零件）與側面（朝右；頭、身體、靠近鏡頭的手和腿，後面的手腳是調暗的複製品）
const FOOT = { front: [30, 108], side: [27, 98] };

// ---------- 零件圖 ----------
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function kind(hex) {   // 這格是輪廓、皮膚，還是其他（頭髮、短褲）
  const [r, g, b] = rgb(hex);
  if (r + g + b < 140) return 'ink';
  if (r > 200 && g > 150 && b > 120 && r - b > 25) return 'skin';
  return 'other';
}
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const darker = (hex, f) => { const [r, g, b] = rgb(hex); return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`; };
// 把零件畫成 canvas；paint(x, y, 顏色, 種類) 可以回傳新的顏色（做裝備用），回傳 null 表示這格不畫；dim 是整體調暗（後面的手腳）
function partCanvas(P, name, paint, dim = 1) {
  const part = P.parts[name];
  const c = makeCanvas(part.rows[0].length, part.rows.length), ctx = c.getContext('2d');
  part.rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    const hex = P.pal[ch];
    const col = paint ? paint(part.x + i, part.y + j, hex, kind(hex)) : hex;
    if (!col) return;
    ctx.fillStyle = dim < 1 && col[0] === '#' ? darker(col, dim) : col; ctx.fillRect(i, j, 1, 1);
  }));
  return c;
}

// ---------- 裝備：照身體零件的形狀上色，所以一定合身 ----------
const LEATHER = { vest: '#a8683a', vestL: '#bd7b45', vestD: '#8a5230', belt: '#5a3520', gold: '#f2c14e', trim: '#c98a4a', pad: '#aac2dc', padL: '#d5e2ef',
  glove: '#6e4a2e', pants: '#3d4470', pantsD: '#343a62', pantsL: '#5d6eaa', boot: '#84502c', bootD: '#6e4226', sole: '#5e3a1e', band: '#d0473f', bandL: '#e8736a', bandD: '#7a2630' };
const GEAR_SETS = {
  // 冒險者皮甲：皮背心、斜背帶、護肩、手套、長褲、皮靴、紅頭巾。正面與側面各有一套上色規則（座標不同）。
  leather: {
    front: {
      torso(x, y, hex, k) {
        const C = LEATHER;
        if (k === 'ink') return null;
        if (y >= 74) return k === 'other' ? (rgb(hex)[0] > 200 ? C.pantsL : x > 30 ? C.pantsD : C.pants) : null;   // 短褲 → 長褲上半
        if (k !== 'skin' || y <= 52) return null;
        if (y <= 59 && Math.abs(x - 29.5) <= (60 - y) * 0.55) return null;       // V 領
        if (y >= 70) return x >= 28 && x <= 31 ? C.gold : C.belt;                // 腰帶與扣環
        if (Math.abs(x - 20 - (y - 55)) <= 1) return C.belt;                     // 斜背帶
        if (y === 53 || y === 54) return C.trim;
        return x >= 33 ? C.vestD : x <= 23 ? C.vestL : C.vest;
      },
      arm(x, y, hex, k) {
        const C = LEATHER;
        if (k !== 'skin') return null;
        if (y <= 64) return y <= 60 ? C.padL : C.pad;
        if (y <= 71) return C.vestD;
        return y === 72 ? C.trim : C.glove;
      },
      leg(x, y, hex, k) {
        const C = LEATHER;
        if (k !== 'skin') return null;
        if (y <= 92) return x % 15 > 8 ? C.pantsD : C.pants;
        if (y <= 94) return C.trim;
        return y >= 104 ? C.sole : x % 15 > 9 ? C.bootD : C.boot;
      },
      head(x, y, hex, k) {   // 紅頭巾：綁在額頭上，髮絲的黑線蓋在上面；右邊打結垂下
        const C = LEATHER;
        if (x >= 48 && x <= 51 && y >= 29 && y <= 37) return x === 48 || y === 37 ? C.bandD : y <= 31 ? C.bandL : C.band;
        if (x < 11 || x > 48 || k === 'ink') return null;
        const top = 27 + Math.round(((x - 29.5) / 19) ** 2 * 2);
        return y === top ? C.bandL : y === top + 1 || y === top + 2 ? C.band : y === top + 3 ? C.bandD : null;
      },
    },
    side: {
      torso(x, y, hex, k) {
        const C = LEATHER;
        if (k === 'ink') return null;
        if (y >= 68) return k === 'other' ? C.pants : k === 'skin' ? C.pantsL : null;   // 短褲（含白條）→ 長褲上半
        if (k === 'other' && y <= 47) return null;                                // 脖子的陰影
        if (y <= 48) return null;
        if (y >= 63) return x >= 30 && x <= 32 ? C.gold : C.belt;
        if (y <= 50) return C.trim;
        return x >= 30 ? C.vestL : C.vest;
      },
      arm(x, y, hex, k) {
        const C = LEATHER;
        if (k === 'ink') return null;
        if (y <= 57) return y <= 54 ? C.padL : C.pad;
        if (y <= 64) return C.vestD;
        return y === 65 ? C.trim : C.glove;
      },
      leg(x, y, hex, k) {
        const C = LEATHER;
        if (k !== 'skin') return null;
        if (y <= 85) return C.pants;
        if (y <= 87) return C.trim;
        return y >= 95 ? C.sole : x >= 30 ? C.boot : C.bootD;
      },
      head(x, y, hex, k) {   // 紅頭巾：繞過額頭到後腦，後面打結垂下
        const C = LEATHER;
        if (x >= 4 && x <= 7 && y >= 24 && y <= 33) return x === 7 || y === 33 ? C.bandD : y <= 26 ? C.bandL : C.band;
        if (x < 7 || x > 37 || k === 'ink') return null;
        const top = 22 + Math.round((x - 8) / 12);
        return y === top ? C.bandL : y === top + 1 || y === top + 2 ? C.band : y === top + 3 ? C.bandD : null;
      },
    },
  },
};
// 劍：握柄中心是支點，劍身朝上
function swordCanvas() {
  const c = makeCanvas(13, 44), x = c.getContext('2d');
  const r = (col, px, py, w, h) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  r(INK, 3, 3, 7, 30); r(INK, 4, 1, 5, 2); r(INK, 5, 0, 3, 1);                 // 劍身輪廓
  r('#eef3f8', 4, 3, 2, 29); r('#b9c7d8', 6, 2, 1, 30); r('#8fa0b6', 7, 3, 2, 29);
  r('#eef3f8', 5, 1, 1, 2); r('#b9c7d8', 6, 1, 1, 1); r('#8fa0b6', 7, 2, 1, 1);
  r(INK, 0, 32, 13, 5); r('#f2c14e', 1, 33, 11, 2); r('#b9842a', 1, 35, 11, 1);     // 護手
  r(INK, 4, 37, 5, 7); r('#84502c', 5, 37, 2, 5); r('#5e3a1e', 7, 37, 1, 5); r('#f2c14e', 5, 42, 3, 1);   // 握柄
  return { canvas: c, pivot: [6.5, 39.5] };
}

// ---------- 動作：輸入時間，回傳姿勢與特效 ----------
const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const REST = { x: 0, y: 0, bodyY: 0, torso: 0, head: 0, armL: 0, armR: 0, legL: 0, legR: 0, weapon: 0, fx: [] };

export const ANIMS = {
  idle: { name: '待機', dur: 1.8, loop: true, pose(t) {
    const b = Math.sin(t * Math.PI * 2);
    return { ...REST, bodyY: b > 0.25 ? 1 : 0, armL: 2 + b * 1.5, armR: -2 - b * 1.5, head: b * 0.8, weapon: 14 };
  } },
  walk: { name: '走路', dur: 0.7, loop: true, pose(t) {
    const s = Math.sin(t * Math.PI * 2);
    return { ...REST, bodyY: Math.abs(s) > 0.7 ? 1 : 0, legL: s * 24, legR: -s * 24, armL: -s * 20, armR: s * 16 - 6, torso: 2, weapon: 20 };
  } },
  // 揮砍：往後舉起 → 往前砍下（刀光）→ 收回
  slash: { name: '揮砍', dur: 0.62, pose(t) {
    const a = ease(seg(t, 0, 0.32)), b = ease(seg(t, 0.32, 0.5)), c = ease(seg(t, 0.5, 1));
    const armR = lerp(lerp(0, -165, a), -62, b) * (1 - c);
    const weapon = lerp(lerp(14, 160, a), 190, b) * (1 - c) + 14 * c;
    const fx = [];
    if (t > 0.3 && t < 0.72) fx.push({ type: 'arc', from: -175, to: lerp(-175, -50, b), r: 52, alpha: 1 - seg(t, 0.5, 0.72), width: 8 });
    if (t > 0.42 && t < 0.6) fx.push({ type: 'hit', power: 1 });
    return { ...REST, x: lerp(lerp(0, -3, a), 7, b) * (1 - c), torso: lerp(lerp(0, -7, a), 9, b) * (1 - c), head: lerp(0, -4, a) * (1 - b),
      armR, weapon, armL: lerp(0, 18, b) * (1 - c), legL: lerp(0, -10, b) * (1 - c), legR: lerp(0, 12, b) * (1 - c), bodyY: b > 0.5 && c < 0.5 ? 1 : 0, fx };
  } },
  // 跳斬：蹲下 → 跳起、劍舉過頭 → 落下重擊（大刀光、衝擊波、火花）→ 起身
  jump: { name: '跳斬', dur: 1.15, pose(t) {
    const crouch = ease(seg(t, 0, 0.14)), up = ease(seg(t, 0.14, 0.45)), down = seg(t, 0.52, 0.62), land = ease(seg(t, 0.62, 1));
    const air = up * (1 - down * down);
    const y = -34 * air;
    const armR = lerp(lerp(0, -175, up), -48, ease(down)) * (1 - land);
    const weapon = lerp(lerp(14, 180, up), 200, ease(down)) * (1 - land) + 14 * land;
    const fx = [];
    if (t > 0.5 && t < 0.8) fx.push({ type: 'arc', from: -190, to: lerp(-190, -30, ease(down)), r: 56, alpha: 1 - seg(t, 0.62, 0.8), width: 11, gold: true });
    if (t > 0.6 && t < 0.95) fx.push({ type: 'shock', p: seg(t, 0.6, 0.95) });
    if (t > 0.6 && t < 0.9) fx.push({ type: 'sparks', p: seg(t, 0.6, 0.9) });
    if (t > 0.6 && t < 0.72) fx.push({ type: 'hit', power: 2 });
    if (t > 0.6 && t < 0.7) fx.push({ type: 'shake', amount: 3 });
    const squash = (crouch * (1 - up) + (t > 0.62 ? 1 - land : 0) * 0.9) * 3;
    return { ...REST, x: 10 * ease(seg(t, 0.14, 0.62)) * (1 - land), y, bodyY: Math.round(squash), torso: lerp(lerp(0, -10, up), 14, ease(down)) * (1 - land),
      head: lerp(0, -8, up) * (1 - down), armR, weapon, armL: lerp(lerp(0, -40, up), 30, ease(down)) * (1 - land),
      legL: (-30 * air + (squash ? -8 : 0)), legR: (22 * air + (squash ? 8 : 0)), fx };
  } },
};

// ---------- 骨架 ----------
const FAR = 0.74;   // 側面時，後面的手腳調暗
export class Rig {
  constructor(view = 'side') {
    this.sword = swordCanvas();
    this.weapon = true;
    this.gearName = null;
    this.setView(view);
  }
  setView(view) {
    this.view = view;
    const P = this.P = RIG_PARTS[view];
    this.foot = FOOT[view];
    this.body = Object.fromEntries(Object.keys(P.parts).map((k) => [k, partCanvas(P, k)]));
    if (view === 'side') { this.body.armL = partCanvas(P, 'armR', null, FAR); this.body.legL = partCanvas(P, 'legR', null, FAR); }
    this.setGear(this.gearName);
  }
  setGear(name) {
    this.gearName = name;
    const set = name && GEAR_SETS[name] && GEAR_SETS[name][this.view], P = this.P;
    if (!set) { this.gear = {}; return; }
    const g = { head: partCanvas(P, 'head', set.head), torso: partCanvas(P, 'torso', set.torso), armR: partCanvas(P, 'armR', set.arm), legR: partCanvas(P, 'legR', set.leg) };
    if (this.view === 'side') { g.armL = partCanvas(P, 'armR', set.arm, FAR); g.legL = partCanvas(P, 'legR', set.leg, FAR); }
    else { g.armL = partCanvas(P, 'armL', set.arm); g.legL = partCanvas(P, 'legL', set.leg); }
    this.gear = g;
  }
  // 側面的後手、後腿沿用前手、前腿的位置與支點
  geo(name) { return this.P.parts[name] || this.P.parts[name === 'armL' ? 'armR' : 'legR']; }

  // 把一個零件畫在目前的座標系上，繞自己的支點轉 deg 度；inner() 畫跟著它動的東西（例如手上的武器）
  part(ctx, name, deg, inner, dx = 0) {
    const part = this.geo(name), [px, py] = part.pivot;
    ctx.save();
    ctx.translate(Math.round(part.x + px) + dx, Math.round(part.y + py));
    ctx.rotate(Math.round(deg) * RAD);
    if (inner) inner();
    ctx.drawImage(this.body[name], -Math.round(px), -Math.round(py));
    if (this.gear[name]) ctx.drawImage(this.gear[name], -Math.round(px), -Math.round(py));
    ctx.restore();
  }
  heldWeapon(ctx, pose) {
    const a = this.P.parts.armR, hand = this.P.hands.armR;
    ctx.save();
    ctx.translate(Math.round(hand[0] - a.x - a.pivot[0]), Math.round(hand[1] - a.y - a.pivot[1]));
    ctx.rotate(Math.round(pose.weapon) * RAD);
    ctx.drawImage(this.sword.canvas, -Math.round(this.sword.pivot[0]), -Math.round(this.sword.pivot[1]));
    ctx.restore();
  }

  // 在 (ox, oy)（腳底中心）畫出角色
  draw(ctx, ox, oy, pose) {
    const side = this.view === 'side';
    // 側面時持劍的手自然往前伸，劍尖朝前上方（正面的姿勢是劍豎在身旁）
    if (side) pose = { ...pose, armR: pose.armR - 24, weapon: pose.weapon + 38 };
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(ox - this.foot[0] + pose.x), Math.round(oy - this.foot[1] + pose.y));
    this.part(ctx, 'legL', pose.legL, null, side ? -1 : 0);
    this.part(ctx, 'legR', pose.legR);
    // 上半身：整體上下起伏，並繞腰部前後傾
    const t = this.P.parts.torso;
    ctx.translate(0, pose.bodyY);
    ctx.translate(Math.round(t.x + t.pivot[0]), Math.round(t.y + t.pivot[1]));
    ctx.rotate(Math.round(pose.torso) * RAD);
    ctx.translate(-Math.round(t.x + t.pivot[0]), -Math.round(t.y + t.pivot[1]));
    const weapon = this.weapon ? () => this.heldWeapon(ctx, pose) : null;   // 武器畫在手臂下面，拳頭蓋住握柄
    if (side) {
      this.part(ctx, 'armL', pose.armL, null, 3);       // 後面的手：往前錯開一點，從身體後面露出來
      this.part(ctx, 'torso', 0);
      this.part(ctx, 'head', pose.head);
      this.part(ctx, 'armR', pose.armR, weapon);
    } else {
      this.part(ctx, 'torso', 0);
      this.part(ctx, 'armL', pose.armL);
      this.part(ctx, 'head', pose.head);
      this.part(ctx, 'armR', pose.armR, weapon);
    }
    ctx.restore();
  }

  // 特效：刀光、衝擊波、火花（都用一格一格的像素畫）
  drawFx(ctx, ox, oy, pose) {
    const sh = this.P.parts.armR;
    const cx = ox - this.foot[0] + pose.x + sh.x + sh.pivot[0], cy = oy - this.foot[1] + pose.y + pose.bodyY + sh.y + sh.pivot[1];
    for (const f of pose.fx) {
      if (f.type === 'arc') {
        // 刀光：沿著揮砍的弧線，越靠近劍尖越亮、越寬；尾端變細變淡
        const span = f.to - f.from;
        for (let a = f.from; a <= f.to; a += 1.2) {
          const k = (a - f.from) / (span || 1);                 // 0 = 尾端，1 = 劍尖
          const w = Math.max(1, Math.round(f.width * k));
          for (let i = 0; i < w; i++) {
            const r = f.r - i, x = cx - Math.sin(a * RAD) * r, y = cy + Math.cos(a * RAD) * r;
            const edge = i === 0 || i === w - 1;
            ctx.globalAlpha = f.alpha * (0.25 + 0.75 * k);
            ctx.fillStyle = edge ? (f.gold ? '#f2b84b' : '#8fd3ff') : (f.gold ? '#fff3c4' : '#ffffff');
            ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
          }
        }
        ctx.globalAlpha = 1;
      } else if (f.type === 'shock') {
        // 衝擊波：沿著地面往兩邊擴散的兩道弧
        const w = 16 + f.p * 70;
        ctx.globalAlpha = 1 - f.p;
        ctx.fillStyle = '#fff3c4';
        for (let x = -w; x <= w; x++) {
          const h = Math.round((1 - (x / w) ** 2) * (5 - f.p * 3));
          if (Math.abs(x) > w - 10) ctx.fillRect(Math.round(ox + 30 + x), oy - h, 1, Math.max(1, h));
        }
        ctx.globalAlpha = 1;
      } else if (f.type === 'sparks') {
        for (let i = 0; i < 14; i++) {
          const ang = (-150 + i * 9.5) * RAD, sp = 26 + ((i * 37) % 22);
          const x = ox + 30 + Math.cos(ang) * sp * f.p, y = oy - 4 + Math.sin(ang) * sp * f.p + 30 * f.p * f.p;
          ctx.globalAlpha = 1 - f.p;
          ctx.fillStyle = i % 3 ? '#f2b84b' : '#ffffff';
          ctx.fillRect(Math.round(x), Math.round(y), i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
        }
        ctx.globalAlpha = 1;
      }
    }
  }
}
