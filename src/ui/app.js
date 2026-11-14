// HTML 介面：選單、表格、背包、任務這些文字多的畫面。遊戲規則都在 src/core，會動的畫面交給 Phaser（src/game）。
import { data as D } from '../core/data.js';
import { world as W } from '../core/world.js';
import { trial as T } from '../core/trial.js';
import { items as I } from '../core/items.js';
import { stats as S } from '../core/stats.js';
import { save as store } from '../core/save.js';
import { sprites as SP } from './sprites.js';

export function startUI(bus) {
  const $ = (q) => document.querySelector(q);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('zh-TW');
  const fmtV = (k, v) => (D.STAT_PCT[k] ? (Math.round(v * 10) / 10) + '%' : fmt(v));

  let s = null;
  let tab = 'idle';
  let viewLoc = null;       // 正在查看的地點（預設是掛機中的地點）
  let bagFilter = 'all';
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
  function matName(key) { const [tag, tier] = key.split('-'); return D.MATS[tier][tag]; }
  function rarityName(r) { return `<span style="color:${D.RARITY[r].color}">${D.RARITY[r].n}</span>`; }
  function setupCanvas(cv, w, h) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = w * dpr; cv.height = h * dpr;
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
      <div class="hud-item"><span class="hud-label">等級</span><span class="lv">Lv ${s.hero.level}</span>
        <div class="bar exp" title="經驗 ${fmt(s.hero.exp)} / ${fmt(need)}"><span style="width:${(s.hero.exp / need) * 100}%"></span></div></div>
      <div class="hud-item"><span class="gold">${fmt(s.gold)}</span></div>
      <div class="hud-item"><span class="hud-label">掛機中</span><b>${loc.n}${s.location === 'battle' ? '・' + D.AREAS[s.areaIdx].n : ''}</b>
        <div class="bar tick" title="下一次結算"><span style="width:${tickPct}%"></span></div></div>`;
  }

  // ---------- 角色 ----------
  function renderHero() {
    const h = W.hero(s);
    const st = h.stats;
    const mechs = h.cls.mechs.map(([t, f]) => `<li>${esc(S.mechText(t, f))}</li>`).join('');
    $('#heroInfo').innerHTML = `
      <div><p class="cls-name">${esc(h.cls.name)}<span class="cls-kind">${esc(h.cls.kind)}</span></p>
        <ul class="mechs">${mechs || '<li>武器、頭飾、上衣、鞋子中有 2 件同流派，就會有職業</li>'}</ul></div>
      <div class="power"><span class="hud-label">戰力</span><span class="num">${fmt(S.power(st))}</span></div>
      <dl class="stats">${D.STATS.map((x) => `<div><dt>${x.n}</dt><dd class="num">${fmtV(x.k, st[x.k])}</dd></div>`).join('')}</dl>`;
    const log = s.log.slice(0, 12);
    $('#log').innerHTML = log.length ? log.map((l) => `<li><time>${clock(l.t)}</time><span>${esc(l.msg)}</span></li>`).join('')
      : '<li class="empty">還沒有大事發生。升級、鍛造出史詩裝備、擊敗頭目都會記在這裡。</li>';
  }

  // ---------- 分頁 ----------
  function renderTabs() {
    document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
  }
  function renderPanel() {
    renderTabs();
    const p = $('#panel');
    if (tab === 'idle') p.innerHTML = idlePanel();
    else if (tab === 'gear') p.innerHTML = gearPanel();
    else if (tab === 'hunt') { p.innerHTML = huntPanel(); drawBossThumbs(); }
    else if (tab === 'trial') p.innerHTML = trialPanel();
  }

  // ---------- 掛機地點 ----------
  function idlePanel() {
    const v = viewLoc || s.location;
    const locs = D.LOCATIONS.map((l) => `
      <button class="loc" data-act="view-loc" data-k="${l.k}" aria-pressed="${l.k === v}">
        ${l.k === s.location ? '<span class="on">掛機中</span>' : '<span class="on" style="color:var(--muted)">　</span>'}
        <b>${l.n}</b><small>${l.d}</small></button>`).join('');
    const body = { training: trainingView, battle: battleView, forge: forgeView, market: marketView, guild: guildView }[v]();
    const go = v === s.location ? '' : `<button class="btn" data-act="go" data-k="${v}">改到${D.LOCATIONS.find((l) => l.k === v).n}掛機</button>`;
    return `<div class="row spread"><h2>掛機地點</h2><p class="hint">同一時間只能在一個地點掛機，離線也會繼續（最多 12 小時）。</p></div>
      <div class="locs">${locs}</div>
      <div class="sub">${go ? `<div class="row">${go}<span class="hint">目前在${D.LOCATIONS.find((l) => l.k === s.location).n}掛機</span></div>` : ''}${body}</div>`;
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

  function battleView() {
    const rows = D.AREAS.map((a, i) => {
      const locked = i > s.unlockedArea;
      const sel = s.areaIdx === i;
      return `<tr class="${sel ? 'sel' : ''}"><td><b>${a.n}</b><br><span class="hint">${a.monsters.map((m) => m.n).join('、')}</span></td>
        <td class="num">Lv ${a.lv}–${a.lv + 2}</td>
        <td>${D.TAG_KEYS.map((t) => `<span class="chip" style="color:${D.TAGS[t].color}">${D.MATS[a.tier][t]}</span>`).join(' ')}</td>
        <td class="r">${locked ? `<span class="hint">擊敗${D.AREAS[i - 1].boss.n}解鎖</span>` : sel ? '<b style="color:var(--gold)">目前地圖</b>' : `<button class="btn small" data-act="area" data-i="${i}">選擇</button>`}</td></tr>`;
    }).join('');
    const last = lastTickSum && s.location === 'battle' ? `<p class="hint">最近一次結算：擊敗 ${lastTickSum.kills}、落敗 ${lastTickSum.losses}</p>` : '';
    return `<div class="sub-h"><h3>戰鬥地圖</h3><span class="hint">每 5 秒遇到一隻魔物。勝利得到經驗、金幣，有機會掉材料或裝備。</span></div>
      ${last}
      <div class="table-wrap"><table class="t"><thead><tr><th>地圖</th><th>魔物等級</th><th>掉落材料</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function oddsBar(odds) {
    const total = odds.reduce((a, b) => a + b, 0);
    return `<div class="odds">${odds.map((o, i) => `<span style="width:${(o / total) * 100}%;background:${D.RARITY[i].color}" title="${D.RARITY[i].n} ${o}%"></span>`).join('')}</div>
      <div class="legend">${odds.map((o, i) => `<span><i style="background:${D.RARITY[i].color}"></i>${D.RARITY[i].n} ${o}%</span>`).join('')}</div>`;
  }
  function matsGrid() {
    let html = '<div class="h">階級</div>' + D.TAG_KEYS.map((t) => `<div class="h" style="color:${D.TAGS[t].color}">${D.TAGS[t].n}材料</div>`).join('');
    for (let tier = 1; tier <= 5; tier++) {
      html += `<div class="h num">T${tier}</div>`;
      for (const t of D.TAG_KEYS) {
        const n = s.mats[W.matKey(t, tier)] || 0;
        html += `<div class="${n ? '' : 'zero'}"><span>${D.MATS[tier][t]}</span><span class="num">${n}</span></div>`;
      }
    }
    return `<div class="mats">${html}</div>`;
  }
  function forgeView() {
    const f = s.forge, cur = D.FORGE[f.level], next = D.FORGE[f.level + 1];
    const typeOpts = [['auto', '自動輪流'], ['weapon', '武器'], ['head', '頭飾'], ['body', '上衣'], ['feet', '鞋子'], ['acc', '飾品']];
    const tagOpts = [['auto', '材料最多的流派'], ...D.TAG_KEYS.map((t) => [t, D.TAGS[t].n + '材料'])];
    const pct = s.location === 'forge' ? (f.progress / cur.ticks) * 100 : 0;
    return `<div class="sub-h"><h3>鍛造室・${cur.n} <span class="num" style="color:var(--gold)">Lv ${f.level}</span></h3>
        ${next ? `<button class="btn small" data-act="forge-up" ${s.gold < next.cost ? 'disabled' : ''}>升級為${next.n} <span class="num">${fmt(next.cost)}</span></button>` : '<span class="hint">已是最高級設備</span>'}</div>
      <p class="hint">每件裝備用 ${D.CRAFT_COST} 個同階材料，${cur.ticks * 5} 秒完成一件。用哪個流派的材料，就做出哪個流派的裝備；飾品不分流派，專門出詞條。</p>
      ${oddsBar(cur.odds)}
      <div class="row">
        <label class="field" for="forgeType">要鍛造的部位<select id="forgeType" data-set="forge-type">${typeOpts.map(([k, n]) => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="field" for="forgeTag">使用的材料<select id="forgeTag" data-set="forge-tag">${tagOpts.map(([k, n]) => `<option value="${k}" ${f.tag === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      </div>
      ${s.location === 'forge' ? `<div><div class="bar good"><span style="width:${pct}%"></span></div><p class="hint">${esc(f.status || '準備中')}</p></div>` : '<p class="hint">要在鍛造室掛機才會開始鍛造。</p>'}
      ${matsGrid()}`;
  }

  function marketView() {
    const m = s.market;
    const keeps = [0, 8, 20, 50];
    return `<div class="sub-h"><h3>市集</h3><span class="hint">市集聲望 <b class="num">${fmt(m.rep)}</b></span></div>
      <p class="hint">每 5 秒賣出 <b class="num">${W.marketSpeed(m.rep)}</b> 個材料，售價 ×<b class="num">${W.marketBonus(m.rep).toFixed(2)}</b>。聲望越高賣得越快、越貴（有上限）。</p>
      <label class="field" for="keep">每種材料保留<select id="keep" data-set="keep">${keeps.map((k) => `<option value="${k}" ${m.keep === k ? 'selected' : ''}>${k} 個</option>`).join('')}</select></label>
      ${matsGrid()}
      <p class="hint">付費的市集隨從還沒做，之後再看怎麼設計。</p>`;
  }

  function guildView() {
    const r = W.guildRank(s.guild.rep), g = D.GUILD_RANKS[r], nx = D.GUILD_RANKS[r + 1];
    const quests = s.guild.quests.map((q) => {
      const p = W.questProgress(s, q);
      const done = p >= q.need;
      const reward = [`<span class="num">${fmt(q.reward.gold)}</span> 金幣`, `聲望 +${q.reward.rep}`, q.reward.mat ? `${matName(q.reward.mat.key)} ×${q.reward.mat.n}` : ''].filter(Boolean).join('、');
      return `<div class="card"><div class="row spread"><b>${esc(q.n)} ${q.need} 次</b>${done ? `<button class="btn small" data-act="claim" data-id="${q.id}">領取</button>` : ''}</div>
        <div class="bar good"><span style="width:${(p / q.need) * 100}%"></span></div>
        <span class="hint"><span class="num">${p} / ${q.need}</span>・獎勵：${reward}</span></div>`;
    }).join('');
    return `<div class="sub-h"><h3>公會・委託等級 <span class="num" style="color:var(--gold)">${g.n}</span></h3>
        <span class="hint">冒險者聲望 <b class="num">${fmt(s.guild.rep)}</b>${nx ? ` / ${fmt(nx.rep)} 升到 ${nx.n} 級` : '（最高級）'}</span></div>
      <p class="hint">在公會掛機會接雜事委託，每 5 秒約 <b class="num">${fmt(g.gold * (1 + s.hero.level * 0.05))}</b> 金幣。任務在任何地點都會累計，完成後回來領取。</p>
      <div class="slots">${quests}</div>`;
  }

  // ---------- 裝備與背包 ----------
  function itemLines(it) {
    const base = Object.entries(it.base).map(([k, v]) => `<li>${I.fmtStat(k, v)}</li>`).join('');
    const aff = it.affixes.map((a) => `<li class="aff">◆ ${I.fmtStat(a.k, a.v)}</li>`).join('');
    const eff = it.effect ? `<li class="eff">★ ${esc(it.effect.n)}：${esc(it.effect.d)}</li>` : '';
    return `<ul class="lines">${base}${aff}${eff}</ul>`;
  }
  function itemChips(it) {
    return `<div class="chips"><span class="chip" style="color:${D.RARITY[it.rarity].color}">${D.RARITY[it.rarity].n}</span>
      ${it.tag ? `<span class="chip" style="color:${D.TAGS[it.tag].color}">${D.TAGS[it.tag].n}</span>` : '<span class="chip" style="color:var(--muted)">詞條專用</span>'}
      <span class="chip" style="color:var(--muted)">T${it.tier}</span></div>`;
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
    const slots = D.SLOTS.map((sl) => {
      const it = s.equip[sl.k];
      if (!it) return `<div class="card empty"><span class="slot-name">${sl.n}</span><span>空</span></div>`;
      return `<div class="card"><span class="slot-name">${sl.n}</span><span class="iname" style="color:${D.RARITY[it.rarity].color}">${esc(it.name)}</span>
        ${itemChips(it)}${itemLines(it)}<div><button class="btn ghost small" data-act="unequip" data-k="${sl.k}">卸下</button></div></div>`;
    }).join('');
    const filters = [['all', '全部'], ['weapon', '武器'], ['head', '頭飾'], ['body', '上衣'], ['feet', '鞋子'], ['acc', '飾品']];
    const list = s.bag.filter((it) => bagFilter === 'all' || it.type === bagFilter)
      .map((it) => ({ it, slot: slotFor(it) }))
      .map((o) => ({ ...o, d: powerWith(o.slot, o.it) - curPow }))
      .sort((a, b) => b.d - a.d || b.it.rarity - a.it.rarity);
    const bag = list.map(({ it, d }) => `<div class="card"><div class="row spread"><span class="slot-name">${D.TYPE_NAME[it.type]}</span>
        <span class="delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">戰力 ${d > 0 ? '+' : ''}${fmt(d)}</span></div>
        <span class="iname" style="color:${D.RARITY[it.rarity].color}">${esc(it.name)}</span>${itemChips(it)}${itemLines(it)}
        <div class="row"><button class="btn small" data-act="equip" data-id="${it.id}">穿上</button>
        <button class="btn ghost small" data-act="sell" data-id="${it.id}">賣出 <span class="num">${fmt(I.sellPrice(it))}</span></button></div></div>`).join('');
    const cheap = s.bag.filter((it) => it.rarity < 2).length;
    return `<div class="row spread"><h2>裝備</h2><span class="hint">武器、頭飾、上衣、鞋子決定職業；飾品只提供詞條。外觀會隨裝備改變。</span></div>
      <div class="slots">${slots}</div>
      <div class="row spread"><h2>背包 <span class="num hint">${s.bag.length} / ${D.BAG_CAP}</span></h2>
        <div class="row"><div class="filter">${filters.map(([k, n]) => `<button data-act="bag-filter" data-k="${k}" aria-pressed="${bagFilter === k}">${n}</button>`).join('')}</div>
        <button class="btn ghost small" data-act="sell-cheap" ${cheap ? '' : 'disabled'}>賣出普通與精良（${cheap}）</button></div></div>
      ${list.length ? `<div class="bag">${bag}</div>` : `<p class="hint">背包是空的。到鍛造室掛機把材料做成裝備，或在戰鬥地圖碰碰運氣。</p>`}
      <h2>材料</h2>${matsGrid()}`;
  }

  // ---------- 魔物狩獵 ----------
  function huntPanel() {
    const now = Date.now();
    W.refreshTickets(s, now);
    const h = s.hunt;
    const next = h.tickets < W.HUNT_MAX ? `，下一張 ${dur(h.refillAt + W.HUNT_REFILL_MS - now)} 後恢復` : '';
    const list = D.AREAS.map((a, i) => {
      const locked = i > s.unlockedArea;
      const boss = W.bossEnemy(i);
      const kills = s.bossKills[i] || 0;
      return `<div class="card boss"><div class="row"><canvas data-boss="${i}" width="64" height="64"></canvas>
          <div><b>${a.boss.n}</b><br><span class="hint">${a.n}・Lv ${a.lv + 4}</span><br><span class="hint num">生命 ${fmt(boss.stats.hp)}</span></div></div>
        <span class="hint">${kills ? `已擊敗 ${kills} 次` : i === s.unlockedArea && i + 1 < D.AREAS.length ? `首次擊敗解鎖「${D.AREAS[i + 1].n}」` : '尚未擊敗'}</span>
        ${locked ? '<span class="hint">先擊敗前一隻頭目</span>' : `<button class="btn" data-act="hunt" data-i="${i}" ${h.tickets <= 0 ? 'disabled' : ''}>挑戰</button>`}</div>`;
    }).join('');
    return `<div class="row spread"><h2>魔物狩獵</h2><span class="hint">狩獵券 <b class="num" style="color:var(--gold)">${h.tickets} / ${W.HUNT_MAX}</b>${next}</span></div>
      <p class="hint">頭目血量每次挑戰都會重置，要在 30 回合內打倒才算勝利。裝備的特殊效果、職業機制會直接改變戰鬥過程。</p>
      <div class="bosses">${list}</div>`;
  }
  function drawBossThumbs() {
    document.querySelectorAll('canvas[data-boss]').forEach((cv) => {
      const a = D.AREAS[+cv.dataset.boss];
      const ctx = setupCanvas(cv, 64, 64);
      const locked = +cv.dataset.boss > s.unlockedArea;
      SP.draw(ctx, SP.enemyGrid(a.boss.shape, locked ? '#3a4256' : a.boss.c), 0, 0, 4, { alpha: locked ? 0.6 : 1 });
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
        ${foe.boss ? '<p class="hint">守護者關卡：首次通過有額外金幣與材料。</p>' : ''}
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
  function playBattle({ title, foe, r, resultHtml }) {
    battle = { foe, r, resultHtml, done: false, lines: [] };
    $('#battleBar').hidden = false;
    $('#bTitle').textContent = title;
    $('#bLog').innerHTML = '';
    $('#bResult').innerHTML = '';
    const btn = $('#bSkip');
    btn.textContent = '跳過'; btn.dataset.act = 'b-skip';
    $('#stageWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    renderAll();
    // 戰鬥畫面交給 Phaser；沒有人接（例如畫面還沒準備好）就直接顯示結果
    if (!bus.emit('battle:start', { foe, r, equip: { ...s.equip } })) endBattle();
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
    if (sum.sold) rows.push(['市集賣出', `${fmt(sum.sold)} 個材料`]);
    if (sum.marketRep) rows.push(['市集聲望', '+' + fmt(sum.marketRep)]);
    if (sum.guildRep) rows.push(['冒險者聲望', '+' + fmt(sum.guildRep)]);
    const mats = Object.entries(sum.mats).map(([k, n]) => `${matName(k)} ×${n}`).join('、');
    if (mats) rows.push(['材料', mats]);
    const items = sum.items.slice().sort((a, b) => b.rarity - a.rarity);
    const itemHtml = items.length ? `<p class="hint">得到 ${items.length} 件裝備：${items.slice(0, 12).map((it) => `<span style="color:${D.RARITY[it.rarity].color}">${esc(it.name)}</span>`).join('、')}${items.length > 12 ? ' 等' : ''}</p>` : '';
    const notes = sum.notes.length ? `<p class="hint">注意：${sum.notes.map(esc).join('；')}</p>` : '';
    const m = $('#modal');
    m.hidden = false;
    m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="sTitle"><h2 id="sTitle">${esc(title)}</h2>
      <ul class="sum-list">${rows.map(([a, b]) => `<li><span>${a}</span><span>${b}</span></li>`).join('')}</ul>${itemHtml}${notes}
      <div class="row"><button class="btn" data-act="modal-close">收下</button>${items.length ? '<button class="btn ghost" data-act="modal-gear">去看裝備</button>' : ''}</div></div>`;
  }
  function confirmBox(title, text, act, label) {
    const m = $('#modal');
    m.hidden = false;
    m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="cTitle"><h2 id="cTitle">${esc(title)}</h2><p>${esc(text)}</p>
      <div class="row"><button class="btn danger" data-act="${act}">${esc(label)}</button><button class="btn ghost" data-act="modal-close">取消</button></div></div>`;
  }

  // ---------- 主迴圈 ----------
  function renderAll() { renderHud(); renderHero(); renderPanel(); bus.emit('state'); }
  function onTick(sum) {
    lastTickSum = sum;
    bus.emit('tick', sum);
    if (sum.levels) toast(`升到 ${s.hero.level} 級！`);
    const good = sum.items.filter((it) => it.rarity >= 3);
    if (good.length) toast(`得到${D.RARITY[good[0].rarity].n}裝備「${good[0].name}」`);
    renderHero();
    // 掛機分頁會即時更新；其他分頁不打斷玩家操作
    if (tab === 'idle' && !document.activeElement?.matches('select')) renderPanel();
  }
  function loop() {
    const now = Date.now();
    const sum = W.catchUp(s, now);
    if (sum) {
      if (sum.ticks > 3) showSummary(sum, '離線期間的收穫');
      onTick(sum);
      persist();
    }
    renderHud(now);
  }

  // ---------- 操作 ----------
  function act(a, el) {
    const now = Date.now();
    const k = el.dataset.k, id = el.dataset.id, i = el.dataset.i;
    switch (a) {
      case 'view-loc': viewLoc = k; break;
      case 'go': W.setLocation(s, k); viewLoc = null; toast(`改到${D.LOCATIONS.find((l) => l.k === k).n}掛機`); break;
      case 'unlock': if (W.unlockDevice(s, k)) toast('設備已解鎖'); break;
      case 'dev-up': if (W.upgradeDevice(s, k)) toast('設備升級了，訓練上限提高'); break;
      case 'train': s.trainDevice = k; break;
      case 'area': s.areaIdx = +i; break;
      case 'forge-up': if (W.upgradeForge(s)) toast(`鍛造室升級為${D.FORGE[s.forge.level].n}`); break;
      case 'claim': { const q = W.claimQuest(s, id, now); if (q) toast(`領到 ${fmt(q.reward.gold)} 金幣`); break; }
      case 'equip': W.equip(s, id, slotFor(s.bag.find((x) => x.id === id))); break;
      case 'unequip': if (!W.unequip(s, k)) toast('背包滿了，先賣掉一些裝備'); break;
      case 'sell': toast(`賣出，得到 ${fmt(W.sell(s, id))} 金幣`); break;
      case 'sell-cheap': { const r = W.sellBelow(s, 2); toast(`賣出 ${r.n} 件，得到 ${fmt(r.total)} 金幣`); break; }
      case 'bag-filter': bagFilter = k; break;
      case 'hunt': {
        if (battle) { toast('先看完或關閉目前的戰鬥'); return; }
        const out = W.hunt(s, +i, now);
        if (!out) { toast('狩獵券用完了'); break; }
        persist();
        const rw = out.rewards;
        const res = out.r.win
          ? `<p class="result win">勝利！</p><p class="hint">金幣 +${fmt(rw.gold)}・${Object.entries(rw.mats).map(([kk, n]) => `${matName(kk)} ×${n}`).join('、')}${rw.item ? `・<span style="color:${D.RARITY[rw.item.rarity].color}">${esc(rw.item.name)}</span>` : ''}${rw.unlocked ? `<br>解鎖新地圖「${esc(rw.unlocked)}」` : ''}</p>`
          : `<p class="result lose">${out.r.timeout ? '時間到，沒能打倒' : '落敗'}</p><p class="hint">造成 ${fmt(out.r.dealt)} 傷害（頭目生命的 ${Math.round((out.r.dealt / out.r.maxHpE) * 100)}%）。</p>`;
        playBattle({ title: `魔物狩獵：${out.boss.n}`, foe: { shape: out.boss.shape, c: out.boss.c, name: out.boss.n, boss: true }, r: out.r, resultHtml: res });
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
        playBattle({ title: `神之試煉・第 ${out.floor} 關`, foe: { ...out.foe, name: out.foe.name }, r: out.r, resultHtml: res });
        return;
      }
      case 'bless': if (T.choose(s, id)) toast(`得到祝福「${D.BLESSINGS.find((b) => b.id === id).n}」`); break;
      case 'trial-restart': T.restart(s, now); break;
      case 'b-skip': skipBattle(); return;
      case 'b-close': closeBattle(); return;
      case 'modal-close': $('#modal').hidden = true; $('#modal').innerHTML = ''; break;
      case 'modal-gear': $('#modal').hidden = true; $('#modal').innerHTML = ''; tab = 'gear'; break;
      case 'ff': {
        s.lastTick -= 3600e3;
        s.hunt.refillAt -= 3600e3;
        const sum = W.catchUp(s, now);
        if (sum) { onTick(sum); showSummary(sum, '快轉 1 小時的收穫'); }
        break;
      }
      case 'reset-ask': confirmBox('重新開始？', '目前的角色、裝備和進度都會刪除，無法復原。', 'reset', '刪除並重新開始'); return;
      case 'reset': store.clear(); s = W.newGame(Date.now()); T.ensure(s, Date.now()); $('#modal').hidden = true; toast('開始新的冒險'); break;
      default: return;
    }
    persist();
    renderAll();
  }

  function bind() {
    document.addEventListener('click', (e) => {
      const tb = e.target.closest('[data-tab]');
      if (tb) { tab = tb.dataset.tab; renderPanel(); return; }
      const el = e.target.closest('[data-act]');
      if (el && !el.disabled) act(el.dataset.act, el);
    });
    document.addEventListener('change', (e) => {
      const el = e.target.closest('[data-set]');
      if (!el) return;
      if (el.dataset.set === 'forge-type') s.forge.type = el.value;
      if (el.dataset.set === 'forge-tag') s.forge.tag = el.value;
      if (el.dataset.set === 'keep') s.market.keep = +el.value;
      persist(); renderPanel();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
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
    bind();
    const sum = W.catchUp(s, now);
    renderAll();
    if (sum && sum.ticks > 3) showSummary(sum, '離線期間的收穫');
    if (sum) lastTickSum = sum;
    persist();
    setInterval(loop, 1000);
  }

  boot();
  return { getState: () => s };
}
