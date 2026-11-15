// HTML 介面與 Phaser 之間的事件：兩邊不直接互相呼叫。
//
// 介面 → Phaser
//   state          遊戲狀態變了（換地點、換裝備…），場景重新整理
//   tick           一次掛機結算完成，payload 是結算摘要
//   battle:start   開始播放戰鬥 { foe, r, scene, equip, look }（scene：用第幾種場景）
//   battle:skip    跳到戰鬥結尾
//   battle:close   關閉戰鬥，回到掛機場景
//   stage:show     戰鬥畫面顯示或隱藏了（true / false）；只有在戰鬥地圖掛機或播放戰鬥時才顯示
// Phaser → 介面
//   battle:line    播到第 i 行戰鬥紀錄 { i, line }
//   battle:end     戰鬥播完
const handlers = new Map();

export const bus = {
  on(type, fn) {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type).add(fn);
    return () => handlers.get(type).delete(fn);
  },
  // 回傳有幾個監聽者收到，方便判斷 Phaser 是否已經準備好
  emit(type, payload) {
    const set = handlers.get(type);
    if (!set) return 0;
    for (const fn of [...set]) fn(payload);
    return set.size;
  },
};
