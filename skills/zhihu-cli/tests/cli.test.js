import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('CLI exposes the competitor aliases and grouped P0-P4 commands', async () => {
  const { createProgram } = await import('../scripts/cli.js');
  const program = createProgram();
  const topLevel = new Set(program.commands.map((command) => command.name()));
  for (const name of ['login', 'logout', 'status', 'whoami', 'search', 'hot', 'question', 'answers', 'answer', 'feed', 'feeds', 'topic', 'user', 'user-answers', 'user-articles', 'followers', 'following', 'vote', 'follow-question', 'ask', 'pin', 'article', 'delete-question', 'delete-pin', 'delete-article', 'collections', 'notifications']) {
    assert.equal(topLevel.has(name), true, `missing ${name}`);
  }
  const question = program.commands.find((command) => command.name() === 'question');
  const answer = program.commands.find((command) => command.name() === 'answer');
  assert.equal(question.commands.some((command) => command.name() === 'create'), true);
  assert.equal(question.commands.some((command) => command.name() === 'follow'), true);
  assert.equal(answer.commands.some((command) => command.name() === 'comments'), true);
  assert.equal(answer.commands.some((command) => command.name() === 'vote'), true);
});

test('CLI accepts the pnpm separator and compiles stdin', () => {
  const result = spawnSync(process.execPath, ['scripts/cli.js', '--', 'answer', 'compile', '--input', '-'], {
    cwd: projectDirectory,
    input: '# 标题\n',
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, true);
  assert.match(output.data.html, /<h2>标题<\/h2>/);
});

test('pnpm command keeps failure stdout empty and stderr as JSON', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zhihu-cli-test-'));
  try {
    const result = spawnSync('pnpm', ['zhihu', '--', 'auth', 'status'], {
      cwd: projectDirectory,
      encoding: 'utf8',
      env: { ...process.env, ZHIHU_CLI_CONFIG: path.join(directory, 'missing.json') },
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    const output = JSON.parse(result.stderr);
    assert.equal(output.ok, false);
    assert.equal(output.error.type, 'configuration_error');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('auth import reads a piped Cookie header without a redundant flag', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zhihu-cli-test-'));
  try {
    const result = spawnSync(process.execPath, ['scripts/cli.js', 'auth', 'import'], {
      cwd: projectDirectory,
      input: 'd_c0=private; z_c0=session; _xsrf=token',
      encoding: 'utf8',
      env: { ...process.env, ZHIHU_CLI_CONFIG: path.join(directory, 'config.json') },
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.data.imported, true);
    assert.deepEqual(output.data.cookieNames, ['_xsrf', 'd_c0', 'z_c0']);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('version, offline status, and table output are available without network access', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zhihu-cli-human-'));
  const configPath = path.join(directory, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({ cookies: { z_c0: 'session' } }), { mode: 0o600 });
  try {
    const version = spawnSync(process.execPath, ['scripts/cli.js', '--version'], { cwd: projectDirectory, encoding: 'utf8' });
    assert.equal(version.status, 0);
    assert.match(version.stdout, /^\d+\.\d+\.\d+/);
    const status = spawnSync(process.execPath, ['scripts/cli.js', 'auth', 'status', '--offline'], { cwd: projectDirectory, encoding: 'utf8', env: { ...process.env, ZHIHU_CLI_CONFIG: configPath } });
    assert.equal(JSON.parse(status.stdout).data.verifiedOnline, false);
    const table = spawnSync(process.execPath, ['scripts/cli.js', '--format', 'table', 'answer', 'compile', '--input', '-'], { cwd: projectDirectory, input: '# 标题\n', encoding: 'utf8' });
    assert.equal(table.status, 0, table.stderr);
    assert.match(table.stdout, /标题/);
    assert.doesNotMatch(table.stdout, /"ok"/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
