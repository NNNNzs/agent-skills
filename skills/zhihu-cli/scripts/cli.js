#!/usr/bin/env node

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Command, CommanderError } from 'commander';
import { qrLogin } from './lib/auth.js';
import {
  clearAuthentication,
  loadConfig,
  parseCookieHeader,
  readStdin,
  requireCookies,
  saveCookies,
} from './lib/config.js';
import {
  getAnswer,
  getAnswerComments,
  getCollections,
  getFollowers,
  getFollowing,
  getHot,
  getMe,
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
} from './lib/client.js';
import { contentTokenFields, prepareContent, uploadAndCompileContent } from './lib/content.js';
import { createOperationToken, verifyOperationToken } from './lib/confirmation.js';
import { setHttpLogger } from './lib/http.js';
import { inspectImageFile, uploadImage } from './lib/image.js';
import { compileMarkdown, readMarkdownInput } from './lib/markdown.js';
import {
  applyDeletion,
  applyFollow,
  applyVote,
  previewCreation,
  previewDeletion,
  previewFollow,
  previewVote,
  publishCreation,
} from './lib/operations.js';
import {
  fetchAccount,
  fetchQuestion,
  findMyAnswerId,
  publishAnswer,
  saveDraft,
} from './lib/answer.js';
import { configureOutput, fail, progress, success, verbose } from './lib/output.js';
import { UsageError } from './lib/args.js';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

export function questionFromSearchItem(item) {
  const object = item.object ?? item.target ?? item;
  const question = object.type === 'question' ? object : object.question;
  if (!question?.id) return null;
  return {
    id: String(question.id),
    title: question.title || item.highlight?.title || '',
    excerpt: question.excerpt || object.excerpt || item.highlight?.description || '',
    answerCount: question.answer_count ?? null,
    followerCount: question.follower_count ?? null,
    visitCount: question.visit_count ?? question.read_count ?? null,
    url: `https://www.zhihu.com/question/${question.id}`,
    matchedType: object.type || null,
  };
}

export function normalizeAnswer(target) {
  const answer = target?.target ?? target;
  if (!answer?.id) return null;
  return {
    id: String(answer.id),
    questionId: answer.question?.id ? String(answer.question.id) : null,
    questionTitle: answer.question?.title || '',
    author: answer.author ? { name: answer.author.name || '', urlToken: answer.author.url_token || null } : null,
    excerpt: answer.excerpt || answer.excerpt_new || '',
    voteupCount: answer.voteup_count ?? null,
    commentCount: answer.comment_count ?? null,
    createdTime: answer.created_time ?? null,
    updatedTime: answer.updated_time ?? null,
    url: answer.question?.id ? `https://www.zhihu.com/question/${answer.question.id}/answer/${answer.id}` : null,
  };
}

export function normalizeFeedItem(item) {
  const target = item.target ?? item;
  const question = target.question ?? (target.type === 'question' ? target : null);
  const linkUrl = target.link?.url || target.url || null;
  const questionIdFromUrl = /\/question\/(\d+)/.exec(linkUrl || '')?.[1];
  const questionIdFromCard = /^Q_(\d+)$/.exec(item.card_id || '')?.[1];
  return {
    type: target.type || item.type || null,
    id: target.id === undefined ? null : String(target.id),
    title: target.title || question?.title || target.title_area?.text || '',
    excerpt: target.excerpt || target.description || target.excerpt_area?.text || '',
    questionId: question?.id ? String(question.id) : questionIdFromUrl || questionIdFromCard || null,
    voteupCount: target.voteup_count ?? target.vote_count ?? null,
    commentCount: target.comment_count ?? null,
    answerCount: question?.answer_count ?? target.answer_count ?? item.feed_specific?.answer_count ?? null,
    hotValue: target.metrics_area?.text || null,
    url: linkUrl || (question?.id ? `https://www.zhihu.com/question/${question.id}` : null),
  };
}

function childNodes(node) {
  if (!node || typeof node !== 'object') return [];
  return [...(Array.isArray(node.children) ? node.children : []), ...(Array.isArray(node.elements) ? node.elements : []), ...(node.tail_element ? [node.tail_element] : [])];
}

function flattenCard(root) {
  const result = [];
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    result.push(node);
    stack.push(...childNodes(node));
  }
  return result;
}

