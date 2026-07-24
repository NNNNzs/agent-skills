import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { contentTokenFields, prepareContent, uploadAndCompileContent } from '../scripts/lib/content.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XvZ8WQAAAABJRU5ErkJggg==', 'base64');

test('content preview validates local images and binds Markdown and image SHA-256', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zhihu-content-'));
  try {
    const imagePath = path.join(directory, '附加 图.png');
    const markdownPath = path.join(directory, 'post.md');
    fs.writeFileSync(imagePath, png);
    fs.writeFileSync(markdownPath, '# 标题\n\n![图](<附加%20图.png>)\n');
    const prepared = prepareContent({ input: markdownPath, images: [imagePath] });
    const fields = contentTokenFields(prepared);
    assert.match(fields.markdownSha256, /^[a-f0-9]{64}$/);
    assert.equal(fields.images.length, 1);
    assert.match(fields.images[0].sha256, /^[a-f0-9]{64}$/);
    assert.doesNotMatch(prepared.previewHtml, /file:/);

    const final = await uploadAndCompileContent({}, prepared, {
      upload: async (_config, filePath) => ({ imageId: '1', url: 'https://pic.zhimg.com/a.png', markdown: `![${path.basename(filePath)}](https://pic.zhimg.com/a.png "zhimg:w=1;h=1;wm=none")` }),
    });
    assert.match(final.compiled.html, /https:\/\/pic\.zhimg\.com\/a\.png/);
    assert.doesNotMatch(final.compiled.html, /pending\.invalid|file:/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('content preview rejects missing images and file URLs', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zhihu-content-fail-'));
  try {
    const missing = path.join(directory, 'missing.md');
    fs.writeFileSync(missing, '![x](none.png)');
    assert.throws(() => prepareContent({ input: missing }), /不存在/);
    const fileUrl = path.join(directory, 'file.md');
    fs.writeFileSync(fileUrl, '![x](file:///tmp/a.png)');
    assert.throws(() => prepareContent({ input: fileUrl }), /file:/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
