const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function collectJsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectJsFiles(full);
    return entry.isFile() && full.endsWith('.js') ? [full] : [];
  });
}

const jsFiles = collectJsFiles(path.join(__dirname, '..', 'src'));
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr.toString());
    process.exit(result.status || 1);
  }
}

console.log(`api-service smoke passed (${jsFiles.length} files)`);
