import test from 'node:test';
import assert from 'node:assert/strict';
import { signRequest } from '../scripts/lib/zse-signer.js';

test('zse96 matches source snapshot golden vectors', () => {
  assert.equal(
    signRequest('https://www.zhihu.com/api/v4/me', 'token', null, '101_3_3.0'),
    '2.0_F8/7KowGzlmasG8ngOUM2K20KwpAQSQdcAoxx=MvGUflQ2xQw1K9=XrkuH2ohSk2',
  );
  assert.equal(
    signRequest('https://www.zhihu.com/api/v4/content/publish', 'dc0-value', '{"hello":"world"}', '101_3_3.0'),
    '2.0_AP/aMmTZWLw2tGztFhNevYdekyj70tC=jY7izblPeN9erF8s7tkihsNK6XQdJIIp',
  );
});

test('query string is part of the signed pathname', () => {
  assert.notEqual(
    signRequest('https://www.zhihu.com/api/v4/search_v3?q=a', 'token'),
    signRequest('https://www.zhihu.com/api/v4/search_v3?q=b', 'token'),
  );
});
