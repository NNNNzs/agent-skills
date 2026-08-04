# 知乎生态竞品分析报告（2026-08-02 更新版）

> 基于三个参考项目源码深度分析
> 分析对象：Python zhihu-cli / Zhihu++ Android / zhihu-mcp-server vs NNNNzs/zhihu-cli

---

## 一、三个参考项目概览

| 维度 | Python zhihu-cli | Zhihu++ Android | zhihu-mcp-server |
|------|-----------------|-----------------|-----------------|
| **仓库** | BAIGUANGMEI/zhihu-cli | zly2006/zhihu-plus-plus | iteng007/zhihu-mcp-server |
| **语言** | Python 3.10+ | Kotlin (KMP) | JavaScript (ES Module) |
| **定位** | CLI 工具（命令行交互） | 全功能第三方客户端（App） | MCP Server（LLM 工具集成） |
| **许可证** | Apache 2.0 | AGPL-3.0 | AGPL-3.0 |
| **版本** | v0.2.4 | 活跃开发中 | v1.0.0 |
| **核心框架** | Click + Rich + requests | Jetpack Compose + Ktor + Room | @modelcontextprotocol/sdk |
| **发布渠道** | PyPI (pyzhihu-cli) | GitHub Releases / F-Droid | npm |

---

## 二、各项目详细分析

### 2.1 Python zhihu-cli

**架构**：Click CLI → ZhihuClient (requests.Session) → 知乎 V3/V4/专栏 Web API

**CLI 命令（27 个，细分）**：
- 认证（4）：`login --qrcode`, `logout`, `status`(离线), `whoami`
- 阅读（8）：`search`(general/people/topic)、`hot`、`question`、`answers`、`answer`(-c 评论)、`feed`、`feeds`(含内容+评论)、`topic`
- 用户（5）：`user`、`user-answers`(--sort voteups)、`user-articles`、`followers`、`following`
- 互动（2）：`vote`(--up/--neutral)、`follow-question`(--unfollow)
- 创作（3）：`ask`(标题+描述+话题+图片)、`pin`(标题+正文+图片)、`article`(标题+正文+话题+图片)
- 删除（3）：`delete-question`(-y)、`delete-pin`、`delete-article`
- 其他（2）：`collections`、`notifications`(--offset)

**认证机制**：
- 二维码扫码登录：API 轮询 `scan_info`，0.15s 间隔，120s 超时
- Cookie 导入（`--cookie` 参数——**安全隐患**：Cookie 进入 shell 历史和进程列表）
- Cookie 自动补全：只有 `z_c0` 时访问知乎首页获取 `_xsrf`/`d_c0`
- 本地存储：`~/.zhihu-cli/cookies.json`，权限 0600
- 统一浏览器指纹：Chrome 145 UA、sec-ch-ua 等，版本号集中管理

**API 端点**：
- V4 API：`/me`、`/search_v3`、`/questions/{id}`、`/answers/{id}`、`/answers/{id}/comments`、`/answers/{id}/voters`、`/questions/{id}/followers`、`/members/{url_token}` 系列、`/content/drafts`、`/content/publish`、`/notifications/v2/recent`、`/topics/{id}` 等
- V3 API：二维码登录、推荐 Feed、热榜 fallback
- 专栏 API：文章草稿→更新→发布三步
- 图片 API：注册→OSS PUT(HMAC-SHA1+STS)→轮询

**图片处理**：
- 完整四步上传：注册→OSS PUT(HMAC-SHA1+STS 临时凭证)→轮询(最多 15 次/2s 间隔)→Pillow 获取尺寸
- 构建 `<img>` HTML 包含完整知乎 data 属性
- **缺陷**：Content-Type 固定 JPEG，不识别 PNG/GIF/WebP；只支持本地文件不支持 URL

**测试**：182 个测试函数，6 个测试文件
- `test_cli.py`(453 行)：Click CliRunner 测试所有命令
- `test_client.py`(780 行)：ZhihuClient 所有方法
- `test_config.py`(53 行)：配置常量
- `test_auth.py`(187 行)：cookie 解析/序列化
- `test_display.py`(202 行)：HTML strip、数字格式化
- `conftest.py`(98 行)：共享 fixtures
- 标记 `integration` marker 默认跳过，全 mock 不依赖网络

