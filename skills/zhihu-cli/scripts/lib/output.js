import { HttpError } from './http.js';
import Table from 'cli-table3';

let outputFormat = 'json';
let verboseEnabled = false;

export function configureOutput({ format = 'json', verbose = false } = {}) {
  if (!['json', 'table'].includes(format)) throw new Error('--format 仅支持 json 或 table');
  outputFormat = format;
  verboseEnabled = Boolean(verbose);
}

function compact(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}

function tableText(data) {
  if (Array.isArray(data)) {
    if (data.length === 0) return '（无数据）\n';
    const columns = [...new Set(data.flatMap((item) => item && typeof item === 'object' ? Object.keys(item) : ['value']))].slice(0, 8);
    const table = new Table({ head: columns });
    for (const item of data) table.push(columns.map((key) => compact(item && typeof item === 'object' ? item[key] : item)));
    return `${table.toString()}\n`;
  }
  if (data && typeof data === 'object') {
    const table = new Table();
    for (const [key, value] of Object.entries(data)) table.push({ [key]: compact(value) });
    return `${table.toString()}\n`;
  }
  return `${compact(data)}\n`;
}

export function success(data, { paging, warnings = [] } = {}) {
  if (outputFormat === 'table') {
    process.stdout.write(tableText(data));
    if (paging !== undefined) process.stdout.write(`分页: ${compact(paging)}\n`);
    for (const warning of warnings) process.stderr.write(`警告: ${warning}\n`);
    return;
  }
  const result = { ok: true, data };
  if (paging !== undefined) result.paging = paging;
  if (warnings.length > 0) result.warnings = warnings;
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

export function progress(event, data = {}) {
  if (outputFormat === 'table') {
    process.stderr.write(`[${event}] ${compact(data)}\n`);
    return;
  }
  process.stderr.write(`${JSON.stringify({ ok: true, event, data })}\n`);
}

export function verbose(details) {
  if (!verboseEnabled) return;
  let safeUrl = details.url;
  try {
    const parsed = new URL(details.url);
    const names = [...new Set(parsed.searchParams.keys())];
    safeUrl = `${parsed.origin}${parsed.pathname}${names.length ? `?${names.map((name) => `${encodeURIComponent(name)}=…`).join('&')}` : ''}`;
  } catch {
    safeUrl = '[invalid url]';
  }
  const safe = {
    method: details.method,
    url: safeUrl,
    status: details.status,
    attempt: details.attempt,
    durationMs: details.durationMs,
    retrying: details.retrying,
  };
  process.stderr.write(outputFormat === 'table' ? `[http] ${compact(safe)}\n` : `${JSON.stringify({ debug: 'http', ...safe })}\n`);
}

export function serializeError(error) {
  if (error instanceof HttpError) {
    return {
      ok: false,
      error: {
        type: 'http_error',
        message: error.message,
        status: error.status,
        method: error.method,
        url: error.url,
        zhihuCode: error.zhihuCode,
        response: error.responseSnippet,
      },
    };
  }

  return {
    ok: false,
    error: {
      type: error.errorType || (error.name === 'UsageError' ? 'usage_error' : 'error'),
      message: error.message || String(error),
      ...(error.zhihuCode === undefined ? {} : { zhihuCode: error.zhihuCode }),
    },
  };
}

export function fail(error) {
  if (outputFormat === 'table') {
    process.stderr.write(`错误: ${error.message || String(error)}\n`);
    process.exitCode = error.exitCode || 1;
    return;
  }
  process.stderr.write(`${JSON.stringify(serializeError(error), null, 2)}\n`);
  process.exitCode = error.exitCode || 1;
}