export function normalizeComponentCard(item) {
  const nodes = flattenCard(item);
  const title = nodes.find((node) => node.test_id?.endsWith('.title'))?.text || '';
  const excerpt = nodes.find((node) => node.test_id?.endsWith('.description'))?.text || '';
  const footer = nodes.find((node) => typeof node.text === 'string' && /赞同|评论/.test(node.text))?.text || '';
  const actionParameters = new URLSearchParams(item.action?.parameter || '');
  const route = actionParameters.get('route_url') || '';
  const routeMatch = /\/question\/(\d+)\/answer\/(\d+)/.exec(route);
  const answerId = item.extra?.contentToken || item.extra?.content_token || routeMatch?.[2] || null;
  const questionId = routeMatch?.[1] || null;
  const voteupCount = Number.parseInt(/(\d+)\s*赞同/.exec(footer)?.[1] || '', 10);
  const commentCount = Number.parseInt(/(\d+)\s*评论/.exec(footer)?.[1] || '', 10);
  return {
    type: (item.extra?.contentType || item.extra?.content_type || 'answer').toLowerCase(),
    id: answerId ? String(answerId) : null,
    title,
    excerpt,
    questionId,
    voteupCount: Number.isNaN(voteupCount) ? null : voteupCount,
    commentCount: Number.isNaN(commentCount) ? null : commentCount,
    answerCount: null,
    hotValue: null,
    url: route || (questionId && answerId ? `https://www.zhihu.com/question/${questionId}/answer/${answerId}` : null),
  };
}

function uniqueFeedItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.type}:${item.id || ''}:${item.questionId || ''}:${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function integer(value, name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isSafeInteger(parsed) || String(parsed) !== String(value) || parsed < min || parsed > max) {
    throw new UsageError(`${name} 必须是 ${min} 到 ${max} 之间的整数`);
  }
  return parsed;
}

function positiveId(value, name = 'ID') {
  if (!value || !/^\d+$/.test(String(value)) || String(value) === '0') throw new UsageError(`${name} 必须是正整数 ID`);
  return String(value);
}

function resolvedId(positional, options, name = 'ID') {
  return positiveId(positional ?? options.id, name);
}

function values(value, previous) {
  return [...previous, value];
}

function voteState(value) {
  if (!['up', 'neutral'].includes(value)) throw new UsageError('--state 仅支持 up 或 neutral');
  return value;
}

function listResponse(response) {
  if (Array.isArray(response)) return { data: response, paging: null };
  return { data: Array.isArray(response?.data) ? response.data : [], paging: response?.paging ?? null };
}

function compactAccount(raw) {
  return {
    id: raw?.id === undefined || raw?.id === null ? '' : String(raw.id),
    name: raw?.name || '',
    urlToken: raw?.url_token ?? raw?.urlToken ?? null,
    headline: raw?.headline || '',
    avatarUrl: raw?.avatar_url ?? raw?.avatarUrl ?? null,
  };
}

function normalizeQuestion(raw) {
  return {
    id: String(raw?.id || ''), title: raw?.title || '', excerpt: raw?.excerpt || '', detail: raw?.detail || '',
    author: raw?.author ? compactAccount(raw.author) : null,
    topics: (raw?.topics || []).map((topic) => ({ id: String(topic.id || ''), name: topic.name || '', urlToken: topic.url_token || null })),
    answerCount: raw?.answer_count ?? null, commentCount: raw?.comment_count ?? null,
    followerCount: raw?.follower_count ?? null, visitCount: raw?.visit_count ?? raw?.read_count ?? null,
    following: raw?.relationship?.is_following ?? null,
    url: raw?.id ? `https://www.zhihu.com/question/${raw.id}` : null,
  };
}

function normalizeAnswerDetail(raw) {
  return {
    ...normalizeAnswer(raw), content: raw?.content || '', relationship: raw?.relationship ? {
      voting: raw.relationship.voting ?? null,
      isAuthor: raw.relationship.is_author ?? raw.relationship.isAuthor ?? null,
    } : null,
  };
}

function normalizeUser(raw) {
  return {
    ...compactAccount(raw), description: raw?.description || '', gender: raw?.gender ?? null,
    answerCount: raw?.answer_count ?? null, articlesCount: raw?.articles_count ?? null,
    followerCount: raw?.follower_count ?? null, followingCount: raw?.following_count ?? null,
    voteupCount: raw?.voteup_count ?? null, thankedCount: raw?.thanked_count ?? null,
  };
}

function normalizeComment(raw) {
  return {
    id: raw?.id === undefined ? null : String(raw.id), author: raw?.author ? compactAccount(raw.author) : null,
    content: raw?.content || '', voteCount: raw?.vote_count ?? null, childCommentCount: raw?.child_comment_count ?? null,
    createdTime: raw?.created_time ?? null,
  };
}

function normalizeArticle(raw) {
  return {
    id: raw?.id === undefined ? null : String(raw.id), title: raw?.title || '', excerpt: raw?.excerpt || '',
    author: raw?.author ? compactAccount(raw.author) : null, voteupCount: raw?.voteup_count ?? null,
    commentCount: raw?.comment_count ?? null, createdTime: raw?.created_time ?? null, updatedTime: raw?.updated_time ?? null,
    url: raw?.id ? `https://zhuanlan.zhihu.com/p/${raw.id}` : null,
  };
}

