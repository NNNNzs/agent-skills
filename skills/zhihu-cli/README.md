# zhihu-cli

面向人类与 AI Agent 的完整知乎 CLI：支持安全登录、内容检索与阅读、用户和话题研究、互动、Markdown 创作、多类型内容发布，以及受确认令牌保护的写操作。根目录 `SKILL.md` 可供 Codex、Hermes、OpenClaw 等支持 Agent Skills 的宿主使用。

> 本项目使用知乎未公开承诺稳定的 Web 接口，不是知乎官方 SDK。请遵守知乎服务条款、隐私政策和社区规范；项目不会绕过 CAPTCHA、访问控制、频率限制或风控。

## 安装

要求 Node.js `>=20.18.1`，推荐使用 pnpm。

```bash
# 全局安装；发布到 npm 后可直接使用
pnpm add -g zhihu-cli
zhihu --version

# 不全局安装
pnpm dlx zhihu-cli --version

# 源码安装
git clone https://github.com/NNNNzs/zhihu-cli.git
cd zhihu-cli
pnpm install
pnpm zhihu -- --version
```

包同时提供 `zhihu` 和 `zhihu-cli` 两个 bin。源码开发入口为 `pnpm zhihu -- <command>`。本项目不需要也不会自动启动后台服务。

可以把下面这句话直接发给支持终端和 Agent Skills 的 Agent：

> 请安装 `https://github.com/NNNNzs/zhihu-cli.git` 中的 `zhihu-cli` Skill，使用 pnpm 安装依赖并读取根 `SKILL.md`；优先让我扫码登录，不要要求我在聊天中发送 Cookie，任何写操作都先给我预览和确认令牌。

## 登录

推荐扫码登录：

```bash
zhihu auth login --qr
# 兼容别名
zhihu login --qrcode
```

JSON 模式会在 stderr 输出不含二维码 URL、token 或 Cookie 的 `qr_ready`、`scanned`、`confirmed`、`expired` 事件，stdout 只在流程结束后输出一次结果。二维码临时写入 `~/.zhihu-cli/login_qrcode.png`，权限为 `0600`；成功、超时、取消和 logout 后都会删除。使用 `--format table` 时终端也会显示二维码。

如果扫码接口不可用，可由用户本人在本机终端从标准输入导入浏览器 Cookie。不要把 Cookie 发进聊天、放入命令参数或提交到仓库。

```bash
# macOS
pbpaste | zhihu auth import

# 已有本地文件
zhihu auth import < cookies.txt
```

登录态保存在 `~/.zhihu-cli/config.json`，目录和文件权限分别为 `0700`、`0600`。旧 `~/.zhihu-creator/config.json` 与 `ZHIHU_CREATOR_CONFIG` 只做兼容读取；新覆盖变量为 `ZHIHU_CLI_CONFIG`。

```bash
zhihu auth status --offline
zhihu auth status
zhihu auth whoami
zhihu auth logout
```

## 查询命令

所有命令默认输出稳定 JSON：`{ "ok": true, "data": ..., "paging": ..., "warnings": ... }`。错误只写 stderr，并返回非零退出码。使用 `--format table` 可切换紧凑表格，使用 `--verbose` 可查看仅含方法、脱敏 URL、状态码、耗时和重试次数的日志。

```bash
zhihu search --query "React 性能" --type general --limit 10
zhihu search --query "产品经理" --type people
zhihu search --query "人工智能" --type topic
zhihu search --query "Node.js" --questions-only --answers 3

zhihu feed hot --limit 20 --answers 2
zhihu feed recommend --limit 10 --expand --comments 3
zhihu feeds --limit 10 --comment-limit 3

zhihu question 12345678
zhihu question answers 12345678 --limit 10 --sort default
zhihu answer 87654321
zhihu answer comments 87654321 --limit 20
zhihu answer comments 87654321 --all

zhihu user somebody
zhihu user answers somebody
zhihu user articles somebody
zhihu user followers somebody
zhihu user following somebody
zhihu topic 19550517
zhihu topic questions 19550517

zhihu account collections
zhihu account notifications --limit 10 --offset 0
```

公开内容在接口允许时支持匿名读取；收藏、通知、个性化推荐和所有写操作必须登录。列表命令限制单页数量，评论只有显式 `--all` 才会翻页，并受最大页数保护。

## 两阶段写操作

点赞、关注、图片上传、回答草稿、发布和删除都必须先预览。确认令牌绑定账户、操作、目标、远端状态、标题、正文、话题、设置和图片哈希；内容、账户或远端状态变化后必须重新预览。

