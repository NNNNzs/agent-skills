# zhihu-cli 接口约定

## 输出

默认成功响应：

```json
{"ok":true,"data":{},"paging":null,"warnings":[]}
```

- `data` 为详情对象或精简列表。
- 列表接口在可用时返回 `paging`。
- `warnings` 只在非空时出现。
- 失败时 stdout 为空，stderr 输出 `{ "ok": false, "error": ... }`，退出码非零。
- `--format table` 只改变呈现，不改变请求行为或 JSON 数据；常用列表使用固定列，长正文、URL 和中文宽字符按终端宽度截断。
- `--verbose` 只记录方法、通道、白名单 URL（查询值隐藏）、状态码、耗时、尝试次数和是否重试。
- 扫码 JSON 进度写 stderr，最终结果只写 stdout 一次；事件不含 QR URL、token 或 Cookie。

## 认证与文件

- 新配置：`~/.zhihu-cli/config.json`，目录 `0700`，文件 `0600`。
- 临时二维码：`~/.zhihu-cli/login_qrcode.png`，权限 `0600`，流程结束即删除。
- 兼容读取：`~/.zhihu-creator/config.json`、`ZHIHU_CREATOR_CONFIG`。
- 当前覆盖变量：`ZHIHU_CLI_CONFIG`。
- `auth import` 只读非交互 stdin，不接受 Cookie 参数或文件参数；默认补全 Cookie，`--no-repair` 可跳过，`auth repair` 可显式重试。
- `auth login --qr` 最长等待 120 秒，未扫码时每秒轮询，已扫码时每 0.5 秒轮询。
- `auth status --offline` 不联网；在线 status 和 whoami 以 `/api/v4/me` 为准。
- logout 清空新旧配置登录态并删除二维码。

常用 Cookie：`z_c0` 表示登录态，`d_c0` 用于 ZSE 签名，`_xsrf` 用于写请求。输出仅可显示 Cookie 名称和存在性，不可显示值。

Web 成功和失败响应中的 `Set-Cookie` 都会原子合并，过期 Cookie 会删除。当前没有已验证的 Web refresh-token 协议；401 不自动重放写请求，并提示 repair 或重新扫码。

## 分页

- 常规 `limit` 最大 50；评论最大 100；偏移最大 10000。
- 列表保留远端 `paging`。
- `answer comments --all` 最多读取 20 页，避免无界请求。
- Feed 的 `--answers`、`--expand` 和 `--comments` 会产生额外请求，默认关闭。

## 命令映射

| 能力 | 分组命令 | 兼容命令 |
|---|---|---|
| 扫码登录 | `auth login --qr` | `login --qrcode` |
| 当前用户 / 状态 / 退出 | `auth whoami/status/logout` | `whoami/status/logout` |
| 热榜 / 推荐 | `feed hot/recommend` | `hot/feed/feeds` |
| 热搜词 | `feed hot-search` | `hot-search` |
| 问题 | `question [show] <id>` | `question <id>` |
| 问题回答 | `question answers <id>` | `answers <id>` |
| 回答 / 评论 | `answer [show] <id>`、`answer comments <id>` | `answer <id> --comments` |
| 用户内容 | `user show/answers/articles/followers/following` | `user-answers`、`user-articles`、`followers`、`following` |
| 话题 | `topic [show] <id>`、`topic questions <id>` | `topic <id>` |
| 收藏 / 通知 | `account collections/notifications` | `collections/notifications` |
| 赞同 | `answer vote preview/apply` | `vote [--neutral] [--confirm]` |
| 关注 | `question follow preview/apply` | `follow-question [--unfollow] [--confirm]` |
| 提问 | `question create preview/publish` | `ask [--confirm]` |
| 想法 | `pin create preview/publish` | `pin [--confirm]` |
| 文章读取 / 创建 | `article show <id>`、`article create preview/publish` | `article [--confirm]` |
| 删除 | `<type> delete preview/apply` | `delete-question/pin/article [--confirm]` |

平铺写命令不带 `--confirm` 时只预览，带有效令牌时才执行。

## 读取端点

- `GET /api/v4/me`
- `GET /api/v4/search_v3`
- `GET api.zhihu.com/topstory/hot-list`
- `GET api.zhihu.com/topstory/recommend`
- `GET api.zhihu.com/search/top_search/tabs/hot/items`
- `GET /api/v4/questions/{id}` 与 `/answers`
- `GET /api/v4/answers/{id}` 与 `/comments`
- `GET /api/v4/members/{token}`、`/answers`、`/articles`、`/followers`、`/followees`
- `GET /api/v4/topics/{id}` 与 `/feeds/essence`
- `GET /api/v4/members/{me}/favlists`
- `GET /api/v4/notifications/v2/recent`
- `GET zhuanlan.zhihu.com/api/articles/{id}`；缺正文时允许一次 `/api/v4/articles/{id}` 备用读取

公开读取在接口允许时可匿名。收藏、通知和个性化推荐强制登录。

## 写端点与确认

- 回答赞同：`POST /api/v4/answers/{id}/voters`
- 问题关注：`POST` 或 `DELETE /api/v4/questions/{id}/followers`
- 回答草稿：`POST /api/v4/questions/{id}/draft`
- 回答、想法及复杂内容：`POST /api/v4/content/publish`
- 普通提问：`POST /api/v4/questions`
- 文章：专栏 draft `POST`、正文 `PATCH`、发布 `PUT`；带图片时使用统一发布适配器
- 图片：注册、OSS 上传、状态确认和状态读取
- 删除：问题、想法或文章对应对象端点 `DELETE`

所有写操作在 apply/publish 前重新读取账户、文件和必要的远端状态。SHA-256 令牌绑定：

- 当前账户 ID；
- 操作类型和目标 ID；
- 远端当前关系、已有回答或对象指纹；
- 标题、正文 SHA-256、话题和设置；
- 每张图片的路径、SHA-256、大小、格式和尺寸。

远端状态、账户或输入变化会使令牌失效。点赞和关注若已达到目标状态会返回幂等成功。删除必须能确认对象 ID、类型和当前账户所有权。

## 网络边界与重试

允许域名只有：

- `www.zhihu.com`
- `api.zhihu.com`
- `zhuanlan.zhihu.com`
- `zhihu-pics-upload.zhimg.com`

Web 通道使用浏览器 UA、Cookie 和可选 ZSE；Android 通道使用集中维护的 App headers，匿名读取不携带 Cookie 或 Web 签名。调用方不能覆盖安全关键 headers。GET 可对 429 和 5xx 进行最多两次有限重试；跨端点 fallback 仅限文章详情这一白名单幂等读取且最多一次。POST、PUT、PATCH 和 DELETE 不自动重试、不跨通道 fallback。401 表示登录失效，403 通常表示权限或风控，429 表示频率限制；CLI 不尝试绕过。

## 验证边界

自动测试使用 mock HTTP，不真实发布、点赞、关注或删除。`ZHIHU_LIVE_TESTS=1 pnpm test:live` 只测试读取；可选 `ZHIHU_LIVE_QUESTION_ID`、`ZHIHU_LIVE_ARTICLE_ID`。写接口发布前按 `docs/manual-write-validation.md` 人工核验。
