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