function normalizeSearchItem(item) {
  const object = item?.object ?? item?.target ?? item;
  if (object?.type === 'people' || object?.type === 'member') return { type: 'people', ...normalizeUser(object) };
  if (object?.type === 'topic') return { type: 'topic', id: String(object.id || ''), name: object.name || item?.highlight?.title || '', excerpt: object.introduction || '' };
  const question = questionFromSearchItem(item);
  if (question) return { type: 'question', ...question };
  return { type: object?.type || 'unknown', id: object?.id === undefined ? null : String(object.id), title: object?.title || '', excerpt: object?.excerpt || '' };
}

function authConfig(operation, names = ['z_c0']) {
  const config = loadConfig({ required: true });
  requireCookies(config, names, operation);
  return config;
}

async function allPages(fetchPage, { limit, offset, all, maxPages = 20 }) {
  if (!all) return fetchPage({ limit, offset });
  const data = [];
  let paging = null;
  let nextOffset = offset;
  for (let page = 0; page < maxPages; page += 1) {
    const response = await fetchPage({ limit, offset: nextOffset });
    const current = listResponse(response);
    data.push(...current.data);
    paging = current.paging;
    if (current.data.length === 0 || paging?.is_end === true || paging?.isEnd === true) break;
    nextOffset += current.data.length;
  }
  return { data, paging: { ...(paging || {}), protectedByMaxPages: data.length >= limit * maxPages } };
}

async function expandFeed(config, items, options) {
  const answers = integer(options.answers, '--answers', 0, { min: 0, max: 10 });
  const comments = integer(options.comments, '--comments', 0, { min: 0, max: 20 });
  if (!answers && !options.expand && !comments) return items;
  const expanded = [];
  for (const item of items) {
    const next = { ...item };
    if (answers && item.questionId) {
      const response = await getQuestionAnswers(config, item.questionId, { limit: answers });
      next.answers = listResponse(response).data.map(normalizeAnswer).filter(Boolean);
    }
    if ((options.expand || comments) && item.type === 'answer' && item.id) next.content = normalizeAnswerDetail(await getAnswer(config, item.id));
    if (comments && item.type === 'answer' && item.id) {
      const response = await getAnswerComments(config, item.id, { limit: comments });
      next.comments = listResponse(response).data.map(normalizeComment);
    }
    expanded.push(next);
  }
  return expanded;
}

function answerSettings(config, options) {
  return { ...config.defaultStyle, table_of_contents_enabled: options.toc === undefined ? Boolean(config.defaultStyle.table_of_contents_enabled) : Boolean(options.toc) };
}

async function prepareAnswer(options, operation) {
  const questionId = positiveId(options.questionId, '--question-id');
  const prepared = prepareContent({ input: options.input, images: options.image || [] });
  const config = authConfig(operation, ['d_c0', 'z_c0']);
  const settings = answerSettings(config, options);
  const [account, question, answerId] = await Promise.all([fetchAccount(config), fetchQuestion(config, questionId), findMyAnswerId(config, questionId)]);
  const context = {
    version: 1, operation, accountId: account.id, targetId: questionId, remoteState: { answerId, questionTitle: question.title },
    title: null, topics: [], settings, ...contentTokenFields(prepared),
  };
  return { config, questionId, prepared, settings, account, question, answerId, context };
}

function answerPreviewData(value) {
  return {
    account: value.account, question: value.question, mode: value.answerId ? 'update' : 'create', existingAnswerId: value.answerId,
    contentSummary: value.prepared.summary, stats: value.prepared.stats, images: value.prepared.images,
    html: value.prepared.previewHtml, settings: value.settings, confirmationToken: createOperationToken(value.context),
  };
}

function addContentOptions(command, { title = true, topics = false } = {}) {
  if (title) command.requiredOption('--title <title>', '标题');
  command.requiredOption('--input <markdown|->', 'Markdown 文件或 stdin');
  if (topics) command.option('--topic <topic>', '话题 ID 或 url_token，可重复', values, []);
  command.option('--image <path>', '附加本地图片，可重复', values, []);
  return command;
}

function addListOptions(command, defaultLimit = 10) {
  return command.option('-l, --limit <number>', '每页数量', String(defaultLimit)).option('--offset <number>', '起始偏移', '0');
}

