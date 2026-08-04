# zhihu-cli 九项功能实施计划

> 由 Codex (gpt-5.6-sol) 于 2026-08-02 生成
> 基于对项目源码的深度阅读

---

## 一、现状判断

9 项功能的实际状态并不相同：

| 功能 | 当前状态 | 结论 |
|---|---|---|
| 热搜词 | 无客户端方法、无命令 | 新增 |
| `--version` | Commander 已读取 `package.json`，已有 CLI/打包测试 | 基本完成，需加固 |
| 文章详情 | `getArticle()` 已存在，CLI 没有读取入口，归一化字段偏少 | 补齐 |
| Markdown 标题归一化 | 已实现"最高两级映射为 h2/h3，其余转粗体段落" | 加固边界 |
| 凭证自动刷新 | 无通用响应 Cookie 回写、无 401 刷新机制 | 新增，风险最高 |
| 图片 `uploading_status` | OSS 上传后已有 PUT 通知，且写请求零重试 | 加固响应验证 |
| `--format table` | 全局选项和通用表格渲染已存在 | 完善可读性与契约 |
| Cookie 自动补全 | 二维码登录会收集 Cookie；导入单个 `z_c0` 后不会补齐 | 新增 |
| 双 API 通道 | 已有 Web 请求、Android headers，但没有正式通道抽象 | 架构补齐 |

---

## 二、逐项实施计划

### 1. 热搜词

建议命令：

```bash
zhihu-cli feed hot-search --limit 20
zhihu-cli hot-search --limit 20
```

避免把"热搜词"和现有"热榜内容"混在同一个 `hot` 命令中。

修改文件：

- `scripts/lib/client.js`
  - 新增 `getHotSearch(config, { limit })`
  - 通过 Android 通道调用热搜接口
  - 限制数量，返回原始响应给命令层归一化
- `scripts/cli.js`
  - 新增 `normalizeHotSearchItem()`
  - 注册 `feed hot-search` 与兼容别名 `hot-search`
  - 输出建议字段：`rank`、`query`、`displayQuery`、`hotValue`、`url`
- `tests/client.test.js`
  - 验证域名、路径、Android headers、limit
- `tests/cli.test.js`
  - 验证命令存在、参数校验和别名
- `tests/normalization.test.js`
  - 覆盖字段缺失、不同响应结构、重复词去重
- `tests/live.test.js`
  - 增加显式只读、环境变量控制的 live smoke test
- `README.md`、`SKILL.md`、`references/api.md`
  - 补充命令和匿名读取说明
- 最后运行 `pnpm check`

主要风险：

- 热搜接口属于非公开接口，响应结构可能变化。
- 有的结果是搜索词，有的是活动卡片或专题，需要定义过滤规则。
- URL 可能不是知乎白名单内的标准页面，不能直接用于二次 API 请求。
- 应避免将接口返回顺序误当成稳定的显式排名。

验收标准：

- 无登录状态可读取热搜词。
- JSON 字段稳定，不透传巨大原始卡片。
- 未识别卡片被安全忽略或以 `type: "unknown"` 返回，而不是导致整个命令失败。

工作量：约 1–1.5 人日。

---

### 2. `--version`

当前实现：

```js
.version(packageJson.version)
```

且 `tests/cli.test.js`、`scripts/verify-pack.js` 已覆盖基本行为。

修改文件：

- `scripts/cli.js`
  - 保持从入口文件相对定位 `package.json`
  - 可显式配置 `-V, --version`，不引入第二份版本常量
- `tests/cli.test.js`
  - 将宽松的语义版本正则升级为精确等于 `package.json.version`
  - 覆盖 `-V`
  - 覆盖 stdout 只有版本号、stderr 为空、退出码为 0
- `scripts/verify-pack.js`
  - 只验证 `zhihu-cli` 一个 bin 的安装包行为
- `README.md`
  - 保持源码、全局安装、`pnpm dlx` 三种调用示例

主要风险：

- Commander 的 `exitOverride()` 和自定义错误处理可能误把版本输出包装成 JSON。
- 打包后相对路径变化导致找不到 `package.json`。
- 不应在 `cli.js` 手工重复声明版本号。

验收标准：

```bash
zhihu-cli --version
zhihu-cli -V
```

都精确输出 `package.json` 中的版本，并以 0 退出。

工作量：约 0.25 人日。

