# 项目索引

`zhihu-cli` 是 Node.js 20 + pnpm 的知乎 CLI 与 Agent Skill。不要自动启动服务；CLI 都是前台短进程，扫码登录是最长 120 秒的前台会话。

## 目录

- `scripts/cli.js`：Commander 命令注册、兼容别名和输出编排。
- `scripts/lib/auth.js`：二维码登录状态机。
- `scripts/lib/client.js`：知乎读取、互动、发布和删除 API 封装。
- `scripts/lib/config.js`：新旧配置、Cookie stdin 导入和权限。
- `scripts/lib/content.js`：Markdown 本地图片发现、SHA-256 预览和发布时上传。
- `scripts/lib/operations.js`：互动、创建、删除的两阶段确认。
- `scripts/lib/answer.js`：回答草稿和统一发布 payload。
- `scripts/lib/http.js`：域名白名单、签名、重试和脱敏日志。
- `scripts/lib/output.js`：JSON/table 输出契约。
- `tests/`：mock 单元、命令和显式只读集成测试。
- `docs/`：竞品分析与人工验证清单。
- `references/`：Skill 按需读取的 API、Markdown、写作与来源资料。
- `SKILL.md`：唯一 Skill 源文件。
- `dist/skills/zhihu-cli/`：由 `pnpm sync:skills` 生成的分发副本，不直接编辑。

## 开发命令

```bash
pnpm test
pnpm check
pnpm sync:skills
pnpm pack --dry-run
pnpm verify:pack
```

使用 `apply_patch` 做有意编辑；保留用户已有未提交改动。写请求必须零重试，凭证和二维码 token 不得进入输出、日志、测试快照或包内容。
