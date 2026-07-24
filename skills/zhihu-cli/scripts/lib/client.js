import crypto from 'node:crypto';
import { ANDROID_HEADERS, requestJson, requestRaw } from './http.js';

const API_V4 = 'https://www.zhihu.com/api/v4';
const API_V3 = 'https://www.zhihu.com/api/v3';
const COLUMN_API = 'https://zhuanlan.zhihu.com/api';

function params(values) {
  return new URLSearchParams(Object.entries(values).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => [key, String(value)]));
}

function publicRequest(config) {
  return { signed: Boolean(config.cookies?.d_c0) };
}

export async function getMe(config) {
  return requestJson(config, `${API_V4}/me`, { signed: true });
}

export async function searchContent(config, { query, type = 'general', limit = 10, offset = 0 }) {
  const queryParams = params({ q: query, t: type, limit, offset, correction: 1, search_source: 'Normal' });
  return requestJson(config, `${API_V4}/search_v3?${queryParams}`, publicRequest(config));
}

export async function getHot(config, { limit = 20 } = {}) {
  return requestJson(config, `https://api.zhihu.com/topstory/hot-list?${params({ limit })}`, { headers: ANDROID_HEADERS });
}

export async function getRecommend(config, { limit = 10 } = {}) {
  return requestJson(config, `https://api.zhihu.com/topstory/recommend?${params({ limit })}`, { headers: ANDROID_HEADERS });
}

export async function getQuestion(config, id) {
  const include = 'read_count,visit_count,answer_count,comment_count,follower_count,detail,excerpt,topics,relationship,author';
  return requestJson(config, `${API_V4}/questions/${id}?include=${encodeURIComponent(include)}`, publicRequest(config));
}

export async function getQuestionAnswers(config, id, { limit = 10, offset = 0, sort = 'default' } = {}) {
  return requestJson(config, `${API_V4}/questions/${id}/answers?${params({ limit, offset, sort_by: sort, include: 'data[*].content,excerpt,voteup_count,comment_count,author,question' })}`, publicRequest(config));
}

export async function getAnswer(config, id) {
  const include = 'content,excerpt,voteup_count,comment_count,created_time,updated_time,author,question,relationship';
  return requestJson(config, `${API_V4}/answers/${id}?include=${encodeURIComponent(include)}`, publicRequest(config));
}

export async function getAnswerComments(config, id, { limit = 20, offset = 0 } = {}) {
  return requestJson(config, `${API_V4}/answers/${id}/comments?${params({ limit, offset, order: 'normal', status: 'open' })}`, publicRequest(config));
}

const USER_INCLUDE = 'name,headline,description,url_token,gender,answer_count,articles_count,follower_count,following_count,voteup_count,thanked_count';

export async function getUser(config, token) {
  return requestJson(config, `${API_V4}/members/${encodeURIComponent(token)}?include=${encodeURIComponent(USER_INCLUDE)}`, publicRequest(config));
}

export async function getUserAnswers(config, token, { limit = 10, offset = 0, sort = 'created' } = {}) {
  return requestJson(config, `${API_V4}/members/${encodeURIComponent(token)}/answers?${params({ limit, offset, sort_by: sort, include: 'data[*].excerpt,voteup_count,comment_count,question,author' })}`, publicRequest(config));
}

export async function getUserArticles(config, token, { limit = 10, offset = 0, sort = 'created' } = {}) {
  return requestJson(config, `${API_V4}/members/${encodeURIComponent(token)}/articles?${params({ limit, offset, sort_by: sort, include: 'data[*].title,excerpt,voteup_count,comment_count,author' })}`, publicRequest(config));
}

export async function getFollowers(config, token, { limit = 10, offset = 0 } = {}) {
  return requestJson(config, `${API_V4}/members/${encodeURIComponent(token)}/followers?${params({ limit, offset })}`, publicRequest(config));
}

export async function getFollowing(config, token, { limit = 10, offset = 0 } = {}) {
  return requestJson(config, `${API_V4}/members/${encodeURIComponent(token)}/followees?${params({ limit, offset })}`, publicRequest(config));
}

export async function getTopic(config, id) {
  return requestJson(config, `${API_V4}/topics/${id}?include=${encodeURIComponent('name,introduction,followers_count,questions_count')}`, publicRequest(config));
}

export async function getTopicQuestions(config, id, { limit = 10, offset = 0 } = {}) {
  return requestJson(config, `${API_V4}/topics/${id}/feeds/essence?${params({ limit, offset })}`, publicRequest(config));
}

export async function getCollections(config, { limit = 10, offset = 0 } = {}) {
  const me = await getMe(config);
  if (!me?.url_token) throw new Error('当前账户缺少 url_token，无法读取收藏夹');
  return requestJson(config, `${API_V4}/members/${encodeURIComponent(me.url_token)}/favlists?${params({ limit, offset })}`, { signed: true });
}

