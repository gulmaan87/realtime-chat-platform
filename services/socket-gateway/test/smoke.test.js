const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function collectJsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectJsFiles(full));
    else if (entry.isFile() && full.endsWith('.js')) files.push(full);
  }
  return files;
}

const srcDir = path.join(__dirname, '..', 'src');
const jsFiles = collectJsFiles(srcDir);
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr.toString());
    process.exit(result.status || 1);
  }
}

const socketFile = fs.readFileSync(path.join(srcDir, 'socket', 'connection.js'), 'utf8');
if (!socketFile.includes('request_presence')) {
  throw new Error('Expected request_presence handler in socket connection');
}

console.log(`socket-gateway smoke passed (${jsFiles.length} files)`);