function registerAuth(program) {
  const auth = program.command('auth').description('认证与登录态');
  auth.command('import').description('仅从 stdin 导入 Cookie').action(async () => {
    const result = saveCookies(parseCookieHeader(await readStdin()));
    success({ imported: true, configPath: result.configPath, cookieNames: result.cookieNames });
  });
  auth.command('login').option('--qr', '使用二维码登录').action(async (options, command) => {
    if (!options.qr) throw new UsageError('auth login 目前仅支持 --qr');
    const global = command.optsWithGlobals();
    const config = loadConfig();
    const result = await qrLogin(config, {
      progress,
      showTerminalQr: global.format === 'table' ? (text) => process.stderr.write(`${text}\n`) : () => {},
    });
    success(result);
  });
  auth.command('logout').action(() => success({ authenticated: false, cleared: clearAuthentication() }));
  auth.command('whoami').action(async () => success(compactAccount(await getMe(authConfig('查看当前账户')))));
  auth.command('status').option('--offline', '仅检查本地登录态').action(async (options) => {
    const config = loadConfig({ required: true });
    const local = { authenticated: Boolean(config.cookies.z_c0), cookieNames: Object.keys(config.cookies).sort(), hasRequired: { d_c0: Boolean(config.cookies.d_c0), z_c0: Boolean(config.cookies.z_c0), _xsrf: Boolean(config.cookies._xsrf) } };
    if (options.offline) return success({ ...local, verifiedOnline: false });
    const account = compactAccount(await getMe(config));
    success({ ...local, authenticated: true, verifiedOnline: true, account });
  });

  program.command('login').option('--qrcode', '使用二维码登录').option('--qr', '使用二维码登录').action(async (options, command) => {
    if (!options.qrcode && !options.qr) throw new UsageError('login 目前仅支持 --qrcode');
    const result = await qrLogin(loadConfig(), { progress, showTerminalQr: command.optsWithGlobals().format === 'table' ? (text) => process.stderr.write(`${text}\n`) : () => {} });
    success(result);
  });
  program.command('logout').action(() => success({ authenticated: false, cleared: clearAuthentication() }));
  program.command('whoami').action(async () => success(compactAccount(await getMe(authConfig('查看当前账户')))));
  program.command('status').option('--offline', '仅检查本地登录态').action(async (options) => {
    const config = loadConfig({ required: true });
    const data = { authenticated: Boolean(config.cookies.z_c0), cookieNames: Object.keys(config.cookies).sort() };
    if (!options.offline) data.account = compactAccount(await getMe(config));
    success(data);
  });
}

