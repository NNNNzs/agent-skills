# AGENTS.md

本文件为 AI 编码代理（Claude Code、Cursor、Copilot 等）提供在此仓库中工作的指导，老板。

## 仓库概述

这是一个为 Claude.ai 和 Claude Code 设计的技能集合仓库，用于扩展 Claude 的能力。每个技能都是打包的指令和资源，可以根据任务需求自动激活，老板。

## 创建新技能

### 目录结构

```
skills/
  {skill-name}/           # kebab-case 目录名
    SKILL.md              # 必需：技能定义
    metadata.json         # 必需：元数据
    README.md             # 推荐：技能说明
    AGENTS.md             # 推荐：代理指令
    rules/                # 可选：规则文件
      {rule-name}.md
    resources/            # 可选：资源文件
      {file-name}
    scripts/              # 可选：可执行脚本
      {script-name}.sh
```

### 命名规范

- **技能目录**: `kebab-case` (例如: `react-best-practices`, `log-monitor`)
- **SKILL.md**: 始终大写，始终使用这个确切的文件名
- **规则文件**: `kebab-case.md` (例如: `async-parallel.md`)
- **脚本文件**: `kebab-case.sh` (例如: `deploy.sh`)

### SKILL.md 格式

```markdown
---
name: {skill-name}
description: {一句话描述何时使用此技能。包括触发短语如"优化代码"、"检查日志"等}
license: MIT
metadata:
  author: {your-name}
  version: "1.0.0"
---

# {技能标题}

{技能功能的简要描述}

## 何时应用

在以下情况参考这些指南：
- {场景 1}
- {场景 2}
- {场景 3}

## 规则分类

| 优先级 | 类别 | 影响 | 前缀 |
|--------|------|------|------|
| 1 | {类别名} | {等级} | `{prefix}-` |

## 快速参考

### 1. {类别名} ({优先级})

- `{prefix}-{rule-name}` - {简要说明}

## 如何使用

阅读各个规则文件以获取详细解释和代码示例：
```
rules/{prefix}-{rule-name}.md
```

每个规则文件包含：
- 为什么重要
- 不正确的代码示例及说明
- 正确的代码示例及说明
- 额外的上下文和参考
```

### metadata.json 格式

```json
{
  "version": "1.0.0",
  "organization": "{组织名称}",
  "date": "{发布日期}",
  "abstract": "{技能摘要，描述目的和范围}",
  "references": [
    "https://example.com/reference1",
    "https://example.com/reference2"
  ]
}
```

### 上下文效率最佳实践

技能按需加载 —— 启动时只加载技能名称和描述。完整的 `SKILL.md` 只在代理认为技能相关时才加载到上下文中。为了最小化上下文使用：

- **保持 SKILL.md 在 500 行以下** —— 将详细参考材料放在单独的文件中
- **编写具体的描述** —— 帮助代理准确知道何时激活技能
- **使用渐进式披露** —— 引用支持文件，只在需要时读取
- **优先使用脚本而非内联代码** —— 脚本执行不消耗上下文（只有输出会）
- **文件引用只工作一级** —— 从 SKILL.md 直接链接到支持文件

### README.md 格式

每个技能应该有自己的 README.md，用于人类阅读：

```markdown
# {技能名称}

{人类可读的技能描述}

## 何时使用

- {使用场景 1}
- {使用场景 2}

## 包含的规则

- {规则 1}
- {规则 2}

## 安装

```bash
cp -r skills/{skill-name} ~/.claude/skills/
```

## 参考资料

- [参考 1](url)
- [参考 2](url)
```

### 创建规则文件

规则文件应该包含：

```markdown
# {规则标题}

## 为什么重要

{解释为什么这个规则重要}

## 错误示例

\```tsx
// 不好的代码
{示例代码}
\```

**问题：** {解释问题}

## 正确示例

\```tsx
// 好的代码
{示例代码}
\```

**改进：** {解释改进}

## 额外上下文

{额外的背景信息和参考链接}
```

## 终端用户安装

为用户记录以下安装方法：

### 方法 1：使用 npx（推荐）

```bash
npx skills add NNNNzs/agent-skills --skill {skill-name}
```

示例：
```bash
# 安装 OpenAPI Explorer
npx skills add NNNNzs/agent-skills --skill openapi-explorer
```

### 方法 2：手动安装

**Claude Code:**
```bash
# 克隆仓库
git clone https://github.com/NNNNzs/agent-skills.git

# 复制技能到 Claude Code 技能目录
cp -r agent-skills/skills/{skill-name} ~/.claude/skills/
```

**claude.ai:**
将技能添加到项目知识或在此对话中粘贴 SKILL.md 内容。

### 卸载技能

```bash
npx skills remove {skill-name}
```

### 查看已安装的技能

```bash
npx skills list
```

### 网络访问权限

如果技能需要网络访问（如 openapi-explorer），指导用户在 `claude.ai/settings/capabilities` 添加所需的域名。
