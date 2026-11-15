// 功能選單的像素圖示（16×16）。每個字母是一種顏色，'.' 透明；輸出成 SVG，放大後仍是整齊的方塊。
const PAL = {
  k: '#0a0d13', w: '#ece4d2', g: '#f2b84b', G: '#b27b1c', s: '#c9d4e2', S: '#7d8ba0', r: '#e0564a', R: '#a83a32',
  b: '#4a8fe0', B: '#2f5fa8', p: '#a565e0', P: '#6f3fb0', n: '#a8703a', N: '#6b4421', e: '#62c46a', E: '#3d8a48',
  o: '#e8962a', f: '#f6d3bd', h: '#5a4347', d: '#3a4a66',
};
const ART = {
  training: [   // 啞鈴
    '................', '................', '................', '..SS........SS..', '.SssS......SssS.', '.SssS......SssS.',
    '.SssSSSSSSSSssS.', '.SsssssssssssS..', '.SssSSSSSSSSssS.', '.SssS......SssS.', '.SssS......SssS.', '..SS........SS..',
    '................', '....g..g..g.....', '................', '................'],
  battle: [     // 交叉的劍
    '.s............s.', '.ss..........ss.', '..sS........Ss..', '...sS......Ss...', '....sS....Ss....', '.....sS..Ss.....',
    '......sSSs......', '.......ss.......', '......SssS......', '.....Ss..sS.....', '.g..Ss....sS..g.', '.gggs......sggg.',
    '..ggg......ggg..', '..nggg....gggn..', '.nn..g....g..nn.', '.n............n.'],
  forge: [      // 鐵砧與火花
    '....o.....g.....', '.......o........', '..g.........o...', '................', '.SSSSSSSSSSSS...', '.SsssssssssssSS.',
    '..SsssssssssssS.', '...SSSSsssSSSS..', '......SssS......', '......SssS......', '.....SSssSS.....', '....SssssssS....',
    '...SSSSSSSSSS...', '................', '................', '................'],
  market: [     // 攤位
    '................', '.rrwwrrwwrrwwrr.', '.rrwwrrwwrrwwrr.', '.rrwwrrwwrrwwrr.', '.RRwwRRwwRRwwRR.', '.n............n.',
    '.n............n.', '.n..g..e..p...n.', '.n.ggg.ee.pp..n.', '.nnnnnnnnnnnnnn.', '.nNNNNNNNNNNNNn.', '.nNNNNNNNNNNNNn.',
    '.nNNNNNNNNNNNNn.', '.n............n.', '.n............n.', '................'],
  guild: [      // 盾徽
    '................', '..gggggggggggg..', '..gbbbbbbbbbbg..', '..gbbbbwwbbbbg..', '..gbbbbwwbbbbg..', '..gbwwwwwwwwbg..',
    '..gbbwwwwwwbbg..', '..gbbbwwwwbbbg..', '..gbbbwbbwbbbg..', '..gBBwBBBBwBBg..', '...gBBBBBBBBg...', '...gBBBBBBBBg...',
    '....gBBBBBBg....', '.....gBBBBg.....', '......gggg......', '................'],
  hero: [       // 冒險者的臉
    '................', '....hhhhhhh.....', '...hhhhhhhhhh...', '..hhhhhhhhhhhh..', '..hhhhhhhhhhhh..', '..hhhfhhhfhhhh..',
    '..hhffffffffhh..', '..hfkkffffkkfh..', '...fkwffffkwf...', '...ffffffffff...', '....ffffffff....', '.....ffffff.....',
    '....bbbffbbb....', '...bbbbbbbbbb...', '...bbbbbbbbbb...', '................'],
  gear: [       // 背包
    '................', '.....nnnnnn.....', '....nn....nn....', '....n......n....', '..nnnnnnnnnnnn..', '..nNNNNNNNNNNn..',
    '..nnnnnnnnnnnn..', '..nnnnnggnnnnn..', '..nnnnggggnnnn..', '..nnnnnggnnnnn..', '..nnnnnnnnnnnn..', '..nNNnnnnnnNNn..',
    '..nNNnnnnnnNNn..', '..nnnnnnnnnnnn..', '...NNNNNNNNNN...', '................'],
  hunt: [       // 有角的魔物
    '.r............r.', '.rr..........rr.', '.rRr........rRr.', '..rRpppppppprR..', '..pppppppppppp..', '.pppppppppppppp.',
    '.ppwwkppppkwwpp.', '.ppwwkppppkwwpp.', '.pppppppppppppp.', '.pppPPPPPPPPppp.', '.ppPwPwPPwPwPpp.', '.ppPPPPPPPPPPpp.',
    '..pppppppppppp..', '...PPPPPPPPPP...', '................', '................'],
  trial: [      // 獎盃
    '................', '..gggggggggggg..', '.gggggggggggggg.', '.g.gggggwggg.g..', '.g.ggggwwwgg.g..', '.g.gggwwwwwg.g..',
    '..gggggwwwggg...', '...ggggwgwgg....', '....gggggggg....', '.....gggggg.....', '......GggG......', '......GggG......',
    '.....GggggG.....', '....GGGGGGGG....', '....GGGGGGGG....', '................'],
  settings: [   // 齒輪
    '................', '......ssss......', '..ss..ssss..ss..', '..sssssssssss...', '...ssssSSssss...', '..ssssS..Sssss..',
    '.ssssS....Sssss.', '.sssS......Ssss.', '.sssS......Ssss.', '.ssssS....Sssss.', '..ssssS..Sssss..', '...ssssSSssss...',
    '..sssssssssss...', '..ss..ssss..ss..', '......ssss......', '................'],
};
const cache = {};
export function navIcon(name) {
  if (cache[name]) return cache[name];
  const rows = ART[name] || ART.settings;
  let rects = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {          // 同一列相同顏色合併成一個長方形
      const ch = row[x];
      let n = 1;
      while (x + n < row.length && row[x + n] === ch) n++;
      if (ch !== '.') rects += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${PAL[ch]}"/>`;
      x += n;
    }
  });
  return (cache[name] = `<svg class="nav-ico" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`);
}
