/*
 * Derived from zly2006/zhihu-plus-plus ZhihuImageUpload.
 * Copyright (C) 2024-2026 zly2006 and contributors.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { requestJson, requestRaw } from './http.js';

const OSS_USER_AGENT = 'aliyun-sdk-js/6.8.0 Chrome 99.0.4844.84 on Windows 10 64-bit';

function readUInt24LE(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

export function decodeImageSize(bytes) {
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes.toString('ascii', 1, 4) === 'PNG') {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length >= 10 && bytes.toString('ascii', 0, 3) === 'GIF') {
    return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  }
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const type = bytes.toString('ascii', offset, offset + 4);
      const length = bytes.readUInt32LE(offset + 4);
      const data = offset + 8;
      if (data + length > bytes.length) break;
      if (type === 'VP8X' && length >= 10) {
        return { width: readUInt24LE(bytes, data + 4) + 1, height: readUInt24LE(bytes, data + 7) + 1 };
      }
      if (type === 'VP8L' && length >= 5 && bytes[data] === 0x2f) {
        const bits = bytes.readUInt32LE(data + 1);
        return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
      }
      if (type === 'VP8 ' && length >= 10 && bytes[data + 3] === 0x9d && bytes[data + 4] === 0x01 && bytes[data + 5] === 0x2a) {
        return { width: bytes.readUInt16LE(data + 6) & 0x3fff, height: bytes.readUInt16LE(data + 8) & 0x3fff };
      }
      offset = data + length + (length & 1);
    }
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 3 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      while (bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset];
      offset += 1;
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 1 >= bytes.length) break;
      const length = bytes.readUInt16BE(offset);
      const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isStartOfFrame && offset + 6 < bytes.length) {
        return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
      }
      if (length < 2 || offset + length > bytes.length) break;
      offset += length;
    }
  }
  return { width: 0, height: 0 };
}

export function detectImageType(bytes, fileName = '') {
  const extension = path.extname(fileName).toLowerCase();
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes.toString('ascii', 1, 4) === 'PNG') return { mimeType: 'image/png', extension: 'png' };
  if (bytes.length >= 3 && bytes.toString('ascii', 0, 3) === 'GIF') return { mimeType: 'image/gif', extension: 'gif' };
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return { mimeType: 'image/webp', extension: 'webp' };
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return { mimeType: 'image/jpeg', extension: 'jpg' };
  const fallback = {
    '.png': { mimeType: 'image/png', extension: 'png' },
    '.gif': { mimeType: 'image/gif', extension: 'gif' },
    '.webp': { mimeType: 'image/webp', extension: 'webp' },
    '.jpg': { mimeType: 'image/jpeg', extension: 'jpg' },
    '.jpeg': { mimeType: 'image/jpeg', extension: 'jpg' },
  }[extension];
  if (fallback) return fallback;
  throw new Error('无法识别图片格式，仅支持 PNG、JPEG、GIF 和 WebP');
}

export function hmacSha1Base64(secret, value) {
  return crypto.createHmac('sha1', secret).update(value).digest('base64');
}

export function buildOssSignatureString({ method, contentType = '', date, securityToken, imageHash, subResource = '' }) {
  const resource = `/zhihu-pics/v2-${imageHash}${subResource ? `?${subResource}` : ''}`;
  return `${method}\n\n${contentType}\n${date}\n`
    + `x-oss-date:${date}\n`
    + `x-oss-security-token:${securityToken}\n`
    + `x-oss-user-agent:${OSS_USER_AGENT}\n`
    + resource;
}

function ossHeaders(token, signature, date) {
  return {
    'x-oss-date': date,
    'x-oss-user-agent': OSS_USER_AGENT,
    'x-oss-security-token': token.accessToken,
    authorization: `OSS ${token.accessId}:${signature}`,
  };
}

function normalizeToken(raw) {
  return {
    accessId: raw.access_id ?? raw.accessId,
    accessKey: raw.access_key ?? raw.accessKey,
    accessToken: raw.access_token ?? raw.accessToken,
  };
}

export function inspectImageFile(filePath) {
  const resolvedPath = path.resolve(filePath);
  const bytes = fs.readFileSync(resolvedPath);
  if (bytes.length === 0) throw new Error(`图片文件为空: ${resolvedPath}`);
  const { mimeType, extension } = detectImageType(bytes, resolvedPath);
  const { width, height } = decodeImageSize(bytes);
  if (width <= 0 || height <= 0) throw new Error(`无法读取图片尺寸: ${resolvedPath}`);
  return {
    path: resolvedPath,
    fileName: path.basename(resolvedPath),
    size: bytes.length,
    width,
    height,
    mimeType,
    extension,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
}

async function uploadSingle(config, imageHash, bytes, mimeType, token, requestRawFn) {
  const date = new Date().toUTCString();
  const value = buildOssSignatureString({
    method: 'PUT', contentType: mimeType, date, securityToken: token.accessToken, imageHash,
  });
  const signature = hmacSha1Base64(token.accessKey, value);
  await requestRawFn(config, `https://zhihu-pics-upload.zhimg.com/v2-${imageHash}`, {
    method: 'PUT',
    retries: 0,
    headers: { 'content-type': mimeType, ...ossHeaders(token, signature, date) },
    body: bytes,
  });
}

async function initiateMultipart(config, imageHash, token, requestRawFn) {
  const date = new Date().toUTCString();
  const subResource = 'uploads';
  const value = buildOssSignatureString({ method: 'POST', date, securityToken: token.accessToken, imageHash, subResource });
  const signature = hmacSha1Base64(token.accessKey, value);
  const response = await requestRawFn(config, `https://zhihu-pics-upload.zhimg.com/v2-${imageHash}?uploads`, {
    method: 'POST', retries: 0, headers: ossHeaders(token, signature, date),
  });
  const xml = await response.text();
  const uploadId = /<UploadId>([^<]+)<\/UploadId>/.exec(xml)?.[1];
  if (!uploadId) throw new Error('无法解析 OSS UploadId');
  return uploadId;
}

async function uploadGif(config, imageHash, bytes, token, requestRawFn) {
  const uploadId = await initiateMultipart(config, imageHash, token, requestRawFn);
  const parts = [];
  const partSize = 1024 * 1024;
  for (let offset = 0, partNumber = 1; offset < bytes.length; offset += partSize, partNumber += 1) {
    const subResource = `partNumber=${partNumber}&uploadId=${uploadId}`;
    const date = new Date().toUTCString();
    const value = buildOssSignatureString({
      method: 'PUT', contentType: 'application/octet-stream', date, securityToken: token.accessToken, imageHash, subResource,
    });
    const signature = hmacSha1Base64(token.accessKey, value);
    const response = await requestRawFn(config, `https://zhihu-pics-upload.zhimg.com/v2-${imageHash}?${subResource}`, {
      method: 'PUT',
      retries: 0,
      headers: { 'content-type': 'application/octet-stream', ...ossHeaders(token, signature, date) },
      body: bytes.subarray(offset, Math.min(bytes.length, offset + partSize)),
    });
    const etag = response.headers.get('etag');
    if (!etag) throw new Error(`OSS 分片 ${partNumber} 未返回 ETag`);
    parts.push({ partNumber, etag });
  }

  const subResource = `uploadId=${uploadId}`;
  const date = new Date().toUTCString();
  const value = buildOssSignatureString({
    method: 'POST', contentType: 'application/xml', date, securityToken: token.accessToken, imageHash, subResource,
  });
  const signature = hmacSha1Base64(token.accessKey, value);
  const xml = `<CompleteMultipartUpload>${parts.map(({ partNumber, etag }) => `<Part><PartNumber>${partNumber}</PartNumber><ETag>${etag}</ETag></Part>`).join('')}</CompleteMultipartUpload>`;
  await requestRawFn(config, `https://zhihu-pics-upload.zhimg.com/v2-${imageHash}?${subResource}`, {
    method: 'POST',
    retries: 0,
    headers: { 'content-type': 'application/xml', ...ossHeaders(token, signature, date) },
    body: xml,
  });
}

export async function uploadImage(config, filePath, dependencies = {}) {
  const requestJsonFn = dependencies.requestJson || requestJson;
  const requestRawFn = dependencies.requestRaw || requestRaw;
  const sleep = dependencies.sleep || ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const bytes = fs.readFileSync(filePath);
  if (bytes.length === 0) throw new Error('图片文件为空');
  const { mimeType } = detectImageType(bytes, filePath);
  const { width, height } = decodeImageSize(bytes);
  const imageHash = crypto.createHash('md5').update(bytes).digest('hex');

  const apply = await requestJsonFn(config, 'https://api.zhihu.com/images', {
    method: 'POST',
    retries: 0,
    body: { image_hash: imageHash, source: 'article' },
  });
  const uploadFile = apply.upload_file ?? apply.uploadFile;
  if (!uploadFile) throw new Error('知乎图片申请响应缺少 upload_file');
  const imageId = String(uploadFile.image_id ?? uploadFile.imageId);
  const state = uploadFile.state;

  if (state === 2) {
    const rawToken = apply.upload_token ?? apply.uploadToken;
    if (!rawToken) throw new Error('知乎要求上传图片但没有返回 upload_token');
    const token = normalizeToken(rawToken);
    if (!token.accessId || !token.accessKey || !token.accessToken) throw new Error('知乎返回的 upload_token 字段不完整');
    if (mimeType === 'image/gif') await uploadGif(config, imageHash, bytes, token, requestRawFn);
    else await uploadSingle(config, imageHash, bytes, mimeType, token, requestRawFn);
    await requestRawFn(config, `https://api.zhihu.com/images/${imageId}/uploading_status`, {
      method: 'PUT',
      retries: 0,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ upload_result: 'success' }),
    });
  }

  let status;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    status = await requestJsonFn(config, `https://api.zhihu.com/images/${imageId}`, { retries: 2 });
    if (status.status === 'success') break;
    if (attempt < 9) await sleep(2_000);
  }
  if (status?.status !== 'success') throw new Error(`图片状态轮询超时: ${status?.status || 'unknown'}`);

  const source = status.src ?? status.original_src ?? status.originalSrc ?? status.watermark_src ?? status.watermarkSrc;
  if (!source) throw new Error('图片上传成功但响应缺少图片地址');
  const originalUrl = status.original_src ?? status.originalSrc ?? source;
  const watermarkUrl = status.watermark_src ?? status.watermarkSrc ?? null;
  const watermarkMode = status.watermark ?? 'none';
  const metadata = [`w=${width}`, `h=${height}`, `wm=${watermarkMode}`];
  if (watermarkUrl) metadata.push(`wmsrc=${watermarkUrl}`);

  return {
    imageId,
    url: source,
    originalUrl,
    watermarkUrl,
    watermarkMode,
    width,
    height,
    mimeType,
    reused: state !== 2,
    markdown: `![${path.basename(filePath)}](${source} "zhimg:${metadata.join(';')}")`,
  };
}