---

### 3. 文章详情

当前 `client.js` 已有：

```js
getArticle(config, id)
```

但 `article` 命令目前只承担创建兼容入口，不能直接读取详情。

建议命令设计：

```bash
zhihu-cli article show <id>
```

不要直接使用 `zhihu-cli article <id>`，因为现有 `article` 父命令已有创建选项，直接增加位置参数容易产生歧义。

修改文件：

- `scripts/lib/client.js`
  - 扩充 `getArticle()` 的字段请求或增加 Web API 备用端点
  - 如果专栏 API 字段不足，按双通道策略执行只读 fallback
- `scripts/cli.js`
  - 扩展 `normalizeArticle()`，增加：
    - `content`
    - `author`
    - `excerpt`
    - `voteupCount`
    - `commentCount`
    - `createdTime`
    - `updatedTime`
    - `topics`
    - `url`
  - 在现有 `article` 父命令下注册 `show`
  - 使用 `positiveId()` 校验文章 ID
- `tests/client.test.js`
  - 验证文章读取端点、GET 重试策略和匿名/登录请求行为
- `tests/normalization.test.js`
  - 覆盖 snake_case/camelCase、作者缺失、正文为空
- `tests/cli.test.js`
  - 验证 `article show` 与已有 `article create/delete` 不冲突
- `tests/live.test.js`
  - 通过 `ZHIHU_LIVE_ARTICLE_ID` 启用只读测试
- `README.md`、`SKILL.md`、`references/api.md`

主要风险：

- `zhuanlan.zhihu.com/api/articles/{id}` 和 Web V4 返回结构不同。
- 正文 HTML 可能很大，table 模式不能直接塞入单元格。
- 部分文章可能被删除、设为私密或要求登录。
- 创建和读取共用 `article` 父命令，必须防止 Commander 参数继承冲突。

验收标准：

- `article show <id>` 返回稳定详情对象。
- JSON 保留完整正文；table 模式只展示正文摘要或字符数。
- 不影响现有文章 preview/publish/delete。

工作量：约 1–1.5 人日。

---

### 4. Markdown 标题归一化

当前逻辑按文档中实际出现的标题级别排序：

- 最浅级 → `h2`
- 第二级 → `h3`
- 其余 → `<p><strong>…</strong></p>`

这个方向合理，但需补齐边界定义。

修改文件：

- `scripts/lib/markdown.js`
  - 将标题映射提取为独立、可测试函数
  - 明确没有标题时不做处理
  - 保证开闭 token 使用完全相同的映射
  - 不改变标题内的 inline token、链接、代码或强调
  - 决定重复标题、跳级标题的稳定规则
- `tests/markdown.test.js`
  - 增加矩阵：
    - 仅 `h1`
    - 仅 `h6`
    - `h1/h2/h3`
    - `h2/h4/h6`
    - 标题顺序乱序
    - 重复级别
    - 标题中包含链接、代码、强调
    - 空文档和无标题文档
  - 验证不会产生 `h1`、`h4`–`h6`
- `references/markdown.md`
  - 明确"按出现的不同层级相对归一化"，而不是简单把 `#` 替换成 `##`
- 如输出增加归一化警告，再更新 `scripts/lib/content.js` 和对应测试

主要风险：

- 当前算法会把只有一个 `######` 的文档映射成 `h2`；这是否符合产品预期必须固化为契约。
- 第三级以后转粗体段落会损失目录层级。
- 改变规则会影响确认令牌中的预览 HTML，旧预览令牌应自然失效。

验收标准：

- 任意 Markdown 标题最终只产生 `h2`、`h3` 或粗体段落。
- 同一输入编译结果确定、无状态泄漏。
- 已支持的表格、公式、图片、代码块行为不变。

工作量：约 0.5–1 人日。

---

### 5. 凭证自动刷新

这是最需要先做接口验证的项目。当前配置只保存 Cookie，没有独立 `refresh_token`；不能直接照搬移动端刷新逻辑。

建议拆成两层：

1. 响应 Cookie 自动更新：所有请求吸收 `Set-Cookie` 并安全回写。
2. 真正的 401 refresh：仅在确认存在可靠刷新端点和所需凭证后启用。

修改文件：

- 建议新增 `scripts/lib/credentials.js`
  - 负责 Cookie 合并、过期 Cookie 删除、刷新节流、并发去重
  - 同一进程内多个 401 只允许一个刷新请求
  - 建议 10 秒冷却，避免刷新风暴
