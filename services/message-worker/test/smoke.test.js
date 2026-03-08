const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function collectJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJsFiles(full));
    if (entry.isFile() && full.endsWith('.js')) out.push(full);
  }
  return out;
}

const jsFiles = collectJsFiles(path.join(__dirname, '..', 'src'));
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr.toString());
    process.exit(result.status || 1);
  }
}

console.log(`message-worker smoke passed (${jsFiles.length} files)`);
