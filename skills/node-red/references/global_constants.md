# 全局常量定义（初始化变量流程）

## 概述

Node-RED 启动时通过「初始化变量」流程（Flow ID: `1a3fcb3d2b0868ae`）自动加载所有常量到 **global context**。所有流程通过 `global.get()` 读取，集中管理，一处修改全局生效。

## 流程结构

```
inject(启动时) → function(加载全局常量) → debug(初始化完成)
```

## 常量列表

### USER_MAP — 用户映射表

```js
global.get("USER_MAP")
// => {
//   0: { name: "老板", role: "boss" },
//   505: { name: "女主人", role: "helen" }
// }
```

| 操作ID | 名称 | 角色 | 开锁方式 |
|--------|------|------|----------|
| 0 | 老板（山哥） | boss | 指纹(16) |
| 505 | 女主人（Helen） | helen | 密码(2) |
| 2003 | 未分配 | — | 钥匙(5) |
| 2005 | 未分配 | — | 钥匙(5) |
| 501 | 系统自动上锁 | — | 密码(2) |

### ENTITY — 设备 Entity ID

```js
global.get("ENTITY")
```

| 键 | Entity ID | 说明 |
|----|-----------|------|
| `lock_event` | `event.loock_cn_1175227125_t3pul_lock_event_e_2_1020` | 505门锁事件 |
| `living_room_camera` | `switch.chuangmi_cn_1178119571_079ac1_on_p_2_1` | 505客厅摄像头（小米智能摄像机 4 4K） |
| `tts` | `text.xiaomi_cn_980482823_oh2p_play_text_a_7_3` | 小爱TTS播报 |
| `tts_notify` | `notify.xiaomi_cn_980482823_oh2p_play_text_a_7_3` | 小爱通知播报 |
| `living_room_light` | `light.xiaomi_cn_877842444_ceil05_s_2_light` | 客厅灯 |
| `master_bedroom_light` | `light.xiaomi_cn_829045439_ceil03_s_2_light` | 主卧灯 |
| `second_bedroom_light` | `light.xiaomi_cn_829060708_ceil02_s_2_light` | 次卧灯 |
| `study_light` | `light.xiaomi_cn_829048472_ceil03_s_2_light` | 书房灯 |
| `balcony_curtain` | `cover.babai_cn_1002645573_bb82mm_s_2_curtain` | 阳台窗帘 |
| `balcony_illumination` | `sensor.linp_cn_blt_3_1nbl4ktu50k00_es2_illumination_p_2_1005` | 阳台光照传感器 |

### ROOMS — 房间灯光列表

```js
global.get("ROOMS")
// => [
//   { room: "客厅", entity: "light.xiaomi_cn_877842444_ceil05_s_2_light" },
//   { room: "主卧", entity: "light.xiaomi_cn_829045439_ceil03_s_2_light" },
//   { room: "次卧", entity: "light.xiaomi_cn_829060708_ceil02_s_2_light" },
//   { room: "书房", entity: "light.xiaomi_cn_829048472_ceil03_s_2_light" }
// ]
```

## 使用方式

在任意 function 节点中：

```js
const USER_MAP = global.get("USER_MAP") || {};
const ENTITY = global.get("ENTITY") || {};
const ROOMS = global.get("ROOMS") || [];

// 读取设备
const tts = ENTITY.tts;
const camera = ENTITY.living_room_camera;

// 查找用户
const user = USER_MAP[opId];
```

## 新增常量的步骤

1. 在「初始化变量」流程的 function 节点中添加 `global.set("KEY", value)`
2. 在需要使用的流程 function 节点中用 `global.get("KEY")` 读取
3. 更新本文档

## 环境信息

- **Node-RED**: Docker 容器 `nodered`，localhost:1880
- **HA Server 节点**: `5aa4694d07e2086d`（公网ha）
- **Context 持久化**: 已启用 `localfilesystem`（`settings.js`），global context 重启后保留
- **其他摄像头**（仅供参考，当前未使用）:
  - `switch.chuangmi_cn_324594296_ipc019_on_p_2_1` — 403 客厅
  - `switch.chuangmi_cn_1106034555_069a01_on_p_2_1` — 南京门口