function registerReadCommands(program) {
  addListOptions(program.command('search').requiredOption('-q, --query <text>').option('--type <type>', 'general|people|topic', 'general').option('--questions-only').option('--answers <number>', '每个问题展开回答数', '0')).action(async (options) => {
    if (!['general', 'people', 'topic'].includes(options.type)) throw new UsageError('--type 仅支持 general、people 或 topic');
    const limit = integer(options.limit, '--limit', 10, { min: 1, max: 50 });
    const offset = integer(options.offset, '--offset', 0, { min: 0, max: 10000 });
    const config = loadConfig();
    const response = await searchContent(config, { query: options.query, type: options.type, limit, offset });
    let data = listResponse(response).data.map(normalizeSearchItem).filter((item) => !options.questionsOnly || item.type === 'question');
    const answers = integer(options.answers, '--answers', 0, { min: 0, max: 10 });
    if (answers) data = await Promise.all(data.map(async (item) => item.type !== 'question' ? item : ({ ...item, answers: listResponse(await getQuestionAnswers(config, item.id, { limit: answers })).data.map(normalizeAnswer).filter(Boolean) })));
    success(data, { paging: response?.paging ?? null });
  });

  const feed = program.command('feed').description('推荐和热榜').option('-l, --limit <number>', '数量', '10').action(async (options) => {
    const config = authConfig('读取个性化推荐');
    const response = await getRecommend(config, { limit: integer(options.limit, '--limit', 10, { min: 1, max: 50 }) });
    success(uniqueFeedItems(listResponse(response).data.map((item) => item.type === 'ComponentCard' ? normalizeComponentCard(item) : normalizeFeedItem(item))));
  });
  for (const kind of ['hot', 'recommend']) {
    feed.command(kind).option('-l, --limit <number>', '数量', kind === 'hot' ? '20' : '10').option('--answers <number>', '展开回答数', '0').option('--expand', '展开回答正文').option('--comments <number>', '展开评论数', '0').action(async (options) => {
      const limit = integer(options.limit, '--limit', kind === 'hot' ? 20 : 10, { min: 1, max: 50 });
      const config = kind === 'hot' ? loadConfig() : authConfig('读取个性化推荐');
      const response = kind === 'hot' ? await getHot(config, { limit }) : await getRecommend(config, { limit });
      const normalized = uniqueFeedItems(listResponse(response).data.map((item) => item.type === 'ComponentCard' ? normalizeComponentCard(item) : normalizeFeedItem(item))).slice(0, limit);
      success(await expandFeed(config, normalized, options), { paging: response?.paging ?? null });
    });
  }
  program.command('hot').option('-l, --limit <number>', '数量', '20').option('--answers <number>', '展开回答数', '0').action(async (options) => {
    const config = loadConfig();
    const limit = integer(options.limit, '--limit', 20, { min: 1, max: 50 });
    const response = await getHot(config, { limit });
    const normalized = uniqueFeedItems(listResponse(response).data.map((item) => item.type === 'ComponentCard' ? normalizeComponentCard(item) : normalizeFeedItem(item))).slice(0, limit);
    success(await expandFeed(config, normalized, options), { paging: response?.paging ?? null });
  });
  program.command('feeds').option('-l, --limit <number>', '数量', '10').option('--comment-limit <number>', '每项评论数', '3').action(async (options) => {
    const config = authConfig('读取个性化推荐');
    const limit = integer(options.limit, '--limit', 10, { min: 1, max: 50 });
    const response = await getRecommend(config, { limit });
    const normalized = uniqueFeedItems(listResponse(response).data.map((item) => item.type === 'ComponentCard' ? normalizeComponentCard(item) : normalizeFeedItem(item))).slice(0, limit);
    success(await expandFeed(config, normalized, { expand: true, comments: options.commentLimit, answers: 0 }), { paging: response?.paging ?? null });
  });

  const question = program.command('question').description('问题').argument('[id]').action(async (id, options) => success(normalizeQuestion(await getQuestion(loadConfig(), resolvedId(id, options, '问题 ID')))));
  question.command('show').argument('[id]').option('--id <id>').action(async (id, options) => success(normalizeQuestion(await getQuestion(loadConfig(), resolvedId(id, options, '问题 ID')))));
  addListOptions(question.command('answers').argument('[id]').option('--id <id>').option('--sort <sort>', 'default|updated', 'default')).action(async (id, options) => {
    if (!['default', 'updated'].includes(options.sort)) throw new UsageError('--sort 仅支持 default 或 updated');
    const response = await getQuestionAnswers(loadConfig(), resolvedId(id, options, '问题 ID'), { limit: integer(options.limit, '--limit', 10, { min: 1, max: 50 }), offset: integer(options.offset, '--offset', 0, { min: 0, max: 10000 }), sort: options.sort });
    success(listResponse(response).data.map(normalizeAnswer).filter(Boolean), { paging: response?.paging ?? null });
  });
  addListOptions(program.command('answers').argument('<question-id>').option('--sort <sort>', 'default|updated', 'default')).action(async (id, options) => {
    const response = await getQuestionAnswers(loadConfig(), positiveId(id, '问题 ID'), { limit: integer(options.limit, '--limit', 10, { min: 1, max: 50 }), offset: integer(options.offset, '--offset', 0, { min: 0, max: 10000 }), sort: options.sort });
    success(listResponse(response).data.map(normalizeAnswer).filter(Boolean), { paging: response?.paging ?? null });
  });

  const answer = program.command('answer').description('回答').argument('[id]').option('--comments', '同时返回评论').option('-l, --limit <number>', '评论数量', '20').action(async (id, options) => {
    const answerId = resolvedId(id, options, '回答 ID');
    const config = loadConfig();
    const detail = normalizeAnswerDetail(await getAnswer(config, answerId));
    if (options.comments) detail.comments = listResponse(await getAnswerComments(config, answerId, { limit: integer(options.limit, '--limit', 20, { min: 1, max: 100 }) })).data.map(normalizeComment);
    success(detail);
  });
  answer.command('show').argument('[id]').option('--id <id>').action(async (id, options) => success(normalizeAnswerDetail(await getAnswer(loadConfig(), resolvedId(id, options, '回答 ID')))));
  addListOptions(answer.command('comments').argument('[id]').option('--id <id>').option('--all', '读取多页，最多 20 页')).action(async (id, options) => {
    const answerId = resolvedId(id, options, '回答 ID');
    const config = loadConfig();
    const limit = integer(options.limit, '--limit', 10, { min: 1, max: 100 });
    const offset = integer(options.offset, '--offset', 0, { min: 0, max: 10000 });
    const response = await allPages(({ limit: pageLimit, offset: pageOffset }) => getAnswerComments(config, answerId, { limit: pageLimit, offset: pageOffset }), { limit, offset, all: options.all });
    success(listResponse(response).data.map(normalizeComment), { paging: response?.paging ?? null });
  });

  const user = program.command('user').argument('[token]').action(async (token) => { if (!token) throw new UsageError('缺少用户 url_token'); success(normalizeUser(await getUser(loadConfig(), token))); });
  user.command('show').argument('<token>').action(async (token) => success(normalizeUser(await getUser(loadConfig(), token))));
  for (const kind of ['answers', 'articles', 'followers', 'following']) {
    addListOptions(user.command(kind).argument('<token>').option('--sort <sort>', '排序', 'created')).action(async (token, options) => {
      const config = loadConfig();
      const paging = { limit: integer(options.limit, '--limit', 10, { min: 1, max: 50 }), offset: integer(options.offset, '--offset', 0, { min: 0, max: 10000 }), sort: options.sort };
      const response = kind === 'answers' ? await getUserAnswers(config, token, paging) : kind === 'articles' ? await getUserArticles(config, token, paging) : kind === 'followers' ? await getFollowers(config, token, paging) : await getFollowing(config, token, paging);
      const normalize = kind === 'answers' ? normalizeAnswer : kind === 'articles' ? normalizeArticle : normalizeUser;
      success(listResponse(response).data.map(normalize).filter(Boolean), { paging: response?.paging ?? null });
    });
  }
  program.command('user-answers').argument('<token>').option('-l, --limit <number>', '数量', '10').action(async (token, options) => { const response = await getUserAnswers(loadConfig(), token, { limit: integer(options.limit, '--limit', 10, { min: 1, max: 50 }) }); success(listResponse(response).data.map(normalizeAnswer).filter(Boolean), { paging: response?.paging ?? null }); });
  program.command('user-articles').argument('<token>').option('-l, --limit <number>', '数量', '10').action(async (token, options) => { const response = await getUserArticles(loadConfig(), token, { limit: integer(options.limit, '--limit', 10, { min: 1, max: 50 }) }); success(listResponse(response).data.map(normalizeArticle), { paging: response?.paging ?? null }); });
  program.command('followers').argument('<token>').option('-l, --limit <number>', '数量', '10').action(async (token, options) => { const response = await getFollowers(loadConfig(), token, { limit: integer(options.limit, '--limit', 10, { min: 1, max: 50 }) }); success(listResponse(response).data.map(normalizeUser), { paging: response?.paging ?? null }); });
  program.command('following').argument('<token>').option('-l, --limit <number>', '数量', '10').action(async (token, options) => { const response = await getFollowing(loadConfig(), token, { limit: integer(options.limit, '--limit', 10, { min: 1, max: 50 }) }); success(listResponse(response).data.map(normalizeUser), { paging: response?.paging ?? null }); });

  const topic = program.command('topic').argument('[id]').action(async (id, options) => { const raw = await getTopic(loadConfig(), resolvedId(id, options, '话题 ID')); success({ id: String(raw.id || id), name: raw.name || '', introduction: raw.introduction || '', followersCount: raw.followers_count ?? null, questionsCount: raw.questions_count ?? null }); });
  topic.command('show').argument('[id]').option('--id <id>').action(async (id, options) => { const topicId = resolvedId(id, options, '话题 ID'); const raw = await getTopic(loadConfig(), topicId); success({ id: String(raw.id || topicId), name: raw.name || '', introduction: raw.introduction || '', followersCount: raw.followers_count ?? null, questionsCount: raw.questions_count ?? null }); });
  addListOptions(topic.command('questions').argument('<id>')).action(async (id, options) => { const response = await getTopicQuestions(loadConfig(), positiveId(id, '话题 ID'), { limit: integer(options.limit, '--limit', 10, { min: 1, max: 50 }), offset: integer(options.offset, '--offset', 0, { min: 0, max: 10000 }) }); success(listResponse(response).data.map((item) => normalizeQuestion(item.target?.question ?? item.target ?? item)), { paging: response?.paging ?? null }); });

  const account = program.command('account');
  addListOptions(account.command('collections')).action(async (options) => { const response = await getCollections(authConfig('读取收藏夹'), { limit: integer(options.limit, '--limit', 10, { min: 1, max: 50 }), offset: integer(options.offset, '--offset', 0, { min: 0, max: 10000 }) }); success(listResponse(response).data, { paging: response?.paging ?? null }); });
  addListOptions(account.command('notifications')).action(async (options) => { const response = await getNotifications(authConfig('读取通知'), { limit: integer(options.limit, '--limit', 10, { min: 1, max: 50 }), offset: integer(options.offset, '--offset', 0, { min: 0, max: 10000 }) }); success(listResponse(response).data, { paging: response?.paging ?? null }); });
  addListOptions(program.command('collections')).action(async (options) => { const response = await getCollections(authConfig('读取收藏夹'), { limit: integer(options.limit, '--limit', 10, { min: 1, max: 50 }), offset: integer(options.offset, '--offset', 0, { min: 0, max: 10000 }) }); success(listResponse(response).data, { paging: response?.paging ?? null }); });
  addListOptions(program.command('notifications')).action(async (options) => { const response = await getNotifications(authConfig('读取通知'), { limit: integer(options.limit, '--limit', 10, { min: 1, max: 50 }), offset: integer(options.offset, '--offset', 0, { min: 0, max: 10000 }) }); success(listResponse(response).data, { paging: response?.paging ?? null }); });
}