- `scripts/lib/http.js`
  - 成功或失败响应均可吸收安全的 `Set-Cookie`
  - 401 时调用 credential refresher
  - 只读 GET 最多刷新后重放一次
  - 写请求绝不自动重放
  - 增加内部标记避免递归刷新
- `scripts/lib/config.js`
  - 增加通用原子更新函数，例如 `mergeCookies()`
  - 保留其他配置字段
  - 继续保证目录 `0700`、文件 `0600`
- `scripts/lib/auth.js`
  - 复用统一 Set-Cookie 解析器，消除两套 Cookie 解析逻辑
- 视接口验证结果调整 `DEFAULT_CONFIG`
  - 如确有 refresh token，单独存储并确保从不输出
- `tests/http.test.js`
  - GET：401 → 刷新 → 成功，只重放一次
  - POST/PUT/PATCH/DELETE：401 后不重放
  - 刷新失败保持原始认证错误
  - 并发 401 只触发一次刷新
  - 刷新请求自身 401 不递归
- `tests/config.test.js`
  - 原子合并、权限、并发写入、删除过期 Cookie
- `tests/auth.test.js`
  - 统一解析后的回归测试
- `references/api.md`、`SKILL.md`
  - 明确自动刷新边界和重新扫码条件

主要风险：

- 未确认刷新端点前贸然实现，可能导致账号风控。
- GET 重放也可能扩大请求量，必须最多一次。
- 写请求自动重放可能造成重复发布、点赞或删除，必须禁止。
- 多进程同时更新配置存在丢失更新风险；至少要采用"重新读取—合并—临时文件—rename"。
- `Set-Cookie` 中的删除语义、Expires 逗号和多值头解析容易出错。
- Cookie、刷新令牌和响应头绝不能进入日志或测试快照。

建议设置一个 0.5–1 人日的协议验证阶段；如果无法可靠确认 refresh 协议，本期只交付"Cookie 自动滚动更新 + 明确提示重新扫码"，不要伪装成真正刷新。

工作量：约 2–4 人日，取决于协议验证结果。

---

### 6. 图片 `uploading_status`

当前已在新图片 OSS 上传完成后执行：

```http
PUT /images/{id}/uploading_status
{"upload_result":"success"}
```

并保证 PUT 零重试。主要缺口是响应验证和失败路径。

修改文件：

- `scripts/lib/image.js`
  - 抽出 `notifyUploadingStatus()`
  - 接受 200/204 等明确成功状态
  - 通知失败时立即终止，不进入"假成功"轮询
  - 保持复用图片 `state !== 2` 不重复通知
  - 明确 GIF 分片完成后才通知
  - 可考虑 OSS 上传失败时是否发送 `upload_result: "failed"`；只有在接口契约确认后才做
- `tests/image.test.js`
  - PNG 单文件上传顺序断言：
    `apply → OSS PUT → uploading_status → poll`
  - GIF 顺序断言：
    `init → parts → complete → uploading_status → poll`
  - reused 图片不调用通知
  - 通知 4xx/5xx 时不继续轮询
  - 通知 PUT 即使传入 retries 也只调用一次
  - 204 响应可正常处理
- `tests/http.test.js`
  - 保留所有非 GET 零重试保障
- `references/api.md`
  - 补充图片状态机
- `docs/manual-write-validation.md`
  - 增加人工验证步骤

主要风险：

- 竞品文档中"当前没有通知"的结论已经落后于代码，实施时应以代码为准。
- 通知请求成功不代表图片处理完成，仍需保留状态轮询。
- OSS 成功、通知失败会留下远端孤立对象，但不能自动重复 PUT。

验收标准：

- 新图片严格按顺序上传、通知、轮询。
- 任一写步骤失败都不会发布正文。
- 写请求始终零重试。

工作量：约 0.5–1 人日。

---

### 7. `--format table`

当前是通用"对象键值表/数组前 8 列"实现，能用但对嵌套数据和长正文不够友好。

修改文件：

- `scripts/lib/output.js`
  - 引入可选表格 schema，而不是完全依靠对象键枚举
  - 支持列标题、字段选择、宽度、格式化器
  - 对嵌套作者显示名称，不直接输出整段 JSON
  - 对正文、excerpt、URL 做终端宽度感知截断
  - 分页和 warning 保持 stdout/stderr 分离
  - 空数组保持可读提示
