import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createArticle,
  createPin,
  createQuestion,
  deleteContent,
  getAnswer,
  getAnswerComments,
  getFollowers,
  getFollowing,
  getHot,
  getNotifications,
  getQuestion,
  getQuestionAnswers,
  getRecommend,
  getTopic,
  getTopicQuestions,
  getUser,
  getUserAnswers,
  getUserArticles,
  searchContent,
} from '../scripts/lib/client.js';
import { DEFAULT_CONFIG } from '../scripts/lib/config.js';

test('read clients use bounded Zhihu endpoints and preserve pagination parameters', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify({ data: [], paging: { is_end: true }, id: '1' }), { headers: { 'content-type': 'application/json' } });
  };
  const config = structuredClone(DEFAULT_CONFIG);
  try {
    await searchContent(config, { query: '测试', type: 'people', limit: 7, offset: 2 });
    await getHot(config, { limit: 3 });
    await getRecommend(config, { limit: 4 });
    await getQuestion(config, '10');
    await getQuestionAnswers(config, '10', { limit: 6, offset: 1, sort: 'updated' });
    await getAnswer(config, '11');
    await getAnswerComments(config, '11', { limit: 8, offset: 2 });
    await getUser(config, 'alice');
    await getUserAnswers(config, 'alice', { limit: 9, offset: 3 });
    await getUserArticles(config, 'alice', { limit: 9, offset: 3 });
    await getFollowers(config, 'alice', { limit: 9, offset: 3 });
    await getFollowing(config, 'alice', { limit: 9, offset: 3 });
    await getTopic(config, '12');
    await getTopicQuestions(config, '12', { limit: 5, offset: 4 });
    await getNotifications(config, { limit: 5, offset: 4 });
    assert.equal(calls.length, 15);
    assert.match(calls[0].url, /search_v3\?.*t=people.*limit=7.*offset=2/);
    assert.match(calls[4].url, /questions\/10\/answers\?.*limit=6.*offset=1.*sort_by=updated/);
    assert.match(calls[6].url, /answers\/11\/comments\?.*limit=8.*offset=2/);
    assert.match(calls[10].url, /members\/alice\/followers/);
    assert.match(calls[11].url, /members\/alice\/followees/);
    assert.match(calls[13].url, /topics\/12\/feeds\/essence\?.*limit=5.*offset=4/);
    assert.match(calls[14].url, /notifications\/v2\/recent\?.*limit=5.*offset=4/);
    assert.equal(calls.every((call) => new URL(call.url).protocol === 'https:'), true);
  } finally {
    globalThis.fetch = original;
  }
});

test('question, pin, article and delete adapters use the expected zero-retry HTTP methods', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), method: options.method });
    const value = String(url);
    if (value.endsWith('/content/drafts')) return new Response(JSON.stringify({ id: 'draft' }));
    if (value.endsWith('/content/publish')) return new Response(JSON.stringify({ code: 0, data: { result: '{"id":"published"}' } }));
    if (value.endsWith('/articles/drafts')) return new Response(JSON.stringify({ id: 'article-draft' }));
    if (options.method === 'PATCH' || options.method === 'DELETE') return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ id: 'created' }));
  };
  const config = structuredClone(DEFAULT_CONFIG);
  try {
    await createQuestion(config, { title: '普通', html: '<p>正文</p>' });
    await createQuestion(config, { title: '复杂', html: '<h2>正文</h2>', complex: true });
    await createPin(config, { title: '想法', html: '<p>正文</p>' });
    await createArticle(config, { title: '文章', html: '<p>正文</p>' });
    await createArticle(config, { title: '带图文章', html: '<p><img src="https://pic.zhimg.com/a.png" /></p>', images: [{ url: 'https://pic.zhimg.com/a.png' }] });
    await deleteContent(config, 'question', '1');
    assert.equal(calls.some((call) => call.url.endsWith('/questions') && call.method === 'POST'), true);
    assert.equal(calls.some((call) => call.url.endsWith('/content/publish') && call.method === 'POST'), true);
    assert.equal(calls.some((call) => call.method === 'PATCH'), true);
    assert.equal(calls.some((call) => call.method === 'PUT'), true);
    assert.equal(calls.some((call) => call.method === 'DELETE'), true);
  } finally {
    globalThis.fetch = original;
  }
});
