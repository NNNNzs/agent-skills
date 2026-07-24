/*
 * Payload behavior derived from zly2006/zhihu-plus-plus ZhihuAnswerPublisher.
 * Copyright (C) 2024-2026 zly2006 and contributors.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import crypto from 'node:crypto';
import { requestJson } from './http.js';

const PUBLISH_INCLUDE = 'is_visible,paid_info,paid_info_content,has_column,admin_closed_comment,reward_info,annotation_action,annotation_detail,collapse_reason,is_normal,is_sticky,collapsed_by,suggest_edit,comment_count,thanks_count,favlists_count,can_comment,content,editable_content,voteup_count,reshipment_settings,comment_permission,created_time,updated_time,review_info,relevant_info,question,excerpt,attachment,content_source,is_labeled,endorsements,reaction_instruction,ip_info,relationship.is_authorized,voting,is_thanked,is_author,is_nothelp,is_favorited;author.vip_info,kvip_info,badge[*].topics;settings.table_of_contents.enabled';

export function buildPcBusinessParams(settings) {
  return JSON.stringify({
    reshipment_settings: settings.reshipment_settings,
    comment_permission: settings.comment_permission,
    reward_setting: { can_reward: settings.can_reward },
    disclaimer_status: 'close',
    disclaimer_type: 'none',
    commercial_report_info: { is_report: false },
    commercial_zhitask_bind_info: null,
    is_report: false,
    table_of_contents_enabled: settings.table_of_contents_enabled,
    thank_inviter_status: 'close',
    thank_inviter: '',
  });
}

export function buildDraftBody(html, settings) {
  return {
    content: html,
    draft_type: 'normal',
    delta_time: 30,
    settings: {
      reshipment_settings: settings.reshipment_settings,
      comment_permission: settings.comment_permission,
      can_reward: settings.can_reward,
      tagline: '',
      disclaimer_status: 'close',
      disclaimer_type: 'none',
      commercial_report_info: { is_report: true },
      push_activity: false,
      table_of_contents_enabled: settings.table_of_contents_enabled,
      thank_inviter_status: 'close',
      thank_inviter: '',
    },
  };
}

export function buildPublishBody({ questionId, answerId, html, settings, traceId }) {
  return {
    action: 'answer',
    data: {
      publish: { traceId },
      hybridInfo: {},
      draft: {
        disabled: 1,
        isPublished: answerId !== null,
        contentId: answerId === null ? null : String(answerId),
      },
      extra_info: {
        question_id: String(questionId),
        publisher: 'pc',
        include: PUBLISH_INCLUDE,
        pc_business_params: buildPcBusinessParams(settings),
      },
      hybrid: { html },
      reprint: { reshipment_settings: settings.reshipment_settings },
      commentsPermission: { comment_permission: settings.comment_permission },
      appreciate: { can_reward: settings.can_reward },
      publishSwitch: { draft_type: 'normal' },
      creationStatement: { disclaimer_status: 'close', disclaimer_type: 'none' },
      commercialReportInfo: { isReport: 0 },
      toFollower: {},
      contentsTables: { table_of_contents_enabled: settings.table_of_contents_enabled },
      thanksInvitation: { thank_inviter_status: 'close', thank_inviter: '' },
    },
  };
}

export function createTraceId(now = Date.now(), uuid = crypto.randomUUID()) {
  return `${now},${uuid}`;
}

export function createConfirmationToken({ questionId, answerId, html, settings }) {
  const canonical = JSON.stringify({
    questionId: String(questionId),
    answerId: answerId === null ? null : String(answerId),
    html,
    settings: {
      comment_permission: settings.comment_permission,
      reshipment_settings: settings.reshipment_settings,
      can_reward: settings.can_reward,
      table_of_contents_enabled: settings.table_of_contents_enabled,
    },
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function parsePublishAnswerId(result) {
  let parsed = result;
  if (typeof result === 'string') {
    try { parsed = JSON.parse(result); } catch { return null; }
  }
  const value = parsed?.publish?.id ?? parsed?.id;
  if (value === null || value === undefined || !/^\d+$/.test(String(value))) return null;
  return String(value);
}

export async function findMyAnswerId(config, questionId, { request = requestJson } = {}) {
  const include = encodeURIComponent('relationship,relationship.my_answer');
  const response = await request(config, `https://api.zhihu.com/questions/${questionId}?include=${include}`, { signed: true });
  const answer = response?.relationship?.my_answer ?? response?.relationship?.myAnswer;
  if (!answer || answer.is_deleted === true || answer.isDeleted === true) return null;
  const value = answer.id ?? answer.answer_id ?? answer.answerId;
  return value === undefined || value === null ? null : String(value);
}

export async function fetchAccount(config, { request = requestJson } = {}) {
  const response = await request(config, 'https://www.zhihu.com/api/v4/me');
  return {
    id: String(response.id || ''),
    name: response.name || '',
    urlToken: response.url_token || response.urlToken || null,
    avatarUrl: response.avatar_url || response.avatarUrl || null,
  };
}

export async function fetchQuestion(config, questionId, { request = requestJson } = {}) {
  const include = 'read_count,visit_count,answer_count,comment_count,follower_count,detail,excerpt,topics';
  const response = await request(config, `https://www.zhihu.com/api/v4/questions/${questionId}?include=${encodeURIComponent(include)}`, { signed: true });
  return {
    id: String(response.id ?? questionId),
    title: response.title || '',
    excerpt: response.excerpt || '',
    answerCount: response.answer_count ?? null,
    followerCount: response.follower_count ?? null,
    visitCount: response.visit_count ?? response.read_count ?? null,
    url: `https://www.zhihu.com/question/${questionId}`,
  };
}

export async function saveDraft(config, { questionId, answerId, html, settings }, { request = requestJson } = {}) {
  await request(config, `https://www.zhihu.com/api/v4/questions/${questionId}/draft`, {
    method: 'POST',
    signed: true,
    retries: 0,
    headers: {
      'x-xsrftoken': config.cookies._xsrf,
      referer: `https://www.zhihu.com/question/${questionId}/answer/${answerId || ''}`,
    },
    body: buildDraftBody(html, settings),
  });
  return { questionId: String(questionId), answerId, mode: answerId ? 'update' : 'create', saved: true };
}

export async function publishAnswer(config, context, { request = requestJson } = {}) {
  const response = await request(config, 'https://www.zhihu.com/api/v4/content/publish', {
    method: 'POST',
    signed: true,
    retries: 0,
    headers: { 'x-xsrftoken': config.cookies._xsrf },
    body: buildPublishBody({ ...context, traceId: createTraceId() }),
  });
  if (response?.message !== 'success') {
    const error = new Error(`发布失败: ${response?.message || 'unknown'}`);
    error.zhihuCode = response?.code;
    throw error;
  }
  const answerId = parsePublishAnswerId(response?.data?.result);
  if (!answerId) throw new Error('发布成功但无法解析回答 ID');
  return {
    questionId: String(context.questionId),
    answerId,
    mode: context.answerId ? 'update' : 'create',
    url: `https://www.zhihu.com/question/${context.questionId}/answer/${answerId}`,
  };
}
