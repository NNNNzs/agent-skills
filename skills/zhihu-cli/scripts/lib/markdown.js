/*
 * Behavior derived from zly2006/zhihu-plus-plus ZhihuMarkdownCompiler.
 * Copyright (C) 2024-2026 zly2006 and contributors.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import fs from 'node:fs';
import MarkdownIt from 'markdown-it';

function escapeAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function safeUrl(value, kind, warnings) {
  try {
    const url = new URL(value);
    const allowed = kind === 'image'
      ? new Set(['http:', 'https:'])
      : new Set(['http:', 'https:', 'mailto:']);
    if (allowed.has(url.protocol)) return value;
  } catch {
    // Relative and local paths are intentionally rejected for publishable HTML.
  }
  warnings.push(`已移除不安全或未上传的${kind === 'image' ? '图片' : '链接'}地址: ${String(value).slice(0, 120)}`);
  return '';
}

function parseZhimgMeta(title = '') {
  const trimmed = title.trim();
  if (!trimmed.startsWith('zhimg:')) return null;
  const metadata = {};
  for (const segment of trimmed.slice(6).split(';')) {
    const [rawKey, ...rawValue] = segment.split('=');
    const key = rawKey?.trim();
    const value = rawValue.join('=').trim();
    if (!key || !value) continue;
    if (key === 'w' && /^\d+$/.test(value)) metadata.rawWidth = Number(value);
    if (key === 'h' && /^\d+$/.test(value)) metadata.rawHeight = Number(value);
    if (key === 'wm') metadata.watermark = value === '1' ? 'original' : value === '0' ? 'none' : value;
    if (key === 'wmsrc') metadata.watermarkSrc = value;
  }
  return metadata;
}

function mathPlugin(md) {
  md.inline.ruler.after('escape', 'zhihu_inline_math', (state, silent) => {
    if (state.src[state.pos] !== '$' || state.src[state.pos + 1] === '$') return false;
    let end = state.pos + 1;
    while ((end = state.src.indexOf('$', end)) !== -1) {
      if (state.src[end - 1] !== '\\' && end > state.pos + 1) break;
      end += 1;
    }
    if (end === -1) return false;
    if (!silent) {
      const token = state.push('zhihu_inline_math', 'math', 0);
      token.content = state.src.slice(state.pos + 1, end);
    }
    state.pos = end + 1;
    return true;
  });

  md.block.ruler.before('fence', 'zhihu_block_math', (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine] + state.tShift[startLine];
    const maximum = state.eMarks[startLine];
    if (state.src.slice(start, maximum).trim() !== '$$') return false;
    let nextLine = startLine + 1;
    for (; nextLine < endLine; nextLine += 1) {
      const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
      const lineEnd = state.eMarks[nextLine];
      if (state.src.slice(lineStart, lineEnd).trim() === '$$') break;
    }
    if (nextLine >= endLine) return false;
    if (silent) return true;
    const token = state.push('zhihu_block_math', 'math', 0);
    token.block = true;
    token.map = [startLine, nextLine + 1];
    token.content = state.getLines(startLine + 1, nextLine, state.tShift[startLine], true).trim();
    state.line = nextLine + 1;
    return true;
  });
}

function markPlugin(md) {
  md.inline.ruler.before('emphasis', 'zhihu_mark', (state, silent) => {
    const start = state.pos;
    if (state.src.slice(start, start + 2) !== '==') return false;
    const end = state.src.indexOf('==', start + 2);
    if (end <= start + 2) return false;
    if (!silent) {
      const open = state.push('mark_open', 'mark', 1);
      open.markup = '==';
      const text = state.push('text', '', 0);
      text.content = state.src.slice(start + 2, end);
      const close = state.push('mark_close', 'mark', -1);
      close.markup = '==';
    }
    state.pos = end + 2;
    return true;
  });
}

function createRenderer(warnings) {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false, breaks: false });
  let unsafeLinkDepth = 0;
  // Parse every explicit Markdown destination, then enforce our narrower
  // protocol allowlist in the renderer so rejected URLs produce a warning
  // instead of surviving as misleading literal Markdown.
  md.validateLink = () => true;
  md.use(mathPlugin);
  md.use(markPlugin);

  md.core.ruler.after('block', 'zhihu_heading_levels', (state) => {
    const levels = [...new Set(state.tokens
      .filter((token) => token.type === 'heading_open')
      .map((token) => Number(token.tag.slice(1))))].sort((a, b) => a - b);
    for (const token of state.tokens) {
      if (token.type !== 'heading_open' && token.type !== 'heading_close') continue;
      const level = Number(token.tag.slice(1));
      const normalized = level === levels[0] ? 'h2' : level === levels[1] ? 'h3' : 'strong-paragraph';
      token.meta = { ...(token.meta || {}), zhihuTag: normalized };
    }
  });

  md.renderer.rules.heading_open = (tokens, index) => {
    const tag = tokens[index].meta.zhihuTag;
    return tag === 'strong-paragraph' ? '<p><strong>' : `<${tag}>`;
  };
  md.renderer.rules.heading_close = (tokens, index) => {
    const tag = tokens[index].meta.zhihuTag;
    return tag === 'strong-paragraph' ? '</strong></p>' : `</${tag}>`;
  };
  md.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index];
    const language = token.info.trim().split(/\s+/)[0];
    const attribute = language ? ` lang="${escapeAttribute(language)}"` : '';
    return `<pre${attribute}>${md.utils.escapeHtml(token.content)}</pre>`;
  };
  md.renderer.rules.code_block = (tokens, index) => `<pre>${md.utils.escapeHtml(tokens[index].content)}</pre>`;
  md.renderer.rules.hr = () => '<hr>';
  md.renderer.rules.table_open = () => '<table data-draft-node="block" data-draft-type="table" data-size="normal">';
  md.renderer.rules.thead_open = () => '<tbody>';
  md.renderer.rules.thead_close = () => '';
  md.renderer.rules.tbody_open = () => '';
  md.renderer.rules.tbody_close = () => '</tbody>';
  md.renderer.rules.zhihu_inline_math = (tokens, index) => {
    const tex = tokens[index].content.trim();
    return `<img eeimg="1" src="//www.zhihu.com/equation?tex=${encodeURIComponent(tex)}" alt="${escapeAttribute(tex.replace(/[\r\n]+/g, ' '))}" />`;
  };
  md.renderer.rules.zhihu_block_math = (tokens, index) => {
    const tex = tokens[index].content.trim();
    return `<p><img eeimg="2" src="//www.zhihu.com/equation?tex=${encodeURIComponent(tex)}" alt="${escapeAttribute(tex.replace(/[\r\n]+/g, ' '))}" /></p>`;
  };
  md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const hrefIndex = tokens[index].attrIndex('href');
    const href = hrefIndex >= 0 ? tokens[index].attrs[hrefIndex][1] : '';
    const safe = safeUrl(href, 'link', warnings);
    if (!safe) {
      unsafeLinkDepth += 1;
      return '<span>';
    }
    if (hrefIndex >= 0) tokens[index].attrs[hrefIndex][1] = safe;
    return self.renderToken(tokens, index, options);
  };
  md.renderer.rules.link_close = () => {
    if (unsafeLinkDepth > 0) {
      unsafeLinkDepth -= 1;
      return '</span>';
    }
    return '</a>';
  };
  md.renderer.rules.image = (tokens, index) => {
    const token = tokens[index];
    const source = safeUrl(token.attrGet('src') || '', 'image', warnings);
    if (!source) return '';
    const alt = token.content || '';
    const title = token.attrGet('title') || '';
    const meta = parseZhimgMeta(title);
    let html = `<img src="${escapeAttribute(source)}"`;
    if (alt) html += ` alt="${escapeAttribute(alt)}"`;
    if (meta?.rawWidth) html += ` data-rawwidth="${meta.rawWidth}" width="${meta.rawWidth}"`;
    if (meta?.rawHeight) html += ` data-rawheight="${meta.rawHeight}"`;
    if (meta?.watermark) html += ` data-watermark="${escapeAttribute(meta.watermark)}"`;
    if (meta?.watermarkSrc) html += ` data-watermark-src="${escapeAttribute(meta.watermarkSrc)}"`;
    if (!meta && title) html += ` data-caption="${escapeAttribute(title)}"`;
    return `${html} />`;
  };
  return md;
}

export function compileMarkdown(markdown) {
  const warnings = [];
  const renderer = createRenderer(warnings);
  const html = renderer.render(markdown).trimEnd();
  return {
    html,
    warnings,
    stats: {
      markdownCharacters: [...markdown].length,
      htmlCharacters: [...html].length,
    },
  };
}

export function readMarkdownInput(inputPath) {
  if (inputPath === '-') return fs.readFileSync(0, 'utf8');
  return fs.readFileSync(inputPath, 'utf8');
}
