import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswer, normalizeComponentCard, normalizeFeedItem, questionFromSearchItem } from '../scripts/cli.js';

test('normalizes search questions without retaining huge raw response', () => {
  const result = questionFromSearchItem({ object: { type: 'answer', excerpt: '摘要', question: { id: 12, title: '标题', answer_count: 3 } } });
  assert.deepEqual(result, {
    id: '12', title: '标题', excerpt: '摘要', answerCount: 3, followerCount: null,
    visitCount: null, url: 'https://www.zhihu.com/question/12', matchedType: 'answer',
  });
});

test('normalizes feed and answer records', () => {
  assert.equal(normalizeFeedItem({ target: { id: 1, type: 'answer', question: { id: 2, title: 'Q' } } }).questionId, '2');
  assert.equal(normalizeAnswer({ target: { id: 3, question: { id: 2, title: 'Q' }, author: { name: 'A' } } }).url, 'https://www.zhihu.com/question/2/answer/3');
});

test('extracts hot-list question ids and ComponentCard answers', () => {
  const hot = normalizeFeedItem({
    card_id: 'Q_123',
    feed_specific: { answer_count: 7 },
    target: { title_area: { text: 'Hot' }, link: { url: 'https://www.zhihu.com/question/123' } },
  });
  assert.equal(hot.questionId, '123');
  assert.equal(hot.answerCount, 7);

  const card = normalizeComponentCard({
    type: 'ComponentCard',
    children: [
      { test_id: 'answer.456.title', text: 'Question', type: 'Text' },
      { test_id: 'answer.456.description', text: 'Excerpt', type: 'Text' },
      { elements: [{ text: '12 赞同 · 3 评论', type: 'Text' }] },
    ],
    extra: { contentToken: '456', contentType: 'ANSWER' },
    action: { parameter: `route_url=${encodeURIComponent('https://zhihu.com/question/123/answer/456?native=0')}` },
  });
  assert.equal(card.questionId, '123');
  assert.equal(card.id, '456');
  assert.equal(card.voteupCount, 12);
  assert.equal(card.commentCount, 3);
});