function registerAnswerWriting(program) {
  const answer = program.commands.find((command) => command.name() === 'answer');
  answer.command('compile').requiredOption('--input <markdown|->').action((options) => { const compiled = compileMarkdown(readMarkdownInput(options.input)); success({ html: compiled.html, stats: compiled.stats }, { warnings: compiled.warnings }); });
  for (const action of ['preview', 'publish', 'draft']) {
    const command = answer.command(action).requiredOption('--question-id <id>').requiredOption('--input <markdown|->').option('--image <path>', '本地图片，可重复', values, []).option('--toc', '启用目录').option('--no-toc', '禁用目录');
    if (action === 'publish') command.requiredOption('--confirm <sha256>');
    if (action === 'draft') command.option('--confirm <sha256>');
    command.action(async (options) => {
      const operation = action === 'draft' ? 'answer.draft' : 'answer.publish';
      const prepared = await prepareAnswer(options, operation);
      const preview = answerPreviewData(prepared);
      if (action === 'preview' || (action === 'draft' && !options.confirm)) return success({ ...preview, operation });
      if (!verifyOperationToken(prepared.context, options.confirm)) throw new Error('确认令牌不匹配：账户、目标、回答状态、正文、图片或设置已变化，请重新预览');
      requireCookies(prepared.config, ['d_c0', 'z_c0', '_xsrf'], action === 'draft' ? '保存回答草稿' : '发布回答');
      const uploaded = await uploadAndCompileContent(prepared.config, prepared.prepared);
      const context = { questionId: prepared.questionId, answerId: prepared.answerId, html: uploaded.compiled.html, settings: prepared.settings };
      const result = action === 'draft' ? await saveDraft(prepared.config, context) : await publishAnswer(prepared.config, context);
      success({ ...result, question: prepared.question, images: uploaded.uploads.map((image) => ({ imageId: image.imageId, url: image.url })) }, { warnings: uploaded.compiled.warnings });
    });
  }
  const image = program.command('image');
  image.command('upload').requiredOption('--file <path>').option('--confirm <sha256>').action(async (options) => {
    const config = authConfig('上传图片');
    const account = compactAccount(await getMe(config));
    const inspected = inspectImageFile(options.file);
    const context = { version: 1, operation: 'image.upload', accountId: account.id, targetId: null, remoteState: null, image: inspected };
    const confirmationToken = createOperationToken(context);
    if (!options.confirm) return success({ account, image: inspected, confirmationToken });
    if (!verifyOperationToken(context, options.confirm)) throw new Error('确认令牌不匹配：账户或图片内容已变化，请重新预览');
    success(await uploadImage(config, inspected.path));
  });
}

