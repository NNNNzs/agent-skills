# Node-RED Node Schemas Reference

通用字段（所有节点都有）：`id`（无连字符 UUID）、`type`、`z`（tab ID）、`name`、`x`/`y`（坐标）、`wires`（输出连线数组）。

## Core Nodes

### inject
| 字段 | 类型 | 说明 |
|------|------|------|
| `props` | array | 要注入的属性，如 `[{"p":"payload"},{"p":"topic","vt":"str"}]` |
| `repeat` | string | 重复间隔（秒），空=不重复 |
| `crontab` | string | cron 表达式 |
| `once` | bool | 部署时触发一次 |
| `onceDelay` | number | once=true 时的延迟秒数 |
| `topic` | string | topic 值 |
| `payload` | string | payload 值 |
| `payloadType` | string | `str\|num\|bool\|json\|bin\|date\|env\|flow\|global` |

### function
| 字段 | 类型 | 说明 |
|------|------|------|
| `func` | string | JavaScript 代码 |
| `outputs` | number | 输出端口数 |
| `noerr` | number | 0=显示错误, 1=隐藏 |
| `initialize` | string | 部署时执行的初始化代码 |
| `finalize` | string | 关闭时执行的清理代码 |
| `libs` | array | 外部库 |

### debug
| 字段 | 类型 | 说明 |
|------|------|------|
| `active` | bool | 是否启用 |
| `tosidebar` | bool | 显示在调试侧栏 |
| `console` | bool | 同时输出到系统控制台 |
| `tostatus` | bool | 显示为节点状态 |
| `complete` | string | 输出内容：`payload\|complete\|undefined` |
| `targetType` | string | `msg\|full` |

### change
```json
{"type": "change", "rules": [{"t": "set", "p": "payload", "pt": "msg", "to": "value", "tot": "str"}]}
```
- `t`: set|change|delete|move
- `pt`: msg|flow|global（属性来源）
- `tot`: str|num|bool|json|bin|date|env|msg|flow|global（目标类型）

### switch
```json
{"type": "switch", "property": "payload", "propertyType": "msg",
 "rules": [{"t": "eq", "v": "val", "vt": "str"}, {"t": "else"}],
 "checkall": "true", "outputs": 2}
```
- `t`: eq|neq|lt|lte|gt|gte|btwn|cont|regex|true|false|null|nnull|jsonata|else
- `vt`: str|num|bool|json|env|flow|global

### delay
| 字段 | 类型 | 说明 |
|------|------|------|
| `pauseType` | string | `delay\|rate\|queue\|random` |
| `timeout` | string | 延迟时间 |
| `timeoutUnits` | string | `seconds\|minutes\|hours\|days` |
| `rate` | string | 每时间段允许的消息数 |
| `rateUnits` | string | `second\|minute\|hour` |
| `drop` | bool | 超出速率时丢弃中间消息 |

## Network Nodes

### http in
| 字段 | 类型 | 说明 |
|------|------|------|
| `url` | string | 端点路径，如 `/api/data` |
| `method` | string | `get\|post\|put\|delete\|patch` |
| `upload` | bool | 是否接受文件上传 |
| `swaggerDoc` | string | OpenAPI 文档路径 |

### http response
| 字段 | 类型 | 说明 |
|------|------|------|
| `statusCode` | string | 覆盖状态码 |
| `headers` | object | 自定义响应头 |

### http request
| 字段 | 类型 | 说明 |
|------|------|------|
| `method` | string | HTTP 方法 |
| `ret` | string | 返回类型：`txt\|bin\|obj` |
| `url` | string | 请求 URL |
| `tls` | string | TLS 配置节点 ID |

### mqtt in / mqtt out
| 字段 | 类型 | 说明 |
|------|------|------|
| `topic` | string | MQTT 主题，支持通配符 `+` `#` |
| `qos` | string | `0\|1\|2` |
| `datatype` | string | `auto\|json\|utf8\|base64`（仅 mqtt in） |
| `broker` | string | 引用 mqtt-broker 配置节点 ID |
| `retain` | string | 是否保留消息（仅 mqtt out） |

### websocket in/out
| 字段 | 类型 | 说明 |
|------|------|------|
| `server` | string | WS server 配置节点 ID |
| `client` | string | WS client 配置节点 ID |

## Storage Nodes

### file in
| 字段 | 类型 | 说明 |
|------|------|------|
| `filename` | string | 文件路径 |
| `format` | string | `utf8\|lines\|stream\|base64` |
| `chunk` | bool | 是否分块读取 |

### file
| 字段 | 类型 | 说明 |
|------|------|------|
| `filename` | string | 文件路径 |
| `appendNewline` | bool | 末尾追加换行 |
| `createDir` | bool | 目录不存在时创建 |
| `overwriteFile` | string | `true\|false\|delete` |

## Logic Nodes

### range
| 字段 | 类型 | 说明 |
|------|------|------|
| `minin`/`maxin` | string | 输入范围 |
| `minout`/`maxout` | string | 输出范围 |
| `action` | string | `scale\|clamp\|roll` |

### template
| 字段 | 类型 | 说明 |
|------|------|------|
| `field` | string | 输出字段，通常 `payload` |
| `syntax` | string | `mustache\|handlebars` |
| `template` | string | 模板内容 |

### join
| 字段 | 类型 | 说明 |
|------|------|------|
| `mode` | string | `auto\|custom` |
| `build` | string | `object\|array\|string\|buffer` |
| `key` | string | 合并键（build=object 时） |
| `joiner` | string | 连接符（build=string 时） |

### split
| 字段 | 类型 | 说明 |
|------|------|------|
| `splt` | string | 分隔符 |
| `spltType` | string | `str\|bin\|len` |
| `arraySplt` | number | 数组分组大小 |

## Error Handling

### catch
| 字段 | 类型 | 说明 |
|------|------|------|
| `scope` | array | 捕获特定节点 ID，空=全部 |
| `uncaught` | bool | 是否捕获未处理的错误 |

### status
| 字段 | 类型 | 说明 |
|------|------|------|
| `scope` | array | 监控特定节点 ID，空=全部 |

## Configuration Nodes

### mqtt-broker
| 字段 | 类型 | 说明 |
|------|------|------|
| `broker` | string | broker 地址 |
| `port` | string | 端口 |
| `clientid` | string | 客户端 ID |
| `protocolVersion` | string | `3\|4\|5` |
| `keepalive` | string | 心跳间隔（秒） |
| `cleansession` | bool | 是否清除会话 |

## Custom Properties

- 环境变量：节点属性中 `$(ENV_VAR)`，function 中 `env.get("ENV_VAR")`
- JSONata：属性类型设为 `"jsonata"`，如 `$sum(payload)`
- 常用 msg 属性：`payload`（主数据）、`topic`（分类）、`_msgid`（唯一 ID）、`parts`（split/join 元数据）、`req`/`res`（HTTP 对象）
