# OpenAPI Explorer

OpenAPI/Swagger 文档智能解析工具，专为 AI 代理设计。

## 特性

- 🎯 **精准提取**：按模块、路径、schema 分块读取
- 🚀 **避免溢出**：不加载整个大文档，节省上下文
- 🔍 **智能引用**：自动解析 $ref 引用的数据结构
- 📦 **批量操作**：支持批量获取相关接口和 schema
- 🤖 **AI 优化**：专为 AI 代理设计，提供标准工作流程

## 何时使用

- ✅ 根据 Swagger 文档生成 API 调用代码
- ✅ 查询特定接口的定义、参数、返回值
- ✅ 获取请求/响应的数据结构
- ✅ 了解接口的认证方式和限制
- ✅ 查找某个模块包含的所有接口

## 安装

### 方法 1：使用 npx（推荐）

```bash
npx skills add NNNNzs/agent-skills --skill openapi-explorer
```

### 方法 2：手动安装

```bash
# 克隆仓库
git clone https://github.com/NNNNzs/agent-skills.git

# 复制技能到 Claude Code 技能目录
cp -r agent-skills/skills/openapi-explorer ~/.claude/skills/
```

## 使用方式

### 通过 AI 代理使用

这个技能专为 AI 代理设计，你可以直接与 AI 对话：

- "帮我看看这个 API 文档：https://api.example.com/swagger.json"
- "用户管理模块有哪些接口？"
- "生成获取用户详情的 TypeScript 代码"
- "这个接口需要什么参数？"

AI 代理会自动使用此技能进行解析。

### 直接使用脚本

如果你想直接使用脚本（无需安装依赖）：

```bash
python3 scripts/fetch-tags.py https://api.example.com/swagger.json
python3 scripts/fetch-by-tag.py https://api.example.com/swagger.json user
python3 scripts/fetch-endpoint.py https://api.example.com/swagger.json "/api/users/{id}"
python3 scripts/fetch-schema.py https://api.example.com/swagger.json User
```

## 工作原理

OpenAPI 文档通常很大（可能数 MB），此工具采用以下策略：

1. **分块读取**：使用 jq 的路径过滤，只读取需要的部分
2. **路径索引**：通过 `paths.keys()` 快速定位接口
3. **标签分组**：按 tag（模块）组织接口
4. **引用解析**：解析 `$ref` 引用的 schema 定义

## 依赖

- Python 3.6+（通常已预装）
- 无需额外安装依赖，使用 Python 标准库

## 限制

- 文档必须符合 OpenAPI 3.x 或 Swagger 2.0 规范
- URL 必须可公开访问或已配置认证
- 超大文档（>50MB）可能需要特殊处理

## 参考资料

- [OpenAPI 3.0 规范](https://spec.openapis.org/oas/v3.0.0)
- [Agent Skills 文档](https://github.com/NNNNzs/agent-skills)
