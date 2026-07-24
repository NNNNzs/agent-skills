# Markdown 到知乎 HTML

## 支持范围

- 标题：正文中实际使用的最高两级分别映射为 `<h2>`、`<h3>`，更低层级映射为加粗段落。
- 段落、软换行、硬换行、粗体、斜体、删除线、行内代码、代码块、引用、有序与无序列表、链接、分隔线和 GFM 表格。
- 行内公式 `$...$` 与块公式 `$$...$$` 映射为 `www.zhihu.com/equation` 图片。
- 图片输出为知乎可接受的 `<img>`；上传脚本返回的 Markdown title 包含 `zhimg:` 元数据，可携带宽高和水印信息。

## 安全处理

- Markdown 中的原始 HTML默认禁用。
- 文本、属性、代码、URL 和图片说明均执行 HTML 转义。
- 链接只允许 `http:`、`https:`、`mailto:`；图片只允许 `http:`、`https:`。不安全协议会被移除并产生警告。
- 本地图片不会在编译时自动读取或上传，应先显式执行 `image upload`。

## 图片示例

```markdown
![架构图](https://picx.zhimg.com/v2-example.png "zhimg:w=1280;h=720;wm=none")
```
