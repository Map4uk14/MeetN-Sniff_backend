const { spawnSync } = require('child_process');
const { readdirSync, statSync } = require('fs');
const { join } = require('path');

const roots = ['index.js', 'scripts', 'src'];
const files = [];

function collectJavaScriptFiles(target) {
  const stats = statSync(target);

  if (stats.isFile() && target.endsWith('.js')) {
    files.push(target);
    return;
  }

  if (!stats.isDirectory()) {
    return;
  }

  for (const entry of readdirSync(target)) {
    collectJavaScriptFiles(join(target, entry));
  }
}

for (const root of roots) {
  collectJavaScriptFiles(root);
}

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log(`Checked ${files.length} JavaScript files.`);
