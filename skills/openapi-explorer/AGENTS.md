# OpenAPI Explorer - AI 代理工作指南

本技能为 AI 代理提供 OpenAPI/Swagger 文档解析能力。

## 激活条件

当用户提到以下内容时激活此技能：
- "swagger"、"openapi"、"api 文档"
- "根据文档生成 API 调用"
- "查询接口定义"、"获取接口信息"
- "查看某个模块的接口"
- 提供了 swagger/openapi URL

## 核心原则

### 1. 避免上下文溢出
OpenAPI 文档可能很大（数 MB），不要一次性读取。必须使用分块策略。

### 2. 渐进式查询
- 第一步：获取概览（tags、title）
- 第二步：按需获取接口列表
- 第三步：获取具体接口详情
- 第四步：按需解析 $ref

### 3. 优先使用脚本
使用提供的 Node.js 脚本，它们已经实现了分块读取逻辑。

## 标准工作流程

### 场景 1：用户首次询问 Swagger 文档

```bash
# 步骤 1：获取文档概览（无需安装依赖）
python3 /mnt/skills/user/openapi-explorer/scripts/fetch-tags.py {swagger-url}

# 步骤 2：向用户展示可用的模块
# 根据返回的 tags 列表，向用户展示有哪些模块

# 步骤 3：等待用户选择模块或接口
```

### 场景 2：用户询问某个模块的所有接口

```bash
# 直接获取该模块的接口列表
python3 /mnt/skills/user/openapi-explorer/scripts/fetch-by-tag.py {swagger-url} {tag-name}

# 向用户展示接口列表，包含：路径、方法、简要描述
```

### 场景 3：用户询问具体接口

```bash
# 获取接口详情
python3 /mnt/skills/user/openapi-explorer/scripts/fetch-endpoint.py {swagger-url} "{path}" {method}

# 检查返回值中是否有 $ref
# 如果有，使用 resolve-refs 解析

echo '{endpoint_json}' | python3 /mnt/skills/user/openapi-explorer/scripts/resolve-refs.py {swagger-url}
```

### 场景 4：生成 API 调用代码

```bash
# 先获取接口定义
python3 /mnt/skills/user/openapi-explorer/scripts/fetch-endpoint.py {swagger-url} "{path}" {method} > /tmp/endpoint.json

# 解析 $ref
cat /tmp/endpoint.json | python3 /mnt/skills/user/openapi-explorer/scripts/resolve-refs.py {swagger-url} > /tmp/schemas.json

# 根据接口定义和 schemas 生成代码
```

## 输出格式

向用户展示接口信息时，按以下格式：

```markdown
## 接口：{summary}

**路径**: `{method} {path}`
**描述**: {description}
**标签**: {tags}

### 请求参数
{parameters table}

### 请求体
{request body schema}

### 响应
{responses table}

### 数据结构
{relevant schemas}
```

## 输出格式规范

### 向用户展示接口列表

```markdown
## {模块名} 模块的接口

| 路径 | 方法 | 描述 |
|------|------|------|
| /api/users | GET | 获取用户列表 |
| /api/users/{id} | GET | 获取用户详情 |
```

### 向用户展示接口详情

```markdown
## 接口：{summary}

**基本信息**
- 路径：`{method} {path}`
- 描述：{description}
- 标签：{tags}

**请求参数**
{参数表格}

**请求体**
{请求体示例（如果有）}

**响应**
{响应说明}

**相关数据结构**
{Schema 说明}
```

### 代码生成输出

```markdown
## 生成的代码

### TypeScript
```typescript
{代码}
```

### Python
```python
{代码}
```

### cURL
```bash
curl -X {method} "{url}" \
  -H "Content-Type: application/json" \
  -d '{...}'
```
```

## 重要注意事项

### 1. 永远不要读取整个文档

❌ 错误做法：
```bash
curl -s {url} | jq '.'  # 会读取整个文档
```

