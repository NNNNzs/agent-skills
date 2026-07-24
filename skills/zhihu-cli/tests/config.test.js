import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { clearAuthentication, cookieHeader, getConfigPath, loadConfig, parseCookieHeader, saveCookies } from '../scripts/lib/config.js';

test('cookie parser preserves equals signs and skips attributes', () => {
  const cookies = parseCookieHeader('d_c0=abc==; z_c0=secret; Path=/; Secure; _xsrf=x');
  assert.deepEqual(cookies, { d_c0: 'abc==', z_c0: 'secret', _xsrf: 'x' });
  assert.equal(cookieHeader(cookies), 'd_c0=abc==; z_c0=secret; _xsrf=x');
});

test('uses the zhihu-cli configuration name while accepting the legacy override', () => {
  const previousCli = process.env.ZHIHU_CLI_CONFIG;
  const previousCreator = process.env.ZHIHU_CREATOR_CONFIG;
  try {
    delete process.env.ZHIHU_CLI_CONFIG;
    delete process.env.ZHIHU_CREATOR_CONFIG;
    assert.match(getConfigPath(), /\.zhihu-cli\/config\.json$/);

    process.env.ZHIHU_CREATOR_CONFIG = '/tmp/legacy-zhihu-config.json';
    assert.equal(getConfigPath(), '/tmp/legacy-zhihu-config.json');

    process.env.ZHIHU_CLI_CONFIG = '/tmp/zhihu-cli-config.json';
    assert.equal(getConfigPath(), '/tmp/zhihu-cli-config.json');
  } finally {
    if (previousCli === undefined) delete process.env.ZHIHU_CLI_CONFIG;
    else process.env.ZHIHU_CLI_CONFIG = previousCli;
    if (previousCreator === undefined) delete process.env.ZHIHU_CREATOR_CONFIG;
    else process.env.ZHIHU_CREATOR_CONFIG = previousCreator;
  }
});

test('saved config is private and loadable without exposing values', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zhihu-config-test-'));
  const previous = process.env.ZHIHU_CLI_CONFIG;
  process.env.ZHIHU_CLI_CONFIG = path.join(directory, 'nested', 'config.json');
  try {
    const saved = saveCookies({ d_c0: 'private', z_c0: 'session' });
    assert.deepEqual(saved.cookieNames, ['d_c0', 'z_c0']);
    assert.equal(fs.statSync(saved.configPath).mode & 0o777, 0o600);
    assert.equal(loadConfig({ required: true }).cookies.d_c0, 'private');
  } finally {
    if (previous === undefined) delete process.env.ZHIHU_CLI_CONFIG;
    else process.env.ZHIHU_CLI_CONFIG = previous;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('logout safely clears a corrupt configured file and removes QR state', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zhihu-config-clear-'));
  const previous = process.env.ZHIHU_CLI_CONFIG;
  process.env.ZHIHU_CLI_CONFIG = path.join(directory, 'config.json');
  try {
    fs.writeFileSync(process.env.ZHIHU_CLI_CONFIG, '{broken');
    fs.writeFileSync(path.join(directory, 'login_qrcode.png'), 'secret');
    clearAuthentication();
    assert.deepEqual(JSON.parse(fs.readFileSync(process.env.ZHIHU_CLI_CONFIG, 'utf8')).cookies, {});
    assert.equal(fs.existsSync(path.join(directory, 'login_qrcode.png')), false);
    assert.equal(fs.statSync(process.env.ZHIHU_CLI_CONFIG).mode & 0o777, 0o600);
  } finally {
    if (previous === undefined) delete process.env.ZHIHU_CLI_CONFIG;
    else process.env.ZHIHU_CLI_CONFIG = previous;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
