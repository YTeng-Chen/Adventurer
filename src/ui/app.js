// HTML 介面：選單、表格、背包、任務這些文字多的畫面。遊戲規則都在 src/core，會動的畫面交給 Phaser（src/game）。
import { data as D } from '../core/data.js';
import { world as W } from '../core/world.js';
import { trial as T } from '../core/trial.js';
import { items as I } from '../core/items.js';
import { stats as S } from '../core/stats.js';
import { save as store } from '../core/save.js';
import { sprites as SP } from './sprites.js';
import { Rig, ANIMS, HAIR_COLORS, DEFAULT_HAIR, GENDERS, RIG_ICON_LOOKS, gearIcon } from '../rig/rig.js';
import { navIcon } from './nav-icons.js';

export function startUI(bus) {
  const $ = (q) => document.querySelector(q);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('zh-TW');
  const fmtV = (k, v) => (D.STAT_PCT[k] ? (Math.round(v * 10) / 10) + '%' : fmt(v));

  let s = null;
  let tab = null;           // 目前打開的功能：掛機地點的代號，或 guild、hero、gear、trial、settings（開機時設為掛機中的地點）
  let stageShown = false;
  let bagFilter = 'all';
  let eqSel = null;         // 背包頁上方點開的裝備格（D.SLOTS 的 k），null 是都收起來
  let battle = null;        // 播放中的戰鬥
  let lastTickSum = null;

  // ---------- 工具 ----------
  let toastT;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), 3000);
  }
  function persist() { store.save(s); }
  function dur(ms) {
    const m = Math.floor(ms / 60000), h = Math.floor(m / 60);
    if (h) return `${h} 小時 ${m % 60} 分`;
    if (m) return `${m} 分`;
    return `${Math.ceil(ms / 1000)} 秒`;
  }
  function clock(t) { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
  const matName = (key) => W.matName(key);
  function rarityName(r) { return `<span style="color:${D.RARITY[r].color}">${D.RARITY[r].n}</span>`; }
  function setupCanvas(cv, w, h) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = w * dpr; cv.height = h * dpr;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    return ctx;
  }

  // ---------- HUD ----------
  function renderHud(now = Date.now()) {
    const need = W.expNeed(s.hero.level);
    const loc = D.LOCATIONS.find((l) => l.k === s.location);
    const tickPct = Math.min(100, ((now - s.lastTick) / D.TICK_MS) * 100);
    $('#hud').innerHTML = `
      <div class="hud-main">${navIcon(s.location)}
        <div class="hud-text"><span class="hud-label">掛機中</span><b>${loc.n}${s.location === 'battle' ? '・' + W.stageLabel(D.stageOf(s.areaIdx, s.stage)) : ''}</b>
          <div class="bar tick" title="下一次結算"><span style="width:${tickPct}%"></span></div></div></div>
      <div class="hud-side"><span class="gold">${fmt(s.gold)}</span>
        <span class="hud-lv"><span class="lv">Lv ${s.hero.level}</span>
          <span class="bar exp" title="經驗 ${fmt(s.hero.exp)} / ${fmt(need)}"><span style="width:${(s.hero.exp / need) * 100}%"></span></span></span></div>`;
  }

  // ---------- 戰鬥畫面：只有在戰鬥地圖掛機、或播放戰鬥時才顯示 ----------
  function updateStage() {
    // 背包頁：戰鬥畫面縮成螢幕高度 1/8 的一條，固定在上方（播放戰鬥時維持原本大小）
    $('#stageWrap').classList.toggle('mini', tab === 'gear' && !battle);
    const show = !!battle || s.location === 'battle';
    if (show === stageShown) return;
    stageShown = show;
    $('#stageWrap').hidden = !show;
    bus.emit('stage:show', show);
  }

  // ---------- 角色 ----------
  function heroPanel() {
    const h = W.hero(s);
    const st = h.stats;
    const mechs = h.cls.mechs.map((m) => `<li>${esc(S.mechText(m))}</li>`).join('');
    const log = s.log.slice(0, 12);
    return `<div class="row spread"><h2>角色</h2><button class="btn ghost small" data-act="look">更換外觀</button></div>
      <div><p class="cls-name">${esc(h.cls.name)}<span class="cls-kind">${esc(h.cls.kind)}</span></p>
        <p class="hint">冒險者階級 <b style="color:var(--gold)">${D.RANKS[W.rank(s)].n}</b>・${rankProgress()}</p>
        <ul class="mechs">${mechs || '<li>拿起武器就會有職業：劍或弓是劍士、弓手（連鎖），鎚是守衛（反擊），法杖是術士（燃燒）</li>'}${h.sets.map(setLines).join('')}</ul>
        <div class="power"><span class="hud-label">戰力</span><span class="num">${fmt(S.power(st))}</span></div>
        <dl class="stats">${D.STATS.map((x) => `<div><dt>${x.n}</dt><dd class="num">${fmtV(x.k, st[x.k])}</dd></div>`).join('')}</dl></div>
      <div class="log-box"><h3 class="mini-h">最近發生的事</h3>
        <ul class="log">${log.length ? log.map((l) => `<li><time>${clock(l.t)}</time><span>${esc(l.msg)}</span></li>`).join('')
          : '<li class="empty">還沒有大事發生。升級、鍛造出史詩裝備、擊敗頭目都會記在這裡。</li>'}</ul></div>`;
  }
  function settingsPanel() {
    return `<h2>設定</h2>
      <div class="card-list">
        <div class="row spread"><span>外觀（性別與髮色）</span><button class="btn ghost small" data-act="look">更換外觀</button></div>
        <div class="row spread"><span>快轉 1 小時<small class="hint">　測試用，馬上看到離線收穫</small></span><button class="btn ghost small" data-act="ff" id="ffBtn">快轉</button></div>
        <div class="row spread"><span>取得全部裝備<small class="hint">　測試用，每一款各拿一件傳說品質放進背包</small></span><button class="btn ghost small" data-act="give-all">取得</button></div>
        <div class="row spread"><span>刪除全部裝備<small class="hint">　測試用，清空背包和身上的裝備</small></span><button class="btn ghost small" data-act="clear-gear-ask">刪除</button></div>
        <div class="row spread"><span>重新開始<small class="hint">　刪除角色、裝備和進度</small></span><button class="btn ghost small" data-act="reset-ask" id="resetBtn">重新開始</button></div>
      </div>
      <p class="hint">Phaser 版原型・進度存在這個瀏覽器。</p>`;
  }

  // ---------- 分頁 ----------
  const TOOLS = [{ k: 'guild', n: '公會' }, { k: 'hero', n: '角色' }, { k: 'gear', n: '背包' }, { k: 'trial', n: '試煉' }, { k: 'settings', n: '設定' }];
  const isLoc = (k) => D.LOCATIONS.some((l) => l.k === k);
  function renderTiles() {
    const ready = s.guild.quests.filter((q) => W.questReady(s, q)).length;
    const badge = (k) => (k === s.location ? '<span class="tile-on">掛機中</span>'
      : k === 'guild' && ready ? `<span class="tile-on gold">可領取 ${ready}</span>` : '');
    const tile = (k, n) => `<button class="tile" data-tab="${k}" id="tab-${k}" aria-pressed="${k === tab}">
      ${badge(k)}${navIcon(k)}<span class="tile-n">${n}</span></button>`;
    $('#tiles').innerHTML = D.LOCATIONS.map((l) => tile(l.k, l.n.replace('地圖', ''))).join('') + TOOLS.map((t) => tile(t.k, t.n)).join('');
  }
  function renderPanel() {
    renderTiles();
    updateStage();
    const p = $('#panel');
    if (isLoc(tab)) { p.innerHTML = locPanel(tab); if (tab === 'battle') drawBossThumbs(); }
    else if (tab === 'guild') p.innerHTML = guildPanel();
    else if (tab === 'hero') p.innerHTML = heroPanel();
    else if (tab === 'gear') p.innerHTML = gearPanel();
    else if (tab === 'trial') p.innerHTML = trialPanel();
    else p.innerHTML = settingsPanel();
  }

  // ---------- 掛機地點 ----------
  function locPanel(v) {
    const loc = D.LOCATIONS.find((l) => l.k === v);
    const body = { training: trainingView, battle: battleView, forge: forgeView, market: marketView }[v]();
    const state = '<span class="on-chip">掛機中</span>';
    return `<div class="row spread"><h2>${loc.n}</h2>${state}</div>
      <p class="hint">${loc.d}。點下面的地點方塊就會改到那裡掛機，同一時間只能在一個地點，離線也會繼續（最多 12 小時）。</p>
      <div class="sub">${body}</div>`;
  }

  function trainingView() {
    const rows = D.DEVICES.map((d) => {
      const lv = s.devices[d.k];
      const cap = d.cap * lv;
      const cur = s.training[d.stat] || 0;
      const using = s.trainDevice === d.k;
      let act;
      if (!lv) act = `<button class="btn small" data-act="unlock" data-k="${d.k}" ${s.gold < d.unlock ? 'disabled' : ''}>解鎖 <span class="num">${fmt(d.unlock)}</span></button>`;
      else {
        const up = lv < D.DEVICE_MAX_LV ? `<button class="btn ghost small" data-act="dev-up" data-k="${d.k}" ${s.gold < D.deviceUpgradeCost(lv) ? 'disabled' : ''}>升級 <span class="num">${fmt(D.deviceUpgradeCost(lv))}</span></button>` : '<span class="hint">已滿級</span>';
        act = `${using ? '<b style="color:var(--gold)">使用中</b>' : `<button class="btn small" data-act="train" data-k="${d.k}">使用</button>`} ${up}`;
      }
      return `<tr class="${using ? 'sel' : ''}"><td><b>${d.n}</b><br><span class="hint">${D.STAT_NAME[d.stat]} +${d.gain}／次</span></td>
        <td class="num">${lv ? 'Lv ' + lv : '未解鎖'}</td>
        <td>${lv ? `<div class="bar good"><span style="width:${(cur / cap) * 100}%"></span></div><span class="hint num">${fmt(cur)} / ${fmt(cap)}</span>` : ''}</td>
        <td class="r">${act}</td></tr>`;
    }).join('');
    return `<div class="sub-h"><h3>鍛鍊室</h3><span class="hint">每 5 秒鍛鍊一次。每項訓練都有上限，升級設備才能繼續。</span></div>
      <div class="table-wrap"><table class="t"><thead><tr><th>設備</th><th>等級</th><th>進度</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // 這張地圖（或這一段）還差哪些條件，例如「還需要：初級冒險者、擊敗甲蟲女王」
  function needsText(i, b = 0) { return '還需要：' + W.stageNeeds(s, i, b).join('、'); }
  function ticketText(now = Date.now()) {
    W.refreshTickets(s, now);
    const h = s.hunt;
    return `狩獵券 <b class="num" style="color:var(--gold)">${h.tickets} / ${W.HUNT_MAX}</b>${h.tickets < W.HUNT_MAX ? `（${dur(h.refillAt + W.HUNT_REFILL_MS - now)}後恢復一張）` : ''}`;
  }
  function battleView() {
    const tiers = (a) => `T${a.tier}–T${a.tier + D.STAGES - 1}`;
    const rows = D.AREAS.map((a, i) => {
      const locked = !W.areaOpen(s, i);
      const sel = s.areaIdx === i;
      return `<tr class="${sel ? 'sel' : ''}"><td><b>${a.n}</b><br><span class="hint">${a.monsters.map((m) => m.n).join('、')}</span></td>
        <td class="num">Lv ${a.lv}–${a.lv + D.STAGES * D.STAGE_SPAN - 1}</td>
        <td><span class="chip">${tiers(a)}</span></td>
        <td class="r">${locked ? `<span class="hint">${needsText(i)}</span>` : sel ? '<b style="color:var(--gold)">目前地圖</b>' : `<button class="btn small" data-act="area" data-i="${i}">選擇</button>`}</td></tr>`;
    }).join('');
    const last = lastTickSum && s.location === 'battle' ? `<p class="hint">最近一次結算：擊敗 ${lastTickSum.kills}、落敗 ${lastTickSum.losses}</p>` : '';
    const ai = s.areaIdx, a = D.AREAS[ai];
    const mons = a.monsters.map((m) => `<li><b>${m.n}</b> → ${m.mat.n}<span class="hint">（${D.MAT_CATS[m.mat.cat].n}）</span></li>`).join('');
    const stages = Array.from({ length: D.STAGES }, (_, b) => {
      const st = D.stageOf(ai, b), open = W.stageOpen(s, ai, b), here = s.stage === b;
      const boss = W.bossEnemy(ai, b), kills = s.bossKills[ai + '-' + b] || 0, cost = W.huntCost(s, ai, b);
      const fight = !open ? `<span class="hint">${needsText(ai, b)}</span>`
        : `<button class="btn small" data-act="hunt" data-i="${ai}" data-b="${b}" ${s.hunt.tickets < cost ? 'disabled' : ''}>${cost ? '重打（狩獵券 1）' : '挑戰頭目'}</button>`;
      const idle = !open ? '' : here ? '<b style="color:var(--gold)">在這段掛機</b>' : `<button class="btn ghost small" data-act="stage" data-b="${b}">在這段掛機</button>`;
      return `<div class="card boss${here ? ' here' : ''}">
          <div class="row spread"><b>第 ${b + 1} 段・Lv ${st.lo}–${st.hi}</b><span class="chip">T${st.tier} 素材</span></div>
          <div class="row"><canvas data-boss="${ai}-${b}" width="64" height="64"></canvas>
            <div><b>${st.boss.n}</b><br><span class="hint num">Lv ${st.bossLv}・生命 ${fmt(boss.stats.hp)}</span><br><span class="hint">掉落 ${st.boss.mat.n} T${st.tier}</span></div></div>
          <span class="hint">${kills ? `已擊敗 ${kills} 次` : `尚未擊敗（首次擊敗金幣 ×3${b + 1 < D.STAGES ? '，開放下一段' : ''}）`}</span>
          <div class="row">${idle}${fight}</div></div>`;
    }).join('');
    return `<div class="sub-h"><h3>戰鬥地圖</h3><span class="hint">每 5 秒遇到一隻魔物。勝利得到經驗、金幣，有機會掉牠的素材。</span></div>
      ${last}
      <div class="table-wrap"><table class="t"><thead><tr><th>地圖</th><th>魔物等級</th><th>素材</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="sub-h"><h3>${a.n}</h3><span class="hint">${ticketText()}</span></div>
      <p class="hint">每張地圖分三段，每段 10 級、掉一個階級的素材。魔物的等級跟著你，但不會超出那一段的範圍。打倒段尾的頭目就能到下一段刷更高等級的魔物；還沒打倒的頭目隨時可以挑戰，打倒過的要用狩獵券重打，可以再拿頭目素材和魔物素材。頭目要在 ${D.BOSS.maxActions} 回合內打倒。</p>
      <ul class="mon-mats">${mons}</ul>
      <div class="bosses">${stages}</div>`;
  }

  function oddsBar(odds) {
    const total = odds.reduce((a, b) => a + b, 0);
    return `<div class="odds">${odds.map((o, i) => `<span style="width:${(o / total) * 100}%;background:${D.RARITY[i].color}" title="${D.RARITY[i].n} ${o}%"></span>`).join('')}</div>
      <div class="legend">${odds.map((o, i) => `<span><i style="background:${D.RARITY[i].color}"></i>${D.RARITY[i].n} ${o}%</span>`).join('')}</div>`;
  }
  // 素材表：每種魔物素材在各階有幾個（灰色的「—」是那種魔物不會掉那一階），下面是有的頭目素材
  function matsGrid() {
    const cell = (id, tier) => {
      if (!D.MATS[id].tiers.includes(tier)) return '<td class="na">—</td>';
      const n = s.mats[W.matKey(id, tier)] || 0;
      return `<td class="num${n ? '' : ' zero'}">${n}</td>`;
    };
    const T5 = [1, 2, 3, 4, 5];
    const body = Object.entries(D.MAT_CATS).map(([cat, c]) => {
      const ids = Object.keys(D.MATS).filter((id) => D.MATS[id].cat === cat);
      const total = T5.map((tier) => ids.reduce((n, id) => n + (s.mats[W.matKey(id, tier)] || 0), 0));
      return `<tr class="cat"><th>${c.n}<span class="hint">　${c.d}</span></th>${total.map((n) => `<th class="num">${n || ''}</th>`).join('')}</tr>`
        + ids.map((id) => `<tr><td>${D.MATS[id].n}<span class="hint">　${D.MATS[id].src}</span></td>${T5.map((tier) => cell(id, tier)).join('')}</tr>`).join('');
    }).join('');
    const boss = Object.keys(D.MATS).filter((id) => D.MATS[id].cat === 'boss' && s.mats[W.matKey(id, D.MATS[id].tiers[0])] > 0)
      .map((id) => `<span class="chip">${D.MATS[id].n} T${D.MATS[id].tiers[0]} ×${s.mats[W.matKey(id, D.MATS[id].tiers[0])]}</span>`).join('');
    return `<div class="table-wrap"><table class="t matt"><thead><tr><th>素材</th>${T5.map((x) => `<th class="num">T${x}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>
      <p class="hint">頭目素材：${boss ? `</p><div class="chips">${boss}</div>` : '還沒有。打倒頭目會掉牠的專屬素材，鍛造時可以加進去提高稀有度。</p>'}`;
  }
  function forgeView() {
    const f = s.forge, cur = D.FORGE[f.level], next = D.FORGE[f.level + 1];
    const typeOpts = [['auto', '自動輪流'], ['weapon', '武器'], ['head', '頭飾'], ['body', '上衣'], ['feet', '鞋子'], ['acc', '飾品']];
    const defOpts = [['auto', '隨機'], ...(f.type === 'auto' ? [] : I.defsOf(f.type).map((g) => [g.id, `${g.n}（${W.recipeText(g)}${g.tier ? `，只能做 T${g.tier}` : ''}）`]))];
    const tierOpts = [['auto', '自動（最高）'], ...[1, 2, 3, 4, 5].map((x) => [String(x), 'T' + x])];
    const g = f.type !== 'auto' && D.GEAR_BY_ID[f.def];
    const pct = s.location === 'forge' ? (f.progress / cur.ticks) * 100 : 0;
    return `<div class="sub-h"><h3>鍛造室・${cur.n} <span class="num" style="color:var(--gold)">Lv ${f.level}</span></h3>
        ${next ? `<button class="btn small" data-act="forge-up" ${s.gold < next.cost ? 'disabled' : ''}>升級為${next.n} <span class="num">${fmt(next.cost)}</span></button>` : '<span class="hint">已是最高級設備</span>'}</div>
      <p class="hint">${cur.ticks * 5} 秒完成一件。每一款裝備有自己的配方，寫的是要哪幾類素材各幾個（硬材、皮料、靈材，見下面的素材表），同一類、同一階的素材可以互相代替，先用數量最多的。全部要用同一階的素材，用哪一階就做出哪一階的裝備；階級選「自動」會用湊得出配方的最高階。</p>
      ${oddsBar(cur.odds)}
      <div class="row">
        <label class="field" for="forgeType">要鍛造的部位<select id="forgeType" data-set="forge-type">${typeOpts.map(([k, n]) => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="field" for="forgeDef">款式<select id="forgeDef" data-set="forge-def" ${f.type === 'auto' ? 'disabled' : ''}>${defOpts.map(([k, n]) => `<option value="${k}" ${f.def === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="field" for="forgeTier">素材階級<select id="forgeTier" data-set="forge-tier">${tierOpts.map(([k, n]) => `<option value="${k}" ${String(f.tier) === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      </div>
      ${g ? `<p class="hint">配方：<b>${esc(W.recipeText(g))}</b>（全部同一階）</p>` : '<p class="hint">隨機款式不會做要用頭目素材的裝備（例如炎龍套裝），要做請指定款式。</p>'}
      <label class="check"><input type="checkbox" data-set="forge-boost" ${f.boost ? 'checked' : ''}> 加入頭目素材：每件多用 1 個同一階的頭目素材，稀有度抽 ${D.BOOST_ROLLS} 次取最好的（沒有就照常鍛造）</label>
      ${s.location === 'forge' ? `<div><div class="bar good"><span style="width:${pct}%"></span></div><p class="hint">${esc(f.status || '準備中')}</p></div>` : '<p class="hint">要在鍛造室掛機才會開始鍛造。</p>'}
      ${matsGrid()}`;
  }

  function marketView() {
    const m = s.market;
    const keeps = [0, 8, 20, 50];
    return `<div class="sub-h"><h3>市集</h3><span class="hint">市集聲望 <b class="num">${fmt(m.rep)}</b></span></div>
      <p class="hint">每 5 秒賣出 <b class="num">${W.marketSpeed(m.rep)}</b> 個素材（頭目素材不賣），售價 ×<b class="num">${W.marketBonus(m.rep).toFixed(2)}</b>。聲望越高賣得越快、越貴（有上限）。</p>
      <label class="field" for="keep">每種素材保留<select id="keep" data-set="keep">${keeps.map((k) => `<option value="${k}" ${m.keep === k ? 'selected' : ''}>${k} 個</option>`).join('')}</select></label>
      ${matsGrid()}
      <p class="hint">付費的市集隨從還沒做，之後再看怎麼設計。</p>`;
  }

  // 冒險者聲望與升到下一階要多少
  function rankProgress() {
    const nx = D.RANKS[W.rank(s) + 1];
    return `冒險者聲望 <b class="num">${fmt(s.guild.rep)}</b>${nx ? ` / ${fmt(nx.rep)} 升為${nx.n}` : '（最高階）'}`;
  }
  // ---------- 公會：每日委託 ----------
  function questCard(q) {
    const p = W.questProgress(s, q), a = q.kind === 'kill' && D.AREAS[q.area];
    const unit = q.kind === 'kill' ? '隻' : '個';
    const btn = q.done ? '<span class="chip" style="color:var(--good)">已完成</span>'
      : W.questReady(s, q) ? `<button class="btn small" data-act="claim" data-id="${q.id}">${q.kind === 'kill' ? '領取' : '交付'}</button>` : '';
    const where = a && !q.done && (s.location !== 'battle' || s.areaIdx !== q.area) ? `<br>在戰鬥地圖選「${a.n}」掛機才會算${W.areaOpen(s, q.area) ? '' : `（${needsText(q.area)}）`}` : '';
    const src = q.kind === 'deliver' && W.matDef(q.mat);
    const how = src && !q.done ? `<br>${D.AREAS[src.area].n}的${src.src}會掉（要在 T${W.matTier(q.mat)} 的那一段）。素材夠了就能交付，交付後會扣掉；市集會先留著這些素材` : '';
    return `<div class="card"><div class="row spread"><b>${esc(W.questText(q))} ${q.need} ${unit}</b>${btn}</div>
      <div class="bar good"><span style="width:${(q.done ? 1 : p / q.need) * 100}%"></span></div>
      <span class="hint"><span class="num">${q.done ? q.need : p} / ${q.need}</span>・獎勵：<span class="num">${fmt(q.reward.gold)}</span> 金幣、聲望 +${q.reward.rep}${where}${how}</span></div>`;
  }
  function guildPanel() {
    const now = Date.now();
    return `<div class="row spread"><h2>公會</h2><span class="hint">冒險者階級 <b style="color:var(--gold)">${D.RANKS[W.rank(s)].n}</b></span></div>
      <p class="hint">${rankProgress()}</p>
      <div class="sub"><div class="sub-h"><h3>今天的委託</h3><span class="hint">${dur(W.dayResetAt(now) - now)}後刷新（每天 00:00）</span></div>
        <p class="hint">擊敗指定的魔物（接到委託之後才開始算），或交付指定的素材。完成後回到這裡領取金幣與冒險者聲望，每個委託一天只能完成一次。</p>
        <div class="slots">${s.guild.quests.map(questCard).join('')}</div></div>
      <p class="hint">冒險者階級決定能刷到哪一階的素材：${[1, 2, 3, 4, 5].map((x) => `T${x} 要${D.RANKS[x - 1].n}`).join('、')}。另外還要打倒前一段的頭目才能去下一段。</p>`;
  }

  // ---------- 裝備與背包 ----------
  function itemLines(it) {
    const base = Object.entries(it.base).map(([k, v]) => `<li>${I.fmtStat(k, v)}</li>`).join('');
    const aff = it.affixes.map((a) => `<li class="aff">◆ ${I.fmtStat(a.k, a.v)}</li>`).join('');
    const eff = it.effect ? `<li class="eff">★ ${esc(it.effect.n)}：${esc(it.effect.d)}</li>` : '';
    // 套裝：列出每段效果，已經生效的亮起來（件數算身上穿的）
    const st = it.set && (S.setStatus(s.equip).find((x) => x.k === it.set) || { ...D.SETS[it.set], k: it.set, count: 0, bonus: D.SETS[it.set].bonus });
    return `<ul class="lines">${base}${aff}${eff}${st ? setLines(st) : ''}</ul>`;
  }
  // 套裝效果的幾行：「炎龍套裝（身上 2/4）」，生效的那幾段用套裝的顏色
  function setLines(st) {
    return `<li class="set set-h" style="--sc:${st.color}">${esc(st.n)}（身上 ${st.count}/${st.pieces}）</li>`
      + st.bonus.map((b) => `<li class="set${b.on ? ' on' : ''}" style="--sc:${st.color}">${b.need} 件：${esc(b.d)}</li>`).join('');
  }
  // 裝備圖示：畫一次就快取成圖片網址
  const iconCache = new Map();
  function iconURL(it) {
    const key = `${it.type}-${it.look}-${it.tier}-${it.rarity}`;
    if (!iconCache.has(key) && RIG_ICON_LOOKS.has(it.look)) iconCache.set(key, gearIcon(it).toDataURL());   // 用角色身上的畫法
    if (!iconCache.has(key)) {
      const g = SP.itemIconGrid(it);
      const sc = Math.max(1, Math.floor(48 / Math.max(g.length, g[0].length)));
      const c = document.createElement('canvas');
      c.width = g[0].length * sc; c.height = g.length * sc;
      SP.draw(c.getContext('2d'), g, 0, 0, sc);
      iconCache.set(key, c.toDataURL());
    }
    return iconCache.get(key);
  }
  function itemHead(it, label) {
    return `<div class="item-head"><span class="icon" style="--rc:${D.RARITY[it.rarity].color}"><img src="${iconURL(it)}" alt=""></span>
      <div class="item-title">${label ? `<span class="slot-name">${label}</span>` : ''}<span class="iname" style="color:${D.RARITY[it.rarity].color}">${esc(it.name)}</span></div></div>`;
  }
  function itemChips(it) {
    return `<div class="chips"><span class="chip" style="color:${D.RARITY[it.rarity].color}">${D.RARITY[it.rarity].n}</span>
      ${itemKindChip(it)}
      ${it.set ? `<span class="chip" style="color:${D.SETS[it.set].color}">${D.SETS[it.set].n}</span>` : ''}
      <span class="chip" style="color:var(--muted)">T${it.tier}</span></div>`;
  }
  // 武器標出職業（顏色是職業機制），其他部位標出部位
  function itemKindChip(it) {
    const form = it.type === 'weapon' && D.FORMS[it.form];
    if (form) return `<span class="chip" style="color:${D.MECHS[form.mech].color}">${form.cls}・${D.MECHS[form.mech].n}</span>`;
    return `<span class="chip" style="color:var(--muted)">${it.type === 'acc' ? '飾品・詞條專用' : D.TYPE_NAME[it.type]}</span>`;
  }
  function slotFor(it) {
    if (it.type !== 'acc') return it.type;
    if (!s.equip.acc1) return 'acc1';
    if (!s.equip.acc2) return 'acc2';
    return I.score(s.equip.acc1) <= I.score(s.equip.acc2) ? 'acc1' : 'acc2';
  }
  function powerWith(slot, it) {
    const eq = { ...s.equip, [slot]: it };
    return S.power(S.computeHero({ ...s, equip: eq }).stats);
  }
  function gearPanel() {
    const curPow = S.power(W.hero(s).stats);
    // 裝備：六格排成一列小圖示，點一格才展開那件的詳細數值
    const slots = D.SLOTS.map((sl) => {
      const it = s.equip[sl.k];
      return `<button class="eq-slot" data-act="eq-sel" data-k="${sl.k}" aria-pressed="${eqSel === sl.k}" aria-label="${sl.n}：${it ? esc(it.name) : '空'}">
        <span class="icon" style="--rc:${it ? D.RARITY[it.rarity].color : 'var(--line)'}">${it ? `<img src="${iconURL(it)}" alt="">` : ''}</span>
        <span class="eq-n">${sl.n}</span></button>`;
    }).join('');
    const selSlot = D.SLOTS.find((sl) => sl.k === eqSel), cur = selSlot && s.equip[selSlot.k];
    const detail = !selSlot ? ''
      : cur ? `<div class="card">${itemHead(cur, selSlot.n)}${itemChips(cur)}${itemLines(cur)}<div><button class="btn ghost small" data-act="unequip" data-k="${selSlot.k}">卸下</button></div></div>`
        : `<p class="hint">${selSlot.n}沒有裝備，從下面的背包挑一件。</p>`;
    const filters = [['all', '全部'], ['weapon', '武器'], ['head', '頭飾'], ['body', '上衣'], ['feet', '鞋子'], ['acc', '飾品']];
    const list = s.bag.filter((it) => bagFilter === 'all' || it.type === bagFilter)
      .map((it) => ({ it, slot: slotFor(it) }))
      .map((o) => ({ ...o, d: powerWith(o.slot, o.it) - curPow }))
      .sort((a, b) => b.d - a.d || b.it.rarity - a.it.rarity);
    const bag = list.map(({ it, d }) => `<div class="card"><div class="row spread"><span class="slot-name">${D.TYPE_NAME[it.type]}</span>
        <span class="delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">戰力 ${d > 0 ? '+' : ''}${fmt(d)}</span></div>
        ${itemHead(it)}${itemChips(it)}${itemLines(it)}
        <div class="row"><button class="btn small" data-act="equip" data-id="${it.id}">穿上</button>
        <button class="btn ghost small" data-act="sell" data-id="${it.id}">賣出 <span class="num">${fmt(I.sellPrice(it))}</span></button></div></div>`).join('');
    const cheap = s.bag.filter((it) => it.rarity < 2).length;
    return `<div class="row spread"><h2>裝備</h2><span class="hint">${esc(W.hero(s).cls.name)}・戰力 <b class="num">${fmt(curPow)}</b></span></div>
      <div class="eq-row">${slots}</div>
      ${detail || '<p class="hint">點一格看詳細數值。武器決定職業，飾品只提供詞條。</p>'}
      <div class="row spread"><h2>背包 <span class="num hint">${s.bag.length} / ${D.BAG_CAP}</span></h2>
        <div class="row"><div class="filter">${filters.map(([k, n]) => `<button data-act="bag-filter" data-k="${k}" aria-pressed="${bagFilter === k}">${n}</button>`).join('')}</div>
        <button class="btn ghost small" data-act="sell-cheap" ${cheap ? '' : 'disabled'}>賣出普通與精良（${cheap}）</button></div></div>
      ${list.length ? `<div class="bag">${bag}</div>` : `<p class="hint">背包是空的。裝備只能在鍛造室用素材打造，素材在戰鬥地圖打魔物、打頭目取得。</p>`}
      <h2>素材</h2>${matsGrid()}`;
  }

  // 頭目的小圖（戰鬥地圖頁的每一段）
  function drawBossThumbs() {
    document.querySelectorAll('canvas[data-boss]').forEach((cv) => {
      const [ai, b] = cv.dataset.boss.split('-').map(Number);
      const boss = D.AREAS[ai].bosses[b], locked = !W.stageOpen(s, ai, b);
      const ctx = setupCanvas(cv, 64, 64);
      SP.draw(ctx, SP.enemyGrid(boss.shape, locked ? '#3a4256' : boss.c), 0, 0, 64 / SP.ENEMY_W, { alpha: locked ? 0.6 : 1 });
    });
  }

  // ---------- 神之試煉 ----------
  function blessChip(id) {
    const b = D.BLESSINGS.find((x) => x.id === id);
    const t = D.BLESS_TIERS[b.t];
    return `<span class="bless" style="--c:${t.color}" title="${esc(b.d)}"><b>${esc(b.n)}</b> ${esc(b.d)}</span>`;
  }
  function trialPanel() {
    const now = Date.now();
    const run = T.ensure(s, now);
    const head = `<div class="row spread"><h2>神之試煉</h2><span class="hint">每週一重置，還有 ${dur(T.weekResetAt(now) - now)}</span></div>
      <div class="row" style="gap:28px">
        <div><div class="hud-label">目前關卡</div><div class="big-num">${run.floor}</div></div>
        <div><div class="hud-label">本週最佳</div><div class="big-num">${run.best}</div></div>
        <div><div class="hud-label">已有祝福</div><div class="big-num">${run.blessings.length}</div></div>
      </div>
      <p class="hint">每過 ${D.BLESS_EVERY} 關從三個祝福中選一個。祝福分一般、稀世、史詩、神之四級，越深的關卡越容易出現高等級祝福。輸了就結束這次挑戰，可以從第 1 關重來，祝福也會清空。同一週的關卡與祝福選項固定。</p>
      ${run.blessings.length ? `<div class="bless-row">${run.blessings.map(blessChip).join('')}</div>` : ''}`;
    let body;
    if (run.offer) {
      body = `<h2>選擇一個祝福</h2><div class="offer">${run.offer.map((id) => {
        const b = D.BLESSINGS.find((x) => x.id === id), t = D.BLESS_TIERS[b.t];
        return `<button data-act="bless" data-id="${id}" style="--c:${t.color}"><span class="tier">${t.n}</span><span class="bn">${esc(b.n)}</span><span class="hint">${esc(b.d)}</span></button>`;
      }).join('')}</div>`;
    } else if (run.alive) {
      const foe = T.enemy(run.week, run.floor);
      body = `<div class="sub"><div class="sub-h"><h3>第 ${run.floor} 關：${esc(foe.name)}</h3><span class="hint num">Lv ${foe.lv}・生命 ${fmt(foe.stats.hp)}</span></div>
        ${foe.boss ? '<p class="hint">守護者關卡：首次通過有額外金幣與素材。</p>' : ''}
        <div><button class="btn" data-act="trial-fight">挑戰第 ${run.floor} 關</button></div></div>`;
    } else {
      body = `<div class="sub"><h3>這次止步於第 ${run.floor} 關</h3><p class="hint">調整裝備或多練幾級再來。重新挑戰會從第 1 關開始，祝福清空，已領過的通關獎勵不會重複發。</p>
        <div><button class="btn" data-act="trial-restart">重新挑戰</button></div></div>`;
    }
    const codex = D.BLESS_TIERS.map((t, i) => D.BLESSINGS.filter((b) => b.t === i).map((b) => `<span class="bless" style="--c:${t.color}"><b>${esc(b.n)}</b> ${esc(b.d)}</span>`).join('')).join('');
    return `${head}${body}<details><summary>所有祝福一覽（${D.BLESSINGS.length} 種）</summary><div class="codex">${codex}</div></details>`;
  }

  // ---------- 戰鬥播放 ----------
  const KIND = { attack: '攻擊', double: '連擊', chain: '連鎖追擊', counter: '反擊', burn: '燃燒', undying: '不朽發動' };
  function logText(l, pName, eName) {
    const who = l.who === 'p' ? pName : eName;
    if (l.kind === 'undying') return `${l.who === 'p' ? pName : eName}的不朽發動，保住一命`;
    if (l.kind === 'burn') return `${l.who === 'p' ? eName : pName}受到燃燒（${l.stacks} 層）${fmt(l.dmg)} 傷害${l.crit ? '・暴擊' : ''}`;
    return `${who}${KIND[l.kind]}，造成 ${fmt(l.dmg)} 傷害${l.crit ? '・暴擊' : ''}`;
  }
  function playBattle({ title, foe, r, resultHtml, scene = 0 }) {
    battle = { foe, r, resultHtml, done: false, lines: [] };
    $('#battleBar').hidden = false;
    $('#bTitle').textContent = title;
    $('#bLog').innerHTML = '';
    $('#bResult').innerHTML = '';
    const btn = $('#bSkip');
    btn.textContent = '跳過'; btn.dataset.act = 'b-skip';
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // 戰鬥畫面交給 Phaser；沒有人接（例如畫面還沒準備好）就直接顯示結果
    if (!bus.emit('battle:start', { foe, r, scene, equip: { ...s.equip }, look: s.appearance })) endBattle();
  }
  function battleLine({ line }) {
    if (!battle || battle.done) return;
    battle.lines.push(`<li class="${line.who}">${esc(logText(line, '冒險者', battle.foe.name))}</li>`);
    const bl = $('#bLog');
    bl.innerHTML = battle.lines.slice(-30).join('');
    bl.scrollTop = 1e6;
  }
  function endBattle() {
    if (!battle || battle.done) return;
    battle.done = true;
    const bl = $('#bLog');
    bl.innerHTML = battle.r.log.slice(-60).map((l) => `<li class="${l.who}">${esc(logText(l, '冒險者', battle.foe.name))}</li>`).join('');
    bl.scrollTop = 1e6;
    $('#bResult').innerHTML = battle.resultHtml;
    const btn = $('#bSkip');
    btn.textContent = '關閉'; btn.dataset.act = 'b-close';
  }
  function skipBattle() {
    if (battle && !battle.done && !bus.emit('battle:skip')) endBattle();
  }
  function closeBattle() {
    if (!battle) return;
    battle = null;
    $('#battleBar').hidden = true;
    bus.emit('battle:close');
    renderAll();
  }

  // ---------- 離線收穫 ----------
  function showSummary(sum, title) {
    const loc = D.LOCATIONS.find((l) => l.k === s.location);
    const rows = [['掛機地點', loc.n], ['經過時間', dur(sum.elapsed || sum.ticks * D.TICK_MS)]];
    if (sum.levels) rows.push(['升級', `+${sum.levels}（現在 Lv ${s.hero.level}）`]);
    if (sum.exp) rows.push(['經驗', '+' + fmt(sum.exp)]);
    if (sum.gold) rows.push(['金幣', '+' + fmt(sum.gold)]);
    if (sum.kills || sum.losses) rows.push(['戰鬥', `擊敗 ${fmt(sum.kills)}・落敗 ${fmt(sum.losses)}`]);
    for (const k in sum.train) rows.push([D.STAT_NAME[k] + '鍛鍊', '+' + fmtV(k, sum.train[k])]);
    if (sum.sold) rows.push(['市集賣出', `${fmt(sum.sold)} 個素材`]);
    if (sum.marketRep) rows.push(['市集聲望', '+' + fmt(sum.marketRep)]);
    const mats = Object.entries(sum.mats).map(([k, n]) => `${matName(k)} ×${n}`).join('、');
    if (mats) rows.push(['素材', mats]);
    const items = sum.items.slice().sort((a, b) => b.rarity - a.rarity);
    const itemHtml = items.length ? `<p class="hint">得到 ${items.length} 件裝備：${items.slice(0, 12).map((it) => `<span style="color:${D.RARITY[it.rarity].color}">${esc(it.name)}</span>`).join('、')}${items.length > 12 ? ' 等' : ''}</p>` : '';
    const notes = sum.notes.length ? `<p class="hint">注意：${sum.notes.map(esc).join('；')}</p>` : '';
    const m = $('#modal');
    m.hidden = false;
    m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="sTitle"><h2 id="sTitle">${esc(title)}</h2>
      <ul class="sum-list">${rows.map(([a, b]) => `<li><span>${a}</span><span>${b}</span></li>`).join('')}</ul>${itemHtml}${notes}
      <div class="row"><button class="btn" data-act="modal-close">收下</button>${items.length ? '<button class="btn ghost" data-act="modal-gear">去看裝備</button>' : ''}</div></div>`;
  }
  // ---------- 外觀（角色建立） ----------
  let lookDraft = null, lookFirst = false, pendingSummary = null;
  // 用骨架角色畫預覽：view 是 'front' 或 'side'
  function drawLook(cv, view, look, equip, scale) {
    const rig = new Rig(view);
    rig.setLook(look); rig.setEquip(equip || {});
    const w = view === 'front' ? 76 : 70, h = 138;
    const ctx = setupCanvas(cv, w * scale, h * scale);
    ctx.scale(scale, scale);
    rig.draw(ctx, view === 'front' ? 38 : 30, h - 3, ANIMS.idle.pose(0));
  }
  function openLook(first) {
    lookFirst = first;
    const cur = s.appearance || {};
    lookDraft = { gender: GENDERS[cur.gender] ? cur.gender : 'm', color: HAIR_COLORS[cur.color] ? cur.color : DEFAULT_HAIR };
    renderLook();
  }
  function renderLook() {
    const d = lookDraft, m = $('#modal');
    m.hidden = false;
    const colors = Object.entries(HAIR_COLORS).map(([k, v]) => `<button type="button" class="swatch" data-act="look-c" data-k="${k}" aria-pressed="${d.color === k}"><i style="background:${v[1]}"></i>${k}</button>`).join('');
    const genders = Object.entries(GENDERS).map(([k, n]) => `<button type="button" class="swatch" data-act="look-g" data-k="${k}" aria-pressed="${d.gender === k}">${n}</button>`).join('');
    m.innerHTML = `<div class="modal-card look-card" role="dialog" aria-modal="true" aria-labelledby="lookTitle">
      <h2 id="lookTitle">${lookFirst ? '建立你的冒險者' : '更換外觀'}</h2>
      ${lookFirst ? '<p class="hint">選擇性別和髮色，之後可以在角色面板的「更換外觀」修改。</p>' : ''}
      <div class="look-grid">
        <div class="look-preview"><canvas id="lookBig" aria-label="角色正面"></canvas><canvas id="lookSide" aria-label="角色側面"></canvas></div>
        <div class="look-options">
          <span class="mini-h">性別</span><div class="row swatches">${genders}</div>
          <span class="mini-h">髮色</span><div class="row swatches">${colors}</div>
          <p class="hint">目前男女各有一種髮型，其他髮型的圖還在準備中。</p>
        </div>
      </div>
      <div class="row"><button class="btn" data-act="look-ok">${lookFirst ? '開始冒險' : '儲存外觀'}</button>${lookFirst ? '' : '<button class="btn ghost" data-act="look-cancel">取消</button>'}</div></div>`;
    drawLook($('#lookBig'), 'front', d, s.equip, 2);
    drawLook($('#lookSide'), 'side', d, s.equip, 2);
  }
  function closeLook(saveIt) {
    if (saveIt) { s.appearance = { ...lookDraft }; persist(); toast(lookFirst ? '冒險開始！' : '外觀已更新'); }
    lookDraft = null;
    const wasFirst = lookFirst;
    lookFirst = false;
    $('#modal').hidden = true; $('#modal').innerHTML = '';
    renderAll();
    if (wasFirst && pendingSummary) { const sum = pendingSummary; pendingSummary = null; showSummary(sum, '離線期間的收穫'); }
  }

  function confirmBox(title, text, act, label) {
    const m = $('#modal');
    m.hidden = false;
    m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="cTitle"><h2 id="cTitle">${esc(title)}</h2><p>${esc(text)}</p>
      <div class="row"><button class="btn danger" data-act="${act}">${esc(label)}</button><button class="btn ghost" data-act="modal-close">取消</button></div></div>`;
  }

  // ---------- 主迴圈 ----------
  function renderAll() { renderHud(); updateStage(); renderPanel(); bus.emit('state'); }
  function onTick(sum) {
    lastTickSum = sum;
    bus.emit('tick', sum);
    if (sum.levels) toast(`升到 ${s.hero.level} 級！`);
    const good = sum.items.filter((it) => it.rarity >= 3);
    if (good.length) toast(`得到${D.RARITY[good[0].rarity].n}裝備「${good[0].name}」`);
    // 掛機地點、角色、公會的畫面會即時更新；其他功能不打斷玩家操作
    if ((isLoc(tab) || tab === 'hero' || tab === 'guild') && !document.activeElement?.matches('select')) renderPanel();
    else renderTiles();   // 公會方塊上的「可領取」
  }
  function loop() {
    const now = Date.now();
    const sum = W.catchUp(s, now);
    if (sum) {
      if (sum.ticks > 3) { if (lookDraft) pendingSummary = sum; else showSummary(sum, '離線期間的收穫'); }
      onTick(sum);
      persist();
    }
    // 過了午夜：換一批公會委託
    if (W.refreshQuests(s, now)) { persist(); toast('公會的委託刷新了'); renderPanel(); }
    renderHud(now);
  }

  // ---------- 操作 ----------
  function act(a, el) {
    const now = Date.now();
    const k = el.dataset.k, id = el.dataset.id, i = el.dataset.i;
    switch (a) {
      case 'go': W.setLocation(s, k); toast(`改到${D.LOCATIONS.find((l) => l.k === k).n}掛機`); break;
      case 'unlock': if (W.unlockDevice(s, k)) toast('設備已解鎖'); break;
      case 'dev-up': if (W.upgradeDevice(s, k)) toast('設備升級了，訓練上限提高'); break;
      case 'train': s.trainDevice = k; break;
      case 'area': if (!W.setArea(s, +i)) toast(needsText(+i)); break;
      case 'stage': if (!W.setStage(s, +el.dataset.b)) toast(needsText(s.areaIdx, +el.dataset.b)); break;
      case 'forge-up': if (W.upgradeForge(s)) toast(`鍛造室升級為${D.FORGE[s.forge.level].n}`); break;
      case 'give-all': { const r = W.giveAllGear(s); toast(`拿到 ${r.got} 件裝備${r.left ? `，背包滿了，還有 ${r.left} 件沒放進去` : ''}`); break; }
      case 'clear-gear-ask': confirmBox('刪除全部裝備？', '背包和身上的裝備都會刪除，無法復原。', 'clear-gear', '全部刪除'); return;
      case 'clear-gear': { const n = W.clearGear(s); $('#modal').hidden = true; $('#modal').innerHTML = ''; toast(`刪除了 ${n} 件裝備`); break; }
      case 'claim': { const q = W.claimQuest(s, id, now); if (q) toast(`完成委託：金幣 +${fmt(q.reward.gold)}、聲望 +${q.reward.rep}`); break; }
      case 'equip': W.equip(s, id, slotFor(s.bag.find((x) => x.id === id))); break;
      case 'unequip': if (!W.unequip(s, k)) toast('背包滿了，先賣掉一些裝備'); break;
      case 'sell': toast(`賣出，得到 ${fmt(W.sell(s, id))} 金幣`); break;
      case 'sell-cheap': { const r = W.sellBelow(s, 2); toast(`賣出 ${r.n} 件，得到 ${fmt(r.total)} 金幣`); break; }
      case 'bag-filter': bagFilter = k; break;
      // 點裝備格：展開或收起，背包也篩成同一個部位，方便比較
      case 'eq-sel': eqSel = eqSel === k ? null : k; bagFilter = eqSel ? D.SLOTS.find((sl) => sl.k === eqSel).type : 'all'; break;
      case 'hunt': {
        if (battle) { toast('先看完或關閉目前的戰鬥'); return; }
        const b = +el.dataset.b;
        const out = W.hunt(s, +i, b, now);
        if (!out) { toast(W.stageOpen(s, +i, b) ? '狩獵券用完了' : needsText(+i, b)); break; }
        persist();
        const rw = out.rewards;
        const res = out.r.win
          ? `<p class="result win">勝利！</p><p class="hint">金幣 +${fmt(rw.gold)}・${Object.entries(rw.mats).map(([kk, n]) => `${matName(kk)} ×${n}`).join('、')}${rw.unlocked.length ? `<br>可以前往${esc(rw.unlocked.join('、'))}` : ''}${rw.next ? `<br>達到${esc(rw.next.needs.join('、'))}就能前往「${esc(rw.next.stage)}」` : ''}</p>`
          : `<p class="result lose">${out.r.timeout ? '時間到，沒能打倒' : '落敗'}</p><p class="hint">造成 ${fmt(out.r.dealt)} 傷害（頭目生命的 ${Math.round((out.r.dealt / out.r.maxHpE) * 100)}%）。${W.bossBeaten(s, +i, b) ? '' : '還沒打倒過的頭目可以馬上再挑戰。'}</p>`;
        playBattle({ title: `頭目：${out.boss.n}（Lv ${out.stage.bossLv}）`, foe: { shape: out.boss.shape, c: out.boss.c, name: out.boss.n, boss: true }, r: out.r, resultHtml: res, scene: +i });
        return;
      }
      case 'trial-fight': {
        if (battle) { toast('先看完或關閉目前的戰鬥'); return; }
        const out = T.fightFloor(s, now);
        if (!out) break;
        persist();
        const res = out.r.win
          ? `<p class="result win">通過第 ${out.floor} 關</p>${out.rewards ? `<p class="hint">首次通過獎勵：金幣 +${fmt(out.rewards.gold)}${out.rewards.mat ? `・${matName(out.rewards.mat.key)} ×${out.rewards.mat.n}` : ''}</p>` : ''}${s.trial.offer ? '<p class="hint">可以選擇一個祝福了。</p>' : ''}`
          : `<p class="result lose">在第 ${out.floor} 關落敗</p>`;
        playBattle({ title: `神之試煉・第 ${out.floor} 關`, foe: { ...out.foe, name: out.foe.name }, r: out.r, resultHtml: res, scene: out.floor - 1 });
        return;
      }
      case 'bless': if (T.choose(s, id)) toast(`得到祝福「${D.BLESSINGS.find((b) => b.id === id).n}」`); break;
      case 'trial-restart': T.restart(s, now); break;
      case 'b-skip': skipBattle(); return;
      case 'b-close': closeBattle(); return;
      case 'modal-close': $('#modal').hidden = true; $('#modal').innerHTML = ''; break;
      case 'look': openLook(false); return;
      case 'look-g': lookDraft.gender = k; renderLook(); return;
      case 'look-c': lookDraft.color = k; renderLook(); return;
      case 'look-ok': closeLook(true); return;
      case 'look-cancel': closeLook(false); return;
      case 'modal-gear': $('#modal').hidden = true; $('#modal').innerHTML = ''; tab = 'gear'; break;
      case 'ff': {
        s.lastTick -= 3600e3;
        s.hunt.refillAt -= 3600e3;
        const sum = W.catchUp(s, now);
        if (sum) { onTick(sum); showSummary(sum, '快轉 1 小時的收穫'); }
        break;
      }
      case 'reset-ask': confirmBox('重新開始？', '目前的角色、裝備和進度都會刪除，無法復原。', 'reset', '刪除並重新開始'); return;
      case 'reset': store.clear(); s = W.newGame(Date.now()); T.ensure(s, Date.now()); $('#modal').hidden = true; persist(); tab = s.location; renderAll(); openLook(true); return;
      default: return;
    }
    persist();
    renderAll();
  }

  function bind() {
    document.addEventListener('click', (e) => {
      const tb = e.target.closest('[data-tab]');
      if (tb) {
        tab = tb.dataset.tab;
        // 點掛機地點的方塊就直接改到那裡掛機
        if (isLoc(tab) && tab !== s.location) { act('go', { dataset: { k: tab } }); return; }
        renderPanel(); return;
      }
      const el = e.target.closest('[data-act]');
      if (el && !el.disabled) act(el.dataset.act, el);
    });
    document.addEventListener('change', (e) => {
      const el = e.target.closest('[data-set]');
      if (!el) return;
      if (el.dataset.set === 'forge-type') { s.forge.type = el.value; s.forge.def = 'auto'; }
      if (el.dataset.set === 'forge-def') s.forge.def = el.value;
      if (el.dataset.set === 'forge-tier') s.forge.tier = el.value === 'auto' ? 'auto' : +el.value;
      if (el.dataset.set === 'forge-boost') s.forge.boost = el.checked;
      if (el.dataset.set === 'keep') s.market.keep = +el.value;
      persist(); renderPanel();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (lookFirst) return;
      if (lookDraft) { closeLook(false); return; }
      if (!$('#modal').hidden) { $('#modal').hidden = true; return; }
      if (battle) battle.done ? closeBattle() : skipBattle();
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });
    window.addEventListener('beforeunload', persist);
    bus.on('battle:line', battleLine);
    bus.on('battle:end', endBattle);
  }

  function boot() {
    const now = Date.now();
    s = store.load(now) || W.newGame(now);
    T.ensure(s, now);
    tab = s.location;
    bind();
    const sum = W.catchUp(s, now);
    renderAll();
    if (sum) lastTickSum = sum;
    if (!s.appearance) {
      if (sum && sum.ticks > 3) pendingSummary = sum;
      openLook(true);
    } else if (sum && sum.ticks > 3) showSummary(sum, '離線期間的收穫');
    persist();
    setInterval(loop, 1000);
  }

  boot();
  return { getState: () => s };
}