function registerWriteCommands(program) {
  const answer = program.commands.find((command) => command.name() === 'answer');
  const vote = answer.command('vote');
  vote.command('preview').argument('<id>').option('--state <state>', 'up|neutral', 'up').action(async (id, options) => success(await previewVote(authConfig('预览赞同操作'), positiveId(id, '回答 ID'), voteState(options.state))));
  vote.command('apply').argument('<id>').option('--state <state>', 'up|neutral', 'up').requiredOption('--confirm <sha256>').action(async (id, options) => success(await applyVote(authConfig('执行赞同操作', ['d_c0', 'z_c0', '_xsrf']), positiveId(id, '回答 ID'), voteState(options.state), options.confirm)));
  program.command('vote').argument('<id>').option('--neutral').option('--confirm <sha256>').action(async (id, options) => { const config = authConfig('赞同操作'); const state = options.neutral ? 'neutral' : 'up'; success(options.confirm ? await applyVote(config, positiveId(id, '回答 ID'), state, options.confirm) : await previewVote(config, positiveId(id, '回答 ID'), state)); });

  const question = program.commands.find((command) => command.name() === 'question');
  const follow = question.command('follow');
  follow.command('preview').argument('<id>').option('--unfollow').action(async (id, options) => success(await previewFollow(authConfig('预览关注操作'), positiveId(id, '问题 ID'), !options.unfollow)));
  follow.command('apply').argument('<id>').option('--unfollow').requiredOption('--confirm <sha256>').action(async (id, options) => success(await applyFollow(authConfig('执行关注操作', ['d_c0', 'z_c0', '_xsrf']), positiveId(id, '问题 ID'), !options.unfollow, options.confirm)));
  program.command('follow-question').argument('<id>').option('--unfollow').option('--confirm <sha256>').action(async (id, options) => { const config = authConfig('关注操作'); const desired = !options.unfollow; success(options.confirm ? await applyFollow(config, positiveId(id, '问题 ID'), desired, options.confirm) : await previewFollow(config, positiveId(id, '问题 ID'), desired)); });

  for (const [type, parent] of [['question', question], ['pin', program.command('pin')], ['article', program.command('article')]]) {
    const create = parent.command('create');
    for (const action of ['preview', 'publish']) {
      const command = addContentOptions(create.command(action), { title: true, topics: type !== 'pin' });
      if (action === 'publish') command.requiredOption('--confirm <sha256>');
      command.action(async (options) => {
        const config = authConfig(`${type} 创建`, ['d_c0', 'z_c0', '_xsrf']);
        const prepared = prepareContent({ input: options.input, images: options.image });
        const creationOptions = { title: options.title, topics: options.topic || [] };
        if (action === 'preview') success(await previewCreation(config, type, prepared, creationOptions), { warnings: prepared.warnings });
        else success(await publishCreation(config, type, prepared, creationOptions, options.confirm));
      });
    }
    const deletion = parent.command('delete');
    deletion.command('preview').argument('<id>').action(async (id) => success(await previewDeletion(authConfig(`${type} 删除预览`), type, positiveId(id))));
    deletion.command('apply').argument('<id>').requiredOption('--confirm <sha256>').action(async (id, options) => success(await applyDeletion(authConfig(`${type} 删除`, ['d_c0', 'z_c0', '_xsrf']), type, positiveId(id), options.confirm)));
    if (type !== 'question') {
      parent.option('--title <title>').option('--input <markdown|->').option('--topic <topic>', '话题，可重复', values, []).option('--image <path>', '图片，可重复', values, []).option('--confirm <sha256>').action(async (options) => {
        if (!options.title || !options.input) throw new UsageError(`${type} 需要 --title 和 --input，或使用 create/delete 子命令`);
        const config = authConfig(`${type} 创建`, ['d_c0', 'z_c0', '_xsrf']);
        const prepared = prepareContent({ input: options.input, images: options.image });
        const creationOptions = { title: options.title, topics: options.topic || [] };
        success(options.confirm ? await publishCreation(config, type, prepared, creationOptions, options.confirm) : await previewCreation(config, type, prepared, creationOptions));
      });
    }
  }

  for (const [name, type] of [['ask', 'question'], ['pin-create', 'pin'], ['article-create', 'article']]) {
    const command = addContentOptions(program.command(name), { title: true, topics: type !== 'pin' }).option('--confirm <sha256>');
    command.action(async (options) => { const config = authConfig(`${type} 创建`, ['d_c0', 'z_c0', '_xsrf']); const prepared = prepareContent({ input: options.input, images: options.image }); const creationOptions = { title: options.title, topics: options.topic || [] }; success(options.confirm ? await publishCreation(config, type, prepared, creationOptions, options.confirm) : await previewCreation(config, type, prepared, creationOptions)); });
  }
  for (const type of ['question', 'pin', 'article']) {
    program.command(`delete-${type}`).argument('<id>').option('--confirm <sha256>').action(async (id, options) => { const config = authConfig(`${type} 删除`); success(options.confirm ? await applyDeletion(config, type, positiveId(id), options.confirm) : await previewDeletion(config, type, positiveId(id))); });
  }
}