export async function getNotifications(config, { limit = 10, offset = 0 } = {}) {
  return requestJson(config, `${API_V4}/notifications/v2/recent?${params({ limit, offset })}`, { signed: true });
}

export async function setVote(config, id, state) {
  return requestJson(config, `${API_V4}/answers/${id}/voters`, { method: 'POST', retries: 0, signed: true, body: { type: state } });
}

export async function setQuestionFollow(config, id, following) {
  const url = `${API_V4}/questions/${id}/followers`;
  const response = await requestRaw(config, url, { method: following ? 'POST' : 'DELETE', retries: 0, signed: true });
  if (response.status === 204) return { success: true };
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { success: true }; }
}

export async function createQuestion(config, { title, html, topics = [], images = [], complex = false }) {
  if (images.length > 0 || complex) {
    return unifiedPublish(config, {
      action: 'question',
      data: {
        title: { title }, topic: { topics }, hybrid: { html, textLength: html.replace(/<[^>]+>/g, '').length },
        extra_info: { publisher: 'pc' }, questionConfig: { type: '0' }, draft: { disabled: 1 },
      },
    });
  }
  return requestJson(config, `${API_V4}/questions`, {
    method: 'POST', retries: 0, signed: true,
    body: { title, detail: html, ...(topics.length ? { topic_url_tokens: topics } : {}) },
  });
}

async function createUnifiedDraft(config, action) {
  const response = await requestJson(config, `${API_V4}/content/drafts`, { method: 'POST', retries: 0, signed: true, body: { action } });
  const id = response?.data?.content_id ?? response?.id;
  if (!id) throw new Error(`${action} 草稿创建成功但缺少 ID`);
  return String(id);
}

async function unifiedPublish(config, body) {
  const response = await requestJson(config, `${API_V4}/content/publish`, {
    method: 'POST', retries: 0, signed: true, headers: { 'x-requested-with': 'fetch' }, body,
  });
  if (response?.code !== undefined && response.code !== 0) throw new Error(response.message || `${body.action} 发布失败`);
  const result = response?.data?.result;
  if (typeof result === 'string') {
    try { return JSON.parse(result); } catch { /* keep raw response */ }
  }
  return response;
}

function traceId() {
  return `${Date.now()},${crypto.randomUUID()}`;
}

export async function createPin(config, { title, html, images = [] }) {
  const draftId = await createUnifiedDraft(config, 'pin');
  return unifiedPublish(config, {
    action: 'pin',
    data: {
      publish: { traceId: traceId() }, commentsPermission: { comment_permission: 'all' },
      extra_info: { view_permission: 'all', publisher: 'pc' }, draft: { disabled: 1, id: draftId },
      title: { title }, hybrid: { html, textLength: html.replace(/<[^>]+>/g, '').length },
      ...(images.length ? { media: { medias: images.map((image) => ({ image: { width: image.width, height: image.height, url: image.url, originalUrl: image.originalUrl, watermark: image.watermarkMode, watermarkUrl: image.watermarkUrl || '' } })) } } : {}),
    },
  });
}

export async function createArticle(config, { title, html, topics = [], images = [] }) {
  if (images.length > 0) {
    const draftId = await createUnifiedDraft(config, 'article');
    return unifiedPublish(config, {
      action: 'article',
      data: {
        title: { title }, hybrid: { html, textLength: html.replace(/<[^>]+>/g, '').length },
        ...(topics.length ? { topic: { topics } } : {}),
        extra_info: { publisher: 'pc' }, draft: { disabled: 1, id: draftId },
        commentsPermission: { comment_permission: 'anyone' },
      },
    });
  }
  const draft = await requestJson(config, `${COLUMN_API}/articles/drafts`, { method: 'POST', retries: 0, body: {} });
  if (!draft?.id) throw new Error('文章草稿创建成功但缺少 ID');
  await requestRaw(config, `${COLUMN_API}/articles/${draft.id}/draft`, {
    method: 'PATCH', retries: 0, body: { title, content: html, ...(topics.length ? { topics } : {}) },
  });
  return requestJson(config, `${COLUMN_API}/articles/${draft.id}/publish`, {
    method: 'PUT', retries: 0, body: { column: null, commentPermission: 'anyone' },
  });
}

export async function getPin(config, id) {
  return requestJson(config, `${API_V4}/pins/${id}`, publicRequest(config));
}

export async function getArticle(config, id) {
  return requestJson(config, `${COLUMN_API}/articles/${id}`);
}

export async function deleteContent(config, type, id) {
  const url = type === 'article' ? `${COLUMN_API}/articles/${id}` : `${API_V4}/${type === 'pin' ? 'pins' : 'questions'}/${id}`;
  const response = await requestRaw(config, url, { method: 'DELETE', retries: 0, signed: true });
  return { deleted: response.ok, id: String(id), type };
}

export { API_V3 };