- `scripts/cli.js`
  - 对热榜、热搜、搜索、文章、用户等传入合适 schema
  - JSON 数据结构不得因 table 模式改变
- `tests/output.test.js`（建议新增）
  - 数组、对象、空数据、Unicode、宽字符、嵌套对象、长文本
  - warning 写 stderr
  - table 模式不出现 JSON envelope
- `tests/cli.test.js`
  - 覆盖全局选项位于命令前
  - 验证错误输出和退出码
  - 覆盖文章正文不完整铺入表格
- `README.md`、`references/api.md`

主要风险：

- 中文宽字符、ANSI 字符和终端宽度会影响对齐。
- 为 table 修改数据对象会破坏 JSON 稳定契约，应只在渲染层变换。
- 默认枚举对象键会让字段顺序随不同 API 响应变化。

验收标准：

- `--format table` 只改变呈现，不改变请求、认证或业务数据。
- 常用列表具有固定列顺序。
- stdout 只有最终表格；warning/debug/progress 仍在 stderr。

工作量：约 1–1.5 人日。

---

### 8. Cookie 自动补全

目标场景：用户通过 stdin 只导入 `z_c0`，CLI 主动访问知乎初始化页面，补齐 `_xsrf`、`d_c0` 等必要 Cookie。

建议命令行为：

```bash
pbpaste | zhihu-cli auth import
```

导入后自动补全；如果网络补全失败，可以保存已有 Cookie，但返回 warning，并明确哪些操作仍不可用。也可提供：

```bash
zhihu-cli auth repair
```

用于已有配置的显式修复。

修改文件：

- `scripts/lib/auth.js`
  - 新增 `completeCookies(config, dependencies)`
  - 使用独立 cookie jar 访问 `/signin`、`/udid`、首页或经验证的初始化端点
  - 吸收响应 Set-Cookie
  - 不输出 Cookie 值
- `scripts/lib/config.js`
  - 复用原子 Cookie 合并方法
  - 返回 `addedCookieNames`、`missingCookieNames`
- `scripts/cli.js`
  - `auth import` 导入后调用补全
  - 可新增 `auth repair`
  - `auth status --offline` 继续完全不联网
- `tests/auth.test.js`
  - 只有 `z_c0` 时补齐 `_xsrf`、`d_c0`
  - 已有 Cookie 不被空值覆盖
  - Set-Cookie 删除、Expires、多头解析
  - 网络失败时不泄露凭证
- `tests/cli.test.js`
  - import 输出只包含 Cookie 名称
  - repair 不接受 Cookie 命令行参数
- `tests/config.test.js`
  - 合并与权限回归
- `SKILL.md`、`README.md`、`references/api.md`

主要风险：

- "补全 Cookie"不是"恢复失效登录态"；失效的 `z_c0` 仍应要求扫码。
- 初始化接口可能触发 CAPTCHA 或风控，遇到后必须停止，不得绕过。
- 自动补全是网络副作用，需在帮助文档中说明；`--offline` 绝不能触发。
- 不应把 Cookie 值放进 Commander 参数、stdout、stderr 或 verbose 日志。

验收标准：

- 只导入 `z_c0` 后，能在接口允许时补齐签名和 CSRF 所需 Cookie。
- 返回结果只显示 Cookie 名称和布尔状态。
- 补全失败不会破坏原有配置。

工作量：约 1–2 人日。

---

### 9. 双 API 通道

当前只是零散存在：

- Web：Chrome UA、可选 ZSE 签名
- Android：`ANDROID_HEADERS`
- `getHot()`、`getRecommend()` 手工传 Android headers

建议建立正式通道抽象，作为热搜、文章 fallback、认证策略的基础。

修改文件：

- `scripts/lib/http.js`
  - 定义通道常量或枚举：`web`、`android`
  - 新增统一入口或 wrappers：
    - `requestWebJson()`
    - `requestAndroidJson()`
  - Web 通道负责：
    - 浏览器 UA
    - Cookie
    - 可选 ZSE
    - `x-requested-with`
  - Android 通道负责：
    - Android UA
    - App/API/ZA headers
    - 明确哪些接口可匿名
  - 通道不允许调用方任意覆盖安全关键 headers