**设计优点**：
- 分层清晰：config → auth → client → display → commands/
- 统一浏览器指纹，所有 headers 从 `get_browser_headers()` 源
- CSRF：从 cookie 读 `_xsrf` 设置 `x-xsrftoken` 请求头
- AI Agent 友好：QR 码保存为 PNG 供转发，`--json` 全局支持
- Context Manager 支持 `with` 语句
- Cookie 文件 0600 权限，全程 HTTPS

**设计缺陷**：
- `_get_client()` 在 `content.py`、`interact.py`、`user.py` 三文件重复定义
- 写操作无 preview/confirm 机制，直接 POST
- 删除用 `-y` 跳过确认，Agent 场景不安全
- 无 rate limiting / 请求重试
- 无 Markdown 编译（文章正文自动包 `<p>` 过于简单）
- 无 token 刷新机制，Cookie 过期需重新扫码
- `feed` URL 硬编码 v3，未用 `ZHIHU_API_V3` 常量

---

### 2.2 Zhihu++ Android

**架构**：Kotlin Multiplatform → Ktor HTTP → 知乎 Web API + Android API（双通道）

**模块结构**：
- `app` — Android 主应用（lite/full 两个 variant）
- `shared` — KMP 共享核心（commonMain/androidMain/jvmMain/nativeMain/iosMain）
- `shared-local-db` — Room 本地数据库
- `sentence_embeddings` — ONNX 端侧 embedding
- `markdown-parser/renderer/runtime` — 内置 Markdown 引擎
- `desktopApp` — 实验性桌面版（JVM）

**核心功能**：
- **本地推荐算法**：`CrawlingExecutor` 从知乎 API 抓取、`UserBehaviorAnalyzer` 分析行为、`FeedGenerator` 生成 feed，支持多源（关注动态/热榜/高赞/协同过滤）
- **内容过滤系统**：关键词/正则、用户/话题/作者屏蔽、**NLP 语义屏蔽**（ONNX Sentence Embedding + 向量相似度）、盐选屏蔽、质量过滤
- **阅读增强**：沉浸式阅读、AI 总结、TTS 朗读、导出（PDF/图片/Markdown/HTML）、LaTeX 渲染、无水印保存

**关键技术实现**：
- `ZseSigner.kt`：**最权威的 zse96 v2 签名**——SM4 变种加密（自定义 S-box ZB + 轮密钥 ZK），签名源 `zse93 + pathname + d_c0 + body` 的 MD5，自定义 base64 编码
- `ZhihuCredentialRefresher`：401 时自动 refresh token，带 10s 节流
- `ZhihuMarkdownCompiler.kt`：Markdown → 知乎 HTML（标题归一化、LaTeX 公式 `eeimg` 属性、表格 `data-draft-node`、代码块 `<pre lang>`、图片 `zhimg:` 协议）
- `ZhihuImageUpload.kt`：注册→OSS PUT→通知完成→轮询（普通图单 PUT，GIF 走 OSS 分片上传 init→parts→complete）
- `ZhihuAnswerPublisher.kt`：探测已有回答→获取可编辑内容→patchDraft→publishAnswer（payload 含 traceId/draft/extra_info/hybrid.html）
- `ZhihuPinPublisher.kt`：独立于回答发布，通过 drafts→publish
- `QrLogin.kt`：完整桌面端浏览器登录模拟，含风控处理（403 + risk_control）

**认证机制**：
- Cookie：`z_c0`(会话)、`d_c0`(设备)、`_xsrf`(CSRF)
- 登录方式：二维码扫码、手机验证码、手动 Cookie
- 凭证刷新：`ZhihuCredentialRefresher` 401 自动刷新
- zse96 签名：作为 Ktor 扩展函数透明注入

**优势**：
- 签名实现最完整最权威（MCP Server 的签名从这里移植）
- Markdown 编译器成熟（标题归一化、LaTeX、表格、代码块、图片元数据）
- 图片上传流程完整（含 GIF 分片）
- 端侧 AI 推荐（独创）
- 跨平台（Android + iOS + Desktop via KMP）
- AGENTS.md 详细规范 API 逆向验证方法论

**劣势**：
- 是 App 不是 CLI，不直接可复用为命令行工具
- 代码量大（23M），分析成本高
- AGPL 许可证，衍生作品需开源

---

### 2.3 zhihu-mcp-server

**架构**：MCP SDK (stdio) → signRequest() → 知乎 Web API + Android API（双通道）

