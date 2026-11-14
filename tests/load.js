// 在 Node 中載入遊戲核心（與瀏覽器相同的檔案、相同的載入順序）
const path = require('path');
const files = ['rng', 'data', 'stats', 'items', 'combat', 'world', 'trial', 'save'];
for (const f of files) require(path.join(__dirname, '..', 'js', 'core', f + '.js'));
module.exports = globalThis.ADV;
