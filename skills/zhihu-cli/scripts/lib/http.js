import { Agent, ProxyAgent } from 'undici';
import { cookieHeader } from './config.js';
import { signRequest } from './zse-signer.js';

const ALLOWED_HOSTS = new Set([
  'www.zhihu.com',
  'api.zhihu.com',
  'zhuanlan.zhihu.com',
  'zhihu-pics-upload.zhimg.com',
]);

const directDispatcher = new Agent({ connect: { timeout: 10_000 } });
const proxyDispatchers = new Map();
let httpLogger = null;

export function setHttpLogger(logger) {
  httpLogger = typeof logger === 'function' ? logger : null;
}

export const ANDROID_HEADERS = Object.freeze({
  'x-api-version': '3.1.8',
  'x-app-version': '10.61.0',
  'x-app-za': 'OS=Android&Release=12&Model=sdk_gphone64_arm64&VersionName=10.61.0&VersionCode=26107&Product=com.zhihu.android&Width=1440&Height=2952&DeviceType=AndroidPhone&Brand=google',
  'user-agent': 'com.zhihu.android/Futureve/10.61.0 Mozilla/5.0 (Linux; Android 12; sdk_gphone64_arm64 Build/SE1A.220630.001.A1; wv) AppleWebKit/537.36 Mobile Safari/537.36',
});

function dispatcherFor(config) {
  const proxy = config.proxy;
  if (!proxy) return directDispatcher;
  if (!proxyDispatchers.has(proxy)) proxyDispatchers.set(proxy, new ProxyAgent(proxy));
  return proxyDispatchers.get(proxy);
}

export function assertAllowedUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error(`拒绝请求非白名单地址: ${url.origin}`);
  }
  return url;
}

export class HttpError extends Error {
  constructor(message, { status, method, url, responseSnippet, zhihuCode } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.method = method;
    this.url = url;
    this.responseSnippet = responseSnippet;
    this.zhihuCode = zhihuCode;
  }
}

function safeResponseSnippet(text) {
  return text.replace(/[\r\n\t]+/g, ' ').slice(0, 800);
}

function safeJsonError(parsed) {
  const allowed = ['code', 'message', 'name', 'need_login'];
  const result = {};
  for (const key of allowed) {
    if (['string', 'number', 'boolean'].includes(typeof parsed?.[key])) result[key] = parsed[key];
  }
  return Object.keys(result).length > 0 ? JSON.stringify(result) : '[response body omitted]';
}

function buildHeaders(config, url, { headers = {}, bodyText = null, signed = false } = {}) {
  const result = {
    'user-agent': config.userAgent,
    accept: 'application/json, text/plain, */*',
    ...headers,
  };
  const cookies = cookieHeader(config.cookies || {});
  if (cookies) result.cookie = cookies;
  if (signed) {
    result['x-zse-93'] = config.zse93;
    result['x-zse-96'] = signRequest(url.toString(), config.cookies?.d_c0 || '', bodyText, config.zse93);
    result['x-requested-with'] = 'fetch';
  }
  return result;
}

export async function requestRaw(config, value, options = {}) {
  const url = assertAllowedUrl(value);
  const method = (options.method || 'GET').toUpperCase();
  const retries = method === 'GET' ? (options.retries ?? 2) : 0;
  let body = options.body;
  let bodyText = null;
  const headers = { ...(options.headers || {}) };

  if (body !== undefined && body !== null && !Buffer.isBuffer(body) && !(body instanceof Uint8Array) && typeof body !== 'string') {
    bodyText = JSON.stringify(body);
    body = bodyText;
    if (!headers['content-type']) headers['content-type'] = 'application/json';
  } else if (typeof body === 'string') {
    bodyText = body;
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const startedAt = Date.now();
    let response;
    try {
      response = await fetch(url, {
        method,
        headers: buildHeaders(config, url, { headers, bodyText, signed: options.signed }),
        body,
        dispatcher: options.dispatcher || dispatcherFor(config),
        redirect: 'manual',
        signal: AbortSignal.timeout(options.timeoutMs || 20_000),
      });
    } catch (error) {
      if (attempt < retries) {
        httpLogger?.({ method, url: url.toString(), attempt, status: null, durationMs: Date.now() - startedAt, retrying: true });
        await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
        continue;
      }
      throw new HttpError(`网络请求失败: ${error.message}`, { method, url: url.toString() });
    }

    httpLogger?.({ method, url: url.toString(), attempt, status: response.status, durationMs: Date.now() - startedAt, retrying: attempt < retries && (response.status === 429 || response.status >= 500) });

    if (response.ok) return response;
    const text = await response.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    if (attempt < retries && (response.status === 429 || response.status >= 500)) {
      await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
      continue;
    }
    throw new HttpError(
      `知乎请求失败: HTTP ${response.status}${parsed?.message ? ` ${parsed.message}` : ''}`,
      {
        status: response.status,
        method,
        url: url.toString(),
        responseSnippet: parsed ? safeJsonError(parsed) : safeResponseSnippet(text),
        zhihuCode: parsed?.code,
      },
    );
  }
  throw new Error('请求重试流程异常结束');
}

export async function requestJson(config, value, options = {}) {
  const response = await requestRaw(config, value, options);
  if (response.status === 204) return null;
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError('知乎返回了无法解析的 JSON', {
      status: response.status,
      method: options.method || 'GET',
      url: value,
      responseSnippet: safeResponseSnippet(text),
    });
  }
}
