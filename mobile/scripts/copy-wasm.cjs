const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist');
const dest = path.join(__dirname, '..', 'public');

if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

['sql-wasm.wasm', 'sql-wasm.js'].forEach(file => {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
  console.log(`Copié : ${file}`);
});
