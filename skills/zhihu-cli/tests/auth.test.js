import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { absorbSetCookies, qrLogin } from '../scripts/lib/auth.js';
import { loadConfig } from '../scripts/lib/config.js';

function jsonResponse(data, { status = 200, cookies = [] } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' });
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(JSON.stringify(data), { status, headers });
}

test('absorbs combined Set-Cookie values without retaining attributes', () => {
  const cookies = {};
  absorbSetCookies(new Headers({ 'set-cookie': '_xsrf=x; Path=/, d_c0=device; Expires=Wed, 21 Oct 2030 07:28:00 GMT; Path=/' }), cookies);
  assert.equal(cookies._xsrf, 'x');
  assert.equal(cookies.d_c0, 'device');
  assert.equal(cookies.Expires, undefined);
});

test('QR login handles unscanned, scanned, confirmed and saves private cookies', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zhihu-qr-test-'));
  const previous = process.env.ZHIHU_CLI_CONFIG;
  process.env.ZHIHU_CLI_CONFIG = path.join(directory, 'config', 'config.json');
  let fakeNow = 0;
  let poll = 0;
  const events = [];
  const requested = [];
  const qrPath = path.join(directory, 'config', 'login_qrcode.png');
  try {
    const result = await qrLogin({ userAgent: 'test', zse93: '101_3_3.0' }, {
      qrPath,
      now: () => fakeNow,
      sleep: async (milliseconds) => { fakeNow += milliseconds; },
      progress: (event, data) => events.push({ event, data }),
      request: async (url) => {
        requested.push(String(url));
        if (String(url).endsWith('/signin')) return jsonResponse({}, { cookies: ['_xsrf=x; Path=/', 'd_c0=device; Path=/'] });
        if (String(url).includes('/login/qrcode/') && String(url).endsWith('/scan_info')) {
          poll += 1;
          if (poll === 1) return jsonResponse({ status: 0, user_id: null });
          if (poll === 2) return jsonResponse({ status: 1 });
          return jsonResponse({ success: true, user_id: 'u1' }, { cookies: ['z_c0=session; Path=/'] });
        }
        if (String(url).endsWith('/login/qrcode')) return jsonResponse({ token: 'secret-qr-token', link: 'https://www.zhihu.com/account/scan/secret' });
        if (String(url).endsWith('/api/v4/me')) return jsonResponse({ id: 'u1', name: '测试用户', url_token: 'tester' });
        return jsonResponse({});
      },
    });
    assert.equal(result.authenticated, true);
    assert.deepEqual(events.map((item) => item.event), ['qr_ready', 'scanned', 'confirmed']);
    assert.doesNotMatch(JSON.stringify(events), /secret-qr-token|account\/scan\/secret|session/);
    assert.equal(requested.some((url) => url.endsWith('/api/v4/me')), true);
    assert.equal(fs.existsSync(qrPath), false);
    assert.equal(fs.statSync(path.dirname(process.env.ZHIHU_CLI_CONFIG)).mode & 0o777, 0o700);
    assert.equal(fs.statSync(process.env.ZHIHU_CLI_CONFIG).mode & 0o777, 0o600);
    assert.equal(loadConfig({ required: true }).cookies.z_c0, 'session');
  } finally {
    if (previous === undefined) delete process.env.ZHIHU_CLI_CONFIG;
    else process.env.ZHIHU_CLI_CONFIG = previous;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('QR login cleans the image on 403 and cancellation', async () => {
  for (const mode of ['forbidden', 'cancelled']) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zhihu-qr-fail-'));
    const qrPath = path.join(directory, 'login_qrcode.png');
    const controller = new AbortController();
    try {
      await assert.rejects(qrLogin({ userAgent: 'test', zse93: '101_3_3.0' }, {
        qrPath,
        signal: controller.signal,
        now: () => 0,
        sleep: async () => { if (mode === 'cancelled') controller.abort(); },
        request: async (url) => {
          if (String(url).endsWith('/login/qrcode')) return jsonResponse({ token: 'token', link: 'https://www.zhihu.com/scan' });
          if (String(url).endsWith('/scan_info')) return jsonResponse({}, { status: 403 });
          return jsonResponse({});
        },
      }), mode === 'forbidden' ? /403/ : /取消/);
      assert.equal(fs.existsSync(qrPath), false);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
});

test('QR login emits expired and removes the image at its bounded timeout', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zhihu-qr-timeout-'));
  const qrPath = path.join(directory, 'login_qrcode.png');
  let fakeNow = 0;
  const events = [];
  try {
    await assert.rejects(qrLogin({ userAgent: 'test', zse93: '101_3_3.0' }, {
      qrPath,
      timeoutMs: 10,
      now: () => fakeNow,
      sleep: async (milliseconds) => { fakeNow += milliseconds; },
      progress: (event) => events.push(event),
      request: async (url) => String(url).endsWith('/login/qrcode')
        ? jsonResponse({ token: 'token', link: 'https://www.zhihu.com/scan' })
        : jsonResponse({ status: 0 }),
    }), /超时/);
    assert.deepEqual(events, ['qr_ready', 'expired']);
    assert.equal(fs.existsSync(qrPath), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