```bash
# 赞同与关注
zhihu answer vote preview 87654321 --state up
zhihu answer vote apply 87654321 --state up --confirm <token>
zhihu question follow preview 12345678
zhihu question follow apply 12345678 --confirm <token>

# 兼容平铺别名：无 --confirm 时只预览
zhihu vote 87654321
zhihu vote 87654321 --confirm <token>
zhihu follow-question 12345678 --unfollow
```

重复执行已达到目标状态的点赞或关注会返回幂等成功，不会重复写入。

## Markdown、图片与发布

本地图片可直接写在 Markdown 中，也可重复传入 `--image`。预览只校验路径、格式、尺寸并计算 SHA-256；publish 阶段才上传图片并编译最终 HTML。发布内容禁止保留 `file:` URL。

```bash
zhihu answer compile --input answer.md

# 独立图片上传也是两阶段
zhihu image upload --file diagram.png
zhihu image upload --file diagram.png --confirm <token>

# 回答：draft 不带令牌时返回草稿预览
zhihu answer preview --question-id 12345678 --input answer.md --image diagram.png
zhihu answer publish --question-id 12345678 --input answer.md --image diagram.png --confirm <token>
zhihu answer draft --question-id 12345678 --input answer.md
zhihu answer draft --question-id 12345678 --input answer.md --confirm <token>

# 提问、想法、文章
zhihu question create preview --title "问题标题" --input question.md --topic 19550517 --image diagram.png
zhihu question create publish --title "问题标题" --input question.md --topic 19550517 --image diagram.png --confirm <token>
zhihu pin create preview --title "想法标题" --input pin.md --image photo.jpg
zhihu article create preview --title "文章标题" --input article.md --topic 19550517

# 删除自己的内容
zhihu question delete preview 12345678
zhihu question delete apply 12345678 --confirm <token>
zhihu pin delete preview 123
zhihu article delete preview 456
```

平铺兼容命令包括 `hot`、`answers`、`feed`、`feeds`、`user-answers`、`user-articles`、`followers`、`following`、`collections`、`notifications`、`ask`、`pin`、`article`、`delete-question`、`delete-pin`、`delete-article`。`ask`、`pin`、`article` 及删除别名无 `--confirm` 时只返回预览。

提问、想法和文章写接口来自 mock 验证及来源快照，尚未用真实账号自动发布验证；发布前应先阅读 [人工验证清单](docs/manual-write-validation.md)。自动测试不会真实发布、点赞、关注或删除。

## Agent 安装

仓库根 `SKILL.md` 是唯一源文件，`pnpm sync:skills` 生成 `dist/skills/zhihu-cli/` 的 ClawHub/OpenClaw 分发副本，`pnpm check:skills` 检查漂移。

```bash
# Codex
git clone https://github.com/NNNNzs/zhihu-cli.git ~/.codex/skills/zhihu-cli
pnpm --dir ~/.codex/skills/zhihu-cli install

# Hermes
git clone https://github.com/NNNNzs/zhihu-cli.git ~/.hermes/skills/zhihu-cli
pnpm --dir ~/.hermes/skills/zhihu-cli install

# OpenClaw 源码安装；按实际 workspace 调整路径
git clone https://github.com/NNNNzs/zhihu-cli.git ~/.openclaw/workspace/skills/zhihu-cli
pnpm --dir ~/.openclaw/workspace/skills/zhihu-cli install
```

安装后开启新会话，或按宿主方式刷新 Skills。扫码时 Agent 应保持登录命令为前台会话，收到 `qr_ready` 后立即把本地 PNG 作为图片交付给用户，再继续等待扫码结果；不能读取、回显或转发 Cookie。

升级源码安装：

```bash
git -C <skill-directory> pull --ff-only
pnpm --dir <skill-directory> install
```

全局安装升级：

```bash
pnpm update -g zhihu-cli
```

## 开发与验证

```bash
pnpm install
pnpm test
pnpm check
pnpm pack --dry-run
pnpm verify:pack

# 只读真实接口，默认不会运行
ZHIHU_LIVE_TESTS=1 pnpm test:live
```

架构和目录索引见 [AGENTS.md](AGENTS.md)，接口约定见 [references/api.md](references/api.md)，Markdown 规则见 [references/markdown.md](references/markdown.md)，竞品分析见 [docs/competitive-analysis-python-zhihu-cli.md](docs/competitive-analysis-python-zhihu-cli.md)。

## 许可与来源

项目采用 [AGPL-3.0-only](LICENSE)。来源快照与许可证记录见 [references/provenance.md](references/provenance.md)。
