// 手繪的動漫迷你 Q 版角色（34×50）：每個字母代表一種顏色，'.' 是透明。
// K 輪廓、D/H/M/L 頭髮由暗到亮、S/s 皮膚、E/e/g 眼睛、W 高光、J/j/I 外套、T/t/u 白 T、P/p/q 褲子、O/o 鞋面、w/n 鞋底。
export const ROWS = [
  '.........KKKKKK...................',
  '........KHDDHDDKKKKKK.............',
  '.....KK.KHHDHHHDDDMHHKK..KK.......',
  '....KHHKKMMDLMMDHMMMLDHKKHHK......',
  '....KDHDLMDMMMHDDHHMMMDLDHDK......',
  '....KDDLMMDMHHHDDHHHHMDMMDDK......',
  '....KDMMMDDMDMDDMDDDDHHDMMDK......',
  '....KMMMHDMDMMHDMHDHDDDDHMHKK.....',
  '...KHHMHDLMDMHDLHHDHDDDDHHHHDK....',
  '..KKHHHHDMDLMHDMHHDDDDDDDHHHHDK...',
  '.KDHHHHDDMDLMHDMHHDDHDDDDDHDHDK...',
  '.KDHDDDDMMDMMHDMHHDDHDDDDDDDDK....',
  '.KDDDDDDMMDMMHDMHHDDHDDDDDMMK.....',
  '..KKMMHDMMHDMHDMHDDHHDHHDDMHK.....',
  '...KHHHDHHHDHHDMHDDHHDHHDDHHHK....',
  '..KHHHHDHHDKHHDMHDDHDKHHDDHHHK....',
  '..KHDDDDHDDsHDKHHDKHDsHHDDDDHK....',
  '..KDDDDHKDKSHDsHHDsHDSKHDHDDDK....',
  '...KDHHKKKKKKKSHHKSKKKKKKHDDK.....',
  '....KHHDKEWEEsSHDsSEWEEKKKHK......',
  '....KHHDSEWEESSKDSSEWEEsssK.......',
  '....KDKKSEEeeSSsKSSEEeessK........',
  '.....K.KSegggSSSsSSegggsK.........',
  '........KSSSSSSSSSSSSSsK..........',
  '.........KSSSSSssSSSSsK...........',
  '.........KIJjsSSSSsjJjK...........',
  '........KIIJJjssssjJJJjK..........',
  '........KIJJJKssstKJJJjK..........',
  '......KKJIIITKTTTtKTJjJJKK........',
  '.....KJJKIIJTKTTTtKTJJjKJJK.......',
  '.....KIJKIJJTKTTTtKTJJjKJjK.......',
  '....KJIJKIjJtKTTTtKTJJjKJjJK......',
  '....KJIJKIjJJKTTttKtJjJKJjJK......',
  '....KIJJKIJjJKTTttKJjJJKJjJK......',
  '....KIJJKIJJJKTTttKJjJJKJjJK......',
  '....KIIIKIjjJKTTttKJjjJKjjjK......',
  '....KSSSKJJJJKttttKJJJJKSSSK......',
  '....KSSsKjjjjjjjjjjjjjjKSssK......',
  '.....KsK.KPPPPPppPPPPPK.KsK.......',
  '......K..KPPPPPppPPPPPK..K........',
  '.........KqPPPpKKqPpPpK...........',
  '.........KqPpPpKKqPPppK...........',
  '.........KqPpPpKKqPPppK...........',
  '.........KqPPppKKqPPPpK...........',
  '.........KqPPPpKKqPPPpK...........',
  '........KOOooOOKKOOooOOK..........',
  '.......KwwOOOOOKKOOOOOwwK.........',
  '......KwwwwwwnnKKwwwwwwnnK........',
  '.......KKKKKKKK..KKKKKKKK.........',
  '..................................',
];

export const BASE = {"K": "#120d12", "S": "#ffdcc4", "s": "#f2b9a0", "r": "#d99482", "W": "#ffffff", "T": "#ece6e8", "t": "#bdb3b9", "u": "#8f858c", "O": "#2e292f", "o": "#48424a", "w": "#f4f2f6", "n": "#c3bfc8"};

export const COLORWAYS = [
  { name: "A 照參考圖", pal: {"D": "#2a2127", "H": "#3d3036", "M": "#54434b", "L": "#76626b", "E": "#231a20", "e": "#5a4a54", "g": "#a4949e", "J": "#3a3238", "j": "#262026", "I": "#52474f", "P": "#353037", "p": "#231e24", "q": "#4a434b"} },
  { name: "B 棕髮藍外套", pal: {"D": "#5a2f1c", "H": "#7e4528", "M": "#a0603a", "L": "#c8875a", "E": "#1c2440", "e": "#2f5aa0", "g": "#7fb0e8", "J": "#2f5ea8", "j": "#1f3f78", "I": "#4f82cc", "P": "#2f3350", "p": "#1f2238", "q": "#454a6e"} },
  { name: "C 銀髮紅外套", pal: {"D": "#7a7690", "H": "#a8a4bc", "M": "#c8c4d8", "L": "#ecebf4", "E": "#3a121c", "e": "#9a2a3c", "g": "#e06a7c", "J": "#b0303e", "j": "#7a1e2a", "I": "#d44a56", "P": "#2e2a36", "p": "#1c1a24", "q": "#45404f"} },
];

export function grid(pal) {
  return ROWS.map((row) => row.split('').map((c) => (c === '.' ? null : pal[c] || BASE[c])));
}