**MCP 工具（10 个）**：

| 工具名 | 功能 | 需要 Cookie |
|---|---|---|
| `zhihu_hot_list` | 热榜（Android API，免登录） | ❌ |
| `zhihu_search` | 通用搜索（问题/回答/文章/用户） | ✅ |
| `zhihu_hot_search` | 热搜词列表 | ❌ |
| `zhihu_get_question` | 问题详情（标题、关注数、回答数等） | ✅ |
| `zhihu_get_answer` | 回答详情（内容、作者、点赞数等） | ✅ |
| `zhihu_get_article` | 专栏文章详情 | ✅ |
| `zhihu_question_answers` | 问题下的回答列表（分页+排序） | ✅ |
| `zhihu_get_user` | 用户资料（昵称、简介、粉丝数等） | ✅ |
| `zhihu_set_cookies` | 设置/更新 Cookie，持久化到 config.json | — |
| `zhihu_get_config` | 查看当前配置（脱敏，不暴露 Cookie 值） | — |

**zse96 v2 签名实现**（`zse-signer.js`）：
```
signSource = zse93 + pathname + d_c0 + body
md5Hash = MD5(signSource)
signature = encryptZseV4(md5Hash)  // 自定义块加密：ZK 轮密钥 + ZB S-Box + Feistel 结构
x-zse-96 = "2.0_" + signature
```
- 自定义 Base64 编码（非标准字母表）
- 零外部加密依赖：仅 Node.js 内置 `crypto`（MD5）+ 纯 JS 实现块加密

**双 API 通道**：
- **Web API** (`zhihuRequest`)：Chrome UA + zse96 签名，用于搜索/详情等
- **Android API** (`zhihuAndroidRequest`)：伪装 Android 客户端 `com.zhihu.android/10.61.0`，无需签名，用于热榜等免登录接口

**代码结构**：
- `index.js`（~520 行）：所有工具定义和路由
- `zse-signer.js`（~187 行）：签名逻辑
- `test.js` / `final-test.js`：手动测试脚本（无测试框架）

**优势**：
- 签名实现准确（从权威源移植）
- 依赖极简（仅 1 个外部依赖）
- MCP 标准协议，可直接被 Claude Code 等 LLM 客户端使用
- 公开内容允许匿名访问（热榜、热搜）
- `zhihu_get_config` 返回脱敏配置

**劣势**：
- 只有 10 个工具，覆盖面窄
- 无写操作能力（纯读取）
- 无二维码登录（手动 Cookie 配置）
- 单文件架构，无模块化
- 无自动化测试（只有手动脚本）
- 无 CI/CD

---

## 三、功能矩阵对比

