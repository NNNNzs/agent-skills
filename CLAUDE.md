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
├── CLAUDE.md          # 本文件 - 项目索引
├── .env.example       # 环境变量配置示例
├── skills/            # 技能集合
│   ├── openapi-explorer/  # OpenAPI 文档解析工具
│   └── ruoyi-api/        # 若依系统 API 调用工具
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

### ruoyi-api

若依系统 API 直接调用工具，让大模型能够直接操作若依系统。

- 👤 用户管理 - 创建、更新、删除、重置密码
- 🔐 角色管理 - 创建角色、分配权限、数据范围
- 📋 菜单管理 - 创建菜单、调整排序、权限配置
- 🏢 部门管理 - 创建部门、树形结构维护
- 📖 渐进式披露文档 - 模块化 API 文档，按需加载

安装：
```bash
npx skills add NNNNzs/agent-skills --skill ruoyi-api
```

配置：
```bash
# 在项目根目录创建 .env 文件
RUOYI_BASE_URL=http://localhost:3700
RUOYI_TOKEN=your_bearer_token_here
```

## 开发新技能

参考 `AGENTS.md` 获取详细的创建指南。

## 相关文档

- [README.md](./README.md) - 项目概述和安装指南
- [.env.example](./.env.example) - 环境变量配置示例
- 各技能目录下的 SKILL.md 和 references/
