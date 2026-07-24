import test from 'node:test';
import assert from 'node:assert/strict';
import { compileMarkdown } from '../scripts/lib/markdown.js';

test('normalizes heading levels and renders supported blocks', () => {
  const { html } = compileMarkdown(`# 一级\n\n### 二级\n\n###### 低级\n\n- 项目\n\n\`\`\`js\nalert('<x>')\n\`\`\``);
  assert.match(html, /<h2>一级<\/h2>/);
  assert.match(html, /<h3>二级<\/h3>/);
  assert.match(html, /<p><strong>低级<\/strong><\/p>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<pre lang="js">alert\('&lt;x&gt;'\)\n<\/pre>/);
});

test('renders inline and block equations as Zhihu equation images', () => {
  const { html } = compileMarkdown('行内 $1/2$\n\n$$\nE=mc^2\n$$');
  assert.match(html, /eeimg="1"[^>]+tex=1%2F2[^>]+alt="1\/2"/);
  assert.match(html, /eeimg="2"[^>]+tex=E%3Dmc%5E2[^>]+alt="E=mc\^2"/);
});

test('renders tables, escapes raw HTML, and rejects unsafe URLs', () => {
  const { html, warnings } = compileMarkdown('| A | B |\n|---|---|\n| <x> | [bad](javascript:alert(1)) |');
  assert.match(html, /data-draft-type="table"/);
  assert.match(html, /&lt;x&gt;/);
  assert.doesNotMatch(html, /javascript:/);
  assert.doesNotMatch(html, /href="#"/);
  assert.ok(warnings.length >= 1);
});

test('renders uploaded Zhihu image metadata', () => {
  const { html } = compileMarkdown('![图](https://picx.zhimg.com/v2-x.png "zhimg:w=1280;h=720;wm=none")');
  assert.match(html, /data-rawwidth="1280"/);
  assert.match(html, /data-rawheight="720"/);
  assert.match(html, /data-watermark="none"/);
});
