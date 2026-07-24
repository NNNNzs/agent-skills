import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDeletion, applyFollow, applyVote, previewCreation, previewDeletion, previewFollow, previewVote, publishCreation } from '../scripts/lib/operations.js';

const account = { id: 'me', name: '我', url_token: 'mine' };

test('vote preview binds account/state and apply is tamper-safe and idempotent', async () => {
  let state = 'neutral';
  let writes = 0;
  const dependencies = {
    getMe: async () => account,
    getAnswer: async () => ({ id: '10', excerpt: '回答', relationship: { voting: state } }),
    setVote: async (_config, _id, desired) => { writes += 1; state = desired; },
  };
  const preview = await previewVote({}, '10', 'up', dependencies);
  await assert.rejects(applyVote({}, '10', 'up', '0'.repeat(64), dependencies), /令牌/);
  const applied = await applyVote({}, '10', 'up', preview.confirmationToken, dependencies);
  assert.equal(applied.changed, true);
  const idempotent = await applyVote({}, '10', 'up', 'invalid', dependencies);
  assert.equal(idempotent.idempotent, true);
  assert.equal(writes, 1);
});

test('follow applies once and returns idempotent success at the desired state', async () => {
  let following = false;
  let writes = 0;
  const dependencies = {
    getMe: async () => account,
    getQuestion: async () => ({ id: '20', title: '问题', relationship: { is_following: following } }),
    setQuestionFollow: async (_config, _id, desired) => { writes += 1; following = desired; },
  };
  const preview = await previewFollow({}, '20', true, dependencies);
  assert.equal((await applyFollow({}, '20', true, preview.confirmationToken, dependencies)).changed, true);
  assert.equal((await applyFollow({}, '20', true, 'bad', dependencies)).idempotent, true);
  assert.equal(writes, 1);
});

test('delete requires ownership and a token bound to remote state', async () => {
  let title = '我的问题';
  let deleted = 0;
  const dependencies = {
    getMe: async () => account,
    readTarget: async () => ({ id: '30', title, author: { id: 'me', url_token: 'mine' }, updated_time: 1 }),
    deleteContent: async () => { deleted += 1; return { deleted: true }; },
  };
  const preview = await previewDeletion({}, 'question', '30', dependencies);
  title = '已变化';
  await assert.rejects(applyDeletion({}, 'question', '30', preview.confirmationToken, dependencies), /令牌/);
  title = '我的问题';
  assert.equal((await applyDeletion({}, 'question', '30', preview.confirmationToken, dependencies)).deleted, true);
  assert.equal(deleted, 1);
  await assert.rejects(previewDeletion({}, 'question', '30', { ...dependencies, readTarget: async () => ({ id: '30', author: { id: 'other' } }) }), /拥有/);
});

test('creation token binds content and uploads before one non-retried publisher call', async () => {
  const prepared = {
    markdownSha256: 'a'.repeat(64), summary: '正文', stats: { markdownCharacters: 2 }, warnings: [], previewHtml: '<p>正文</p>',
    images: [{ path: '/tmp/a.png', sha256: 'b'.repeat(64), size: 1, width: 1, height: 1, mimeType: 'image/png' }],
  };
  const dependencies = {
    getMe: async () => account,
    uploadAndCompile: async () => ({ compiled: { html: '<p>最终正文</p>' }, uploads: [{ imageId: 'image', url: 'https://pic.zhimg.com/a.png' }] }),
    create: async (_config, body) => ({ id: 'created', body }),
  };
  const options = { title: '标题', topics: ['1'] };
  const preview = await previewCreation({}, 'question', prepared, options, dependencies);
  await assert.rejects(publishCreation({}, 'question', { ...prepared, markdownSha256: 'c'.repeat(64) }, options, preview.confirmationToken, dependencies), /令牌/);
  const result = await publishCreation({}, 'question', prepared, options, preview.confirmationToken, dependencies);
  assert.equal(result.published, true);
  assert.equal(result.result.body.html, '<p>最终正文</p>');
});

test('creation stops before publishing when an image upload fails', async () => {
  const prepared = { markdownSha256: 'a'.repeat(64), summary: '', stats: {}, warnings: [], previewHtml: '', images: [] };
  const options = { title: '标题', topics: [] };
  let creates = 0;
  const getMe = async () => account;
  const preview = await previewCreation({}, 'pin', prepared, options, { getMe });
  await assert.rejects(publishCreation({}, 'pin', prepared, options, preview.confirmationToken, {
    getMe,
    uploadAndCompile: async () => { throw new Error('upload failed'); },
    create: async () => { creates += 1; },
  }), /upload failed/);
  assert.equal(creates, 0);
});
