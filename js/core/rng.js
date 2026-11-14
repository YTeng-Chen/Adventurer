// 可重現的隨機數：掛機結算、試煉祝福都用種子，結果可以重算、可以測試。
(function (A) {
  function make(seed) {
    let s = seed >>> 0;
    const r = {
      next() {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      int(a, b) { return a + Math.floor(r.next() * (b - a + 1)); },
      range(a, b) { return a + r.next() * (b - a); },
      chance(p) { return r.next() < p; },
      pick(arr) { return arr[Math.floor(r.next() * arr.length)]; },
      weighted(weights) {
        const total = weights.reduce((a, b) => a + b, 0);
        let x = r.next() * total;
        for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x < 0) return i; }
        return weights.length - 1;
      },
      get state() { return s; },
    };
    return r;
  }
  function hash(...parts) {
    let h = 2166136261;
    for (const ch of parts.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  A.rng = { make, hash };
})(globalThis.ADV = globalThis.ADV || {});
