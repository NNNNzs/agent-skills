# Agent Skills 项目索引

AI 编码代理技能集合仓库。

## 仓库地址

https://github.com/NNNNzs/agent-skills

## 快速开始

### 安装技能

```bash
# 安装 OpenAPI Explorer
npx skills add NNNNzs/agent-skills --skill openapi-explorer
```

### 查看已安装技能

```bash
npx skills list
```

## 目录结构

```
agent-skills/
├── README.md          # 项目说明和安装指南
├── AGENTS.md          # 详细的代理工作指南
├── CLAUDE.md          # 本文件 - 项目索引
├── skills/            # 技能集合
│   └── openapi-explorer/  # OpenAPI 文档解析工具
└── packages/          # 构建包（可选）
```

## 可用技能

### openapi-explorer

OpenAPI/Swagger 文档智能解析工具，专为 AI 代理设计。

- 🎯 按模块、路径、schema 分块读取
- 🚀 避免上下文溢出
- 🔍 自动解析 $ref 引用
- 📦 零依赖（使用 Python 标准库）

安装：
```bash
npx skills add NNNNzs/agent-skills --skill openapi-explorer
```

## 开发新技能

参考 `AGENTS.md` 获取详细的创建指南。

## 相关文档

- [README.md](./README.md) - 项目概述
- [AGENTS.md](./AGENTS.md) - 代理工作指南
- 各技能目录下的 README.md 和 SKILL.md
