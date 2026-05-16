---
name: node-red
version: 1.0.0
description: >-
  Edit, create, analyze, and deploy Node-RED flows. Use this skill whenever the user
  works with flows.json, mentions Node-RED, or needs MQTT/HTTP API/data pipeline
  integrations — even if they don't say "Node-RED" explicitly (e.g. "帮我改一下
  flows.json 里的 MQTT 节点", "把所有 debug 节点禁用掉", "部署流程到测试环境").
  Also trigger when editing JSON that contains Node-RED node types (inject, function,
  mqtt in, http in, etc.) or when the user asks about flow validation, context
  storage, function node code patterns. Prefer using the bundled scripts over manual
  JSON editing — scripts handle UUID generation, wire cleanup, and validation that
  are easy to get wrong by hand.
license: MIT
compatibility:
  requires: python3
  notes: deploy_flow.py additionally requires `pip install requests`
metadata:
  author: NNNNzs
  version: "1.2.0"
---
# Node-RED Flow Development

## 为什么用脚本而不是直接编辑 JSON

flows.json 是一个大数组，手动编辑容易出错：UUID 格式不对、删节点后残留连线引用、tab 的 `z` 字段对不上。脚本帮你处理这些细节。所以**优先用脚本**，只有在脚本不覆盖的场景（如修改 function 节点的 JavaScript 代码、调整节点坐标布局）才直接编辑 JSON。

## 什么时候用什么工具

### LLM 编排（推荐）

通过 Node-RED v4 单 Flow API 操作，不需要拉取完整 flows.json，适合大模型按需读写。

- **查看所有流程** → `flow_api.py --url <url> list`
- **读取单个流程** → `flow_api.py --url <url> get <flow_id>`（只返回该 Flow 的节点，几 KB）
- **保存到本地编辑再更新** → `get --save` → 编辑 JSON → `update <file>`
- **创建新流程** → `flow_api.py --url <url> create <flow.json>`
- **删除流程** → `flow_api.py --url <url> delete <flow_id>`
- **全部备份** → `flow_api.py --url <url> backup [--dir ./backup]`

### 本地文件操作

以下脚本面向本地 flows.json 文件，适合离线批量编辑后一次性部署。

- **分析现有流程** → `read_flow.py --summary` 先看全局，再 `--type` 或 `--node` 深入
- **从零创建** → `create_flow.py --template` 选模板起步，比手动拼 JSON 快且不易出错
- **改单个节点** → `modify_flow.py --node <id>`
- **改一批节点** → `batch_nodes.py`（禁用/删除/重命名同类节点）
- **写 function 节点代码** → 读 `assets/boilerplate/function_async.js` 或 `function_context.js` 复制模板
- **查节点属性字段** → 读 `references/node_schemas.md`
- **全量部署/回滚** → `deploy_flow.py`，部署前先用 `--get --save` 备份

## 脚本索引

所有脚本在 `scripts/` 下执行：`python3 scripts/<name>.py`

### 单 Flow API（LLM 编排推荐）
- **flow_api.py** `list | get <id> [--save <file>] | create <file> | update <file> | delete <id> | backup [--dir <dir>]`

### 读取与分析
- **read_flow.py** `--summary | --node <id> | --type <type> | --tab <id>`
- **validate_flow.py** `<flow.json>`

### 创建与修改
- **create_flow.py** `--new --name <name> | --template <simple|mqtt|http|http-api|data-pipeline|error-handler> | --add --type <inject|debug|function|comment|change> --tab <tab_id> --name <name>`
- **modify_flow.py** `--node <id> --rename <name> | --move <x>,<y> | --property <prop> --value <val> | --disable | --enable | --delete`
- **wire_nodes.py** `<flow.json> <source_id> <target_id> [output_port]`

### 批量操作
- **batch_nodes.py** `--find --type <type> | --name <pattern> | --tab <id> | --disabled | --pattern <code>` — 查找
- **batch_nodes.py** `--enable | --disable | --delete | --rename [--prefix <p>] [--suffix <s>] --type <type>` — 批量修改
- **batch_nodes.py** `--export --type <type> --output <file>` — 导出

### 部署
- **deploy_flow.py** `--url <url> --get [--save <file>] | --deploy --flows <file> | --validate --flows <file>`

## 参考文档（按需读取）

| 文件 | 何时读取 |
|------|---------|
| `references/node_schemas.md` | 需要创建节点、确认某个节点类型的属性字段时 |
| `references/api_reference.md` | 需要通过 API 部署、获取 context 数据、触发 inject 节点时 |
| `references/function_snippets.md` | 需要 function 节点的简短代码片段（速查）时 |
| `assets/boilerplate/function_async.js` | 需要**完整可复制**的异步操作模板时 |
| `assets/boilerplate/function_context.js` | 需要**完整可复制**的 context 存储模板时 |
| `assets/templates/mqtt_flow.json` | 需要完整的 MQTT 发布/订阅流程起点时 |
| `assets/templates/http_api_flow.json` | 需要完整的 REST API 流程起点时 |

## 关键约定

- 节点 ID：无连字符 UUID（`str(uuid4()).replace("-", "")`）
- `msg.payload` 主数据，`msg.topic` 分类标识
- Context 三级：node → flow → global，均可配置持久化
- 部署前先验证 + 备份：`deploy_flow.py --url <url> --get --save backup.json`
- 环境变量：节点属性 `$(ENV_VAR)`，function 中 `env.get("ENV_VAR")`
