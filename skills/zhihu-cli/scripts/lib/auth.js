import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { assertAllowedUrl } from './http.js';
import { getConfigDirectory, getQrCodePath, saveCookies } from './config.js';

const BASE = 'https://www.zhihu.com';
const QR_API = `${BASE}/api/v3/account/api/login/qrcode`;
const REQUIRED = ['z_c0', '_xsrf', 'd_c0'];

export class LoginError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LoginError';
    this.errorType = 'authentication_error';
  }
}

function cookieParts(value) {
  if (!value) return [];
  return value.split(/,(?=\s*[^;,=\s]+=[^;,]*)/g);
}

export function absorbSetCookies(headers, cookies) {
  const rawValues = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : [headers.get?.('set-cookie')];
  const values = (rawValues || []).flatMap(cookieParts);
  for (const value of values || []) {
    const pair = value.split(';', 1)[0];
    const separator = pair.indexOf('=');
    if (separator <= 0) continue;
    cookies[pair.slice(0, separator).trim()] = pair.slice(separator + 1).trim();
  }
}

function cookieHeader(cookies) {
  return Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join('; ');
}

function qrTerminalText(text) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const rows = [];
  for (let y = -2; y < size + 2; y += 2) {
    let row = '';
    for (let x = -2; x < size + 2; x += 1) {
      const top = y >= 0 && y < size && x >= 0 && x < size ? qr.modules.get(x, y) : false;
      const bottom = y + 1 >= 0 && y + 1 < size && x >= 0 && x < size ? qr.modules.get(x, y + 1) : false;
      row += top && bottom ? '█' : top ? '▀' : bottom ? '▄' : ' ';
    }
    rows.push(row);
  }
  return rows.join('\n');
}

async function sessionRequest(cookies, urlValue, options = {}, request = fetch) {
  const url = assertAllowedUrl(urlValue);
  const headers = {
    accept: options.accept || 'application/json, text/plain, */*',
    'user-agent': options.userAgent,
    referer: options.referer || `${BASE}/signin`,
    origin: BASE,
    'x-requested-with': 'fetch',
    ...options.headers,
  };
  const cookie = cookieHeader(cookies);
  if (cookie) headers.cookie = cookie;
  if (cookies._xsrf) headers['x-xsrftoken'] = cookies._xsrf;
  let body;
  if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    headers['content-type'] = 'application/json';
  }
  const response = await request(url, {
    method: options.method || 'GET', headers, body, redirect: 'manual',
    signal: AbortSignal.timeout(options.timeoutMs || 15_000),
  });
  absorbSetCookies(response.headers, cookies);
  return response;
}

async function responseJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

function applyBodyCookies(info, cookies) {
  const value = info?.cookie ?? info?.cookies;
  if (typeof value === 'string') {
    for (const segment of value.split(';')) {
      const separator = segment.indexOf('=');
      if (separator > 0) cookies[segment.slice(0, separator).trim()] = segment.slice(separator + 1).trim();
    }
  }
  if (info?.z_c0) cookies.z_c0 = String(info.z_c0);
}

function loginComplete(info, cookies) {
  if (cookies.z_c0) return true;
  if (info?.access_token || (info?.user_id !== undefined && info?.user_id !== null) || info?.success === true || info?.logged_in === true) return true;
  return ['CONFIRMED', 'LOGIN_SUCCESS', 'SUCCESS', 'OK', 'LOGGED_IN'].includes(String(info?.login_status || '').toUpperCase());
}