✅ 正确做法：
```bash
# 使用 Python 脚本，只读取需要的部分（无需安装依赖）
python3 /mnt/skills/user/openapi-explorer/scripts/fetch-tags.py {url}
python3 /mnt/skills/user/openapi-explorer/scripts/fetch-by-tag.py {url} {tag}
python3 /mnt/skills/user/openapi-explorer/scripts/fetch-endpoint.py {url} {path}
```

### 2. 处理 $ref 引用

当接口定义中包含 `$ref` 时，不要忽略它，要解析：

```bash
# 提取并解析所有 $ref
echo '{endpoint_json}' | python3 /mnt/skills/user/openapi-explorer/scripts/resolve-refs.py {url}
```

### 3. 限制输出大小

如果某个接口的响应或 schema 很大：
- 询问用户需要哪些具体字段
- 只展示关键结构
- 提供完整定义的文件路径

### 4. 错误处理

脚本可能失败的原因：
- URL 不正确或无法访问
- 文档格式不符合 OpenAPI 规范
- 网络问题
- Node.js 版本过低

遇到错误时：
1. 告知用户具体的错误信息
2. 提供可能的解决方案
3. 如果是网络问题，建议下载到本地

### 5. 缓存策略

如果用户连续查询多个接口：
- 首次下载后缓存到 `/tmp/swagger-{timestamp}.json`
- 后续查询使用本地缓存
- 避免重复下载大文档

## 常见问题处理

### 用户提供的 URL 无法访问

**原因**：可能是跨域限制、需要认证、URL 错误

**解决方案**：
1. 让用户检查 URL 是否正确
2. 如果需要认证，告知用户如何配置
3. 建议用户下载文档到本地，使用 file:// 协议

### 找不到用户询问的接口

**原因**：路径错误、模块名错误

**解决方案**：
1. 先获取所有 tags，让用户确认
2. 使用 fetch-by-tag 查看模块下所有接口
3. 建议用户查看接口列表选择正确的路径

### Python 脚本执行失败

**原因**：Python 未安装、版本过低

**解决方案**：
```bash
python3 --version  # 确保 >= 3.6
```

大多数系统都已预装 Python 3，无需额外安装。

### 返回的数据太大

**原因**：接口的响应或 schema 定义很复杂

**解决方案**：
1. 只展示关键部分
2. 询问用户需要哪些具体信息
3. 将完整定义保存到文件，提供文件路径

## 示例对话

### 用户：帮我看看这个 API 文档

**代理执行**：
```bash
python3 /mnt/skills/user/openapi-explorer/scripts/fetch-tags.py https://api.example.com/swagger.json
```

**代理回复**：
```
这个 API 文档包含以下模块：
- user（用户管理）
- order（订单管理）
- product（商品管理）

你想查看哪个模块的接口？
```

### 用户：用户管理模块有哪些接口？

**代理执行**：
```bash
python3 /mnt/skills/user/openapi-explorer/scripts/fetch-by-tag.py https://api.example.com/swagger.json user
```

**代理回复**：
```
用户管理模块包含以下接口：
- GET /api/users - 获取用户列表
- GET /api/users/{id} - 获取用户详情
- POST /api/users - 创建用户
- PUT /api/users/{id} - 更新用户
- DELETE /api/users/{id} - 删除用户

需要查看哪个接口的详细信息？
```

### 用户：生成获取用户详情的 TypeScript 代码

**代理执行**：
```bash
python3 /mnt/skills/user/openapi-explorer/scripts/fetch-endpoint.py https://api.example.com/swagger.json "/api/users/{id}" get > /tmp/endpoint.json

cat /tmp/endpoint.json | python3 /mnt/skills/user/openapi-explorer/scripts/resolve-refs.py https://api.example.com/swagger.json
```

**代理回复**：
```typescript
interface User {
  id: number;
  name: string;
  email: string;
  // ... 其他字段
}

async function getUserDetail(id: number): Promise<User> {
  const response = await fetch(`https://api.example.com/api/users/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// 使用示例
const user = await getUserDetail(123);
console.log(user);
```
