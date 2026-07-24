import test from 'node:test';
import assert from 'node:assert/strict';
import { requestJson, HttpError } from '../scripts/lib/http.js';

const config = { cookies: {}, userAgent: 'test', zse93: '101_3_3.0', proxy: null };

test('mock search retries transient failures and preserves paging JSON', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) return new Response('{"message":"later"}', { status: 500 });
    return new Response('{"data":[],"paging":{"is_end":true}}', { status: 200 });
  };
  try {
    const result = await requestJson(config, 'https://www.zhihu.com/api/v4/search_v3?q=x');
    assert.equal(calls, 2);
    assert.equal(result.paging.is_end, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('mock login failure reports 401 without retrying', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response('{"code":10001,"message":"login required","need_login":true}', { status: 401 });
  };
  try {
    await assert.rejects(
      requestJson(config, 'https://www.zhihu.com/api/v4/me'),
      (error) => error instanceof HttpError
        && error.status === 401
        && error.zhihuCode === 10001
        && !error.responseSnippet.includes('session'),
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('POST does not retry and 403 is reported without request secrets', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response('{"code":403,"message":"risk control"}', { status: 403 });
  };
  try {
    await assert.rejects(
      requestJson(config, 'https://www.zhihu.com/api/v4/content/publish', { method: 'POST', retries: 99, body: { x: 1 } }),
      (error) => error instanceof HttpError && error.status === 403 && error.zhihuCode === 403,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects non-Zhihu origins before fetch', async () => {
  await assert.rejects(requestJson(config, 'https://example.com/data'), /非白名单/);
});
