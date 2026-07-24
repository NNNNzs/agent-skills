import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { compileMarkdown } from './markdown.js';
import { inspectImageFile, uploadImage } from './image.js';

const IMAGE_PATTERN = /!\[([^\]]*)\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stripAngles(value) {
  return value.startsWith('<') && value.endsWith('>') ? value.slice(1, -1) : value;
}

function isRemoteImage(value) {
  return /^https?:\/\//i.test(value);
}

function resolveLocalImage(value, baseDirectory) {
  const source = decodeURIComponent(stripAngles(value));
  if (/^file:/i.test(source)) throw new Error('禁止使用 file: 图片 URL，请传入本地路径并由 CLI 上传');
  if (/^[a-z][a-z\d+.-]*:/i.test(source) || source.startsWith('//')) return null;
  return path.resolve(baseDirectory, source);
}

function addExplicitImages(markdown, images) {
  if (!images?.length) return markdown;
  const suffix = images.map((filePath) => {
    const resolvedPath = path.resolve(filePath);
    const alt = path.basename(filePath).replaceAll('[', '').replaceAll(']', '');
    return `![${alt}](<${encodeURI(resolvedPath)}>)`;
  }).join('\n\n');
  return `${markdown.trimEnd()}\n\n${suffix}\n`;
}

function analyzeImages(markdown, baseDirectory) {
  const byPath = new Map();
  const occurrences = [];
  for (const match of markdown.matchAll(IMAGE_PATTERN)) {
    const rawTarget = match[2];
    const target = stripAngles(rawTarget);
    if (isRemoteImage(target)) continue;
    const localPath = resolveLocalImage(rawTarget, baseDirectory);
    if (!localPath) continue;
    if (!fs.existsSync(localPath)) throw new Error(`本地图片不存在: ${localPath}`);
    if (!byPath.has(localPath)) byPath.set(localPath, inspectImageFile(localPath));
    occurrences.push({ full: match[0], alt: match[1], rawTarget, path: localPath });
  }
  return { images: [...byPath.values()], occurrences };
}

function replaceOccurrences(markdown, occurrences, replacementFor) {
  let occurrenceIndex = 0;
  return markdown.replace(IMAGE_PATTERN, (full, alt, rawTarget) => {
    const occurrence = occurrences[occurrenceIndex];
    if (!occurrence || occurrence.full !== full || occurrence.rawTarget !== rawTarget) return full;
    occurrenceIndex += 1;
    return replacementFor(occurrence, alt);
  });
}

export function prepareContent({ input, images = [] }) {
  if (!input) throw new Error('缺少 --input <markdown|->');
  const baseDirectory = input === '-' ? process.cwd() : path.dirname(path.resolve(input));
  const source = input === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(path.resolve(input), 'utf8');
  const markdown = addExplicitImages(source, images);
  const analysis = analyzeImages(markdown, baseDirectory);
  const imageByPath = new Map(analysis.images.map((image) => [image.path, image]));
  const previewMarkdown = replaceOccurrences(markdown, analysis.occurrences, (occurrence, alt) => {
    const image = imageByPath.get(occurrence.path);
    return `![${alt}](https://pending.invalid/${image.sha256} "pending-local-image")`;
  });
  const compiled = compileMarkdown(previewMarkdown);
  return {
    sourcePath: input === '-' ? '-' : path.resolve(input),
    markdown,
    markdownSha256: sha256(markdown),
    images: analysis.images,
    occurrences: analysis.occurrences,
    previewHtml: compiled.html,
    stats: compiled.stats,
    warnings: compiled.warnings,
    summary: markdown.replace(/\s+/g, ' ').trim().slice(0, 280),
  };
}

export async function uploadAndCompileContent(config, prepared, dependencies = {}) {
  const upload = dependencies.upload || uploadImage;
  const uploads = new Map();
  for (const image of prepared.images) uploads.set(image.path, await upload(config, image.path));
  const markdown = replaceOccurrences(prepared.markdown, prepared.occurrences, (occurrence) => uploads.get(occurrence.path).markdown);
  if (/\bfile:/i.test(markdown)) throw new Error('发布内容中仍包含 file: URL');
  const compiled = compileMarkdown(markdown);
  if (/\bfile:/i.test(compiled.html)) throw new Error('编译后的 HTML 中包含 file: URL');
  return { markdown, compiled, uploads: [...uploads.values()] };
}

export function contentTokenFields(prepared) {
  return {
    markdownSha256: prepared.markdownSha256,
    images: prepared.images.map((image) => ({
      path: image.path,
      sha256: image.sha256,
      size: image.size,
      width: image.width,
      height: image.height,
      mimeType: image.mimeType,
    })),
  };
}
