#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetRoot = path.join(root, 'dist', 'skills', 'zhihu-cli');
const files = ['SKILL.md', 'references/api.md', 'references/markdown.md', 'references/writing-style.md', 'docs/manual-write-validation.md'];
const check = process.argv.includes('--check');
const drift = [];

for (const relative of files) {
  const source = path.join(root, relative);
  const target = path.join(targetRoot, relative);
  const sourceText = fs.readFileSync(source, 'utf8');
  const targetText = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
  if (targetText === sourceText) continue;
  drift.push(relative);
  if (!check) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, sourceText);
  }
}

if (check && drift.length > 0) {
  process.stderr.write(`Skill 分发文件已漂移: ${drift.join(', ')}\n请运行 pnpm sync:skills\n`);
  process.exitCode = 1;
} else if (!check) {
  process.stdout.write(`已同步 ${files.length} 个 Skill 文件到 dist/skills/zhihu-cli\n`);
}
