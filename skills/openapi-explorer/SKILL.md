---
name: openapi-explorer
description: OpenAPI/Swagger 文档解析工具。当用户询问 API 文档、接口定义、需要根据 Swagger 生成代码时激活。支持按模块、路径精准提取接口信息，避免加载大文档导致上下文溢出。触发词："swagger"、"openapi"、"api 文档"、"接口定义"、"生成 API 调用代码"。
---

# OpenAPI Explorer

OpenAPI/Swagger 文档智能解析工具，按需精准提取接口信息，避免上下文溢出。

## 脚本路径

所有脚本位于 `{SKILL_DIR}/scripts/`，使用 Python 3 标准库（零依赖）。

## 工作流程

### 1. 获取文档概览

```bash
python3 {SKILL_DIR}/scripts/fetch-tags.py {swagger-url}
```

返回 title、version、tags 列表。向用户展示可用模块供选择。

### 2. 按需获取接口

```bash
# 按模块获取
python3 {SKILL_DIR}/scripts/fetch-by-tag.py {swagger-url} {tag-name}

# 获取接口详情
python3 {SKILL_DIR}/scripts/fetch-endpoint.py {swagger-url} "{path}" {method}

# 获取 schema 定义
python3 {SKILL_DIR}/scripts/fetch-schema.py {swagger-url} {SchemaName}
```

### 3. 解析 $ref 引用

接口定义中包含 `$ref` 时，提取并获取相关 schema：

```bash
echo '{...endpoint_json...}' > /tmp/endpoint.json
python3 {SKILL_DIR}/scripts/resolve-refs.py {swagger-url} < /tmp/endpoint.json
```

### 4. 生成代码

根据接口定义生成 TypeScript/Python/cURL 代码，参考 [references/code-examples.md](references/code-examples.md)。

## 核心约束

- **禁止读取整个文档** — 不要 `fetch(url).then(r => r.json())` 全量读取
- **优先使用脚本** — 脚本已实现分块读取和 JSON 路径过滤
- **渐进式加载** — 概览 → 接口列表 → 接口详情 → schema，按需逐步加载
- **限制输出** — 返回值过大时询问用户需要的具体字段

## 参考文档

- **故障排除** - 见 [references/troubleshooting.md](references/troubleshooting.md)
- **代码生成示例** - 见 [references/code-examples.md](references/code-examples.md)
- [OpenAPI 3.0 规范](https://spec.openapis.org/oas/v3.0.0)
