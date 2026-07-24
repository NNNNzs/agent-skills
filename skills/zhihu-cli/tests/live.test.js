import test from 'node:test';
import assert from 'node:assert/strict';
import { getHot, getQuestion } from '../scripts/lib/client.js';
import { loadConfig } from '../scripts/lib/config.js';

const enabled = process.env.ZHIHU_LIVE_TESTS === '1';

test('live read-only hot list', { skip: !enabled }, async () => {
  const response = await getHot(loadConfig(), { limit: 1 });
  assert.equal(Array.isArray(response?.data), true);
});

test('live read-only question when ZHIHU_LIVE_QUESTION_ID is set', { skip: !enabled || !process.env.ZHIHU_LIVE_QUESTION_ID }, async () => {
  const response = await getQuestion(loadConfig(), process.env.ZHIHU_LIVE_QUESTION_ID);
  assert.equal(String(response.id), process.env.ZHIHU_LIVE_QUESTION_ID);
});
