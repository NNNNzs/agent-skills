# Agent Skills

一个为 AI 编码代理设计的技能集合仓库。技能是打包的指令和脚本，用于扩展代理的能力。

## 仓库地址

https://github.com/NNNNzs/agent-skills

## 项目结构

```
agent-skills/
├── README.md              # 项目说明
├── AGENTS.md             # AI 代理工作指南
├── CLAUDE.md             # 项目索引和简要说明
├── skills/               # 技能集合
│   └── {skill-name}/     # 单个技能目录
│       ├── SKILL.md      # 技能定义（必需）
│       ├── metadata.json # 元数据
│       ├── README.md     # 技能说明
│       ├── AGENTS.md     # 代理指令
│       ├── rules/        # 规则文件
│       └── resources/    # 资源文件
└── packages/             # 可选的构建包
```

## 可用技能

### openapi-explorer

OpenAPI/Swagger 文档解析工具。支持按模块、路径精准提取接口信息，避免加载大文档导致上下文溢出。

**使用场景**：
- 根据 Swagger 文档生成 API 调用代码
- 查询特定接口的定义、参数、返回值
- 获取请求/响应的数据结构
- 了解接口的认证方式和限制

**安装**：
```bash
npx skills add NNNNzs/agent-skills --skill openapi-explorer
```

### ruoyi-api

若依系统 API 直接调用工具。让大模型能够直接操作若依系统，无需手动创建用户、菜单等。

**使用场景**：
- 直接在若依系统中创建、更新、删除用户
- 管理角色和权限分配
- 动态创建菜单和部门结构
- 快速搭建测试环境
- 批量操作和维护

**支持操作**：
- 用户管理 - 创建、更新、删除、重置密码、启用/禁用
- 角色管理 - 创建角色、分配权限、数据范围
- 菜单管理 - 创建菜单、调整排序、权限配置
- 部门管理 - 创建部门、树形结构维护
- 岗位管理、字典管理、通知公告、参数配置

**安装**：
```bash
npx skills add NNNNzs/agent-skills --skill ruoyi-api
```

**配置**：
创建 `~/.ruoyi-config.json` 或项目根目录 `.ruoyi-config.json`：
```json
{
  "baseUrl": "http://localhost:3700",
  "token": "your_bearer_token_here"
}
```

**使用示例**：
```markdown
请使用 ruoyi-api 创建一个测试用户，用户名为 testuser，密码 123456
```

```markdown
使用 ruoyi-api 查询所有角色列表
```

```markdown
请用 ruoyi-api 创建一个管理员角色
```

## 安装

### 使用 npx 安装单个技能（推荐）

```bash
npx skills add NNNNzs/agent-skills --skill {skill-name}
```

示例：
```bash
# 安装 OpenAPI Explorer
npx skills add NNNNzs/agent-skills --skill openapi-explorer
```

### 手动安装

```bash
# 克隆仓库
git clone https://github.com/NNNNzs/agent-skills.git

# 复制技能到 Claude Code 技能目录
cp -r agent-skills/skills/{skill-name} ~/.claude/skills/
```

### 查看已安装的技能

```bash
npx skills list
```

## 使用

技能安装后自动可用。代理会在检测到相关任务时使用它们。

## 创建新技能

参考 [AGENTS.md](./AGENTS.md) 中的详细指南。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
