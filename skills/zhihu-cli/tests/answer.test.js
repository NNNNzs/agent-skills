import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDraftBody,
  buildPublishBody,
  createConfirmationToken,
  createTraceId,
  findMyAnswerId,
  parsePublishAnswerId,
  publishAnswer,
  saveDraft,
} from '../scripts/lib/answer.js';

const settings = {
  comment_permission: 'all',
  reshipment_settings: 'allowed',
  can_reward: false,
  table_of_contents_enabled: true,
};

test('builds source-backed draft and create/update publish payloads', () => {
  const draft = buildDraftBody('<p>x</p>', settings);
  assert.equal(draft.settings.table_of_contents_enabled, true);
  assert.equal(draft.settings.commercial_report_info.is_report, true);

  const create = buildPublishBody({ questionId: '12', answerId: null, html: '<p>x</p>', settings, traceId: 't,u' });
  assert.equal(create.action, 'answer');
  assert.deepEqual(create.data.draft, { disabled: 1, isPublished: false, contentId: null });
  assert.equal(JSON.parse(create.data.extra_info.pc_business_params).table_of_contents_enabled, true);

  const update = buildPublishBody({ questionId: '12', answerId: '34', html: '<p>x</p>', settings, traceId: 't,u' });
  assert.deepEqual(update.data.draft, { disabled: 1, isPublished: true, contentId: '34' });
});

test('confirmation token binds target, state, content, and settings', () => {
  const base = { questionId: '12', answerId: null, html: '<p>x</p>', settings };
  const token = createConfirmationToken(base);
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.notEqual(token, createConfirmationToken({ ...base, html: '<p>y</p>' }));
  assert.notEqual(token, createConfirmationToken({ ...base, answerId: '34' }));
});

test('trace and publish result parsing follow source contract', () => {
  assert.match(createTraceId(123, 'uuid'), /^123,uuid$/);
  assert.equal(parsePublishAnswerId('{"publish":{"id":"123"}}'), '123');
  assert.equal(parsePublishAnswerId({ id: '456' }), '456');
  assert.equal(parsePublishAnswerId('not-json'), null);
});

test('findMyAnswerId supports snake case and deleted answers', async () => {
  const config = {};
  assert.equal(await findMyAnswerId(config, '1', { request: async () => ({ relationship: { my_answer: { id: 9 } } }) }), '9');
  assert.equal(await findMyAnswerId(config, '1', { request: async () => ({ relationship: { my_answer: { id: 9, is_deleted: true } } }) }), null);
});

test('draft and publish writes explicitly disable retries', async () => {
  const calls = [];
  const request = async (config, url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/content/publish')) return { message: 'success', data: { result: '{"publish":{"id":"99"}}' } };
    return {};
  };
  const config = { cookies: { _xsrf: 'x' } };
  await saveDraft(config, { questionId: '1', answerId: null, html: '<p>x</p>', settings }, { request });
  const published = await publishAnswer(config, { questionId: '1', answerId: null, html: '<p>x</p>', settings }, { request });
  assert.equal(calls[0].options.retries, 0);
  assert.equal(calls[1].options.retries, 0);
  assert.equal(published.url, 'https://www.zhihu.com/question/1/answer/99');
});

test('draft failure propagates after one non-retried request', async () => {
  let calls = 0;
  await assert.rejects(
    saveDraft(
      { cookies: { _xsrf: 'x' } },
      { questionId: '1', answerId: null, html: '<p>x</p>', settings },
      { request: async (config, url, options) => {
        calls += 1;
        assert.equal(options.retries, 0);
        throw new Error('draft rejected');
      } },
    ),
    /draft rejected/,
  );
  assert.equal(calls, 1);
});
