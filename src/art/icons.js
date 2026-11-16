// 裝備圖示：武器、頭飾、上衣、鞋子直接用角色身上那一層裁切；飾品另外畫。
import { Layer, render, crop } from './pixel.js';
import { gearMats } from './palette.js';
import { gearGrid } from './chibi.js';

const S = 20;

function accLayer(it) {
  const L = new Layer(S, S), r = it.rarity;
  const kind = it.look;   // ring、necklace、bracelet、earring，其他都畫成護符
  const gemBig = r >= 3;
  if (kind === 'ring') {
    L.ellipse(9.5, 12, 5, 4.5, 'metal');
    L.ellipse(9.5, 12.5, 3, 2.6, null);
    L.rows([[4, 8, 11], [5, 7, 12], [6, 7, 12], [7, 8, 11]], 'gem');
    if (gemBig) L.dots([[6, 6], [13, 6]], 'trim');
  } else if (kind === 'necklace') {
    for (let i = 0; i <= 12; i++) {
      const x = 3 + i, y = 3 + Math.round(6 * Math.sin((i / 12) * Math.PI));
      L.set(x, y, 'metal');
    }
    L.rows([[10, 8, 11], [11, 7, 12], [12, 7, 12], [13, 8, 11], [14, 9, 10]], 'gem');
    if (gemBig) L.dots([[6, 12], [13, 12], [9, 16], [10, 16]], 'trim');
  } else if (kind === 'bracelet') {
    L.ellipse(9.5, 10, 6, 5, 'metal');
    L.ellipse(9.5, 10, 4, 3, null);
    L.dots([[4, 8], [15, 8], [9, 4], [10, 4], [9, 15], [10, 15]], 'gem');
    if (gemBig) L.dots([[5, 13], [14, 13], [5, 6], [14, 6]], 'trim');
  } else if (kind === 'earring') {
    L.dots([[9, 2], [10, 2], [8, 3], [11, 3], [8, 4], [11, 4], [9, 5], [10, 5]], 'metal');
    L.vline(9, 6, 8, 'metal').vline(10, 6, 8, 'metal');
    L.rows([[9, 8, 11], [10, 7, 12], [11, 7, 12], [12, 7, 12], [13, 8, 11], [14, 9, 10]], 'gem');
    if (gemBig) L.dots([[5, 11], [14, 11], [9, 16], [10, 16]], 'trim');
  } else {
    L.vline(9, 1, 3, 'leather').vline(10, 1, 3, 'leather');
    L.rows([[4, 7, 12], [5, 6, 13], [6, 5, 14], [7, 5, 14], [8, 5, 14], [9, 5, 14], [10, 5, 14], [11, 6, 13], [12, 7, 12], [13, 8, 11], [14, 9, 10]], 'metal');
    L.rows([[7, 8, 11], [8, 8, 11], [9, 8, 11], [10, 9, 10]], 'gem');
    if (gemBig) L.dots([[6, 6], [13, 6], [6, 11], [13, 11]], 'trim');
  }
  if (r >= 4) L.dots([[2, 2], [17, 2], [2, 17], [17, 17]], 'gold');
  return L;
}

export function itemIconGrid(it) {
  if (it.type === 'acc') return render(accLayer(it), gearMats(it), { shade: 'cel', outlineColor: '#120d12' });
  return crop(gearGrid(it.type, it), 1);
}