| 能力 | Python CLI | Android | MCP Server | **NNNNzs CLI** |
|------|-----------|---------|------------|----------------|
| **认证** | | | | |
| 二维码扫码 | ✅ | ✅ | ❌ | ✅ |
| Cookie 导入 | ⚠️ `--cookie` | ✅ | ✅ 手动 JSON | ✅ stdin |
| 登录状态检查 | ✅ 在线 | ✅ | ❌ | ✅ 在线+离线 |
| 凭证自动刷新 | ❌ | ✅ 401 refresh | ❌ | ❌ |
| 退出登录 | ✅ | ✅ | ❌ | ✅ |
| **读取** | | | | |
| 综合搜索 | ✅ 3 种类型 | ✅ | ✅ | ✅ |
| 热榜 | ✅ | ✅ | ✅(免登录) | ✅ |
| 热搜词 | ❌ | ✅ | ✅(免登录) | ❌ |
| 推荐 Feed | ✅ | ✅ | ❌ | ✅ |
| 问题详情 | ✅ | ✅ | ✅ | ✅ |
| 回答详情 | ✅ | ✅ | ✅ | ✅ |
| 回答评论 | ✅ 分页 | ✅ | ❌ | ✅ |
| 文章详情 | ❌ | ✅ | ✅ | ❌ |
| 用户资料/回答/文章 | ✅ | ✅ | 部分 | ✅ |
| 粉丝/关注 | ✅ | ✅ | ❌ | ✅ |
| 话题 | ✅ | ✅ | ❌ | ✅ |
| 收藏夹 | ✅ | ✅ | ❌ | ✅ |
| 通知 | ✅ | ✅ | ❌ | ✅ |
| **写入** | | | | |
| 赞同/取消 | ✅ 直接 POST | ✅ | ❌ | ✅ preview+confirm |
| 关注/取消 | ✅ 直接 POST | ✅ | ❌ | ✅ preview+confirm |
| 发布提问 | ✅ 直接发布 | ✅ | ❌ | ✅ preview+confirm |
| 发布想法 | ✅ 直接发布 | ✅ | ❌ | ✅ preview+confirm |
| 发布文章 | ✅ 直接发布 | ✅ | ❌ | ✅ preview+confirm |
| 回答草稿 | ❌ | ✅ | ❌ | ✅ ⭐ |
| 发布/更新回答 | ❌ | ✅ | ❌ | ✅ ⭐ preview+confirm |
| 删除内容 | ✅ `-y` 跳过 | ✅ | ❌ | ✅ preview+confirm |
| **内容处理** | | | | |
| Markdown 编译 | ❌ | ✅ | ❌ | ✅ ⭐ |
| LaTeX 公式 | ❌ | ✅ | ❌ | ✅ ⭐ |
| 图片上传 | ✅ PUT（仅 JPEG） | ✅ PUT+分片+轮询 | ❌ | ✅ PUT+GIF+轮询 ⭐ |
| 图片格式检测 | ❌ 固定 JPEG | ✅ | ❌ | ✅ ⭐ |
| HTML 安全处理 | ❌ 直接拼接 | ✅ | ❌ | ✅ ⭐ |
| **安全** | | | | |
| 写操作确认机制 | ❌ 无 | ❌ 无 | N/A | ✅ ⭐ 两阶段令牌 |
| 域名白名单 | ❌ | ✅ | ❌ | ✅ ⭐ |
| 日志脱敏 | ❌ | ✅ | 部分 | ✅ ⭐ |
| Cookie 安全 | ⚠️ 进程参数泄露 | ✅ | ✅ | ✅ stdin |
| 请求重试/限流 | ❌ | ✅ | ❌ | ✅ ⭐ |
| **Agent 集成** | | | | |
| CLI 工具 | ✅ | ❌ App | ❌ MCP | ✅ |
| MCP Server | ❌ | ❌ | ✅ | ❌（可扩展） |
| Agent Skill | ✅ OpenClaw | ❌ | ❌ | ✅ Hermes/Codex |
| JSON 输出 | 可选 `--json` | N/A | MCP 协议 | 默认 JSON |

---

## 四、关键差异分析

### 4.1 安全模型

**NNNNzs CLI 独有优势**：两阶段写操作（preview → confirm token）

其他三个项目的写操作都是直接 POST，没有预览和确认机制。这对 Agent 场景是重大风险——Agent 可能误解用户意图直接发布内容。

### 4.2 签名实现

- **zse96 v2 签名源头**：Zhihu++ Android（`ZseSigner.kt`）
- **JS 移植版**：zhihu-mcp-server（`zse-signer.js`），从 TypeScript 移植为纯 JS
- **NNNNzs CLI**：`http.js` 中有签名实现，provenance 记录参考了 MCP Server
- **Python CLI**：无 zse96 签名，用简单 HMAC 签名

签名源公式：`zse93 + pathname + d_c0 + body` → MD5 → SM4 变种块加密（ZB S-Box + ZK 轮密钥 + Feistel 结构）→ 自定义 Base64

### 4.3 Markdown 编译

| 项目 | 实现 | 能力 |
|------|------|------|
| Android | `ZhihuMarkdownCompiler.kt` | 标题归一化、LaTeX（`eeimg` 属性）、表格（`data-draft-node`）、代码块、图片（`zhimg:` 协议） |
| NNNNzs | `content.js` | 表格、代码、公式、图片 |
| Python | ❌ 无 | 文章正文自动包 `<p>` |
| MCP | ❌ 无 | N/A |

### 4.4 图片处理

| 维度 | Python | Android | MCP | NNNNzs |
|------|--------|---------|-----|--------|
| 格式检测 | ❌ 固定 JPEG | ✅ | ❌ | ✅ |
| GIF 支持 | ❌ | ✅ 分片上传 | ❌ | ✅ multipart |
| 状态轮询 | ✅ 15次/2s | ✅ | ❌ | ✅ |
| 图片注册 | ✅ | ✅ | ❌ | ✅ |
| 通知完成 | ❌ | ✅ uploading_status | ❌ | ❌ |
| URL 图片 | ❌ 仅本地 | ✅ | ❌ | ❌ |