export async function qrLogin(config, dependencies = {}) {
  const request = dependencies.request || fetch;
  const sleep = dependencies.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const now = dependencies.now || Date.now;
  const emit = dependencies.progress || (() => {});
  const showTerminalQr = dependencies.showTerminalQr || (() => {});
  const cookies = {};
  const qrPath = dependencies.qrPath || getQrCodePath();
  const timeoutMs = dependencies.timeoutMs || 120_000;
  const signal = dependencies.signal;
  const userAgent = config.userAgent;
  let scanned = false;

  fs.mkdirSync(path.dirname(qrPath), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(qrPath), 0o700);

  try {
    const signin = await sessionRequest(cookies, `${BASE}/signin`, { userAgent }, request);
    if (signin.status >= 400) throw new LoginError(`无法初始化知乎登录页: HTTP ${signin.status}`);
    await sessionRequest(cookies, `${BASE}/udid`, { method: 'POST', body: {}, userAgent, timeoutMs: 10_000 }, request).catch(() => null);
    await sessionRequest(cookies, `${BASE}/api/v3/oauth/captcha/v2?type=captcha_sign_in`, { userAgent, timeoutMs: 10_000 }, request).catch(() => null);

    const qrResponse = await sessionRequest(cookies, QR_API, { method: 'POST', body: {}, userAgent }, request);
    if (!qrResponse.ok) throw new LoginError(`二维码申请失败: HTTP ${qrResponse.status}`);
    const qrData = await responseJson(qrResponse);
    const token = qrData.token ?? qrData.qrcode_token;
    const link = qrData.link;
    if (!token || !link) throw new LoginError('二维码接口未返回 token 或 link');

    await QRCode.toFile(qrPath, link, { width: 360, margin: 2 });
    fs.chmodSync(qrPath, 0o600);
    showTerminalQr(qrTerminalText(link));
    emit('qr_ready', { imagePath: qrPath, expiresInSeconds: Math.floor(timeoutMs / 1000) });

    const deadline = now() + timeoutMs;
    const scanUrl = `${QR_API}/${encodeURIComponent(token)}/scan_info`;
    while (now() < deadline) {
      if (signal?.aborted) throw new LoginError('二维码登录已取消');
      await sleep(scanned ? 500 : 1_000);
      if (signal?.aborted) throw new LoginError('二维码登录已取消');
      const response = await sessionRequest(cookies, scanUrl, {
        userAgent,
        accept: '*/*',
        referer: `${BASE}/signin?next=%2F`,
        headers: {
          'sec-fetch-dest': 'empty', 'sec-fetch-mode': 'cors', 'sec-fetch-site': 'same-origin',
          'x-zse-93': config.zse93,
        },
        timeoutMs: 10_000,
      }, request);
      const info = await responseJson(response);
      applyBodyCookies(info, cookies);
      if (response.status === 401 || response.status === 403) throw new LoginError(`二维码轮询被拒绝: HTTP ${response.status}`);
      if (!response.ok) continue;
      if (!scanned && Number(info.status) === 1) {
        scanned = true;
        emit('scanned', { awaitingConfirmation: true });
      }
      if (loginComplete(info, cookies)) break;
    }

    if (!cookies.z_c0) {
      emit('expired', { imagePath: qrPath });
      throw new LoginError('二维码登录超时或未完成确认');
    }
    await sessionRequest(cookies, `${BASE}/`, { userAgent }, request).catch(() => null);
    await sessionRequest(cookies, `${BASE}/api/v4/me`, { userAgent }, request).catch(() => null);
    if (!REQUIRED.every((name) => cookies[name])) throw new LoginError(`扫码完成但缺少必要 Cookie: ${REQUIRED.filter((name) => !cookies[name]).join(', ')}`);
    const meResponse = await sessionRequest(cookies, `${BASE}/api/v4/me`, { userAgent }, request);
    if (!meResponse.ok) throw new LoginError(`登录态校验失败: HTTP ${meResponse.status}`);
    const account = await responseJson(meResponse);
    saveCookies(cookies, { replace: true });
    emit('confirmed', { account: { id: account.id ?? null, name: account.name ?? '' } });
    return { authenticated: true, account: { id: account.id ?? null, name: account.name ?? '', urlToken: account.url_token ?? null }, configDirectory: getConfigDirectory() };
  } finally {
    if (fs.existsSync(qrPath)) fs.unlinkSync(qrPath);
  }
}
