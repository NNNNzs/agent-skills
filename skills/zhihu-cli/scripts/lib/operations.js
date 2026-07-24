import {
  createArticle,
  createPin,
  createQuestion,
  deleteContent,
  getAnswer,
  getArticle,
  getMe,
  getPin,
  getQuestion,
  setQuestionFollow,
  setVote,
} from './client.js';
import { contentTokenFields, uploadAndCompileContent } from './content.js';
import { createOperationToken, verifyOperationToken } from './confirmation.js';

function accountSummary(account) {
  return {
    id: account?.id === undefined || account?.id === null ? '' : String(account.id),
    name: account?.name || '',
    urlToken: account?.url_token ?? account?.urlToken ?? null,
  };
}

function votingState(answer) {
  const value = answer?.relationship?.voting ?? answer?.voting;
  return value === true || value === 1 || value === '1' || value === 'up' ? 'up' : 'neutral';
}

function followingState(question) {
  return Boolean(question?.relationship?.is_following ?? question?.relationship?.isFollowing ?? question?.is_following);
}

function interactionContext(operation, account, targetId, currentState, desiredState) {
  return {
    version: 1,
    operation,
    accountId: account.id,
    targetId: String(targetId),
    remoteState: currentState,
    desiredState,
  };
}

export async function previewVote(config, answerId, desiredState, dependencies = {}) {
  const readMe = dependencies.getMe || getMe;
  const readAnswer = dependencies.getAnswer || getAnswer;
  const [rawAccount, answer] = await Promise.all([readMe(config), readAnswer(config, answerId)]);
  const account = accountSummary(rawAccount);
  const currentState = votingState(answer);
  const context = interactionContext('answer.vote', account, answerId, currentState, desiredState);
  return { account, target: { id: String(answerId), type: 'answer', excerpt: answer?.excerpt || '' }, currentState, desiredState, confirmationToken: createOperationToken(context) };
}

export async function applyVote(config, answerId, desiredState, token, dependencies = {}) {
  const preview = await previewVote(config, answerId, desiredState, dependencies);
  if (preview.currentState === desiredState) return { id: String(answerId), state: desiredState, changed: false, idempotent: true };
  const context = interactionContext('answer.vote', preview.account, answerId, preview.currentState, desiredState);
  if (!verifyOperationToken(context, token)) throw new Error('确认令牌不匹配：账户或回答赞同状态已变化，请重新预览');
  await (dependencies.setVote || setVote)(config, answerId, desiredState);
  return { id: String(answerId), state: desiredState, changed: true, idempotent: false };
}

export async function previewFollow(config, questionId, desiredState, dependencies = {}) {
  const readMe = dependencies.getMe || getMe;
  const readQuestion = dependencies.getQuestion || getQuestion;
  const [rawAccount, question] = await Promise.all([readMe(config), readQuestion(config, questionId)]);
  const account = accountSummary(rawAccount);
  const currentState = followingState(question);
  const context = interactionContext('question.follow', account, questionId, currentState, desiredState);
  return { account, target: { id: String(questionId), type: 'question', title: question?.title || '' }, currentState, desiredState, confirmationToken: createOperationToken(context) };
}

export async function applyFollow(config, questionId, desiredState, token, dependencies = {}) {
  const preview = await previewFollow(config, questionId, desiredState, dependencies);
  if (preview.currentState === desiredState) return { id: String(questionId), following: desiredState, changed: false, idempotent: true };
  const context = interactionContext('question.follow', preview.account, questionId, preview.currentState, desiredState);
  if (!verifyOperationToken(context, token)) throw new Error('确认令牌不匹配：账户或问题关注状态已变化，请重新预览');
  await (dependencies.setQuestionFollow || setQuestionFollow)(config, questionId, desiredState);
  return { id: String(questionId), following: desiredState, changed: true, idempotent: false };
}

function creationContext(type, account, prepared, { title, topics }) {
  return {
    version: 1,
    operation: `${type}.create`,
    accountId: account.id,
    targetId: null,
    remoteState: null,
    title,
    topics,
    settings: type === 'article' ? { commentPermission: 'anyone' } : { commentPermission: 'all' },
    ...contentTokenFields(prepared),
  };
}