---

## 五、可借鉴与注意事项

### 5.1 值得借鉴

| 来源 | 内容 | 建议 |
|------|------|------|
| Python CLI | 27 个命令的完整覆盖面 | 确保 NNNNzs CLI 命令数不低于此 |
| Python CLI | Rich 终端渲染 | 可选 `--format table` 增强人类体验 |
| Python CLI | Cookie 自动补全 | 有 `z_c0` 时自动获取 `_xsrf`/`d_c0` |
| Python CLI | 统一浏览器指纹管理 | 版本号一处管理，所有 headers 派生 |
| Android | zse96 v2 签名权威实现 | 作为签名正确性的校验基准 |
| Android | Markdown 编译器 | 对比两者编译结果一致性，学习标题归一化和 LaTeX 处理 |
| Android | 图片上传完整流程 | 参考 uploading_status 通知、GIF 分片上传 |
| Android | 凭证自动刷新 | 401 时 refresh token，带节流 |
| Android | 双 API 通道策略 | Web API + Android API 并用，免登录接口走 Android |
| MCP Server | 极简依赖设计 | 可参考其单文件 MCP 架构扩展 |
| MCP Server | 匿名访问策略 | 公开内容不强制登录 |
| MCP Server | 配置脱敏 | `zhihu_get_config` 只显示 cookieKeys 不暴露值 |

### 5.2 不应照搬

| 来源 | 风险内容 | 原因 |
|------|---------|------|
| Python CLI | `--cookie` 参数 | Cookie 进入 shell 历史和进程列表 |
| Python CLI | 写操作直接 POST | Agent 场景需要确认机制 |
| Python CLI | 删除 `-y` 跳过确认 | 同上 |
| Python CLI | 固定 JPEG Content-Type | 不识别其他图片格式 |
| Python CLI | 0.15s 固定轮询 | 频率过高有风控风险 |
| Python CLI | 无 rate limiting / 重试 | 高频请求可能触发风控 |
| Python CLI | 无 token 刷新机制 | Cookie 过期需重新扫码 |
| Python CLI | 文章正文自动包 `<p>` | 不支持 Markdown |
| Python CLI | `_get_client()` 三文件重复 | 应提取到公共模块 |
| Android | AGPL 许可证 | 衍生作品需开源 |
| MCP Server | 单文件架构 | 不利于维护和测试 |
| MCP Server | 无自动化测试 | 只有手动脚本 |
| MCP Server | 无写入能力 | 纯只读 |

---

## 六、NNNNzs CLI 的差异化定位

> **唯一同时具备"CLI 工具广度 + Agent 安全模型 + Markdown 创作链路"的 `zhihu-cli`。**

核心差异化：
1. **两阶段写操作 + 确认令牌**：所有写操作先 preview，再用绑定账户/目标/内容的 token 确认
2. **完整 Markdown 编译**：表格、代码、公式、图片，编译后 HTML 安全处理
3. **图片格式感知**：PNG/JPEG/GIF/WebP 自动检测，GIF multipart 上传
4. **Agent Skill 原生支持**：Hermes + Codex 双平台 Skill
5. **域名白名单 + 日志脱敏**：HTTP 客户端安全边界清晰
6. **请求重试与限流**：避免触发知乎风控

---

## 七、待补齐能力

### P0（应有）
- `--version` 命令
- `--format table` 人类可读输出（可选）

### P1（建议从参考项目补充）
- 热搜词获取（MCP Server 有，NNNNzs CLI 缺）
- 文章详情读取（Android/MCP 有）
- 凭证自动刷新（Android 有 401 refresh 机制）
- 图片 uploading_status 通知（Android 有，确保上传完整性）
- URL 图片支持（目前只支持本地文件）

### P2（锦上添花）
- Cookie 自动补全（Python CLI 有，`z_c0` → 自动获取 `_xsrf`/`d_c0`）
- 桌面端 ASCII 二维码渲染（Python CLI 有终端半字符渲染）

**结论**：NNNNzs CLI 在功能广度上已覆盖 Python CLI 的全部能力，且在安全模型、内容处理和 Agent 集成方面有明显优势。主要差距在热搜词、文章详情、凭证刷新等细节功能，以及人类可读输出等体验功能。
