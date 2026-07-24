#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'zhihu-cli-pack-'));

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} 失败\n${result.stderr || result.stdout}`);
  return result.stdout;
}

try {
  run('pnpm', ['pack', '--pack-destination', temporary]);
  const tarball = fs.readdirSync(temporary).find((name) => name.endsWith('.tgz'));
  if (!tarball) throw new Error('pnpm pack 未生成 tarball');
  const tarballPath = path.join(temporary, tarball);
  const listing = run('tar', ['-tzf', tarballPath]);
  for (const required of ['package/SKILL.md', 'package/scripts/cli.js', 'package/dist/skills/zhihu-cli/SKILL.md']) {
    if (!listing.includes(required)) throw new Error(`tarball 缺少 ${required}`);
  }
  if (/config\.json|login_qrcode\.png|\.zhihu-creator|\.zhihu-cli\//.test(listing)) throw new Error('tarball 含有凭证或临时二维码路径');
  const installDirectory = path.join(temporary, 'install');
  fs.mkdirSync(installDirectory);
  run('pnpm', ['add', '--dir', installDirectory, '--ignore-scripts', tarballPath]);
  const binDirectory = path.join(installDirectory, 'node_modules', '.bin');
  const expectedVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  for (const name of ['zhihu', 'zhihu-cli']) {
    const output = run(path.join(binDirectory, name), ['--version'], installDirectory).trim();
    if (output !== expectedVersion) throw new Error(`${name} 版本不匹配: ${output}`);
  }
  process.stdout.write(`tarball 验证通过: ${tarball}\n`);
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