export async function previewCreation(config, type, prepared, options, dependencies = {}) {
  const account = accountSummary(await (dependencies.getMe || getMe)(config));
  const topics = [...(options.topics || [])];
  const context = creationContext(type, account, prepared, { title: options.title, topics });
  return {
    account,
    operation: `${type}.create`,
    title: options.title,
    topics,
    contentSummary: prepared.summary,
    stats: prepared.stats,
    images: prepared.images,
    html: prepared.previewHtml,
    confirmationToken: createOperationToken(context),
  };
}

export async function publishCreation(config, type, prepared, options, token, dependencies = {}) {
  const preview = await previewCreation(config, type, prepared, options, dependencies);
  const context = creationContext(type, preview.account, prepared, { title: options.title, topics: preview.topics });
  if (!verifyOperationToken(context, token)) throw new Error('确认令牌不匹配：账户、标题、正文、话题或图片已变化，请重新预览');
  const uploaded = await (dependencies.uploadAndCompile || uploadAndCompileContent)(config, prepared);
  const create = dependencies.create || { question: createQuestion, pin: createPin, article: createArticle }[type];
  if (!create) throw new Error(`不支持创建内容类型: ${type}`);
  const result = await create(config, {
    title: options.title,
    html: uploaded.compiled.html,
    topics: preview.topics,
    images: uploaded.uploads,
    complex: /<(?:img|table|pre|blockquote|h2|h3)\b/i.test(uploaded.compiled.html),
  });
  return { type, published: true, result, images: uploaded.uploads.map((image) => ({ imageId: image.imageId, url: image.url })) };
}

function ownerOf(remote) {
  const author = remote?.author ?? remote?.creator;
  if (!author || author.type === 'anonymous') return null;
  return {
    id: author.id === undefined || author.id === null ? null : String(author.id),
    urlToken: author.url_token ?? author.urlToken ?? null,
    name: author.name || '',
  };
}

function owns(account, owner) {
  if (!owner) return false;
  return Boolean((account.id && owner.id && account.id === owner.id)
    || (account.urlToken && owner.urlToken && account.urlToken === owner.urlToken));
}

function deletionContext(type, account, id, remote) {
  const owner = ownerOf(remote);
  return {
    version: 1,
    operation: `${type}.delete`,
    accountId: account.id,
    targetId: String(id),
    remoteState: createOperationToken({
      id: String(remote?.id ?? id),
      title: remote?.title || remote?.excerpt || '',
      updatedTime: remote?.updated_time ?? remote?.updated ?? null,
      createdTime: remote?.created_time ?? remote?.created ?? null,
      status: remote?.status ?? null,
      owner,
    }),
  };
}

async function readDeletionTarget(config, type, id, dependencies) {
  const reader = dependencies.readTarget || { question: getQuestion, pin: getPin, article: getArticle }[type];
  if (!reader) throw new Error(`不支持删除内容类型: ${type}`);
  return reader(config, id);
}

export async function previewDeletion(config, type, id, dependencies = {}) {
  const [rawAccount, remote] = await Promise.all([
    (dependencies.getMe || getMe)(config),
    readDeletionTarget(config, type, id, dependencies),
  ]);
  if (!remote || String(remote.id ?? id) !== String(id)) throw new Error('无法确认待删除对象的类型或 ID');
  const account = accountSummary(rawAccount);
  const owner = ownerOf(remote);
  if (!owns(account, owner)) throw new Error('拒绝删除：无法确认当前账户拥有该对象');
  const context = deletionContext(type, account, id, remote);
  return {
    account,
    target: { type, id: String(id), title: remote.title || remote.excerpt || '', owner },
    confirmationToken: createOperationToken(context),
  };
}

export async function applyDeletion(config, type, id, token, dependencies = {}) {
  const [rawAccount, remote] = await Promise.all([
    (dependencies.getMe || getMe)(config),
    readDeletionTarget(config, type, id, dependencies),
  ]);
  const account = accountSummary(rawAccount);
  const owner = ownerOf(remote);
  if (!remote || String(remote.id ?? id) !== String(id) || !owns(account, owner)) throw new Error('拒绝删除：对象、类型或所有权无法确认');
  const context = deletionContext(type, account, id, remote);
  if (!verifyOperationToken(context, token)) throw new Error('确认令牌不匹配：账户、对象或远端状态已变化，请重新预览');
  return (dependencies.deleteContent || deleteContent)(config, type, id);
}
