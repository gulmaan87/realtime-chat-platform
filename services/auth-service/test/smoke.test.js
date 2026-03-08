const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function collectJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
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

const authRoutes = fs.readFileSync(path.join(srcDir, 'routes', 'auth.routes.js'), 'utf8');
if (!authRoutes.includes('router.post("/google"')) {
  throw new Error('Expected /auth/google route to exist');
}

console.log(`auth-service smoke passed (${jsFiles.length} files)`);