export function createProgram() {
  const program = new Command();
  program.name('zhihu').description('面向人类与 Agent 的知乎 CLI').version(packageJson.version)
    .option('--format <format>', '输出格式 json|table', 'json').option('--verbose', '输出脱敏 HTTP 调试日志');
  program.exitOverride().showSuggestionAfterError(true).configureOutput({ writeErr: () => {} });
  program.hook('preAction', (_thisCommand, actionCommand) => {
    const options = actionCommand.optsWithGlobals();
    configureOutput({ format: options.format, verbose: options.verbose });
    setHttpLogger(verbose);
  });
  registerAuth(program);
  registerReadCommands(program);
  registerAnswerWriting(program);
  registerWriteCommands(program);
  return program;
}

export async function main(argv = process.argv.slice(2)) {
  if (argv[0] === '--') argv = argv.slice(1);
  const program = createProgram();
  if (argv.length === 0) {
    program.outputHelp();
    return;
  }
  try {
    await program.parseAsync(['node', 'zhihu', ...argv]);
  } catch (error) {
    if (error instanceof CommanderError && ['commander.helpDisplayed', 'commander.version'].includes(error.code)) return;
    if (error instanceof CommanderError) throw new UsageError(error.message);
    throw error;
  }
}

const executedPath = process.argv[1] && fs.existsSync(process.argv[1]) ? fs.realpathSync(process.argv[1]) : null;
if (executedPath === fileURLToPath(import.meta.url)) main().catch(fail);