- `scripts/lib/client.js`
  - 所有端点明确选择通道
  - 热榜、热搜、推荐走 Android
  - 搜索、问题、回答、用户、写操作走 Web
  - 仅对明确列出的只读接口支持 fallback
  - 写接口禁止跨通道 fallback
- `tests/http.test.js`
  - 两类通道的 headers 快照
  - Web 签名存在/缺失条件
  - Android 不意外带 Web 签名
  - Cookie 不泄漏到不需要的通道
  - 白名单仍然生效
- `tests/client.test.js`
  - 每个 client adapter 的通道选择断言
- `references/api.md`
  - 增加端点—通道矩阵
- `AGENTS.md`
  - 在 HTTP 模块说明中注明通道职责

主要风险：

- "双通道"不应变成任意失败都换接口重试；这会掩盖 401、403、风控和数据语义差异。
- Android 与 Web 的字段、分页和身份语义不同，必须在命令层归一化。
- 认证 Cookie 是否应发送到 `api.zhihu.com` 要逐接口确认，遵循最小披露。
- Android 版本号和 headers 会老化，应集中配置，避免散落。
- 写请求必须固定通道、零重试、无 fallback。

验收标准：

- 每个 API adapter 都能明确看出使用哪个通道。
- 通道 headers 有独立测试。
- fallback 仅限白名单中的幂等只读操作，且最多一次。
- JSON 输出不暴露底层通道差异；verbose 可输出非敏感的 `channel` 字段。

工作量：约 1.5–2.5 人日。

---

## 三、推荐实施顺序

建议分 5 个阶段：

1. 基线和已有功能加固
   `--version` → Markdown 标题归一化 → 图片 `uploading_status`

2. 网络层架构
   双 API 通道

3. 认证能力
   Cookie 自动补全 → 凭证自动刷新

4. 新读取功能
   热搜词 → 文章详情

5. 展示和发布契约
   `--format table` → README/SKILL/API 文档同步 → 全量验证

依赖关系如下：

```text
双 API 通道
├── 热搜词
├── 文章详情 fallback
├── Cookie 自动补全
└── 凭证自动刷新
    └── 通用 Set-Cookie 回写

文章详情 + 热搜词
└── table 专用列设计
```

先做双通道，是为了避免热搜、文章和认证逻辑继续以临时 headers 的形式散落。table 放在读取功能之后，可以一次性确定热搜和文章的展示 schema。

---

## 四、测试与验证策略

每个功能完成后运行对应测试，阶段结束运行：

```bash
pnpm test
pnpm check
pnpm pack --dry-run
pnpm verify:pack
```

建议新增或强化的测试层次：

- 纯函数单元测试：归一化、标题映射、Cookie 解析、table 渲染。
- HTTP mock：端点、通道 headers、重试、401 刷新、Set-Cookie。
- CLI 子进程测试：命令树、stdout/stderr、退出码、别名、版本。
- 打包测试：`zhihu-cli` bin 的 `--version` 和 Skill 分发一致性。
- 只读 live 测试：热搜、文章详情；默认跳过。
- 写流程只使用 mock 和人工验证清单，不能自动执行真实图片上传或发布。

特别需要持续保持的安全断言：

- GET 才允许有限重试。
- POST、PUT、PATCH、DELETE 始终零重试。
- 401 后绝不自动重放写请求。
- Cookie、刷新令牌、二维码 token、请求正文不进入输出或快照。
- 所有请求仍受 HTTPS 与域名白名单约束。

---

## 五、总工作量

| 阶段 | 预计工作量 |
|---|---:|
| 已有功能加固：版本、Markdown、图片状态 | 1.25–2.25 人日 |
| 双 API 通道 | 1.5–2.5 人日 |
| Cookie 自动补全 | 1–2 人日 |
| 凭证自动刷新 | 2–4 人日 |
| 热搜词 | 1–1.5 人日 |
| 文章详情 | 1–1.5 人日 |
| table 完善 | 1–1.5 人日 |
| 文档、Skill 同步、全量回归 | 0.5–1 人日 |
| 合计 | 9.25–16.25 人日 |

最大不确定项是"真正的凭证刷新协议"。如果协议验证失败，采用"响应 Cookie 自动滚动更新 + 自动补全 + 401 提示扫码"的安全降级方案，总工作量可控制在约 9–12 人日。
